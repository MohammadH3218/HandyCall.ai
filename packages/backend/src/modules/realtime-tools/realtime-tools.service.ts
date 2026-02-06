import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CompaniesService } from '../companies/companies.service';
import { resolveServiceTemplateId } from '../companies/service-template-map';
import { AgentConfigService } from '../agent-config/agent-config.service';
import { CompanyNumbersService } from '../company-numbers/company-numbers.service';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { S3Service } from '../../infrastructure/storage/s3.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { UsageService } from '../billing/usage.service';
import { getLocalDateParts, getWeekdayKey, zonedTimeToUtcMs } from '../scheduling/timezone';
import * as chrono from 'chrono-node';
import { AppointmentsService } from '../appointments/appointments.service';
import {
  Call,
  CallDirection,
  CallStatus,
  Contact,
  ContactSource,
  LeadStatus,
  AppointmentStatus,
  CompanyStatus,
} from '@handycall/shared';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { GetAvailabilityDto } from './dto/get-availability.dto';
import { KnowledgeSearchDto } from './dto/knowledge-search.dto';
import { SaveCallDto } from './dto/save-call.dto';
import { ConfigService } from '@nestjs/config';
import { SaveRecordingDto } from './dto/save-recording.dto';
import { signBookingToken } from '../public-booking/booking-link.util';
import { sendSesEmail } from '../public-booking/email.util';
import { renderHandycallEmail } from '../../common/email-templates';
import { isValidEmail } from '@handycall/shared';

