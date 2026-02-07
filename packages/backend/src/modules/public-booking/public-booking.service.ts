import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CompaniesService } from '../companies/companies.service';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { parseHHmm, zonedTimeToUtcMs } from '../scheduling/timezone';
import {
  PublicBookingCancelDto,
  PublicBookingRequestDto,
  PublicBookingRescheduleDto,
  PublicBookingUpdateDto,
} from './dto/public-booking.dto';
import { sendSesEmail } from './email.util';
import { renderHandycallEmail } from '../../common/email-templates';
import { AppointmentStatus, isValidEmail } from '@handycall/shared';
import { signBookingToken, verifyBookingToken } from './booking-link.util';

type BookingTemplate = {
  intake_schema?: { required?: string[]; optional?: string[] };
  booking_defaults?: { duration_minutes?: number };
};

function asE164(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return trimmed;
  return trimmed.startsWith('+') ? `+${digits}` : `+${digits}`;
}

function titleize(input: string): string {
  return String(input || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatSlotLabel(slotIso: string, timeZone: string): string {
  const date = new Date(slotIso);
  if (!Number.isFinite(date.getTime())) return slotIso;
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return slotIso;
  }
}

function parseYmd(input: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(input || '').trim());
  if (!match) return null;
  const [year, month, day] = match.slice(1).map((n) => parseInt(n, 10));
  if (!year || !month || !day) return null;
  return { year, month, day };
}

@Injectable()
export class PublicBookingService {
  constructor(
    private readonly config: ConfigService,
    private readonly companies: CompaniesService,
    private readonly dynamodb: DynamoDBService,
    private readonly scheduling: SchedulingService,
    private readonly appointments: AppointmentsService,
  ) {}

  private getBookingSecret(): string {
    const secret =
      this.config.get<string>('BOOKING_LINK_SECRET') || this.config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('Missing BOOKING_LINK_SECRET/JWT_SECRET');
    return secret;
  }

  private getFrontendBaseUrl(): string {
    return (this.config.get<string>('FRONTEND_URL') || 'https://handycall.org').replace(/\/$/, '');
  }

