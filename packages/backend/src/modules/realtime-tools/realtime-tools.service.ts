import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CompaniesService } from '../companies/companies.service';
import { AgentConfigService } from '../agent-config/agent-config.service';
import { CompanyNumbersService } from '../company-numbers/company-numbers.service';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { S3Service } from '../../infrastructure/storage/s3.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { UsageService } from '../billing/usage.service';
import { zonedTimeToUtcMs } from '../scheduling/timezone';
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
  ) {}

  private twilioAuthHeader(): string {
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN');
    if (!sid || !token) {
      throw new Error('Missing TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN');
    }
    const basic = Buffer.from(`${sid}:${token}`, 'utf8').toString('base64');
    return `Basic ${basic}`;
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

    return {
      company_id: company.company_id,
      company_name: company.company_name,
      timezone: company.timezone,
      service_type: company.service_type,
      agent_config: config,
      calls_enabled: company.calls_enabled,
      sms_enabled: company.sms_enabled,
      calendar_setup_completed: company.calendar_setup_completed ?? false,
      schedule_setup_completed: (company as any).schedule_setup_completed ?? false,
    };
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
    const first_name = typeof collected.first_name === 'string' ? collected.first_name : undefined;
    const last_name = typeof collected.last_name === 'string' ? collected.last_name : undefined;
    const email = typeof collected.email === 'string' ? collected.email : undefined;
    const zipcode = typeof collected.zip === 'string' ? collected.zip : undefined;
    const address = typeof collected.address === 'string' ? collected.address : undefined;

    let contact_id: string;
    if (existing.items.length > 0) {
      const contact = existing.items[0] as Contact;
      contact_id = contact.contact_id;
      await this.dynamodb.update(
        'contacts',
        { company_id, contact_id },
        {
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
      transcriptText && !incomingHasAny ? this.extractCollectedInfoFromTranscript(transcriptText) : {};
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
      text: r?.text,
      similarity: r?.similarity,
    }));
  }

  async getAvailability(dto: GetAvailabilityDto) {
    const company_id = dto.company_id;
    if (!company_id) throw new BadRequestException('company_id is required');

    const company = await this.companies.findById(company_id);
    if (!company) throw new NotFoundException('Company not found');

    const timeZone = this.normalizeTimeZone(dto.timezone, company.timezone || 'UTC');
    const referenceDate = new Date(new Date().toLocaleString('en-US', { timeZone }));
    const startRaw = String(dto.start_time || '').trim();
    const endRaw = String(dto.end_time || '').trim();
    let dayAnchor: Date | null = null;
    let dayOnly = false;
    const parsedRange = chrono.parse(startRaw, referenceDate);
    const parsed = parsedRange?.[0];
    const hasTime = !!(parsed?.start?.isCertain('hour') || parsed?.start?.isCertain('minute'));
    let startIso = this.coerceToUtcIso(startRaw, timeZone, referenceDate);
    if (parsed && !hasTime) {
      const dt = parsed.start?.date?.() ?? chrono.parseDate(startRaw, referenceDate);
      if (dt) {
        const utcMs = zonedTimeToUtcMs(
          {
            year: dt.getFullYear(),
            month: dt.getMonth() + 1,
            day: dt.getDate(),
            hour: 8,
            minute: 0,
          },
          timeZone
        );
        startIso = new Date(utcMs).toISOString();
        dayAnchor = dt;
        dayOnly = true;
      }
    }
    let endIso = '';
    if (endRaw) {
      try {
        endIso = this.coerceToUtcIso(endRaw, timeZone, referenceDate);
      } catch {
        endIso = '';
      }
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
    if (dayOnly && dayAnchor && !endRaw) {
      const utcMs = zonedTimeToUtcMs(
        {
          year: dayAnchor.getFullYear(),
          month: dayAnchor.getMonth() + 1,
          day: dayAnchor.getDate(),
          hour: 18,
          minute: 0,
        },
        timeZone
      );
      const candidate = new Date(utcMs).toISOString();
      if (Date.parse(candidate) > startMs) {
        endIso = candidate;
        endMs = Date.parse(endIso);
      }
    }
    const slots = await this.scheduling.getAvailability(company, startIso, endIso);
    const readableSlots = slots.map((s) => this.formatSlotForCaller(s.start_time, timeZone));
    const timeOnlySlots = slots.map((s) => this.formatSlotTimeOnly(s.start_time, timeZone));
    let spokenAvailability = '';
    if (slots.length > 12) {
      const first = timeOnlySlots[0];
      const last = timeOnlySlots[timeOnlySlots.length - 1];
      spokenAvailability = `I have wide availability from ${first} to ${last}. What time works best?`;
    } else if (slots.length) {
      spokenAvailability = `I have slots open at ${timeOnlySlots.join(', ')}. Which time works best?`;
    }

    return {
      ok: true,
      company_id,
      timezone: timeZone,
      slots: slots.map((s) => s.start_time),
      readable_slots: readableSlots,
      spoken_availability: spokenAvailability,
    };
  }

  async createBooking(dto: CreateBookingDto) {
    const company_id = dto.company_id;
    if (!company_id) throw new BadRequestException('company_id is required');

    const company = await this.companies.findById(company_id);
    if (!company) throw new NotFoundException('Company not found');

    const timeZone = this.normalizeTimeZone(dto.timezone, company.timezone || 'UTC');
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
}
