import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CompaniesService } from '../companies/companies.service';
import { AgentConfigService } from '../agent-config/agent-config.service';
import { CompanyNumbersService } from '../company-numbers/company-numbers.service';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { S3Service } from '../../infrastructure/storage/s3.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import {
  Call,
  CallDirection,
  CallStatus,
  Contact,
  ContactSource,
  LeadStatus,
} from '@handycall/shared';
import { CreateLeadDto } from './dto/create-lead.dto';
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
    private readonly knowledge: KnowledgeService
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
}
