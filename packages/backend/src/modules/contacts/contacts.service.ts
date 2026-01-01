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
    const result = await this.dynamodb.queryByCompany(
      'contacts',
      companyId,
      {},
      {
        indexName: 'company_id-created_at-index',
        limit: options?.limit || 50,
        scanIndexForward: false, // Most recent first
        exclusiveStartKey: options?.lastEvaluatedKey,
      }
    );

    return {
      contacts: result.items as Contact[],
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
    const result = await this.dynamodb.queryByCompany(
      'contacts',
      companyId,
      {
        filterExpression: '#phone = :phone',
      }
    );

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
    const result = await this.dynamodb.queryByCompany(
      'contacts',
      companyId,
      {},
      {
        indexName: 'company_id-created_at-index',
        limit: options?.limit || 50,
      }
    );

    // Filter results based on query
    const filtered = result.items.filter((contact: any) => {
      const searchableText = [
        contact.name,
        contact.phone,
        contact.email,
      ].join(' ').toLowerCase();
      return searchableText.includes(query.toLowerCase());
    });

    return filtered as Contact[];
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
}
