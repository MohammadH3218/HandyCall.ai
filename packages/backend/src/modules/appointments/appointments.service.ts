import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '@nestjs/common';
import {
  Appointment,
  AppointmentCancellationInfo,
  AppointmentCancellationPolicy,
  AppointmentStatus,
  Company,
} from '@handycall/shared';
import { CalendarIntegrationService } from '../calendar-integration/calendar-integration.service';
import { ConfigService } from '@nestjs/config';
import { WebhooksService } from '../webhooks/webhooks.service';
import { FollowUpSequencesService } from '../follow-up-sequences/follow-up-sequences.service';
import { CompaniesService } from '../companies/companies.service';

function asE164(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return trimmed;
  return `+${digits}`;
}

function normalizeEmail(input?: string) {
  const value = String(input || '').trim().toLowerCase();
  return value || undefined;
}

@Injectable()
export class AppointmentsService {
  constructor(
    private dynamodb: DynamoDBService,
    @Inject(forwardRef(() => CalendarIntegrationService))
    private calendarIntegration: CalendarIntegrationService,
    private configService: ConfigService,
    private webhooks: WebhooksService,
    private followUps: FollowUpSequencesService,
    private companiesService: CompaniesService,
  ) {}

  getAppointmentCancellationPolicy(company: Partial<Company> | null | undefined): AppointmentCancellationPolicy {
    const raw = company?.appointment_cancellation_policy as AppointmentCancellationPolicy | undefined;
    const mode = raw?.mode || 'ANYTIME';
    if (mode === 'BEFORE_HOURS') {
      return {
        mode,
        window_hours: Math.max(1, Number(raw?.window_hours || 24)),
      };
    }
    if (mode === 'NO_CANCELLATIONS') {
      return { mode };
    }
    return { mode: 'ANYTIME' };
  }

  getAppointmentCancellationInfo(
    company: Partial<Company> | null | undefined,
    appointment: Partial<Appointment> | null | undefined,
    now = Date.now(),
  ): AppointmentCancellationInfo {
    const policy = this.getAppointmentCancellationPolicy(company);
    const startAt = Number(appointment?.scheduled_start || 0);
    const status = String(appointment?.status || '').toUpperCase();

    if (status === AppointmentStatus.CANCELLED) {
      return {
        can_cancel: false,
        policy_mode: policy.mode,
        policy_hours: policy.window_hours,
        reason_code: 'ALREADY_CANCELLED',
        message: 'This appointment has already been cancelled.',
      };
    }

    if (status === AppointmentStatus.COMPLETED || status === AppointmentStatus.NO_SHOW) {
      return {
        can_cancel: false,
        policy_mode: policy.mode,
        policy_hours: policy.window_hours,
        reason_code: 'ALREADY_COMPLETED',
        message: 'Completed appointments cannot be cancelled.',
      };
    }

    if (startAt && now >= startAt) {
      return {
        can_cancel: false,
        policy_mode: policy.mode,
        policy_hours: policy.window_hours,
        reason_code: 'ALREADY_STARTED',
        message: 'This appointment has already started or passed.',
      };
    }

    if (policy.mode === 'NO_CANCELLATIONS') {
      return {
        can_cancel: false,
        policy_mode: policy.mode,
        reason_code: 'NO_CANCELLATIONS',
        message: 'This pro does not allow self-service appointment cancellations.',
      };
    }

    if (policy.mode === 'BEFORE_HOURS') {
      const hours = Math.max(1, Number(policy.window_hours || 24));
      const cutoffAt = startAt - hours * 60 * 60 * 1000;
      if (now > cutoffAt) {
        return {
          can_cancel: false,
          policy_mode: policy.mode,
          policy_hours: hours,
          cutoff_at: cutoffAt,
          reason_code: 'WINDOW_PASSED',
          message: `Cancellations must be made at least ${hours} hour${hours === 1 ? '' : 's'} before the appointment.`,
        };
      }

      return {
        can_cancel: true,
        policy_mode: policy.mode,
        policy_hours: hours,
        cutoff_at: cutoffAt,
        reason_code: 'ALLOWED',
        message: `You can cancel up to ${hours} hour${hours === 1 ? '' : 's'} before the appointment.`,
      };
    }

    return {
      can_cancel: true,
      policy_mode: policy.mode,
      reason_code: 'ALLOWED',
      message: 'You can cancel this appointment any time before it starts.',
    };
  }