function asE164(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return trimmed;
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

@Injectable()
export class RealtimeToolsService {
  constructor(
    private readonly config: ConfigService,
    private readonly companies: CompaniesService,
    private readonly agentConfig: AgentConfigService,
    private readonly companyNumbers: CompanyNumbersService,
    private readonly dynamodb: DynamoDBService,
    private readonly s3: S3Service,
    private readonly knowledge: KnowledgeService,
    private readonly scheduling: SchedulingService,
    private readonly usageService: UsageService,
    private readonly appointmentsService: AppointmentsService,
  ) { }

  private twilioAuthHeader(): string {
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN');
    if (!sid || !token) {
      throw new Error('Missing TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN');
    }
    const basic = Buffer.from(`${sid}:${token}`, 'utf8').toString('base64');
    return `Basic ${basic}`;
  }

  private getBookingSecret(): string {
    const secret =
      this.config.get<string>('BOOKING_LINK_SECRET') || this.config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('Missing BOOKING_LINK_SECRET/JWT_SECRET');
    return secret;
  }

  private getFrontendBaseUrl(): string {
    return (this.config.get<string>('FRONTEND_URL') || 'https://handycall.org').replace(/\/$/, '');
  }

  private resolveCompanyTimeZone(company: any, fallback = 'UTC'): string {
    const candidate =
      company?.calendar_connection?.timezone ||
      company?.calendar_connection?.timeZone ||
      company?.timezone ||
      fallback;
    return candidate || fallback;
  }

  private pad2(n: number): string {
    return String(n).padStart(2, '0');
  }

  private findOverrideForDate(company: any, ymd: string): any | undefined {
    const overrides = company?.schedule_overrides;
    if (!overrides) return undefined;

    if (Array.isArray(overrides)) {
      return overrides.find((o) => o?.date === ymd);
    }

    if (typeof overrides === 'object') {
      return overrides[ymd];
    }

    return undefined;
  }

  private getScheduleForDay(company: any, weekdayKey: string): any | undefined {
    const hours: any = company?.business_hours || {};
    const direct = hours?.[weekdayKey];
    if (direct) return direct;
    const shortMap: Record<string, string> = {
      monday: 'mon',
      tuesday: 'tue',
      wednesday: 'wed',
      thursday: 'thu',
      friday: 'fri',
      saturday: 'sat',
      sunday: 'sun',
    };
    const shortKey = shortMap[weekdayKey];
    return shortKey ? hours?.[shortKey] : undefined;
  }

  private normalizeSegments(schedule?: any): Array<{ open: string; close: string }> {
    if (!schedule || schedule?.closed) return [];
    const segs = Array.isArray(schedule?.segments) ? schedule.segments : [];
    if (segs.length) return segs.filter((s: any) => s?.open && s?.close);
    const open = schedule?.open;
    const close = schedule?.close;
    if (open && close) return [{ open, close }];
    return [];
  }

  private getClosedInfo(company: any, target: Date, timeZone: string): { closed: boolean; dayLabel: string } {
    const parts = getLocalDateParts(target, timeZone);
    const ymdKey = `${parts.year}-${this.pad2(parts.month)}-${this.pad2(parts.day)}`;
    const override = this.findOverrideForDate(company, ymdKey);
    const pivotUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
    const weekdayKey = getWeekdayKey(pivotUtc, timeZone);
    const schedule = override ?? this.getScheduleForDay(company, weekdayKey);
    const segments = this.normalizeSegments(schedule);
    const closed = Boolean(override?.closed) || segments.length === 0;
    const dayLabel = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' }).format(target);
    return { closed, dayLabel };
  }

  private buildBookingLink(companyId: string, callId: string): string {
    const expiresMs = Number(this.config.get<string>('BOOKING_LINK_EXPIRES_MS') || 7 * 24 * 60 * 60 * 1000);
    const token = signBookingToken(
      { company_id: companyId, call_id: callId, exp: Date.now() + expiresMs },
      this.getBookingSecret()
    );
    return `${this.getFrontendBaseUrl()}/book/${token}`;
  }

  private buildSummaryFallback(collected: Record<string, any> | undefined): string | undefined {
    if (!collected || typeof collected !== 'object') return undefined;

    const pieces: string[] = [];
    const service = typeof collected.service === 'string' ? collected.service.trim() : '';
    const issue = typeof collected.issue === 'string' ? collected.issue.trim() : '';
    const name = typeof collected.name === 'string' ? collected.name.trim() : '';
    const first = typeof collected.first_name === 'string' ? collected.first_name.trim() : '';
    const last = typeof collected.last_name === 'string' ? collected.last_name.trim() : '';
    const address = typeof collected.address === 'string' ? collected.address.trim() : '';
    const zip = typeof collected.zip === 'string' ? collected.zip.trim() : '';
    const preferred = typeof collected.preferred_time === 'string' ? collected.preferred_time.trim() : '';

    const displayName = name || [first, last].filter(Boolean).join(' ').trim();

    if (service) pieces.push(`Service: ${service}.`);
    if (issue) pieces.push(`Issue: ${issue}.`);
    if (displayName) pieces.push(`Name: ${displayName}.`);
    if (address) pieces.push(`Address: ${address}.`);
    if (zip) pieces.push(`Zip: ${zip}.`);
    if (preferred) pieces.push(`Preferred time: ${preferred}.`);

    const text = pieces.join(' ').trim();
    return text || undefined;
  }

  private extractCollectedInfoFromTranscript(transcript: string): Record<string, any> {
    const out: Record<string, any> = {};
    const t = String(transcript || '');

    const phoneMatches = t.match(/(\+?1[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g);
    if (phoneMatches && phoneMatches.length) {
      const last = phoneMatches[phoneMatches.length - 1];
      const e164 = asE164(last);
      if (e164) out.phone = e164;
    }

    const zipMatches = t.match(/\b\d{5}\b/g);
    if (zipMatches && zipMatches.length) {
      out.zip = zipMatches[zipMatches.length - 1];
    }

    const nameMatch = t.match(/(?:my name is|this is)\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,3})/i);
    if (nameMatch?.[1]) {
      const name = nameMatch[1].trim();
      if (name && name.length <= 60) out.name = name;
    }

    const addressMatch = t.match(
      /(?:address is|my address is|located at)\s+([0-9]{1,6}\s+.+?)(?:[.,]\s+|\s+(?:zip|zipcode)\b|$)/i
    );
    if (addressMatch?.[1]) {
      const address = addressMatch[1].trim();
      if (address && address.length <= 120) out.address = address;
    }

    return out;
  }

  private coerceToUtcIso(input: string, timeZone: string, referenceDate?: Date): string {
    const raw = String(input || '').trim();
    if (!raw) throw new BadRequestException('start_time/end_time is required');

    const msIso = Date.parse(raw);
    if (Number.isFinite(msIso)) {
      return new Date(msIso).toISOString();
    }

    const parsed = chrono.parseDate(raw, referenceDate ?? new Date());
    if (!parsed) {
      throw new BadRequestException(`Unrecognized date/time: ${raw}`);
    }

    // chrono assumes server timezone; reinterpret the parsed Y/M/D/H/M as the tenant timezone and convert to UTC.
    const utcMs = zonedTimeToUtcMs(
      {
        year: parsed.getUTCFullYear(),
        month: parsed.getUTCMonth() + 1,
        day: parsed.getUTCDate(),
        hour: parsed.getUTCHours(),
        minute: parsed.getUTCMinutes(),
      },
      timeZone
    );
    return new Date(utcMs).toISOString();
  }

  private formatSlotForCaller(slotIso: string, timeZone: string): string {
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

  private formatSlotTimeOnly(slotIso: string, timeZone: string): string {
    const date = new Date(slotIso);
    if (!Number.isFinite(date.getTime())) return slotIso;
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    } catch {
      return slotIso;
    }
  }

  private normalizeTimeZone(input: string | undefined, fallback: string): string {
    const candidate = String(input || '').trim();
    const safeFallback = String(fallback || 'UTC').trim() || 'UTC';
    if (!candidate) return safeFallback;
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date());
      return candidate;
    } catch {
      return safeFallback;
    }
  }

  private isGenericSummary(text: string | undefined): boolean {
    const t = (text || '').trim().toLowerCase();
    if (!t) return true;
    const generic = new Set([
      'call ended.',
      'call ended',
      'caller confirmed details and ended the call.',
      'caller confirmed details and ended the call',
    ]);
    return generic.has(t);
  }

  async resolveTenant(toNumberRaw: string) {
    const to_number = asE164(toNumberRaw);
    if (!to_number) throw new BadRequestException('to_number is required');

    const mappedCompanyId = await this.companyNumbers.resolveCompanyIdByDid(to_number);
    const company =
      (mappedCompanyId && (await this.companies.findById(mappedCompanyId))) ||
      (await this.companies.findByConnectPhoneNumber(to_number)) ||
      (await this.companies.findByPhone(to_number));

    if (!company) {
      throw new NotFoundException('No tenant found for this number');
    }

    // Check if calls are enabled for this company
    if (company.calls_enabled === false) {
      throw new ForbiddenException('Calls are disabled for this account. Please check your subscription or usage limits.');
    }

    // Check if company is in a valid status
    if (company.status === CompanyStatus.INACTIVE || company.status === CompanyStatus.SUSPENDED) {
      throw new ForbiddenException('Account is inactive or suspended. Please update your subscription.');
    }

    const config = (await this.agentConfig.getConfig(company.company_id)) ?? undefined;

    let service_template_id =
      (company as any).service_template_id || resolveServiceTemplateId(company.service_type);
    if (!service_template_id) {
      service_template_id = 'tmpl_general_v1';
    }
    let service_template: any = null;
    try {
      service_template = await this.dynamodb.get('service_templates', { template_id: service_template_id });
    } catch {
      service_template = null;
    }
    if (!service_template && service_template_id !== 'tmpl_general_v1') {
      try {
        service_template_id = 'tmpl_general_v1';
        service_template = await this.dynamodb.get('service_templates', { template_id: service_template_id });
      } catch {
        service_template = null;
      }
    }
    if (!(company as any).service_template_id && service_template_id) {
      this.dynamodb
        .update('companies', { company_id: company.company_id }, { service_template_id })
        .catch(() => null);
    }

    return {
      company_id: company.company_id,
      company_name: company.company_name,
      timezone: this.resolveCompanyTimeZone(company),
      service_type: company.service_type,
      service_template_id,
      service_template: service_template || undefined,
      subscription_status: (company as any).subscription_status || 'active',
      calls_enabled: company.calls_enabled !== (false as any),
      business_hours: company.business_hours,
      service_area_zipcodes: (company as any).service_area_zipcodes || [],
      transfer_enabled: (company as any).transfer_enabled === true,
      transfer_number: (company as any).transfer_number || undefined,
      agent_config: config ? {
        language: (config as any).language || 'en',
        voice: (config as any).voice || 'alloy',
        model: (config as any).model || 'gpt-4o-realtime-preview-2024-10-01',
        extra_instructions: (config as any).custom_greeting || ''
      } : undefined
    };
  }

  async startCall(dto: { company_id: string; call_id: string; from_number: string; to_number: string }) {
    const company_id = dto.company_id;
    if (!company_id) throw new BadRequestException('company_id is required');

    const call_id = dto.call_id;
    if (!call_id) throw new BadRequestException('call_id is required');

    const from_number = asE164(dto.from_number);
    const to_number = asE164(dto.to_number);
    if (!from_number || !to_number) {
      throw new BadRequestException('from_number and to_number are required');
    }

    const existing = await this.dynamodb.get('calls', { company_id, call_id });
    const now = Date.now();
    if (existing) {
      await this.dynamodb.update('calls', { company_id, call_id }, {
        from_number,
        to_number,
        status: CallStatus.IN_PROGRESS,
        updated_at: now,
      });
      return { ok: true, call_id };
    }

    const call: Call = {
      company_id,
      call_id,
      direction: CallDirection.INBOUND,
      from_number,
      to_number,
      status: CallStatus.IN_PROGRESS,
      ai_handled: true,
      escalated: false,
      lead_captured: false,
      started_at: now,
      created_at: now,
    };

    await this.dynamodb.put('calls', call);
    return { ok: true, call_id };
  }

  async createLead(dto: CreateLeadDto) {
    const company_id = dto.company_id;
    if (!company_id) throw new BadRequestException('company_id is required');

    const from_number = asE164(dto.from_number);
    const to_number = asE164(dto.to_number);
    if (!from_number || !to_number) {
      throw new BadRequestException('from_number and to_number are required');
    }

    const call_id = dto.call_id ?? uuidv4();
    const now = Date.now();

    // Prefer phone-lookup index when available, but fall back to a filtered scan to avoid runtime index dependency.
    let existing: { items: any[] } = { items: [] };
    try {
      existing = await this.dynamodb.queryByCompany(
        'contacts',
        company_id,
        {
          keyCondition: '#phone_number = :phone_number',
          expressionAttributeNames: { '#phone_number': 'phone_number' },
          expressionAttributeValues: { ':phone_number': from_number },
        },
        { indexName: 'phone-lookup', limit: 1 }
      );
    } catch {
      const scan = await this.dynamodb.scan('contacts', {
        filterExpression: '#company_id = :company_id AND #phone_number = :phone_number',
        expressionAttributeNames: { '#company_id': 'company_id', '#phone_number': 'phone_number' },
        expressionAttributeValues: { ':company_id': company_id, ':phone_number': from_number },
        limit: 1,
      });
      existing = { items: scan.items || [] };
    }

    const collected = dto.collected_info ?? {};
    const fullName =
      typeof collected.full_name === 'string'
        ? collected.full_name
        : typeof collected.name === 'string'
          ? collected.name
          : undefined;
    const [firstFromFull, ...restFromFull] = typeof fullName === 'string' ? fullName.trim().split(/\s+/) : [];
    const derivedLast = restFromFull.length ? restFromFull.join(' ') : undefined;
    const first_name = typeof collected.first_name === 'string' ? collected.first_name : firstFromFull || undefined;
    const last_name = typeof collected.last_name === 'string' ? collected.last_name : derivedLast;
    const email = typeof collected.email === 'string' ? collected.email : undefined;
    const zipcode = typeof collected.zip === 'string' ? collected.zip : undefined;
    const address = typeof collected.address === 'string' ? collected.address : undefined;
    const legacyName = [first_name, last_name].filter(Boolean).join(' ').trim() || fullName?.trim();

    let contact_id: string;
    if (existing.items.length > 0) {
      const contact = existing.items[0] as Contact;
      contact_id = contact.contact_id;
      await this.dynamodb.update(
        'contacts',
        { company_id, contact_id },
        {
          ...(legacyName && { name: legacyName }),
          ...(from_number && { phone: from_number }),
          ...(first_name && { first_name }),
          ...(last_name && { last_name }),
          ...(email && { email }),
          ...(zipcode && { zipcode }),
          ...(address && { address }),
          updated_at: now,
          last_contact_at: now,
        }
      );
    } else {
      contact_id = uuidv4();
      const contact: Contact = {
        company_id,
        contact_id,
        phone_number: from_number,
        email,
        first_name,
        last_name,
        address,
        zipcode,
        ...(legacyName ? { name: legacyName } : {}),
        ...(from_number ? { phone: from_number } : {}),
        source: ContactSource.INBOUND_CALL,
        source_call_id: call_id,
        lead_status: LeadStatus.NEW,
        created_at: now,
        updated_at: now,
        last_contact_at: now,
      };
      await this.dynamodb.put('contacts', contact);
    }

    const call: Call = {
      company_id,
      call_id,
      contact_id,
      direction: CallDirection.INBOUND,
      from_number,
      to_number,
      status: CallStatus.IN_PROGRESS,
      ai_handled: true,
      escalated: false,
      lead_captured: true,
      started_at: now,
      created_at: now,
    };

    await this.dynamodb.put('calls', call);

    return { call_id, contact_id };
  }

  async saveCall(dto: SaveCallDto) {
    const company_id = dto.company_id;
    const call_id = dto.call_id;
    if (!company_id || !call_id) {
      throw new BadRequestException('company_id and call_id are required');
    }

    let existing: any = await this.dynamodb.get('calls', { company_id, call_id });
    if (!existing) {
      // Be resilient: if the call record didn't get created for some reason, create a minimal record instead of failing.
      const now = Date.now();
      const call: Call = {
        company_id,
        call_id,
        direction: CallDirection.INBOUND,
        // Unknown fallback; create_lead is responsible for persisting real from/to numbers.
        from_number: '',
        to_number: '',
        status: CallStatus.IN_PROGRESS,
        ai_handled: true,
        escalated: false,
        started_at: now,
        created_at: now,
      };
      await this.dynamodb.put('calls', call);
      existing = call;
    }

    const transcriptText = dto.transcript && dto.transcript.trim() ? dto.transcript.trim() : undefined;

    const skipContactUpdate = dto.skip_contact_update === true;

    const incomingCollected =
      dto.collected_info && typeof dto.collected_info === 'object'
        ? (dto.collected_info as Record<string, any>)
        : undefined;
    const incomingHasAny =
      !!incomingCollected &&
      Object.keys(incomingCollected).some(
        (k) =>
          incomingCollected[k] !== undefined &&
          incomingCollected[k] !== null &&
          `${incomingCollected[k]}`.trim() !== ''
      );

    const extractedCollected =
      transcriptText && !incomingHasAny && !skipContactUpdate ? this.extractCollectedInfoFromTranscript(transcriptText) : {};
    const extractedHasAny = Object.keys(extractedCollected).some(
      (k) => extractedCollected[k] !== undefined && extractedCollected[k] !== null && `${extractedCollected[k]}`.trim() !== ''
    );

    let transcript_url: string | undefined;
    if (transcriptText) {
      try {
        transcript_url = await this.s3.uploadTranscript(company_id, call_id, {
          text: transcriptText,
          collected_info: incomingHasAny ? incomingCollected : extractedHasAny ? extractedCollected : dto.collected_info,
          saved_at: Date.now(),
        });
      } catch (err) {
        console.error('[RealtimeToolsService] Failed to upload transcript (non-fatal):', err);
      }
    }

    const now = Date.now();
    const startedAt = typeof existing?.started_at === 'number' ? existing.started_at : undefined;
    const derivedDuration =
      typeof dto.duration_seconds === 'number'
        ? dto.duration_seconds
        : startedAt
          ? Math.max(1, Math.ceil((now - startedAt) / 1000))
          : undefined;

    const existingSummary = typeof existing?.summary === 'string' ? existing.summary.trim() : '';
    const dtoSummary = typeof dto.summary === 'string' ? dto.summary.trim() : '';
    const collectedForSummary: Record<string, any> = {
      ...(typeof existing?.collected_info === 'object' && existing.collected_info ? existing.collected_info : {}),
      ...(extractedHasAny ? extractedCollected : {}),
      ...(incomingHasAny ? incomingCollected : {}),
    };
    const fallbackSummary = this.buildSummaryFallback(collectedForSummary);

    let summary: string | undefined;
    if (dtoSummary && !this.isGenericSummary(dtoSummary)) {
      summary = dtoSummary;
    } else if (!existingSummary || this.isGenericSummary(existingSummary)) {
      summary = fallbackSummary || (dtoSummary || undefined);
    }

    const updates: Partial<Call> & Record<string, any> = {
      ...(summary && { summary }),
      ...(transcript_url && { transcript_url }),
      ...(transcriptText && {
        transcript:
          Buffer.byteLength(transcriptText, 'utf8') <= 200 * 1024
            ? transcriptText
            : `${transcriptText.slice(0, 120000)}\n\n[Transcript truncated — see transcript_url for the full JSON.]`,
      }),
      ...(typeof derivedDuration === 'number' && { duration_seconds: derivedDuration }),
      status: CallStatus.COMPLETED,
      ended_at: now,
      updated_at: now,
    };

    if (incomingHasAny || extractedHasAny) {
      updates.collected_info = {
        ...(typeof existing?.collected_info === 'object' && existing.collected_info ? existing.collected_info : {}),
        ...(extractedHasAny ? extractedCollected : {}),
        ...(incomingHasAny ? incomingCollected : {}),
      };

      // Normalize phone if present (always store E.164 if we can).
      const phoneValue = (updates.collected_info as any)?.phone;
      if (typeof phoneValue === 'string' && phoneValue.trim()) {
        const normalized = asE164(phoneValue);
        if (normalized) (updates.collected_info as any).phone = normalized;
      }
    }

    // Ensure contact is de-duplicated by phone number and enriched by collected fields.
    if (!skipContactUpdate) {
      try {
        const collected = (updates.collected_info as any) ?? dto.collected_info ?? {};
        const name = typeof collected.name === 'string' ? collected.name.trim() : '';
        const first =
          (typeof collected.first_name === 'string' ? collected.first_name.trim() : '') ||
          (name ? name.split(/\s+/)[0]?.trim() : '');
        const last =
          (typeof collected.last_name === 'string' ? collected.last_name.trim() : '') ||
          (name ? name.split(/\s+/).slice(1).join(' ')?.trim() : '');
        const email = typeof collected.email === 'string' ? collected.email.trim() : '';
        const address = typeof collected.address === 'string' ? collected.address.trim() : '';
        const zip = typeof collected.zip === 'string' ? collected.zip.trim() : '';

        const fromNumber = asE164(
          (typeof existing?.from_number === 'string' && existing.from_number) ||
          (typeof collected.phone === 'string' && collected.phone) ||
          ''
        );

        let contact_id: string | undefined = existing?.contact_id;
        if (!contact_id && fromNumber) {
          // Best-effort find by phone; avoid requiring the phone-lookup index.
          const scan = await this.dynamodb.scan('contacts', {
            filterExpression: '#company_id = :company_id AND #phone_number = :phone_number',
            expressionAttributeNames: { '#company_id': 'company_id', '#phone_number': 'phone_number' },
            expressionAttributeValues: { ':company_id': company_id, ':phone_number': fromNumber },
            limit: 1,
          });
          contact_id = scan.items?.[0]?.contact_id;
        }

        if (!contact_id && fromNumber) {
          contact_id = uuidv4();
          const contact: Contact = {
            company_id,
            contact_id,
            phone_number: fromNumber,
            email: email || undefined,
            first_name: first || undefined,
            last_name: last || undefined,
            address: address || undefined,
            zipcode: zip || undefined,
            source: ContactSource.INBOUND_CALL,
            source_call_id: call_id,
            lead_status: LeadStatus.NEW,
            created_at: now,
            updated_at: now,
            last_contact_at: now,
          };
          await this.dynamodb.put('contacts', contact);
        }

        if (contact_id) {
          updates.contact_id = contact_id as any;
          const contactUpdates: Record<string, any> = {
            ...(first ? { first_name: first } : {}),
            ...(last ? { last_name: last } : {}),
            ...(email ? { email } : {}),
            ...(address ? { address } : {}),
            ...(zip ? { zipcode: zip } : {}),
            last_contact_at: now,
            updated_at: now,
          };
          if (Object.keys(contactUpdates).length > 2) {
            await this.dynamodb.update('contacts', { company_id, contact_id }, contactUpdates);
          } else {
            await this.dynamodb.update('contacts', { company_id, contact_id }, { last_contact_at: now, updated_at: now });
          }

          const displayName = [first, last].filter(Boolean).join(' ').trim();
          if (displayName) updates.caller_name = displayName;
        }
      } catch (err) {
        console.error('[RealtimeToolsService] Failed to update contact from collected_info (non-fatal):', err);
      }
    }

    // Track call usage for billing (idempotent, supports multiple saves with increasing accuracy)
    if (typeof derivedDuration === 'number' && derivedDuration > 0) {
      const seconds = Math.max(1, Math.floor(derivedDuration));
      const recordedSeconds =
        typeof existing?.usage_seconds_recorded === 'number'
          ? existing.usage_seconds_recorded
          : typeof existing?.usage_minutes_recorded === 'number'
            ? Math.round(existing.usage_minutes_recorded * 60)
            : 0;
      const deltaSeconds = Math.max(0, seconds - recordedSeconds);
      const callsCounted = Boolean(existing?.usage_call_counted);

      if (deltaSeconds > 0) {
        try {
          await this.usageService.incrementCallMinutes(company_id, Number((deltaSeconds / 60).toFixed(2)), callsCounted ? 0 : 1);
          updates.usage_seconds_recorded = seconds;
          updates.usage_call_counted = true;
        } catch (err) {
          console.error('[RealtimeToolsService] Failed to track call usage (non-fatal):', err);
        }
      } else if (!callsCounted) {
        // Ensure we count the call even if minutes were already recorded somehow.
        try {
          await this.usageService.incrementCallMinutes(company_id, 0, 1);
          updates.usage_call_counted = true;
        } catch (err) {
          console.error('[RealtimeToolsService] Failed to track call count (non-fatal):', err);
        }
      }
    }

    await this.dynamodb.update('calls', { company_id, call_id }, updates);

    return { ok: true, call_id, transcript_url };
  }

  async saveRecording(dto: SaveRecordingDto) {
    const company_id = dto.company_id;
    const call_id = dto.call_id;
    const recording_sid = dto.recording_sid;
    if (!company_id || !call_id || !recording_sid) {
      throw new BadRequestException('company_id, call_id, and recording_sid are required');
    }

    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    if (!accountSid) throw new Error('Missing TWILIO_ACCOUNT_SID');

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recording_sid}.mp3`;
    const res = await fetch(url, { method: 'GET', headers: { Authorization: this.twilioAuthHeader() } });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Failed to download Twilio recording (${res.status}): ${text}`);
    }

    const buf = Buffer.from(await res.arrayBuffer());
    await this.s3.uploadRecording(company_id, call_id, buf, 'audio/mpeg');

    const updates: Record<string, any> = { updated_at: Date.now() };
    if (typeof dto.duration_seconds === 'number' && dto.duration_seconds > 0) {
      updates.duration_seconds = dto.duration_seconds;
    }

    // Don't fail if call record is missing; create minimal if needed.
    const existing = await this.dynamodb.get('calls', { company_id, call_id });
    if (!existing) {
      const now = Date.now();
      const call: Call = {
        company_id,
        call_id,
        direction: CallDirection.INBOUND,
        from_number: '',
        to_number: '',
        status: CallStatus.COMPLETED,
        ai_handled: true,
        escalated: false,
        started_at: now,
        created_at: now,
        ended_at: now,
        ...(typeof dto.duration_seconds === 'number' ? { duration_seconds: dto.duration_seconds } : {}),
      } as any;
      await this.dynamodb.put('calls', call as any);
      return { ok: true, call_id, recording_saved: true };
    }

    await this.dynamodb.update('calls', { company_id, call_id }, updates);
    return { ok: true, call_id, recording_saved: true };
  }

  async knowledgeSearch(dto: KnowledgeSearchDto) {
    const company_id = dto.company_id;
    if (!company_id) throw new BadRequestException('company_id is required');
    const query = (dto.query || '').trim();
    if (!query) throw new BadRequestException('query is required');

    const results = await this.knowledge.searchKnowledge(company_id, query, dto.top_k ?? 5);
    // Return only what the model needs (keep payload small for latency/cost).
    return (results || []).map((r: any) => ({
      knowledge_id: r?.item?.knowledge_id,
      title: r?.item?.title,
      type: r?.item?.type,
      text: (r?.text || '').slice(0, 1000),
      similarity: r?.similarity,
    }));
  }

  async getAvailability(dto: GetAvailabilityDto) {
    const company_id = dto.company_id;
    if (!company_id) throw new BadRequestException('company_id is required');

    const company = await this.companies.findById(company_id);
    if (!company) throw new NotFoundException('Company not found');

    const timeZone = this.normalizeTimeZone(dto.timezone, this.resolveCompanyTimeZone(company));
    const referenceDate = new Date(new Date().toLocaleString('en-US', { timeZone }));
    const startRaw = String(dto.start_time || '').trim();
    const endRaw = String(dto.end_time || '').trim();
    let dayAnchor: Date | null = null;
    let dayOnly = false;
    const parsedRange = chrono.parse(startRaw, referenceDate);
    const parsed = parsedRange?.[0];
    const hasTime = !!(parsed?.start?.isCertain('hour') || parsed?.start?.isCertain('minute'));
    const hasExplicitDate = !!(
      parsed?.start?.isCertain('day') ||
      parsed?.start?.isCertain('weekday') ||
      parsed?.start?.isCertain('month') ||
      parsed?.start?.isCertain('year')
    );
    const requestedIso = this.coerceToUtcIso(startRaw, timeZone, referenceDate);
    let startIso = requestedIso;
    if (parsed && hasExplicitDate) {
      const dt = parsed.start?.date?.() ?? chrono.parseDate(startRaw, referenceDate);
      if (dt) {
        dayAnchor = dt;
      }
    }
    const weekdayOnly =
      !!(
        parsed?.start?.isCertain('weekday') &&
        !parsed?.start?.isCertain('day') &&
        !parsed?.start?.isCertain('month') &&
        !parsed?.start?.isCertain('year')
      );
    if (weekdayOnly && dayAnchor) {
      const dayKey = (d: Date) =>
        new Intl.DateTimeFormat('en-CA', {
          timeZone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(d);
      if (dayKey(dayAnchor) < dayKey(referenceDate)) {
        dayAnchor = new Date(dayAnchor.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
    }
    if (parsed && hasExplicitDate && !hasTime && dayAnchor) {
      dayOnly = true;
    }
    let endIso = '';
    if (endRaw) {
      try {
        endIso = this.coerceToUtcIso(endRaw, timeZone, referenceDate);
      } catch {
        endIso = '';
      }
    }
    const usesDayWindow = !!(dayAnchor && (dayOnly || (hasTime && !endRaw)));
    if (usesDayWindow && dayAnchor) {
      const startUtcMs = zonedTimeToUtcMs(
        {
          year: dayAnchor.getFullYear(),
          month: dayAnchor.getMonth() + 1,
          day: dayAnchor.getDate(),
          hour: 8,
          minute: 0,
        },
        timeZone
      );
      const endUtcMs = zonedTimeToUtcMs(
        {
          year: dayAnchor.getFullYear(),
          month: dayAnchor.getMonth() + 1,
          day: dayAnchor.getDate(),
          hour: 18,
          minute: 0,
        },
        timeZone
      );
      startIso = new Date(startUtcMs).toISOString();
      endIso = new Date(endUtcMs).toISOString();
    }

    const durationMinutes = this.scheduling.getDurationMinutes(company);
    const startMs = Date.parse(startIso);
    let endMs = endIso ? Date.parse(endIso) : NaN;
    const minWindowMs = durationMinutes * 60_000;
    const endTooShort = Number.isFinite(endMs) && endMs - startMs < minWindowMs;
    if (!Number.isFinite(endMs) || endMs <= startMs || endTooShort) {
      const extendMinutes = hasTime ? Math.max(120, durationMinutes) : Math.max(10 * 60, durationMinutes);
      endIso = new Date(startMs + extendMinutes * 60_000).toISOString();
      endMs = Date.parse(endIso);
    }
    const closedCheckDate = dayAnchor ?? new Date(startMs);
    const closedInfo = (dayOnly || hasTime) ? this.getClosedInfo(company, closedCheckDate, timeZone) : null;
    const closedDay = closedInfo?.closed === true;

    const slots = await this.scheduling.getAvailability(company, startIso, endIso);
    const readableSlots = slots.map((s) => this.formatSlotForCaller(s.start_time, timeZone));
    const timeOnlySlots = slots.map((s) => this.formatSlotTimeOnly(s.start_time, timeZone));
    let requested_time_available: boolean | undefined;
    if (hasTime) {
      const requestedMs = Date.parse(requestedIso);
      if (Number.isFinite(requestedMs)) {
        requested_time_available = slots.some((s) => {
          const slotMs = Date.parse(s.start_time);
          return Number.isFinite(slotMs) && Math.abs(slotMs - requestedMs) <= 5 * 60_000;
        });
      } else {
        requested_time_available = false;
      }
    }
    let spokenAvailability = '';
    if (closedDay && !slots.length) {
      const label = closedInfo?.dayLabel || 'that day';
      spokenAvailability = `We are closed on ${label}. What day works instead?`;
    } else if (hasTime) {
      if (requested_time_available === true) {
        spokenAvailability = `That time is available.`;
      } else if (requested_time_available === false) {
        if (slots.length) {
          const sample = timeOnlySlots.slice(0, 3);
          spokenAvailability = `That time isn't available. I have ${sample.join(', ')}. Which time works best?`;
        } else {
          spokenAvailability = `That time isn't available. What day or time works instead?`;
        }
      }
    } else if (slots.length) {
      const sample = timeOnlySlots.slice(0, 3);
      spokenAvailability = `I have ${sample.join(', ')}. Which time works best?`;
    }

    return {
      ok: true,
      company_id,
      timezone: timeZone,
      slots: slots.map((s) => s.start_time),
      readable_slots: readableSlots,
      spoken_availability: spokenAvailability,
      ...(closedInfo ? { closed_day: closedDay, closed_day_label: closedInfo.dayLabel } : {}),
      ...(typeof requested_time_available === 'boolean' ? { requested_time_available } : {}),
    };
  }

  async createBooking(dto: CreateBookingDto) {
    const company_id = dto.company_id;
    if (!company_id) throw new BadRequestException('company_id is required');

    if (!dto.confirmed) {
      throw new BadRequestException('Booking not confirmed. Ask user to confirm first.');
    }

    const company = await this.companies.findById(company_id);
    if (!company) throw new NotFoundException('Company not found');

    const timeZone = this.normalizeTimeZone(dto.timezone, this.resolveCompanyTimeZone(company));
    const referenceDate = new Date(new Date().toLocaleString('en-US', { timeZone }));
    const customerEmail =
      (dto.customer_email && dto.customer_email.trim()) ||
      `caller-${(dto.contact_id || dto.call_id || 'unknown').replace(/[^a-zA-Z0-9]/g, '')}@handycall.invalid`;

    const startIso = this.coerceToUtcIso(dto.start_time, timeZone, referenceDate);
    const durationMinutes = this.scheduling.getDurationMinutes(company);
    let endIso = dto.end_time
      ? this.coerceToUtcIso(dto.end_time, timeZone, referenceDate)
      : new Date(Date.parse(startIso) + durationMinutes * 60_000).toISOString();
    const startMs = Date.parse(startIso);
    let endMs = Date.parse(endIso);
    if (!Number.isFinite(endMs) || endMs <= startMs || endMs - startMs < durationMinutes * 60_000) {
      endIso = new Date(startMs + durationMinutes * 60_000).toISOString();
      endMs = Date.parse(endIso);
    }

    const [slot] = await this.scheduling.getAvailability(company, startIso, endIso);
    if (!slot) {
      throw new BadRequestException('Requested time is no longer available');
    }

    // Use the canonical appointments service so the record is consistent and external calendars are synced.
    let contact_phone: string | undefined;
    if (dto.call_id) {
      try {
        const call: any = await this.dynamodb.get('calls', { company_id, call_id: dto.call_id });
        if (typeof call?.from_number === 'string' && call.from_number.trim()) {
          contact_phone = call.from_number.trim();
        }
      } catch {
        // non-fatal
      }
    }

    const appointment: any = await this.appointmentsService.createAppointment(company_id, {
      scheduled_start: new Date(slot.start_time).getTime(),
      scheduled_end: new Date(slot.end_time).getTime(),
      contact_name: dto.customer_name,
      contact_email: customerEmail,
      contact_phone,
      service_type: company.service_type ?? 'General',
      notes: dto.notes,
      created_by: 'AI',
    });

    const appointment_id = appointment?.appointment_id;

    if (dto.call_id) {
      await this.dynamodb.update(
        'calls',
        { company_id, call_id: dto.call_id },
        { appointment_created: true, appointment_id, updated_at: Date.now() }
      );
    }

    return {
      ok: true,
      appointment_id,
      start_time: slot.start_time,
      end_time: slot.end_time,
    };
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

  async sendBookingLink(dto: { company_id: string; call_id: string; email?: string }) {
    const company_id = dto.company_id;
    const call_id = dto.call_id;
    if (!company_id || !call_id) {
      throw new BadRequestException('company_id and call_id are required');
    }

    const company = await this.companies.findById(company_id);
    if (!company) throw new NotFoundException('Company not found');

    const existingCall = await this.dynamodb.get('calls', { company_id, call_id });
    const email = typeof dto.email === 'string' ? dto.email.trim() : '';
    if (!email || !isValidEmail(email)) {
      throw new BadRequestException('A valid email is required');
    }

    const alreadyBooked = Boolean((existingCall as any)?.appointment_created);
    if (!alreadyBooked) {
      throw new BadRequestException('Booking link can only be sent after the appointment is booked.');
    }

    const bookingLink = this.buildBookingLink(company_id, call_id);
    const message = `Thanks for booking with ${company.company_name}. Manage or update your appointment here: ${bookingLink}`;
    console.log('[send_booking_link] preparing', {
      company_id,
      call_id,
      email,
    });

    const region = this.config.get<string>('SES_REGION') || this.config.get<string>('AWS_REGION') || 'us-east-1';
    const fromMeta = this.resolveBookingFromEmail(company);
    const fromAddress = `${fromMeta.display} <${fromMeta.from}>`;
    const subject = `${company.company_name} booking details`;
    const html = renderHandycallEmail({
      title: `${company.company_name} booking details`,
      preheader: `Manage your ${company.company_name} appointment.`,
      greeting: 'Hi there,',
      body: `<p style="margin:0 0 16px;">Thanks for booking with <strong>${company.company_name}</strong>.</p>
             <p style="margin:0 0 16px;">Use the link below to view or manage your appointment.</p>`,
      cta: { label: 'Manage appointment', url: bookingLink },
      footer: `Need help? Reply to this email and our team will assist.`,
    });

    try {
      const result = await sendSesEmail({
        region,
        from: fromAddress,
        to: [email],
        subject,
        text: message,
        html,
      });
      console.log('[send_booking_link] email sent', {
        message_id: (result as any)?.MessageId,
        email,
        from: fromMeta.from,
        region,
      });
    } catch (err: any) {
      console.error('[send_booking_link] email send failed', {
        message: err?.message ?? String(err),
        email,
        from: fromMeta.from,
      });
      throw err;
    }

    const now = Date.now();
    if (existingCall) {
      const updates: Record<string, any> = {
        booking_link_sent_at: now,
        booking_link_channel: 'EMAIL',
        lead_email: email,
        updated_at: now,
      };
      await this.dynamodb.update('calls', { company_id, call_id }, updates);
    } else {
      const call: Call = {
        company_id,
        call_id,
        direction: CallDirection.INBOUND,
        from_number: '',
        to_number: '',
        status: CallStatus.IN_PROGRESS,
        ai_handled: true,
        escalated: false,
        lead_captured: true,
        started_at: now,
        created_at: now,
        outcome: 'LEAD' as any,
        lead_email: email,
        booking_link_channel: 'EMAIL',
      } as any;
      await this.dynamodb.put('calls', call);
    }

    return { ok: true, booking_link: bookingLink };
  }

  async checkServiceArea(company_id: string, zip: string) {
    const company = await this.companies.findById(company_id);
    if (!company) throw new NotFoundException('Company not found');

    const zips = (company as any).service_area_zipcodes ?? [];
    if (!zips.length) return { eligible: true };

    const normalized = zip.trim();
    const eligible = zips.includes(normalized);

    return {
      eligible,
      message: eligible ? undefined : `Sorry, we don’t service zipcode ${normalized}.`,
    };
  }

  async listAppointmentsByPhone(dto: { company_id: string; phone: string; range_days?: number }) {
    const days = dto.range_days ?? 90;
    const now = Date.now();
    const startMs = now - days * 24 * 60 * 60 * 1000;
    const endMs = now + days * 24 * 60 * 60 * 1000;

    // First find the contact by phone
    const contactScan = await this.dynamodb.scan('contacts', {
      filterExpression: '#company_id = :company_id AND #phone = :phone',
      expressionAttributeNames: { '#company_id': 'company_id', '#phone': 'phone_number' },
      expressionAttributeValues: { ':company_id': dto.company_id, ':phone': dto.phone },
      limit: 1,
    });

    const contact = contactScan.items?.[0];
    if (!contact) return { appointments: [] };

    // Then find appointments by contact-appointments GSI
    const company_contact = `${dto.company_id}#${contact.contact_id}`;
    const result = await this.dynamodb.query(
      'appointments',
      '#company_contact = :cc AND #start BETWEEN :s AND :e',
      { '#company_contact': 'company_contact', '#start': 'scheduled_start' },
      { ':cc': company_contact, ':s': startMs, ':e': endMs },
      { indexName: 'contact-appointments' }
    );

    return {
      appointments: (result.items || []).map((a: any) => ({
        appointment_id: a.appointment_id,
        start_time: new Date(a.scheduled_start).toISOString(),
        end_time: new Date(a.scheduled_end).toISOString(),
        service_type: a.service_type,
        status: a.status,
        notes: a.notes,
      })),
    };
  }

  async cancelAppointment(dto: { company_id: string; appointment_id: string; reason?: string }) {
    const result = await this.appointmentsService.cancelAppointment(dto.company_id, dto.appointment_id);
    if (dto.reason) {
      await this.dynamodb.update(
        'appointments',
        { company_id: dto.company_id, appointment_id: dto.appointment_id },
        { notes: `Cancellation reason: ${dto.reason}. Updated at: ${new Date().toISOString()}` }
      );
    }
    return { ok: true, appointment_id: dto.appointment_id };
  }

  async rescheduleAppointment(dto: {
    company_id: string;
    appointment_id: string;
    new_start_time: string;
    timezone?: string;
  }) {
    const company = await this.companies.findById(dto.company_id);
    if (!company) throw new NotFoundException('Company not found');

    const timeZone = this.normalizeTimeZone(dto.timezone, this.resolveCompanyTimeZone(company));
    const startIso = this.coerceToUtcIso(dto.new_start_time, timeZone);
    const startMs = Date.parse(startIso);

    const appt = await this.appointmentsService.getAppointment(dto.company_id, dto.appointment_id);
    const durationMs = appt.scheduled_end - appt.scheduled_start;
    const endMs = startMs + durationMs;

    const updated = await this.appointmentsService.updateAppointment(dto.company_id, dto.appointment_id, {
      scheduled_start: startMs,
      scheduled_end: endMs,
    });

    return {
      ok: true,
      appointment_id: dto.appointment_id,
      start_time: new Date(startMs).toISOString(),
      end_time: new Date(endMs).toISOString(),
    };
  }
}
