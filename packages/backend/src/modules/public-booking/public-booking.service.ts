import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CompaniesService } from '../companies/companies.service';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { UsageService } from '../billing/usage.service';
import { parseHHmm, zonedTimeToUtcMs } from '../scheduling/timezone';
import { PublicBookingRequestDto } from './dto/public-booking.dto';
import { sendTwilioSms } from './sms.util';
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

@Injectable()
export class PublicBookingService {
  constructor(
    private readonly config: ConfigService,
    private readonly companies: CompaniesService,
    private readonly dynamodb: DynamoDBService,
    private readonly scheduling: SchedulingService,
    private readonly appointments: AppointmentsService,
    private readonly usage: UsageService,
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
    const serviceZips = (company as any).service_area_zipcodes ?? [];
    if (serviceZips.length && (address.zip || dto.zip)) {
      const checkZip = (address.zip || dto.zip || '').trim();
      if (checkZip && !serviceZips.includes(checkZip)) {
        throw new BadRequestException(`Sorry, we don't service zipcode ${checkZip}.`);
      }
    }
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

    const call = await this.dynamodb.get('calls', { company_id: payload.company_id, call_id: payload.call_id });
    const phone = typeof call?.from_number === 'string' ? call.from_number : undefined;
    const template = await this.loadTemplate(payload.company_id);
    const fields = this.extractRequiredFields(template);

    return {
      ok: true,
      company_id: company.company_id,
      company_name: company.company_name,
      service_type: company.service_type,
      timezone: company.timezone,
      phone_number: phone,
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

    const call = await this.dynamodb.get('calls', { company_id: payload.company_id, call_id: payload.call_id });

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
    const timeZone = company.timezone || 'UTC';
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

    const appointment = await this.appointments.createAppointment(company.company_id, {
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
          appointment_id: appointment?.appointment_id,
          outcome: 'APPOINTMENT_BOOKED',
          lead_captured: true,
          updated_at: Date.now(),
        }
      );
    }

    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    const fromNumber = typeof call?.to_number === 'string' ? call.to_number : undefined;
    if (accountSid && authToken && fromNumber) {
      const label = formatSlotLabel(startIso, timeZone);
      const body = `You're confirmed with ${company.company_name} for ${label}. Reply if you have questions.`;
      try {
        await sendTwilioSms({ accountSid, authToken, from: fromNumber, to: phone, body });
        await this.usage.incrementSmsCount(company.company_id);
      } catch (err) {
        console.warn('[public-booking] failed to send confirmation SMS', err);
      }
    }

    return {
      ok: true,
      appointment_id: appointment?.appointment_id,
      start_time: startIso,
      end_time: endIso,
    };
  }
}