  private getAddressValidationKey(): string | null {
    return (
      this.configService.get<string>('GOOGLE_ADDRESS_VALIDATION_API_KEY') ||
      this.configService.get<string>('GOOGLE_MAPS_API_KEY') ||
      null
    );
  }

  private normalizeAddressLine(address: { street?: string; street2?: string; city?: string; state?: string; zip?: string }) {
    const line = [address.street, address.street2, address.city && address.state ? `${address.city}, ${address.state} ${address.zip || ''}` : undefined]
      .filter(Boolean)
      .join(', ')
      .replace(/\s+/g, ' ')
      .trim();
    return line;
  }

  private async verifyAndNormalizeAddress(address: { street?: string; street2?: string; city?: string; state?: string; zip?: string }) {
    const apiKey = this.getAddressValidationKey();
    if (!apiKey) return null;
    if (!address?.street || !address?.city || !address?.state || !address?.zip) return null;

    const line = this.normalizeAddressLine(address);
    if (!line) return null;

    const url = `https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: {
          regionCode: 'US',
          addressLines: [line],
        },
        enableUspsCass: true,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn('[address] validation failed', res.status, text);
      return null;
    }

    const data: any = await res.json();
    const result = data?.result;
    const verdict = result?.verdict;
    const postal = result?.address?.postalAddress;
    if (!postal) return null;

    let confidence = 0.5;
    if (verdict?.addressComplete) confidence += 0.35;
    if (verdict?.hasInferredComponents) confidence -= 0.1;
    if (verdict?.hasUnconfirmedComponents) confidence -= 0.15;
    confidence = Math.max(0, Math.min(1, confidence));

    const normalized = {
      street1: postal?.addressLines?.[0] ?? address.street,
      street2: postal?.addressLines?.[1] ?? address.street2,
      city: postal?.locality ?? address.city,
      state: postal?.administrativeArea ?? address.state,
      zip: postal?.postalCode ?? address.zip,
    };

    const formatted = [
      [normalized.street1, normalized.street2].filter(Boolean).join(', '),
      `${normalized.city}, ${normalized.state} ${normalized.zip}`.trim(),
    ]
      .filter(Boolean)
      .join(', ');

    const changes: string[] = [];
    const raw = {
      street1: address.street || '',
      street2: address.street2 || '',
      city: address.city || '',
      state: address.state || '',
      zip: address.zip || '',
    };
    (['street1', 'street2', 'city', 'state', 'zip'] as const).forEach((key) => {
      const before = String(raw[key] || '').trim().toLowerCase();
      const after = String((normalized as any)[key] || '').trim().toLowerCase();
      if (before && after && before !== after) {
        changes.push(`${key}: ${raw[key]} -> ${(normalized as any)[key]}`);
      }
    });

    let status: 'verified' | 'corrected' | 'needs_review' = 'needs_review';
    if (confidence >= 0.85) {
      status = changes.length ? 'corrected' : 'verified';
    }

    const location = result?.geocode?.location;
    const lat = typeof location?.latitude === 'number' ? location.latitude : undefined;
    const lng = typeof location?.longitude === 'number' ? location.longitude : undefined;

    return {
      normalized,
      formatted,
      confidence,
      status,
      changes,
      lat,
      lng,
    };
  }

  private async persistAddressNormalization(
    companyId: string,
    appointmentId: string,
    address: { street?: string; city?: string; state?: string; zip?: string }
  ) {
    try {
      const normalized = await this.verifyAndNormalizeAddress({
        street: address?.street,
        city: address?.city,
        state: address?.state,
        zip: address?.zip,
      });
      if (!normalized) return;
      await this.dynamodb.update(
        'appointments',
        { company_id: companyId, appointment_id: appointmentId },
        {
          address_raw: address,
          address_normalized: normalized.normalized,
          address_formatted: normalized.formatted,
          address_confidence: normalized.confidence,
          address_status: normalized.status,
          address_changes: normalized.changes,
          ...(typeof normalized.lat === 'number' ? { address_lat: normalized.lat } : {}),
          ...(typeof normalized.lng === 'number' ? { address_lng: normalized.lng } : {}),
        }
      );
    } catch (err: any) {
      console.warn('[address] normalization error', err?.message ?? String(err));
    }
  }

  private async findOrCreateContactId(
    companyId: string,
    input: { contact_name?: string; contact_email?: string; contact_phone?: string; notes?: string; address?: { street?: string; city?: string; state?: string; zip?: string } }
  ): Promise<string | undefined> {
    const phone = asE164(input.contact_phone || '');
    if (!phone) return undefined;

    const existing = await this.dynamodb.scan('contacts', {
      filterExpression: '#company_id = :company_id AND (#phone_number = :phone OR #phone = :phone)',
      expressionAttributeNames: {
        '#company_id': 'company_id',
        '#phone_number': 'phone_number',
        '#phone': 'phone',
      },
      expressionAttributeValues: { ':company_id': companyId, ':phone': phone },
      limit: 1,
    });

    const contact = existing.items?.[0] as any;
    if (contact?.contact_id) {
      const nowIso = new Date().toISOString();
      const name = input.contact_name?.trim();
      const [first, ...rest] = name ? name.split(/\s+/) : [];
      const last = rest.length ? rest.join(' ') : undefined;
      const addressLine = input.address
        ? [input.address.street, input.address.city, input.address.state, input.address.zip].filter(Boolean).join(', ')
        : undefined;
      await this.dynamodb.update(
        'contacts',
        { company_id: companyId, contact_id: contact.contact_id },
        {
          ...(name && { name }),
          ...(first && { first_name: first }),
          ...(last && { last_name: last }),
          ...(phone && { phone, phone_number: phone }),
          ...(input.contact_email && { email: normalizeEmail(input.contact_email) }),
          ...(addressLine && { address: addressLine }),
          ...(input.address?.zip && { zipcode: input.address.zip }),
          updated_at: nowIso,
          last_contact_at: Date.now(),
        }
      );
      return contact.contact_id as string;
    }

    const nowIso = new Date().toISOString();
    const contact_id = uuidv4();
    const name = input.contact_name?.trim();
    const [first, ...rest] = name ? name.split(/\s+/) : [];
    const last = rest.length ? rest.join(' ') : undefined;
    const addressLine = input.address
      ? [input.address.street, input.address.city, input.address.state, input.address.zip].filter(Boolean).join(', ')
      : undefined;
    await this.dynamodb.put('contacts', {
      contact_id,
      company_id: companyId,
      name: name || phone,
      phone,
      phone_number: phone,
      first_name: first || undefined,
      last_name: last || undefined,
      email: normalizeEmail(input.contact_email),
      address: addressLine,
      zipcode: input.address?.zip || undefined,
      source: 'MANUAL',
      tags: [],
      notes: input.notes,
      created_at: nowIso,
      updated_at: nowIso,
      total_calls: 0,
    });

    return contact_id;
  }

  private addMonthsUtc(date: Date, months: number): Date {
    const d = new Date(date.getTime());
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    const day = d.getUTCDate();

    const next = new Date(Date.UTC(year, month + months, 1, d.getUTCHours(), d.getUTCMinutes(), 0, 0));
    const daysInTargetMonth = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(day, daysInTargetMonth));
    return next;
  }

  private generateRecurrenceStarts(
    firstStart: number,
    recurrence: { frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'; interval?: number; count?: number; until?: number }
  ): number[] {
    const interval = Math.max(1, Math.floor(recurrence.interval ?? 1));
    const maxCount = Math.min(200, Math.max(1, Math.floor(recurrence.count ?? 1)));
    const until = typeof recurrence.until === 'number' ? recurrence.until : undefined;

    const starts: number[] = [];
    let current = new Date(firstStart);
    for (let i = 0; i < maxCount; i++) {
      const ms = current.getTime();
      if (until && ms > until) break;
      starts.push(ms);

      if (recurrence.frequency === 'DAILY') {
        current = new Date(ms + interval * 24 * 60 * 60 * 1000);
      } else if (recurrence.frequency === 'WEEKLY') {
        current = new Date(ms + interval * 7 * 24 * 60 * 60 * 1000);
      } else {
        current = this.addMonthsUtc(current, interval);
      }
    }

    return starts;
  }

  async listAppointments(
    companyId: string,
    options?: { limit?: number; lastEvaluatedKey?: any }
  ): Promise<{ appointments: any[]; lastEvaluatedKey?: any }> {
    try {
      const result = await this.dynamodb.queryByCompany(
        'appointments',
        companyId,
        {},
        {
          indexName: 'date-index',
          limit: options?.limit || 50,
          scanIndexForward: true, // upcoming first
          exclusiveStartKey: options?.lastEvaluatedKey,
        }
      );

      return { appointments: result.items || [], lastEvaluatedKey: result.lastEvaluatedKey };
    } catch (error) {
      // Fallback to scan if GSI doesn't exist in this environment
      const scan = await this.dynamodb.scan('appointments', {
        filterExpression: '#company_id = :company_id',
        expressionAttributeNames: { '#company_id': 'company_id' },
        expressionAttributeValues: { ':company_id': companyId },
        limit: options?.limit || 50,
        exclusiveStartKey: options?.lastEvaluatedKey,
      });
      return { appointments: scan.items || [], lastEvaluatedKey: scan.lastEvaluatedKey };
    }
  }

  async getAppointment(companyId: string, appointmentId: string): Promise<any> {
    const appt = await this.dynamodb.get('appointments', {
      company_id: companyId,
      appointment_id: appointmentId,
    });

    if (!appt) {
      throw new NotFoundException('Appointment not found');
    }

    return appt;
  }

  async listAppointmentsInRange(companyId: string, startMs: number, endMs: number): Promise<any[]> {
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      throw new BadRequestException('Invalid start/end');
    }

    try {
      const result = await this.dynamodb.queryByCompany(
        'appointments',
        companyId,
        {
          keyCondition: '#scheduled_start BETWEEN :start AND :end',
          expressionAttributeNames: { '#scheduled_start': 'scheduled_start' },
          expressionAttributeValues: { ':start': startMs, ':end': endMs },
        },
        {
          indexName: 'date-index',
          scanIndexForward: true,
          limit: 500,
        }
      );
      return result.items || [];
    } catch {
      const scan = await this.dynamodb.scan('appointments', {
        filterExpression: '#company_id = :company_id AND #scheduled_start BETWEEN :start AND :end',
        expressionAttributeNames: { '#company_id': 'company_id', '#scheduled_start': 'scheduled_start' },
        expressionAttributeValues: { ':company_id': companyId, ':start': startMs, ':end': endMs },
        limit: 500,
      });
      return scan.items || [];
    }
  }

  async createAppointment(
    companyId: string,
    input: {
      scheduled_start: number;
      scheduled_end: number;
      contact_name?: string;
      contact_email?: string;
      contact_phone?: string;
      service_type?: string;
      notes?: string;
      address?: { street?: string; city?: string; state?: string; zip?: string };
      price_cents?: number;
      currency?: string;
      recurrence?: {
        frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
        interval?: number;
        count?: number;
        until?: number;
      };
      created_by?: string;
      status?: AppointmentStatus;
    }
  ) {
    if (!Number.isFinite(input.scheduled_start) || !Number.isFinite(input.scheduled_end)) {
      throw new BadRequestException('scheduled_start and scheduled_end are required');
    }
    if (input.scheduled_end <= input.scheduled_start) {
      throw new BadRequestException('scheduled_end must be after scheduled_start');
    }

    const now = Date.now();

    const contact_id = await this.findOrCreateContactId(companyId, {
      contact_name: input.contact_name,
      contact_email: input.contact_email,
      contact_phone: input.contact_phone,
      notes: input.notes,
      address: input.address,
    });

    const base = {
      company_id: companyId,
      company_contact: `${companyId}#${contact_id}`,
      status: input.status ?? AppointmentStatus.SCHEDULED,
      service_type: input.service_type ?? 'Service',
      contact_id,
      contact_name: input.contact_name,
      contact_email: normalizeEmail(input.contact_email),
      contact_phone: input.contact_phone,
      address: input.address,
      ...(input.address ? { address_raw: input.address } : {}),
      notes: input.notes,
      price_cents: typeof input.price_cents === 'number' ? input.price_cents : undefined,
      currency: input.currency ?? undefined,
      created_by: input.created_by ?? 'USER',
      confirmed: true,
      created_at: now,
      updated_at: now,
    };