  private resolveBookingFromEmail(company: any): { from: string; display: string } {
    const override =
      (typeof company?.booking_from_email === 'string' && company.booking_from_email) ||
      (typeof company?.email_from === 'string' && company.email_from);
    const explicitFrom =
      this.config.get<string>('BOOKING_FROM_EMAIL') ||
      this.config.get<string>('NO_CONTACT_EMAIL') ||
      '';
    const domain =
      this.config.get<string>('BOOKING_EMAIL_DOMAIN') ||
      this.config.get<string>('SES_FROM_DOMAIN') ||
      'handycall.org';
    const rawName = String(company?.company_name || company?.company_id || 'company');
    const slug = rawName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);
    const local = `no-reply+${slug || company?.company_id || 'company'}`;
    const from = override || explicitFrom || `${local}@${domain}`;
    const display = rawName;
    return { from, display };
  }

  private resolveCompanyTimeZone(company: any, fallback = 'UTC'): string {
    const candidate =
      company?.calendar_connection?.timezone ||
      company?.calendar_connection?.timeZone ||
      company?.timezone ||
      fallback;
    return candidate || fallback;
  }

  async buildBookingLink(companyId: string, callId: string) {
    const expiresMs = Number(this.config.get<string>('BOOKING_LINK_EXPIRES_MS') || 7 * 24 * 60 * 60 * 1000);
    const token = signBookingToken(
      { company_id: companyId, call_id: callId, exp: Date.now() + expiresMs },
      this.getBookingSecret()
    );
    return `${this.getFrontendBaseUrl()}/book/${token}`;
  }

  private async loadTemplate(companyId: string): Promise<BookingTemplate | undefined> {
    const company = await this.companies.findById(companyId);
    if (!company) return undefined;
    const templateId = (company as any).service_template_id || 'tmpl_handyman_v1';
    try {
      const template = await this.dynamodb.get('service_templates', { template_id: templateId });
      return template as BookingTemplate;
    } catch {
      return undefined;
    }
  }

  private isAppointmentExpired(appointment: any): boolean {
    if (!appointment) return false;
    const now = Date.now();
    if (appointment.status === AppointmentStatus.CANCELLED || appointment.status === AppointmentStatus.COMPLETED || appointment.status === AppointmentStatus.NO_SHOW) {
      return true;
    }
    if (typeof appointment.scheduled_end === 'number' && appointment.scheduled_end < now) {
      return true;
    }
    return false;
  }

  private async loadCallAndAppointment(companyId: string, callId: string) {
    const call = await this.dynamodb.get('calls', { company_id: companyId, call_id: callId });
    const appointmentId = call?.appointment_id;
    let appointment: any = null;
    if (appointmentId) {
      try {
        appointment = await this.appointments.getAppointment(companyId, appointmentId);
      } catch {
        appointment = null;
      }
    }
    return { call, appointment };
  }

  private extractRequiredFields(template?: BookingTemplate) {
    const required = Array.isArray(template?.intake_schema?.required) ? template!.intake_schema!.required! : [];
    const optional = Array.isArray(template?.intake_schema?.optional) ? template!.intake_schema!.optional! : [];
    return {
      required,
      optional,
      labels: [...required, ...optional].reduce<Record<string, string>>((acc, key) => {
        acc[key] = titleize(key);
        return acc;
      }, {}),
    };
  }

  private resolveAddressInput(dto: PublicBookingRequestDto): { street?: string; city?: string; state?: string; zip?: string } {
    const address = dto.address ?? {};
    const zip = address.zip || dto.zip;
    return {
      street: address.street?.trim() || undefined,
      city: address.city?.trim() || undefined,
      state: address.state?.trim() || undefined,
      zip: zip?.trim() || undefined,
    };
  }

  private ensureRequiredFields(required: string[], dto: PublicBookingRequestDto) {
    const missing: string[] = [];
    const custom = dto.custom_fields ?? {};
    const address = this.resolveAddressInput(dto);
    const hasAddress = Boolean(address.street && address.city && address.state && address.zip);

    for (const field of required) {
      const key = String(field || '').trim();
      if (!key) continue;
      const normalized = key.toLowerCase();
      if (['full_name', 'name'].includes(normalized)) {
        if (!dto.full_name?.trim()) missing.push(key);
        continue;
      }
      if (['email'].includes(normalized)) {
        if (!dto.email?.trim()) missing.push(key);
        continue;
      }
      if (['phone', 'phone_number', 'phone_number_verification'].includes(normalized)) {
        if (!dto.phone_number?.trim()) missing.push(key);
        continue;
      }
      if (['preferred_time'].includes(normalized)) {
        if (!dto.preferred_date?.trim() || !dto.preferred_time?.trim()) missing.push(key);
        continue;
      }
      if (['zip', 'zipcode'].includes(normalized)) {
        if (!(address.zip || dto.zip)) missing.push(key);
        continue;
      }
      if (['address', 'service_address', 'location_address', 'pickup_location', 'dropoff_location'].includes(normalized)) {
        if (!hasAddress) missing.push(key);
        continue;
      }
      if (custom[key] === undefined || custom[key] === null || String(custom[key]).trim() === '') {
        if (!(dto as any)[key]) missing.push(key);
      }
    }

    if (missing.length) {
      throw new BadRequestException(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  async getBookingInfo(token: string) {
    const payload = verifyBookingToken(token, this.getBookingSecret());
    const company = await this.companies.findById(payload.company_id);
    if (!company) throw new NotFoundException('Company not found');

    const { call, appointment } = await this.loadCallAndAppointment(payload.company_id, payload.call_id);
    if (appointment && this.isAppointmentExpired(appointment)) {
      throw new BadRequestException('This booking link has expired.');
    }
    const phone = typeof call?.from_number === 'string' ? call.from_number : undefined;
    const email =
      typeof (call as any)?.lead_email === 'string'
        ? String((call as any).lead_email)
        : typeof (call as any)?.email === 'string'
          ? String((call as any).email)
          : undefined;
    const template = await this.loadTemplate(payload.company_id);
    const fields = this.extractRequiredFields(template);

    return {
      ok: true,
      mode: appointment ? 'manage' : 'book',
      company_id: company.company_id,
      company_name: company.company_name,
      service_type: company.service_type,
      timezone: this.resolveCompanyTimeZone(company),
      phone_number: phone,
      email,
      appointment: appointment
        ? {
            appointment_id: appointment.appointment_id,
            scheduled_start: appointment.scheduled_start,
            scheduled_end: appointment.scheduled_end,
            status: appointment.status,
            contact_name: appointment.contact_name,
            contact_email: appointment.contact_email,
            contact_phone: appointment.contact_phone,
            address: appointment.address,
            notes: appointment.notes,
          }
        : undefined,
      collected_info: call?.collected_info,
      intake_schema: {
        required: fields.required,
        optional: fields.optional,
        labels: fields.labels,
      },
      booking_defaults: template?.booking_defaults || undefined,
    };
  }

  async submitBooking(token: string, dto: PublicBookingRequestDto) {
    const payload = verifyBookingToken(token, this.getBookingSecret());
    const company = await this.companies.findById(payload.company_id);
    if (!company) throw new NotFoundException('Company not found');

    const { call, appointment } = await this.loadCallAndAppointment(payload.company_id, payload.call_id);
    if (appointment) {
      if (this.isAppointmentExpired(appointment)) {
        throw new BadRequestException('This booking link has expired.');
      }
      throw new BadRequestException('This booking link has already been used.');
    }

    const template = await this.loadTemplate(payload.company_id);
    const requiredFields = Array.isArray(template?.intake_schema?.required) ? template!.intake_schema!.required! : [];
    this.ensureRequiredFields(requiredFields, dto);

    if (!dto.preferred_date || !dto.preferred_time) {
      throw new BadRequestException('preferred_date and preferred_time are required');
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dto.preferred_date.trim());
    if (!match) {
      throw new BadRequestException('preferred_date must be YYYY-MM-DD');
    }
    const { hour, minute } = parseHHmm(dto.preferred_time.trim());
    const [year, month, day] = match.slice(1).map((n) => parseInt(n, 10));
    const timeZone = this.resolveCompanyTimeZone(company);
    const startMs = zonedTimeToUtcMs({ year, month, day, hour, minute }, timeZone);
    const durationMinutes = this.scheduling.getDurationMinutes(company);
    const endMs = startMs + durationMinutes * 60_000;

    const startIso = new Date(startMs).toISOString();
    const endIso = new Date(endMs).toISOString();
    const slots = await this.scheduling.getAvailability(company, startIso, endIso);
    const exact = slots.find((s) => Date.parse(s.start_time) === startMs);
    if (!exact) {
      const dayStart = zonedTimeToUtcMs({ year, month, day, hour: 8, minute: 0 }, timeZone);
      const dayEnd = zonedTimeToUtcMs({ year, month, day, hour: 18, minute: 0 }, timeZone);
      const daySlots = await this.scheduling.getAvailability(
        company,
        new Date(dayStart).toISOString(),
        new Date(dayEnd).toISOString()
      );
      const suggestions = daySlots.slice(0, 5).map((s) => formatSlotLabel(s.start_time, timeZone));
      throw new BadRequestException(
        suggestions.length
          ? `That time is no longer available. Try: ${suggestions.join(', ')}.`
          : 'That time is no longer available. Please pick another time.'
      );
    }

    const address = this.resolveAddressInput(dto);
    const phone = asE164(dto.phone_number || (call?.from_number as string) || '');
    if (!phone) {
      throw new BadRequestException('phone_number is required');
    }

    const custom = dto.custom_fields ?? {};
    const customNotes = Object.entries(custom)
      .filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== '')
      .map(([k, v]) => `${titleize(k)}: ${String(v).trim()}`)
      .join('\n');
    const notes = customNotes || undefined;

    const createdAppointment = await this.appointments.createAppointment(company.company_id, {
      scheduled_start: startMs,
      scheduled_end: endMs,
      contact_name: dto.full_name?.trim() || undefined,
      contact_email: dto.email?.trim() || undefined,
      contact_phone: phone,
      service_type: company.service_type ?? 'Service',
      notes,
      address: address.street || address.city || address.state || address.zip ? address : undefined,
      created_by: 'WEB',
    });

    if (call?.call_id) {
      await this.dynamodb.update(
        'calls',
        { company_id: company.company_id, call_id: call.call_id },
        {
          appointment_created: true,
          appointment_id: createdAppointment?.appointment_id,
          outcome: 'APPOINTMENT_BOOKED',
          lead_captured: true,
          ...(dto.email ? { lead_email: dto.email } : {}),
          updated_at: Date.now(),
        }
      );
    }

    const region = this.config.get<string>('SES_REGION') || this.config.get<string>('AWS_REGION') || 'us-east-1';
    const fromMeta = this.resolveBookingFromEmail(company);
    const fromAddress = `${fromMeta.display} <${fromMeta.from}>`;
    const toEmail = dto.email?.trim() || (call as any)?.lead_email;
    if (toEmail && isValidEmail(toEmail)) {
      const label = formatSlotLabel(startIso, timeZone);
      const subject = `${company.company_name} booking confirmation`;
      const manageLink = `${this.getFrontendBaseUrl()}/book/${token}`;
      const body =
        `You're confirmed with ${company.company_name} for ${label}.\n\n` +
        `Manage or update your appointment here: ${manageLink}`;
      const html = renderHandycallEmail({
        title: 'Booking confirmed',
        preheader: `Your ${company.company_name} appointment is scheduled.`,
        greeting: `Hi there,`,
        body: `<p style="margin:0 0 16px;">You're confirmed with <strong>${company.company_name}</strong> for <strong>${label}</strong>.</p>
               <p style="margin:0 0 16px;">Use the link below to view, reschedule, or cancel this appointment.</p>`,
        cta: { label: 'View appointment', url: manageLink },
        footer: `If you did not request this booking, just reply to this email and we'll take care of it.`,
      });
      try {
        const result = await sendSesEmail({
          region,
          from: fromAddress,
          to: [toEmail],
          subject,
          text: body,
          html,
        });
        console.log('[public_booking] confirmation email sent', {
          appointment_id: createdAppointment?.appointment_id,
          message_id: (result as any)?.MessageId,
          to: toEmail,
        });
      } catch (err) {
        console.warn('[public_booking] failed to send confirmation email', err);
      }
    }

    return {
      ok: true,
      appointment_id: createdAppointment?.appointment_id,
      start_time: startIso,
      end_time: endIso,
    };
  }

  async updateBooking(token: string, dto: PublicBookingUpdateDto) {
    const payload = verifyBookingToken(token, this.getBookingSecret());
    const company = await this.companies.findById(payload.company_id);
    if (!company) throw new NotFoundException('Company not found');

    const { appointment, call } = await this.loadCallAndAppointment(payload.company_id, payload.call_id);
    if (!appointment) throw new NotFoundException('Appointment not found for this booking link');
    if (this.isAppointmentExpired(appointment)) {
      throw new BadRequestException('This booking link has expired.');
    }

    const address = this.resolveAddressInput(dto as any);
    const phone = dto.phone_number ? asE164(dto.phone_number) : undefined;
    const custom = dto.custom_fields ?? {};
    const customNotes = Object.entries(custom)
      .filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== '')
      .map(([k, v]) => `${titleize(k)}: ${String(v).trim()}`)
      .join('\n');

    const updated = await this.appointments.updateAppointment(company.company_id, appointment.appointment_id, {
      contact_name: dto.full_name?.trim() || undefined,
      contact_email: dto.email?.trim() || undefined,
      contact_phone: phone,
      address: address.street || address.city || address.state || address.zip ? address : undefined,
      notes: customNotes || undefined,
    });

    if (appointment?.contact_id) {
      try {
        const addressLine = address.street || address.city || address.state || address.zip
          ? [address.street, address.city, address.state, address.zip].filter(Boolean).join(', ')
          : undefined;
        await this.dynamodb.update(
          'contacts',
          { company_id: company.company_id, contact_id: appointment.contact_id },
          {
            ...(dto.full_name?.trim() ? { name: dto.full_name.trim() } : {}),
            ...(dto.full_name?.trim() ? { first_name: dto.full_name.trim().split(/\s+/)[0] } : {}),
            ...(dto.full_name?.trim() ? { last_name: dto.full_name.trim().split(/\s+/).slice(1).join(' ') } : {}),
            ...(phone ? { phone_number: phone, phone } : {}),
            ...(dto.email?.trim() ? { email: dto.email.trim() } : {}),
            ...(addressLine ? { address: addressLine } : {}),
            ...(address.zip ? { zipcode: address.zip } : {}),
            last_contact_at: Date.now(),
            updated_at: new Date().toISOString(),
          }
        );
      } catch (err) {
        console.warn('[public_booking] contact update failed', err);
      }
    }

    if (call?.call_id && dto.email?.trim()) {
      await this.dynamodb.update(
        'calls',
        { company_id: company.company_id, call_id: call.call_id },
        { lead_email: dto.email.trim(), updated_at: Date.now() }
      );
    }

    return {
      ok: true,
      appointment_id: appointment.appointment_id,
      appointment: updated,
    };
  }

  async rescheduleBooking(token: string, dto: PublicBookingRescheduleDto) {
    const payload = verifyBookingToken(token, this.getBookingSecret());
    const company = await this.companies.findById(payload.company_id);
    if (!company) throw new NotFoundException('Company not found');

    const { appointment } = await this.loadCallAndAppointment(payload.company_id, payload.call_id);
    if (!appointment) throw new NotFoundException('Appointment not found for this booking link');
    if (this.isAppointmentExpired(appointment)) {
      throw new BadRequestException('This booking link has expired.');
    }

    if (!dto.preferred_date || !dto.preferred_time) {
      throw new BadRequestException('preferred_date and preferred_time are required');
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dto.preferred_date.trim());
    if (!match) {
      throw new BadRequestException('preferred_date must be YYYY-MM-DD');
    }
    const { hour, minute } = parseHHmm(dto.preferred_time.trim());
    const [year, month, day] = match.slice(1).map((n) => parseInt(n, 10));
    const timeZone = this.resolveCompanyTimeZone(company);
    const startMs = zonedTimeToUtcMs({ year, month, day, hour, minute }, timeZone);
    const durationMs = appointment.scheduled_end - appointment.scheduled_start;
    const endMs = startMs + durationMs;

    const startIso = new Date(startMs).toISOString();
    const endIso = new Date(endMs).toISOString();
    const slots = await this.scheduling.getAvailability(company, startIso, endIso);
    const exact = slots.find((s) => Date.parse(s.start_time) === startMs);
    if (!exact) {
      const dayStart = zonedTimeToUtcMs({ year, month, day, hour: 8, minute: 0 }, timeZone);
      const dayEnd = zonedTimeToUtcMs({ year, month, day, hour: 18, minute: 0 }, timeZone);
      const daySlots = await this.scheduling.getAvailability(
        company,
        new Date(dayStart).toISOString(),
        new Date(dayEnd).toISOString()
      );
      const suggestions = daySlots.slice(0, 5).map((s) => formatSlotLabel(s.start_time, timeZone));
      throw new BadRequestException(
        suggestions.length
          ? `That time is no longer available. Try: ${suggestions.join(', ')}.`
          : 'That time is no longer available. Please pick another time.'
      );
    }

    const updated = await this.appointments.updateAppointment(company.company_id, appointment.appointment_id, {
      scheduled_start: startMs,
      scheduled_end: endMs,
    });

    return {
      ok: true,
      appointment_id: appointment.appointment_id,
      start_time: startIso,
      end_time: endIso,
      appointment: updated,
    };
  }

  async getBookingAvailability(token: string, dto: { start_date?: string; end_date?: string }) {
    const payload = verifyBookingToken(token, this.getBookingSecret());
    const company = await this.companies.findById(payload.company_id);
    if (!company) throw new NotFoundException('Company not found');

    const timeZone = this.resolveCompanyTimeZone(company);
    const now = new Date();
    const todayLocal = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    const startInput = dto.start_date?.trim() || todayLocal;
    const endInput = dto.end_date?.trim();

    const startParts = parseYmd(startInput);
    if (!startParts) throw new BadRequestException('start_date must be YYYY-MM-DD');
    const endParts = endInput ? parseYmd(endInput) : null;
    if (endInput && !endParts) throw new BadRequestException('end_date must be YYYY-MM-DD');

    const startMs = zonedTimeToUtcMs({ ...startParts, hour: 0, minute: 0 }, timeZone);
    const endMs = endParts
      ? zonedTimeToUtcMs({ ...endParts, hour: 23, minute: 59 }, timeZone)
      : startMs + 30 * 24 * 60 * 60 * 1000;

    const daysCount = Math.ceil((endMs - startMs) / (24 * 60 * 60 * 1000)) + 1;
    if (daysCount > 31) {
      throw new BadRequestException('Availability range is too large (max 31 days).');
    }

    const days: Array<{ date: string; available: boolean; slots: string[]; readable_slots: string[] }> = [];
    for (let i = 0; i < daysCount; i++) {
      const dayStartMs = startMs + i * 24 * 60 * 60 * 1000;
      const dayKey = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(dayStartMs));
      const parsed = parseYmd(dayKey);
      if (!parsed) continue;
      const windowStart = zonedTimeToUtcMs({ ...parsed, hour: 0, minute: 0 }, timeZone);
      const windowEnd = zonedTimeToUtcMs({ ...parsed, hour: 23, minute: 59 }, timeZone);
      const slots = await this.scheduling.getAvailability(
        company,
        new Date(windowStart).toISOString(),
        new Date(windowEnd).toISOString()
      );
      const slotTimes = slots.map((s) => s.start_time);
      days.push({
        date: dayKey,
        available: slotTimes.length > 0,
        slots: slotTimes,
        readable_slots: slotTimes.slice(0, 12).map((s) => formatSlotLabel(s, timeZone)),
      });
    }

    return { ok: true, timezone: timeZone, days };
  }

  async cancelBooking(token: string, dto: PublicBookingCancelDto) {
    const payload = verifyBookingToken(token, this.getBookingSecret());
    const company = await this.companies.findById(payload.company_id);
    if (!company) throw new NotFoundException('Company not found');

    const { appointment } = await this.loadCallAndAppointment(payload.company_id, payload.call_id);
    if (!appointment) throw new NotFoundException('Appointment not found for this booking link');
    if (this.isAppointmentExpired(appointment)) {
      throw new BadRequestException('This booking link has expired.');
    }

    await this.appointments.cancelAppointment(company.company_id, appointment.appointment_id);

    if (dto.reason) {
      await this.dynamodb.update(
        'appointments',
        { company_id: company.company_id, appointment_id: appointment.appointment_id },
        { notes: `Cancellation reason: ${dto.reason}. Updated at: ${new Date().toISOString()}` }
      );
    }

    return {
      ok: true,
      appointment_id: appointment.appointment_id,
    };
  }
}
