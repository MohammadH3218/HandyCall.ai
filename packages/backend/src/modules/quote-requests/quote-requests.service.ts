import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { PortalMessagingService } from '../portal-messaging/portal-messaging.service';
import { EmailService } from '../email/email.service';
import { renderHandycallEmail } from '../../common/email-templates';

const QUOTE_REQUESTS_TABLE = 'quote_requests';

export type QuoteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CLOSED';

@Injectable()
export class QuoteRequestsService {
  private readonly logger = new Logger(QuoteRequestsService.name);

  constructor(
    private db: DynamoDBService,
    private messaging: PortalMessagingService,
    private email: EmailService,
  ) {}

  // ── Customer: submit a request to a specific pro ──────────────────────────

  async submitRequest(
    customerId: string,
    data: {
      pro_id: string;
      service_category: string;
      job_description: string;
      district: string;
      contact_name?: string;
      contact_email?: string;
      contact_phone?: string;
      address_line1?: string;
      address_line2?: string;
    },
  ) {
    if (!data.pro_id) throw new BadRequestException('pro_id is required');
    if (!data.job_description?.trim()) throw new BadRequestException('job_description is required');

    // Validate pro exists
    const pro = await this.db.get('pros', { pro_id: data.pro_id });
    if (!pro) throw new NotFoundException('Pro not found');

    const quote: Record<string, any> = {
      quote_id: uuidv4(),
      customer_user_id: customerId,
      pro_id: data.pro_id,
      service_category: data.service_category,
      job_description: data.job_description.trim(),
      district: data.district,
      status: 'PENDING' as QuoteStatus,
      contact_name: data.contact_name ?? null,
      contact_email: data.contact_email ?? null,
      contact_phone: data.contact_phone ?? null,
      address_line1: data.address_line1 ?? null,
      address_line2: data.address_line2 ?? null,
      thread_id: null,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    await this.db.put(QUOTE_REQUESTS_TABLE, quote);

    this.logger.log(`Quote ${quote.quote_id} submitted by customer ${customerId} to pro ${data.pro_id}`);
    return quote;
  }

  // ── Customer: list own requests ────────────────────────────────────────────

  async listCustomerRequests(customerId: string): Promise<any[]> {
    const { items } = await this.db.query(
      QUOTE_REQUESTS_TABLE,
      '#customer_user_id = :cuid',
      { '#customer_user_id': 'customer_user_id' },
      { ':cuid': customerId },
      { indexName: 'customer-quotes-index', scanIndexForward: false, limit: 50 },
    ).catch(() => ({ items: [] }));

    // Enrich with pro name
    const enriched = await Promise.all(
      items.map(async (q) => {
        try {
          const pro = await this.db.get('pros', { pro_id: q.pro_id });
          if (pro) {
            return {
              ...q,
              pro_name: `${(pro as any).first_name ?? ''} ${(pro as any).last_name ?? ''}`.trim(),
              pro_photo: (pro as any).marketplace_profile?.profile_photo ?? null,
            };
          }
        } catch { /* ignore */ }
        return q;
      })
    );

    return enriched;
  }

  // ── Customer: update own request ───────────────────────────────────────────

  async updateCustomerRequest(
    customerId: string,
    quoteId: string,
    data: Partial<{
      job_description: string;
      district: string;
      contact_name: string;
      contact_email: string;
      contact_phone: string;
    }>,
  ) {
    const existing = await this.db.get(QUOTE_REQUESTS_TABLE, { quote_id: quoteId }) as any;
    if (!existing) throw new NotFoundException('Request not found');
    if (existing.customer_user_id !== customerId) throw new NotFoundException('Request not found');
    if (existing.status !== 'PENDING') {
      throw new BadRequestException('Only pending requests can be updated');
    }
    const updates = { ...data, updated_at: Date.now() };
    return this.db.update(QUOTE_REQUESTS_TABLE, { quote_id: quoteId }, updates);
  }

  // ── Pro: list available (incoming) requests ────────────────────────────────

  async listProAvailableRequests(proId: string): Promise<any[]> {
    const { items } = await this.db.query(
      QUOTE_REQUESTS_TABLE,
      '#pro_id = :pid',
      { '#pro_id': 'pro_id', '#qstatus': 'status' },
      { ':pid': proId, ':pending': 'PENDING' },
      {
        indexName: 'pro-quotes-index',
        filterExpression: '#qstatus = :pending',
        scanIndexForward: false,
        limit: 50,
      },
    ).catch(() => ({ items: [] }));

    // Only return redacted info (district + description, no personal details)
    return items.map((q: any) => ({
      quote_id: q.quote_id,
      service_category: q.service_category,
      job_description: q.job_description,
      district: q.district,
      status: q.status,
      created_at: q.created_at,
    }));
  }

  // ── Pro: list past (accepted/declined) requests ────────────────────────────

  async listProPastRequests(proId: string): Promise<any[]> {
    const { items } = await this.db.query(
      QUOTE_REQUESTS_TABLE,
      '#pro_id = :pid',
      { '#pro_id': 'pro_id', '#qstatus': 'status' },
      { ':pid': proId, ':pending': 'PENDING' },
      {
        indexName: 'pro-quotes-index',
        filterExpression: '#qstatus <> :pending',
        scanIndexForward: false,
        limit: 50,
      },
    ).catch(() => ({ items: [] }));

    return items.map((q: any) => ({
      quote_id: q.quote_id,
      service_category: q.service_category,
      job_description: q.job_description,
      district: q.district,
      status: q.status,
      created_at: q.created_at,
      thread_id: q.thread_id ?? null,
      // Only reveal personal info for accepted requests
      ...(q.status === 'ACCEPTED' && {
        contact_name: q.contact_name,
        contact_email: q.contact_email,
        contact_phone: q.contact_phone,
        address_line1: q.address_line1,
        address_line2: q.address_line2,
      }),
    }));
  }

  // ── Pro: get single request (full info if accepted) ─────────────────────────

  async getProRequest(proId: string, quoteId: string): Promise<any> {
    const q = await this.db.get(QUOTE_REQUESTS_TABLE, { quote_id: quoteId }) as any;
    if (!q || q.pro_id !== proId) throw new NotFoundException('Request not found');

    return {
      quote_id: q.quote_id,
      service_category: q.service_category,
      job_description: q.job_description,
      district: q.district,
      status: q.status,
      created_at: q.created_at,
      thread_id: q.thread_id ?? null,
      ...(q.status !== 'PENDING' && {
        contact_name: q.contact_name,
        contact_email: q.contact_email,
        contact_phone: q.contact_phone,
        address_line1: q.address_line1,
        address_line2: q.address_line2,
      }),
    };
  }

  // ── Pro: respond to a request (accept/decline) ─────────────────────────────

  async respondToRequest(
    proId: string,
    quoteId: string,
    action: 'ACCEPT' | 'DECLINE',
  ): Promise<{ quote: any; thread?: any }> {
    const q = await this.db.get(QUOTE_REQUESTS_TABLE, { quote_id: quoteId }) as any;
    if (!q) throw new NotFoundException('Request not found');
    if (q.pro_id !== proId) throw new NotFoundException('Request not found');
    if (q.status !== 'PENDING') {
      throw new BadRequestException('Request has already been responded to');
    }

    // Look up pro info for emails
    const pro = await this.db.get('pros', { pro_id: proId }).catch(() => null) as any;
    const proName = pro
      ? `${pro.first_name ?? ''} ${pro.last_name ?? ''}`.trim() || 'Your pro'
      : 'Your pro';

    if (action === 'DECLINE') {
      const updated = await this.db.update(
        QUOTE_REQUESTS_TABLE,
        { quote_id: quoteId },
        { status: 'DECLINED', updated_at: Date.now() },
      );

      // Email the customer that their request was declined
      if (q.contact_email) {
        this.email['send']({
          to: q.contact_email,
          subject: `Update on your ${q.service_category} request — HandyCall`,
          html: renderHandycallEmail({
            title: 'Request update',
            greeting: `Hi ${q.contact_name || 'there'},`,
            body: `${proName} was unable to take on your <strong>${q.service_category}</strong> request at this time.<br><br>Don't worry — you can browse other available pros on HandyCall and submit a new request.`,
            cta: { label: 'Find another pro', url: 'https://handycall.org/search' },
            footer: 'Questions? Contact us at hello@handycall.org',
          }),
        }).catch((err: Error) => this.logger.warn(`Failed to send decline email: ${err.message}`));
      }

      return { quote: updated };
    }

    // ACCEPT: create a chat thread, reveal contact info
    const thread = await this.messaging.getOrCreateThread({
      proId,
      customerUserId: q.customer_user_id,
      customerEmail: q.contact_email ?? '',
      customerName: q.contact_name ?? undefined,
      quoteContext: {
        quote_id: quoteId,
        service_category: q.service_category,
        location_city: q.district,
        job_description: q.job_description,
        contact_name: q.contact_name ?? null,
        contact_email: q.contact_email ?? null,
        contact_phone: q.contact_phone ?? null,
        address_line1: q.address_line1 ?? null,
        address_line2: q.address_line2 ?? null,
        urgency: q.urgency ?? null,
        created_at: q.created_at,
      },
    });

    // Send a system message to open the conversation
    await this.messaging.sendMessage({
      threadId: thread.thread_id,
      proId,
      senderType: 'PRO',
      body: `${proName} accepted your request! You can now message each other about the ${q.service_category} job.`,
      messageType: 'system',
      systemEvent: 'request_accepted',
      customerEmail: q.contact_email ?? '',
      customerUserId: q.customer_user_id,
      customerName: q.contact_name ?? undefined,
    });

    // Update the quote with ACCEPTED status and thread reference
    const updated = await this.db.update(
      QUOTE_REQUESTS_TABLE,
      { quote_id: quoteId },
      {
        status: 'ACCEPTED',
        thread_id: thread.thread_id,
        accepted_at: Date.now(),
        updated_at: Date.now(),
      },
    );

    // Email the customer that their request was accepted
    if (q.contact_email) {
      this.email['send']({
        to: q.contact_email,
        subject: `${proName} accepted your ${q.service_category} request! — HandyCall`,
        html: renderHandycallEmail({
          title: 'Request accepted!',
          greeting: `Hi ${q.contact_name || 'there'},`,
          body: `Great news! <strong>${proName}</strong> has accepted your <strong>${q.service_category}</strong> request and is ready to help.<br><br>You can now message them directly through HandyCall to coordinate timing and any details.`,
          cta: { label: 'Open chat', url: `https://handycall.org/customer/dashboard/inbox?thread_id=${thread.thread_id}` },
          footer: 'Questions? Contact us at hello@handycall.org',
        }),
      }).catch((err: Error) => this.logger.warn(`Failed to send accept email: ${err.message}`));
    }

    this.logger.log(`Quote ${quoteId} accepted by pro ${proId} → thread ${thread.thread_id}`);
    return { quote: updated, thread };
  }
}
