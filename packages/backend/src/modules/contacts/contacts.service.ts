import { Injectable, NotFoundException } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { v4 as uuidv4 } from 'uuid';

export interface Contact {
  contact_id: string;
  company_id: string;
  name: string;
  phone: string;
  email?: string;
  source: 'CALL' | 'MANUAL' | 'IMPORT';
  tags?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
  last_contact_at?: string;
  total_calls?: number;
}

export interface CreateContactDto {
  name: string;
  phone: string;
  email?: string;
  source?: 'CALL' | 'MANUAL' | 'IMPORT';
  tags?: string[];
  notes?: string;
}

export interface UpdateContactDto {
  name?: string;
  phone?: string;
  email?: string;
  tags?: string[];
  notes?: string;
}

@Injectable()
export class ContactsService {
  constructor(private dynamodb: DynamoDBService) {}

  async getContacts(
    companyId: string,
    options?: {
      limit?: number;
      lastEvaluatedKey?: any;
    }
  ): Promise<{ contacts: Contact[]; lastEvaluatedKey?: any }> {
    // Use scan with company filter instead of GSI to avoid index dependency
    const result = await this.dynamodb.scan('contacts', {
      filterExpression: '#company_id = :company_id',
      expressionAttributeNames: {
        '#company_id': 'company_id',
      },
      expressionAttributeValues: {
        ':company_id': companyId,
      },
      limit: options?.limit || 50,
      exclusiveStartKey: options?.lastEvaluatedKey,
    });

    // Sort by created_at descending (most recent first)
    const sortedContacts = (result.items as Contact[]).sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });

    return {
      contacts: sortedContacts,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  async getContactById(companyId: string, contactId: string): Promise<Contact> {
    const contact = await this.dynamodb.get('contacts', {
      contact_id: contactId,
    });

    if (!contact || contact.company_id !== companyId) {
      throw new NotFoundException('Contact not found');
    }

    return contact as Contact;
  }

  async getContactByPhone(companyId: string, phone: string): Promise<Contact | null> {
    const result = await this.dynamodb.scan('contacts', {
      filterExpression: '#company_id = :company_id AND #phone = :phone',
      expressionAttributeNames: {
        '#company_id': 'company_id',
        '#phone': 'phone',
      },
      expressionAttributeValues: {
        ':company_id': companyId,
        ':phone': phone,
      },
      limit: 1,
    });

    const contacts = result.items as Contact[];
    return contacts.length > 0 ? contacts[0] : null;
  }

  async createContact(companyId: string, data: CreateContactDto): Promise<Contact> {
    const contactId = uuidv4();
    const now = new Date().toISOString();

    const contact: Contact = {
      contact_id: contactId,
      company_id: companyId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      source: data.source || 'MANUAL',
      tags: data.tags || [],
      notes: data.notes,
      created_at: now,
      updated_at: now,
      total_calls: 0,
    };

    await this.dynamodb.put('contacts', contact);

    return contact;
  }

  async updateContact(
    companyId: string,
    contactId: string,
    data: UpdateContactDto
  ): Promise<Contact> {
    const existing = await this.getContactById(companyId, contactId);

    const updates = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    await this.dynamodb.update(
      'contacts',
      { contact_id: contactId },
      updates
    );

    return {
      ...existing,
      ...updates,
    };
  }

  async deleteContact(companyId: string, contactId: string): Promise<void> {
    const contact = await this.getContactById(companyId, contactId);

    await this.dynamodb.delete('contacts', {
      contact_id: contactId,
    });
  }

  async searchContacts(
    companyId: string,
    query: string,
    options?: {
      limit?: number;
    }
  ): Promise<Contact[]> {
    const result = await this.dynamodb.scan('contacts', {
      filterExpression: '#company_id = :company_id',
      expressionAttributeNames: {
        '#company_id': 'company_id',
      },
      expressionAttributeValues: {
        ':company_id': companyId,
      },
      limit: 500, // Get more to filter from
    });

    // Filter results based on query
    const filtered = result.items.filter((contact: any) => {
      const searchableText = [
        contact.name,
        contact.phone,
        contact.email,
      ].join(' ').toLowerCase();
      return searchableText.includes(query.toLowerCase());
    });

    // Return limited results
    return (filtered as Contact[]).slice(0, options?.limit || 50);
  }

  async incrementCallCount(companyId: string, contactId: string): Promise<void> {
    const contact = await this.getContactById(companyId, contactId);

    await this.dynamodb.update(
      'contacts',
      { contact_id: contactId },
      {
        total_calls: (contact.total_calls || 0) + 1,
        last_contact_at: new Date().toISOString(),
      }
    );
  }

  async getContactAppointments(companyId: string, contactId: string): Promise<any[]> {
    const contact = await this.getContactById(companyId, contactId);

    const scan = await this.dynamodb.scan('appointments', {
      filterExpression: '#company_id = :company_id AND ( #contact_id = :contact_id OR #contact_phone = :contact_phone )',
      expressionAttributeNames: {
        '#company_id': 'company_id',
        '#contact_id': 'contact_id',
        '#contact_phone': 'contact_phone',
      },
      expressionAttributeValues: {
        ':company_id': companyId,
        ':contact_id': contactId,
        ':contact_phone': contact.phone,
      },
      limit: 500,
    });

    return (scan.items || []).sort((a: any, b: any) => (a?.scheduled_start ?? 0) - (b?.scheduled_start ?? 0));
  }
}
