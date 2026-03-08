import { Injectable } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';

export type LeadInboxItem = {
  call_id: string;
  contact_id?: string;
  phone_number: string;
  contact_name?: string;
  summary?: string;
  lead_reason?: string;
  lead_progress_stage?: 'INTERESTED' | 'INTAKE_STARTED' | 'READY_TO_BOOK';
  created_at?: number;
  last_contact_at?: number;
  duration_seconds?: number;
};

@Injectable()
export class LeadScoringService {
  constructor(private readonly dynamodb: DynamoDBService) {}

  private normalizeText(value?: string): string {
    return (value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isLead(call: any): boolean {
    if (!call || call.appointment_created === true || call.outcome === 'APPOINTMENT_BOOKED') {
      return false;
    }
    if (call.lead_captured === true || call.outcome === 'LEAD') {
      return true;
    }

    const text = this.normalizeText(`${call.summary || ''} ${call.lead_reason || ''}`);
    const interestSignals = [
      'interested',
      'quote',
      'estimate',
      'pricing',
      'price',
      'availability',
      'appointment',
      'schedule',
      'book',
      'service interest',
      'follow up',
      'talk to the owner',
      'call me back',
    ];

    const hits = interestSignals.filter((signal) => text.includes(signal)).length;
    const collected = call.collected_info && typeof call.collected_info === 'object' ? call.collected_info : {};
    const collectedCount = Object.values(collected).filter((value) => typeof value === 'string' && value.trim()).length;
    const duration = Number(call.duration_seconds || call.duration || 0);
    return hits >= 2 || (hits >= 1 && collectedCount >= 2) || (collectedCount >= 3 && duration >= 45);
  }

  async listLeads(companyId: string): Promise<LeadInboxItem[]> {
    const [callsResult, contactsResult] = await Promise.all([
      this.dynamodb.queryByCompany('calls', companyId, {}, {
        indexName: 'date-index',
        limit: 250,
        scanIndexForward: false,
      }).catch(() =>
        this.dynamodb.scan('calls', {
          filterExpression: '#company_id = :company_id',
          expressionAttributeNames: { '#company_id': 'company_id' },
          expressionAttributeValues: { ':company_id': companyId },
          limit: 250,
        }),
      ),
      this.dynamodb.queryByCompany('contacts', companyId, undefined, { limit: 500 }).catch(() =>
        this.dynamodb.scan('contacts', {
          filterExpression: '#company_id = :company_id',
          expressionAttributeNames: { '#company_id': 'company_id' },
          expressionAttributeValues: { ':company_id': companyId },
          limit: 500,
        }),
      ),
    ]);

    const contactsById = new Map<string, any>();
    const contactsByPhone = new Map<string, any>();
    for (const contact of contactsResult.items || []) {
      contactsById.set(contact.contact_id, contact);
      const phone = String(contact.phone_number || contact.phone || '').trim();
      if (phone) contactsByPhone.set(phone, contact);
    }

    const leadMap = new Map<string, LeadInboxItem>();
    for (const call of callsResult.items || []) {
      if (!this.isLead(call)) continue;

      const contact =
        (call.contact_id ? contactsById.get(call.contact_id) : undefined) ||
        contactsByPhone.get(String(call.from_number || '').trim());

      const key = String(contact?.contact_id || call.contact_id || call.from_number || call.call_id);
      if (leadMap.has(key)) continue;

      const first = String(contact?.first_name || '').trim();
      const last = String(contact?.last_name || '').trim();
      const legacyName = String(contact?.name || '').trim();
      const contactName = legacyName || [first, last].filter(Boolean).join(' ').trim() || undefined;

      leadMap.set(key, {
        call_id: call.call_id,
        contact_id: contact?.contact_id || call.contact_id,
        phone_number: String(call.from_number || contact?.phone_number || contact?.phone || '').trim(),
        contact_name: contactName,
        summary: call.summary,
        lead_reason: call.lead_reason || 'Customer showed enough service interest to follow up.',
        lead_progress_stage: call.lead_progress_stage || 'INTERESTED',
        created_at: Number(call.created_at || call.started_at || 0) || undefined,
        last_contact_at: Number(contact?.last_contact_at || contact?.updated_at || 0) || undefined,
        duration_seconds: Number(call.duration_seconds || call.duration || 0) || undefined,
      });
    }

    return Array.from(leadMap.values()).sort((a, b) => Number(b.created_at || 0) - Number(a.created_at || 0));
  }
}