    if (input.recurrence) {
      const series_id = uuidv4();
      const masterId = uuidv4();

      const master = {
        ...base,
        appointment_id: masterId,
        scheduled_start: input.scheduled_start,
        scheduled_end: input.scheduled_end,
        series_id,
        is_series_master: true,
        recurrence: input.recurrence,
      };
      await this.dynamodb.put('appointments', master);

      const durationMs = input.scheduled_end - input.scheduled_start;
      const starts = this.generateRecurrenceStarts(input.scheduled_start, input.recurrence);
      const occurrences = starts.map((start, idx) => {
        const appointment_id = uuidv4();
        return {
          ...base,
          appointment_id,
          scheduled_start: start,
          scheduled_end: start + durationMs,
          series_id,
          is_series_master: false,
          occurrence_index: idx,
        };
      });

      // First occurrence duplicates the master's time window but is the entry shown on the calendar.
      for (const occ of occurrences) {
        await this.dynamodb.put('appointments', occ);
      }

      void this.webhooks.emitEvent(companyId, 'appointment.created', {
        appointment: master,
        occurrences: occurrences.length,
      });

      return { ...master, created_occurrences: occurrences.length };
    }

    const appointment_id = uuidv4();
    const appointment = {
      ...base,
      appointment_id,
      scheduled_start: input.scheduled_start,
      scheduled_end: input.scheduled_end,
    };

