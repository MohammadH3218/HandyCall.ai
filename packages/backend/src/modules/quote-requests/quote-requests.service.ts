import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { v4 as uuidv4 } from 'uuid';
import { CreateQuoteRequestDto, RespondToQuoteDto, UpdateQuoteRequestDto } from './dto/quote-request.dto';
import { ContactsService } from '../contacts/contacts.service';
import { CustomerProfilesService } from '../customer-profiles/customer-profiles.service';

@Injectable()
export class QuoteRequestsService {
  constructor(
    private readonly dynamodb: DynamoDBService,
    private readonly contacts: ContactsService,
    private readonly customerProfiles: CustomerProfilesService,
  ) {}

  private normalizeIdentity(value?: string) {
    return String(value || '').trim().toLowerCase();
  }

  private isEmailLike(value?: string) {
    return this.normalizeIdentity(value).includes('@');
  }

  private async scanAllQuoteRequests() {
    const items: any[] = [];
    let lastEvaluatedKey: Record<string, any> | undefined;

    do {
      const result = await this.dynamodb.scan('quote_requests', {
        limit: 200,
        exclusiveStartKey: lastEvaluatedKey,
      });
      items.push(...(result.items || []));
      lastEvaluatedKey = result.lastEvaluatedKey;
    } while (lastEvaluatedKey);

    return items;
  }

  async createQuoteRequest(dto: CreateQuoteRequestDto) {
    const quoteId = uuidv4();
    const now = Date.now();
    const profile = await this.customerProfiles.getByEmail(dto.contact_email);
    const resolvedCustomerUserId =
      !dto.customer_user_id || this.isEmailLike(dto.customer_user_id)
        ? profile?.user_id || dto.customer_user_id
        : dto.customer_user_id;

    const item = {
      quote_id: quoteId,
      // Public quotes don't have a company_id; we use 'marketplace' as partition
      company_id: 'marketplace',
      service_category: dto.service_category,
      job_description: dto.job_description,
      location_zipcode: dto.location_zipcode,
      location_city: dto.location_city,
      location_address_line1: dto.location_address_line1,
      location_address_line2: dto.location_address_line2,
      location_state: dto.location_state,
      contact_name: dto.contact_name,
      contact_email: dto.contact_email,
      contact_phone: dto.contact_phone,
      customer_user_id: resolvedCustomerUserId,
      preferred_date: dto.preferred_date,
      urgency: dto.urgency || 'flexible',
      provider_ids: dto.provider_ids || [],
      status: 'OPEN',
      responses: [],
      created_at: now,
      updated_at: now,
    };

    await this.dynamodb.put('quote_requests', item);
    return item;
  }

  async getQuoteRequest(quoteId: string) {
    return (await this.scanAllQuoteRequests()).find((item: any) => item.quote_id === quoteId) || null;
  }

  private matchesCustomer(
    quote: any,
    customer: { email?: string; userId?: string },
  ) {
    const email = this.normalizeIdentity(customer.email);
    const quoteEmail = this.normalizeIdentity(quote?.contact_email);
    const userIdLower = this.normalizeIdentity(customer.userId);
    const quoteUserIdLower = this.normalizeIdentity(quote?.customer_user_id);

    // Newer marketplace requests always persist the canonical customer user id.
    // When that id exists, we only trust that id for ownership checks to avoid
    // cross-account leaks caused by reused emails or earlier test data.
    if (quoteUserIdLower) {
      if (userIdLower && userIdLower === quoteUserIdLower) {
        return true;
      }

      if (this.isEmailLike(quoteUserIdLower)) {
        return Boolean(email) && email === quoteEmail;
      }

      return Boolean(userIdLower) && userIdLower === quoteUserIdLower;
    }

    // Legacy fallback for older rows created before customer_user_id existed.
    if (email && quoteEmail && email === quoteEmail) return true;
    return false;
  }

  async listQuoteRequestsByCategory(category: string, zipcode?: string) {
    let items = (await this.scanAllQuoteRequests()).filter(
      (item: any) =>
        item.company_id === 'marketplace' &&
        item.status === 'OPEN' &&
        item.service_category === category
    );
    if (zipcode) {
      items = items.filter((item: any) =>
        String(item.location_zipcode || '').startsWith(zipcode.slice(0, 3))
      );
    }
    return items;
  }

