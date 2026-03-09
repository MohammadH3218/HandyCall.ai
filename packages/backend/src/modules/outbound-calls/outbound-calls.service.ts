import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { CompaniesService } from '../companies/companies.service';
import { CompanyNumbersService } from '../company-numbers/company-numbers.service';
import { UsageGateService } from '../billing/usage-gate.service';
import { CreateOutboundCallDto, OutboundCallContext } from './dto/create-outbound-call.dto';

@Injectable()
export class OutboundCallsService {
  constructor(
    private readonly config: ConfigService,
    private readonly dynamodb: DynamoDBService,
    private readonly companies: CompaniesService,
    private readonly companyNumbers: CompanyNumbersService,
    private readonly usageGate: UsageGateService,
  ) {}

  private getTwilioAccountSid(): string {
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    if (!sid) throw new Error('Missing TWILIO_ACCOUNT_SID');
    return sid;
  }

  private getTwilioAuthToken(): string {
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN');
    if (!token) throw new Error('Missing TWILIO_AUTH_TOKEN');
    return token;
  }

  private twilioAuthHeader(): string {
    const sid = this.getTwilioAccountSid();
    const token = this.getTwilioAuthToken();
    return `Basic ${Buffer.from(`${sid}:${token}`, 'utf8').toString('base64')}`;
  }

  private getVoiceWebhookUrl(): string {
    return (
      this.config.get<string>('TWILIO_VOICE_WEBHOOK_URL') ||
      this.config.get<string>('VOICE_BRIDGE_VOICE_WEBHOOK_URL') ||
      'https://voice.handycall.org/twilio/voice'
    );
  }

  private buildOutboundWebhookUrl(params: {
    companyId: string;
    context: OutboundCallContext;
    contactName?: string;
    appointmentStart?: string;
    appointmentServiceType?: string;
    customMessage?: string;
  }): string {
    const base = this.getVoiceWebhookUrl();
    const query = new URLSearchParams();
    query.set('direction', 'outbound');
    query.set('company_id', params.companyId);
    query.set('context', params.context);
    if (params.contactName) query.set('contact_name', params.contactName);
    if (params.appointmentStart) query.set('appointment_start', params.appointmentStart);
    if (params.appointmentServiceType) query.set('appointment_service_type', params.appointmentServiceType);
    if (params.customMessage) query.set('custom_message', params.customMessage);
    return `${base}?${query.toString()}`;
  }

  async createOutboundCall(
    companyId: string,
    dto: CreateOutboundCallDto,
  ): Promise<{ call_id: string; twilio_call_sid: string; status: string }> {
    const company = await this.companies.findById(companyId);
    if (!company) throw new NotFoundException('Company not found');

    // Check usage gate
    const allowed = await this.usageGate.isServiceAllowed(companyId, 'minutes');
    if (!allowed) {
      throw new BadRequestException('Call minutes limit reached. Upgrade your plan or purchase an add-on.');
    }

    // Get company phone number
    const numbers = await this.companyNumbers.listCompanyNumbers(companyId);
    const fromNumber = numbers.find((n) => n.provider === 'TWILIO')?.did_e164 ?? numbers[0]?.did_e164;
    if (!fromNumber) {
      throw new BadRequestException('Company has no phone number provisioned.');
    }

    const accountSid = this.getTwilioAccountSid();
    const context = dto.context || OutboundCallContext.MANUAL;
    const contact = dto.contact_id
      ? await this.dynamodb.get('contacts', { company_id: companyId, contact_id: dto.contact_id }).catch(() => null)
      : null;
    const appointment = dto.appointment_id
      ? await this.dynamodb.get('appointments', { company_id: companyId, appointment_id: dto.appointment_id }).catch(() => null)
      : null;
    const contactName = String((contact as any)?.name || [ (contact as any)?.first_name, (contact as any)?.last_name ].filter(Boolean).join(' ') || '').trim();
    const webhookUrl = this.buildOutboundWebhookUrl({
      companyId,
      context,
      contactName: contactName || undefined,
      appointmentStart: String((appointment as any)?.scheduled_start || '').trim() || undefined,
      appointmentServiceType: String((appointment as any)?.service_type || '').trim() || undefined,
      customMessage: String(dto.custom_message || '').trim() || undefined,
    });

    const form = new URLSearchParams();
    form.set('To', dto.to_number);
    form.set('From', fromNumber);
    form.set('Url', webhookUrl);
    form.set('Method', 'POST');
    form.set('StatusCallback', `${this.config.get<string>('API_BASE_URL') || ''}/api/v1/outbound-calls/status`);
    form.set('StatusCallbackMethod', 'POST');
    if (dto.contact_id) form.set('StatusCallbackEvent', 'completed ringing answered no-answer busy failed canceled');
    form.set('MachineDetection', 'Enable');

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
    const res = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: this.twilioAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new BadRequestException(`Twilio error: ${text}`);
    }

    const twilioCall = JSON.parse(text);
    const callId = uuidv4();
    const now = Date.now();

    await this.dynamodb.put('outbound_calls', {
      company_id: companyId,
      call_id: callId,
      twilio_call_sid: twilioCall.sid,
      to_number: dto.to_number,
      from_number: fromNumber,
      contact_id: dto.contact_id,
      appointment_id: dto.appointment_id,
      context,
      status: twilioCall.status || 'queued',
      custom_message: dto.custom_message,
      created_at: now,
      updated_at: now,
    });

    return {
      call_id: callId,
      twilio_call_sid: twilioCall.sid,
      status: twilioCall.status || 'queued',
    };
  }

  async updateCallStatus(twiliCallSid: string, status: string): Promise<void> {
    const scan = await this.dynamodb.scan('outbound_calls', {
      filterExpression: '#twilio_call_sid = :sid',
      expressionAttributeNames: { '#twilio_call_sid': 'twilio_call_sid' },
      expressionAttributeValues: { ':sid': twiliCallSid },
      limit: 1,
    });

    if (!scan.items?.length) return;
    const item = scan.items[0] as any;
    await this.dynamodb.update(
      'outbound_calls',
      { company_id: item.company_id, call_id: item.call_id },
      { status, updated_at: Date.now() },
    );
  }

  async listOutboundCalls(
    companyId: string,
    options?: { limit?: number; lastKey?: string },
  ) {
    const result = await this.dynamodb.query(
      'outbound_calls',
      '#company_id = :company_id',
      { '#company_id': 'company_id' },
      { ':company_id': companyId },
      { limit: options?.limit || 25, exclusiveStartKey: options?.lastKey ? JSON.parse(options.lastKey) : undefined },
    );
    return {
      items: result.items || [],
      lastEvaluatedKey: result.lastEvaluatedKey ? JSON.stringify(result.lastEvaluatedKey) : null,
    };
  }

  async scheduleOutboundCall(params: {
    companyId: string;
    toNumber: string;
    context: OutboundCallContext;
    contactId?: string;
    appointmentId?: string;
    scheduledAt: number;
  }): Promise<void> {
    const now = Date.now();
    await this.dynamodb.put('scheduled_messages', {
      company_id: params.companyId,
      message_id: `${params.scheduledAt}-${uuidv4()}`,
      contact_id: params.contactId,
      appointment_id: params.appointmentId,
      to_number: params.toNumber,
      channel: 'CALL',
      message_type: params.context,
      body: '',
      send_at: params.scheduledAt,
      status: 'PENDING',
      created_at: now,
      updated_at: now,
    });
  }
}