    await this.dynamodb.put('appointments', appointment);

    void this.webhooks.emitEvent(companyId, 'appointment.created', { appointment });

    if (input.address) {
      void this.persistAddressNormalization(companyId, appointment_id, input.address);
    }

    // Sync to external calendar only if the appointment is confirmed (not pending acceptance)
    if (appointment.status !== AppointmentStatus.PENDING_ACCEPTANCE) {
      try {
        await this.calendarIntegration.pushEventToExternalCalendar(companyId, appointment);
      } catch (err) {
        console.error('Error syncing appointment to external calendar:', err);
        // Don't fail appointment creation if sync fails
      }
    }

    return appointment;
  }

  async updateAppointment(
    companyId: string,
    appointmentId: string,
    input: {
      scheduled_start?: number;
      scheduled_end?: number;
      contact_name?: string;
      contact_email?: string;
      contact_phone?: string;
      service_type?: string;
      notes?: string;
      address?: { street?: string; city?: string; state?: string; zip?: string };
      price_cents?: number;
      currency?: string;
      status?: string;
    }
  ) {
    const appt = await this.getAppointment(companyId, appointmentId);
    const now = Date.now();

    const updateFields: any = {
      updated_at: now,
    };

    if (input.scheduled_start !== undefined) updateFields.scheduled_start = input.scheduled_start;
    if (input.scheduled_end !== undefined) updateFields.scheduled_end = input.scheduled_end;
    if (input.contact_name !== undefined) updateFields.contact_name = input.contact_name;
    if (input.contact_email !== undefined) updateFields.contact_email = normalizeEmail(input.contact_email);
    if (input.contact_phone !== undefined) updateFields.contact_phone = input.contact_phone;
    if (input.service_type !== undefined) updateFields.service_type = input.service_type;
    if (input.notes !== undefined) updateFields.notes = input.notes;
    if (input.address !== undefined) updateFields.address = input.address;
    if (input.address !== undefined) updateFields.address_raw = input.address;
    if (input.price_cents !== undefined) updateFields.price_cents = input.price_cents;
    if (input.currency !== undefined) updateFields.currency = input.currency;
    if (input.status !== undefined) updateFields.status = input.status;

    const updated = await this.dynamodb.update(
      'appointments',
      { company_id: companyId, appointment_id: appointmentId },
      updateFields
    );

    const updatedAppointment = { ...appt, ...updateFields };

    void this.webhooks.emitEvent(companyId, 'appointment.updated', { appointment: updatedAppointment });

    if (input.address) {
      void this.persistAddressNormalization(companyId, appointmentId, input.address);
    }

    // Sync to external calendar if connected
    try {
      await this.calendarIntegration.updateEventInExternalCalendar(companyId, updatedAppointment);
    } catch (err) {
      console.error('Error syncing updated appointment to external calendar:', err);
      // Don't fail appointment update if sync fails
    }

    const prevStatus = String(appt?.status || '').toUpperCase();
    const nextStatus = String(updatedAppointment?.status || '').toUpperCase();
    if (nextStatus === AppointmentStatus.COMPLETED && prevStatus !== AppointmentStatus.COMPLETED) {
      void this.webhooks.emitEvent(companyId, 'appointment.completed', { appointment: updatedAppointment });
      void this.followUps
        .scheduleReviewRequest({
          company_id: companyId,
          contact_id: updatedAppointment?.contact_id,
          contact_phone: updatedAppointment?.contact_phone,
          contact_name: updatedAppointment?.contact_name,
          appointment_id: appointmentId,
        })
        .catch((err) => {
          console.warn('[AppointmentsService] Failed to schedule review request:', err);
        });
    }

    return updated ?? updatedAppointment;
  }

  async cancelAppointment(companyId: string, appointmentId: string) {
    const appt = await this.getAppointment(companyId, appointmentId);
    const now = Date.now();
    const updated = await this.dynamodb.update(
      'appointments',
      { company_id: companyId, appointment_id: appointmentId },
      { status: AppointmentStatus.CANCELLED, updated_at: now }
    );
    const cancelled = updated ?? { ...appt, status: AppointmentStatus.CANCELLED, updated_at: now };
    void this.webhooks.emitEvent(companyId, 'appointment.cancelled', { appointment: cancelled });
    return cancelled;
  }

  async listAppointmentsForCustomer(identity: { email?: string; phone?: string }) {
    const email = String(identity.email || '').trim().toLowerCase();
    const phone = identity.phone ? asE164(identity.phone) : '';

    if (!email && !phone) {
      return [];
    }

    const filterParts: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (email) {
      filterParts.push('#contact_email = :contact_email');
      expressionAttributeNames['#contact_email'] = 'contact_email';
      expressionAttributeValues[':contact_email'] = email;
    }

    if (phone) {
      filterParts.push('#contact_phone = :contact_phone');
      expressionAttributeNames['#contact_phone'] = 'contact_phone';
      expressionAttributeValues[':contact_phone'] = phone;
    }

    const matches: any[] = [];
    let lastEvaluatedKey: Record<string, any> | undefined;

    do {
      const result = await this.dynamodb.scan('appointments', {
        filterExpression: filterParts.join(' OR '),
        expressionAttributeNames,
        expressionAttributeValues,
        exclusiveStartKey: lastEvaluatedKey,
      });
      matches.push(...(result.items || []));
      lastEvaluatedKey = result.lastEvaluatedKey;
    } while (lastEvaluatedKey);

    const deduped = Array.from(
      new Map(
        matches.map((item: any) => [`${item.company_id}:${item.appointment_id}`, item]),
      ).values(),
    ) as Appointment[];

    const companyIds = Array.from(new Set(deduped.map((item) => item.company_id).filter(Boolean)));
    const companyEntries = await Promise.all(
      companyIds.map(async (companyId) => [companyId, await this.companiesService.findById(companyId)] as const),
    );
    const companiesById = new Map(companyEntries);

    return deduped
      .sort((a, b) => Number(b.scheduled_start || 0) - Number(a.scheduled_start || 0))
      .map((appointment) => {
        const company = companiesById.get(appointment.company_id) || null;
        return {
          ...appointment,
          company_name: company?.company_name || 'HandyCall Pro',
          company_service_type: company?.service_type || null,
          cancellation: this.getAppointmentCancellationInfo(company, appointment),
        };
      });
  }

  async cancelAppointmentAsCustomer(
    identity: { email?: string; phone?: string },
    appointmentId: string,
    reason?: string,
  ) {
    const appointments = await this.listAppointmentsForCustomer(identity);
    const appointment = appointments.find((item: any) => item?.appointment_id === appointmentId);
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const company = await this.companiesService.findById(appointment.company_id);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const cancellation = this.getAppointmentCancellationInfo(company, appointment);
    if (!cancellation.can_cancel) {
      throw new BadRequestException(cancellation.message);
    }

    const cancelled = await this.cancelAppointment(appointment.company_id, appointmentId);

    if (reason) {
      const existingNotes = String((appointment as any)?.notes || '').trim();
      const nextNotes = [existingNotes, `Cancellation reason: ${reason}`, `Updated at: ${new Date().toISOString()}`]
        .filter(Boolean)
        .join('\n');
      await this.dynamodb.update(
        'appointments',
        { company_id: appointment.company_id, appointment_id: appointmentId },
        { notes: nextNotes },
      );
      return {
        ...cancelled,
        notes: nextNotes,
      };
    }

    return cancelled;
  }

  async deleteAppointment(companyId: string, appointmentId: string) {
    const appt = await this.getAppointment(companyId, appointmentId);

    // Delete from external calendar if connected
    try {
      await this.calendarIntegration.deleteEventFromExternalCalendar(companyId, appt);
    } catch (err) {
      console.error('Error deleting appointment from external calendar:', err);
      // Don't fail appointment deletion if sync fails
    }

    // Delete from database
    await this.dynamodb.delete('appointments', {
      company_id: companyId,
      appointment_id: appointmentId,
    });

    return { deleted: true, appointment_id: appointmentId };
  }
}