  // Pro responds to a quote request
  async respondToQuote(companyId: string, quoteId: string, dto: RespondToQuoteDto) {
    const existing = await this.getQuoteRequest(quoteId);
    if (!existing) throw new NotFoundException('Quote request not found');

    let contact: any = null;
    if (String(dto.status || 'RESPONDED').toUpperCase() === 'ACCEPTED') {
      const [firstName, ...rest] = String(existing.contact_name || '').trim().split(/\s+/).filter(Boolean);
      contact = await this.contacts.upsertMarketplaceContact(companyId, {
        phone_number: existing.contact_phone,
        email: existing.contact_email,
        first_name: firstName || undefined,
        last_name: rest.join(' ') || undefined,
        address: existing.location_address_line1,
        city: existing.location_city,
        state: existing.location_state,
        zipcode: existing.location_zipcode,
        source_quote_id: existing.quote_id,
      });
    }

    const response = {
      response_id: uuidv4(),
      company_id: companyId,
      message: dto.message,
      status: dto.status || 'RESPONDED',
      estimated_price_cents: dto.estimated_price_cents,
      estimated_duration: dto.estimated_duration,
      contact_id: contact?.contact_id,
      responded_at: Date.now(),
    };

    const responses = [
      ...(existing.responses || []).filter((entry: any) => entry.company_id !== companyId),
      response,
    ];

    await this.dynamodb.update(
      'quote_requests',
      { company_id: 'marketplace', quote_id: quoteId },
      { responses, updated_at: Date.now() },
    );

    return {
      ...response,
      contact,
    };
  }

  // Pro views quote requests in their service area/category
  async listForPro(companyId: string, category?: string) {
    let items = (await this.scanAllQuoteRequests()).filter(
      (item: any) => item.company_id === 'marketplace' && item.status === 'OPEN'
    ) as any[];
    if (category) {
      items = items.filter((i) => i.service_category === category);
    }
    // Exclude ones the pro already responded to
    items = items.filter((i) =>
      !(i.responses || []).some((r: any) => r.company_id === companyId)
    );
    return items.sort((a, b) => Number(b.updated_at || b.created_at || 0) - Number(a.updated_at || a.created_at || 0));
  }

  async listPastForPro(companyId: string, category?: string) {
    let items = (await this.scanAllQuoteRequests()).filter((item: any) => {
      if (item.company_id !== 'marketplace') return false;
      if (category && item.service_category !== category) return false;
      return (item.responses || []).some((response: any) => response.company_id === companyId);
    }) as any[];

    return items.sort((a, b) => Number(b.updated_at || b.created_at || 0) - Number(a.updated_at || a.created_at || 0));
  }

  // Get quote requests the customer submitted (by email)
  async listForCustomer(email: string) {
    return this.listForCustomerIdentity({ email });
  }

  async listForCustomerIdentity(customer: { email?: string; userId?: string }) {
    return (await this.scanAllQuoteRequests())
      .filter((item: any) => item.company_id === 'marketplace')
      .filter((item: any) => this.matchesCustomer(item, customer))
      .sort((a: any, b: any) => Number(b.updated_at || b.created_at || 0) - Number(a.updated_at || a.created_at || 0));
  }

  async updateQuoteRequestForCustomer(
    customer: { email?: string; userId?: string },
    quoteId: string,
    dto: UpdateQuoteRequestDto,
  ) {
    const existing = await this.getQuoteRequest(quoteId);
    if (!existing) throw new NotFoundException('Quote request not found');
    if (!this.matchesCustomer(existing, customer)) {
      throw new ForbiddenException('You do not have access to this request');
    }

    const updates: Record<string, any> = {
      updated_at: Date.now(),
    };

    const allowedFields: (keyof UpdateQuoteRequestDto)[] = [
      'job_description',
      'location_zipcode',
      'location_city',
      'location_address_line1',
      'location_address_line2',
      'location_state',
      'contact_name',
      'contact_email',
      'contact_phone',
      'preferred_date',
      'urgency',
    ];

    for (const field of allowedFields) {
      if (dto[field] !== undefined) {
        updates[field] = dto[field];
      }
    }

    await this.dynamodb.update(
      'quote_requests',
      { company_id: 'marketplace', quote_id: quoteId },
      updates,
    );

    return this.getQuoteRequest(quoteId);
  }
}
