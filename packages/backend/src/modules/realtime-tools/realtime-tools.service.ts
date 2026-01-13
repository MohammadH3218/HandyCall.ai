import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CompaniesService } from '../companies/companies.service';
import { AgentConfigService } from '../agent-config/agent-config.service';
import { CompanyNumbersService } from '../company-numbers/company-numbers.service';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { S3Service } from '../../infrastructure/storage/s3.service';
import { CalcomService } from '../../infrastructure/calcom/calcom.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import {
  Call,
  CallDirection,
  CallStatus,
  Contact,
  ContactSource,
  LeadStatus,
  AppointmentStatus,
} from '@handycall/shared';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { GetAvailabilityDto } from './dto/get-availability.dto';
import { KnowledgeSearchDto } from './dto/knowledge-search.dto';
import { SaveCallDto } from './dto/save-call.dto';

function asE164(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('+')) return trimmed;
  return trimmed;
}

@Injectable()
export class RealtimeToolsService {
  constructor(
    private readonly companies: CompaniesService,
    private readonly agentConfig: AgentConfigService,
    private readonly companyNumbers: CompanyNumbersService,
    private readonly dynamodb: DynamoDBService,
    private readonly s3: S3Service,
    private readonly knowledge: KnowledgeService,
    private readonly calcom: CalcomService
  ) {}

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

    const config = (await this.agentConfig.getConfig(company.company_id)) ?? undefined;

    return {
      company_id: company.company_id,
      company_name: company.company_name,
      timezone: company.timezone,
      service_type: company.service_type,
      agent_config: config,
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

    const existing = await this.dynamodb.queryByCompany(
      'contacts',
      company_id,
      {
        keyCondition: '#phone_number = :phone_number',
        expressionAttributeNames: { '#phone_number': 'phone_number' },
        expressionAttributeValues: { ':phone_number': from_number },
      },
      { indexName: 'phone-lookup', limit: 1 }
    );

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

    const existing = await this.dynamodb.get('calls', { company_id, call_id });
    if (!existing) {
      throw new NotFoundException('Call not found');
    }

    let transcript_url: string | undefined;
    if (dto.transcript && dto.transcript.trim()) {
      transcript_url = await this.s3.uploadTranscript(company_id, call_id, {
        text: dto.transcript,
        collected_info: dto.collected_info,
        saved_at: Date.now(),
      });
    }

    const updates: Partial<Call> & Record<string, any> = {
      ...(dto.summary && { summary: dto.summary }),
      ...(transcript_url && { transcript_url }),
      ...(typeof dto.duration_seconds === 'number' && { duration_seconds: dto.duration_seconds }),
      status: CallStatus.COMPLETED,
      ended_at: Date.now(),
    };

    if (dto.collected_info) {
      updates.collected_info = dto.collected_info;
    }

    await this.dynamodb.update('calls', { company_id, call_id }, updates);

    return { ok: true, call_id, transcript_url };
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

    const eventTypeId = company.calcom_event_type_id;
    if (typeof eventTypeId !== 'number') {
      throw new BadRequestException('Company calcom_event_type_id is not configured');
    }

    const timeZone = dto.timezone || company.timezone || 'UTC';

    const schedule = await this.calcom.getSchedule({
      startTime: dto.start_time,
      endTime: dto.end_time,
      eventTypeId,
      timeZone,
      isTeamEvent: false,
    });

    const slots: string[] = [];
    for (const day of Object.keys(schedule.slotsByDay || {})) {
      const daySlots = schedule.slotsByDay[day] || [];
      for (const s of daySlots) {
        if (typeof s?.time === 'string') slots.push(s.time);
      }
    }

    return {
      ok: true,
      company_id,
      event_type_id: eventTypeId,
      timezone: timeZone,
      slots,
    };
  }

  async createBooking(dto: CreateBookingDto) {
    const company_id = dto.company_id;
    if (!company_id) throw new BadRequestException('company_id is required');

    const company = await this.companies.findById(company_id);
    if (!company) throw new NotFoundException('Company not found');

    const eventTypeId = company.calcom_event_type_id;
    if (typeof eventTypeId !== 'number') {
      throw new BadRequestException('Company calcom_event_type_id is not configured');
    }

    const timeZone = dto.timezone || company.timezone || 'UTC';
    const customerEmail =
      (dto.customer_email && dto.customer_email.trim()) ||
      `caller-${(dto.contact_id || dto.call_id || 'unknown').replace(/[^a-zA-Z0-9]/g, '')}@handycall.invalid`;

    const booking = await this.calcom.bookEvent({
      eventTypeId,
      start: dto.start_time,
      end: dto.end_time,
      timeZone,
      language: 'en',
      responses: {
        name: dto.customer_name,
        email: customerEmail,
        ...(dto.notes ? { notes: dto.notes } : {}),
      },
      metadata: {
        company_id,
        ...(dto.call_id ? { call_id: dto.call_id } : {}),
        ...(dto.contact_id ? { contact_id: dto.contact_id } : {}),
        source: 'handycall',
      },
      ...(dto.notes ? { description: dto.notes } : {}),
    });

    const appointment_id = uuidv4();
    const now = Date.now();

    const appointment = {
      appointment_id,
      company_id,
      contact_id: dto.contact_id ?? booking?.attendees?.[0]?.id?.toString?.() ?? undefined,
      call_id: dto.call_id,
      scheduled_start: new Date(booking.startTime || dto.start_time).getTime(),
      scheduled_end: new Date(booking.endTime || dto.end_time).getTime(),
      status: AppointmentStatus.SCHEDULED,
      service_type: company.service_type ?? 'General',
      contact_name: dto.customer_name,
      contact_email: customerEmail,
      notes: dto.notes,
      created_by: 'AI',
      confirmed: true,
      external_booking_uid: booking?.uid,
      external_booking_id: booking?.id,
      created_at: now,
      updated_at: now,
    };

    await this.dynamodb.put('appointments', appointment);

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
      booking_uid: booking?.uid,
      start_time: booking?.startTime ?? dto.start_time,
      end_time: booking?.endTime ?? dto.end_time,
    };
  }
}
