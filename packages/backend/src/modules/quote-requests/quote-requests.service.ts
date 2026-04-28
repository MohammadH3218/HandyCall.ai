import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { PortalMessagingService } from '../portal-messaging/portal-messaging.service';
import { EmailService } from '../email/email.service';
import { renderHandycallEmail } from '../../common/email-templates';
import { getLeadFeeHalalas, halalasToSar, OPEN_JOB_TTL_MS } from './lead-fee-tiers';

const QUOTE_REQUESTS_TABLE = 'quote_requests';
const LEAD_FEE_TRANSACTIONS_TABLE = 'lead_fee_transactions';

export type QuoteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CLOSED' | 'OPEN' | 'CLAIMED' | 'EXPIRED';
export type RequestType = 'DIRECT' | 'OPEN';

@Injectable()
export class QuoteRequestsService {
  private readonly logger = new Logger(QuoteRequestsService.name);

  constructor(
    private db: DynamoDBService,
    private messaging: PortalMessagingService,
    private email: EmailService,
  ) {}

  // ── Customer: submit a direct request to a specific pro ───────────────────

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

    const pro = await this.db.get('pros', { pro_id: data.pro_id });
    if (!pro) throw new NotFoundException('Pro not found');

    const quote: Record<string, any> = {
      quote_id: uuidv4(),
      request_type: 'DIRECT' as RequestType,
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
    this.logger.log(`Direct quote ${quote.quote_id} submitted by customer ${customerId} to pro ${data.pro_id}`);
    return quote;
  }

  // ── Customer: post an open job to the jobs board ───────────────────────────

  async postOpenJob(
    customerId: string,
    data: {
      service_category: string;
      job_description: string;
      district: string;
      contact_name?: string;
      contact_email?: string;
      contact_phone?: string;
      photos?: string[];
    },
  ) {
    if (!data.service_category?.trim()) throw new BadRequestException('service_category is required');
    if (!data.district?.trim()) throw new BadRequestException('district is required');
    if (!data.job_description?.trim() || data.job_description.trim().length < 50) {
      throw new BadRequestException('job_description must be at least 50 characters');
    }

    const leadFeeHalalas = getLeadFeeHalalas(data.service_category);
    const now = Date.now();

    const quote: Record<string, any> = {
      quote_id: uuidv4(),
      request_type: 'OPEN' as RequestType,
      customer_user_id: customerId,
      pro_id: null,
      service_category: data.service_category,
      job_description: data.job_description.trim(),
      district: data.district,
      status: 'OPEN' as QuoteStatus,
      lead_fee_halalas: leadFeeHalalas,
      expires_at: now + OPEN_JOB_TTL_MS,
      photos: data.photos ?? [],
      contact_name: data.contact_name ?? null,
      contact_email: data.contact_email ?? null,
      contact_phone: data.contact_phone ?? null,
      thread_id: null,
      created_at: now,
      updated_at: now,
    };

    await this.db.put(QUOTE_REQUESTS_TABLE, quote);
    this.logger.log(`Open job ${quote.quote_id} posted by customer ${customerId} — lead fee SAR ${halalasToSar(leadFeeHalalas)}`);
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

    const enriched = await Promise.all(
      items.map(async (q: any) => {
        if (q.request_type === 'OPEN') return q;
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

  // ── Customer: list own open job posts ─────────────────────────────────────

  async listCustomerOpenJobs(customerId: string): Promise<any[]> {
    const { items } = await this.db.query(
      QUOTE_REQUESTS_TABLE,
      '#customer_user_id = :cuid',
      { '#customer_user_id': 'customer_user_id', '#rtype': 'request_type' },
      { ':cuid': customerId, ':open_type': 'OPEN' },
      {
        indexName: 'customer-quotes-index',
        filterExpression: '#rtype = :open_type',
        scanIndexForward: false,
        limit: 50,
      },
    ).catch(() => ({ items: [] }));

    const now = Date.now();
    return items
      .map((q: any) => ({
        ...q,
        is_expired: q.expires_at < now,
        time_remaining_ms: Math.max(0, q.expires_at - now),
      }))
      .sort((a: any, b: any) => b.created_at - a.created_at);
  }

  // ── Customer: update own direct request ───────────────────────────────────

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
    if (existing.status !== 'PENDING') throw new BadRequestException('Only pending requests can be updated');
    return this.db.update(QUOTE_REQUESTS_TABLE, { quote_id: quoteId }, { ...data, updated_at: Date.now() });
  }

  // ── Pro: browse jobs board (filtered by their categories/districts) ────────

  async listJobsBoard(proId: string, filters?: { category?: string; district?: string }): Promise<any[]> {
    const pro = await this.db.get('pros', { pro_id: proId }) as any;
    const proCategories: string[] = pro?.service_categories ?? pro?.marketplace_profile?.service_categories ?? [];
    const proDistricts: string[] = pro?.service_districts ?? pro?.marketplace_profile?.service_districts ?? [];

    const now = Date.now();
    const { items } = await this.db.scan(QUOTE_REQUESTS_TABLE, {
      filterExpression: '#qstatus = :open AND #rtype = :rtype AND #expires_at > :now',
      expressionAttributeNames: {
        '#qstatus': 'status',
        '#rtype': 'request_type',
        '#expires_at': 'expires_at',
      },
      expressionAttributeValues: {
        ':open': 'OPEN',
        ':rtype': 'OPEN',
        ':now': now,
      },
    }).catch(() => ({ items: [] }));

    let results = items as any[];

    if (proCategories.length > 0) {
      results = results.filter((q) => proCategories.includes(q.service_category));
    }
    if (proDistricts.length > 0) {
      results = results.filter((q) => proDistricts.includes(q.district));
    }

    if (filters?.category) results = results.filter((q) => q.service_category === filters.category);
    if (filters?.district) results = results.filter((q) => q.district === filters.district);

    return results
      .sort((a, b) => b.created_at - a.created_at)
      .map((q) => ({
        quote_id: q.quote_id,
        service_category: q.service_category,
        job_description: q.job_description,
        district: q.district,
        status: q.status,
        lead_fee_halalas: q.lead_fee_halalas,
        lead_fee_sar: halalasToSar(q.lead_fee_halalas),
        photos: q.photos ?? [],
        expires_at: q.expires_at,
        time_remaining_ms: q.expires_at - now,
        created_at: q.created_at,
      }));
  }

  // ── Pro: list incoming pending direct requests ─────────────────────────────

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

    return items.map((q: any) => ({
      quote_id: q.quote_id,
      service_category: q.service_category,
      job_description: q.job_description,
      district: q.district,
      status: q.status,
      created_at: q.created_at,
    }));
  }

  // ── Pro: list past direct requests ────────────────────────────────────────

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
      request_type: q.request_type ?? 'DIRECT',
      lead_fee_halalas: q.lead_fee_halalas ?? null,
      lead_fee_sar: q.lead_fee_halalas ? halalasToSar(q.lead_fee_halalas) : null,
      created_at: q.created_at,
      thread_id: q.thread_id ?? null,
      ...((q.status === 'ACCEPTED' || q.status === 'CLAIMED') ? {
        contact_name: q.contact_name,
        contact_email: q.contact_email,
        contact_phone: q.contact_phone,
        address_line1: q.address_line1,
        address_line2: q.address_line2,
      } : {}),
    }));
  }

  // ── Pro: get single direct request ────────────────────────────────────────

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
      ...(q.status !== 'PENDING' ? {
        contact_name: q.contact_name,
        contact_email: q.contact_email,
        contact_phone: q.contact_phone,
        address_line1: q.address_line1,
        address_line2: q.address_line2,
      } : {}),
    };
  }

  // ── Pro: claim an open job (first-come-first-served, atomic) ──────────────

  async claimOpenJob(proId: string, quoteId: string): Promise<{ quote: any; thread: any }> {
    const q = await this.db.get(QUOTE_REQUESTS_TABLE, { quote_id: quoteId }) as any;
    if (!q) throw new NotFoundException('Job not found');
    if (q.request_type !== 'OPEN') throw new BadRequestException('This is not an open job post');
    if (q.status === 'EXPIRED' || (q.expires_at && q.expires_at < Date.now())) {
      throw new BadRequestException('This job post has expired');
    }
    if (q.status === 'CLAIMED') throw new ConflictException('This job was already claimed by another pro');
    if (q.status !== 'OPEN') throw new BadRequestException('Job is not available');

    // Atomic conditional update — only one pro wins
    try {
      await this.db.updateRaw(QUOTE_REQUESTS_TABLE, {
        Key: { quote_id: quoteId },
        UpdateExpression: 'SET #status = :claimed, #pro_id = :proId, #updated_at = :now, claimed_at = :now',
        ConditionExpression: '#status = :open',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#pro_id': 'pro_id',
          '#updated_at': 'updated_at',
        },
        ExpressionAttributeValues: {
          ':claimed': 'CLAIMED',
          ':open': 'OPEN',
          ':proId': proId,
          ':now': Date.now(),
        },
      });
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') {
        throw new ConflictException('Another pro claimed this job first — please refresh the board');
      }
      throw err;
    }

    const updated = await this.db.get(QUOTE_REQUESTS_TABLE, { quote_id: quoteId }) as any;

    // Record lead fee transaction
    const leadFeeHalalas = q.lead_fee_halalas ?? getLeadFeeHalalas(q.service_category);
    await this.db.put(LEAD_FEE_TRANSACTIONS_TABLE, {
      transaction_id: uuidv4(),
      pro_id: proId,
      quote_id: quoteId,
      amount_halalas: leadFeeHalalas,
      transaction_type: 'CHARGE',
      description: `Lead fee — ${q.service_category} job in ${q.district}`,
      created_at: Date.now(),
    });

    const pro = await this.db.get('pros', { pro_id: proId }).catch(() => null) as any;
    const proName = pro
      ? `${pro.first_name ?? ''} ${pro.last_name ?? ''}`.trim() || 'Your pro'
      : 'Your pro';

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
        address_line1: null,
        address_line2: null,
        urgency: null,
        created_at: q.created_at,
      },
    });

    await this.messaging.sendMessage({
      threadId: thread.thread_id,
      proId,
      senderType: 'PRO',
      body: `${proName} accepted your ${q.service_category} job post and will be in touch shortly.`,
      messageType: 'system',
      systemEvent: 'job_claimed',
      customerEmail: q.contact_email ?? '',
      customerUserId: q.customer_user_id,
      customerName: q.contact_name ?? undefined,
    });

    await this.db.update(QUOTE_REQUESTS_TABLE, { quote_id: quoteId }, { thread_id: thread.thread_id });

    if (q.contact_email) {
      this.email['send']({
        to: q.contact_email,
        subject: `${proName} accepted your ${q.service_category} job! — HandyCall`,
        html: renderHandycallEmail({
          title: 'Your job was accepted!',
          greeting: `Hi ${q.contact_name || 'there'},`,
          body: `Great news! <strong>${proName}</strong> has accepted your <strong>${q.service_category}</strong> job post and will be reaching out shortly.`,
          cta: { label: 'Open chat', url: 'https://handycall.org/dashboard/messages' },
          footer: 'Questions? Contact us at hello@handycall.org',
        }),
      }).catch((err: Error) => this.logger.warn(`Failed to send claim email: ${err.message}`));
    }

    this.logger.log(`Open job ${quoteId} claimed by pro ${proId} — ${leadFeeHalalas} halalas charged`);
    return { quote: updated, thread };
  }

  // ── Pro: respond to a direct request (accept/decline) ─────────────────────

  async respondToRequest(
    proId: string,
    quoteId: string,
    action: 'ACCEPT' | 'DECLINE',
  ): Promise<{ quote: any; thread?: any }> {
    const q = await this.db.get(QUOTE_REQUESTS_TABLE, { quote_id: quoteId }) as any;
    if (!q) throw new NotFoundException('Request not found');
    if (q.pro_id !== proId) throw new NotFoundException('Request not found');
    if (q.status !== 'PENDING') throw new BadRequestException('Request has already been responded to');

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

      if (q.contact_email) {
        this.email['send']({
          to: q.contact_email,
          subject: `Update on your ${q.service_category} request — HandyCall`,
          html: renderHandycallEmail({
            title: 'Request update',
            greeting: `Hi ${q.contact_name || 'there'},`,
            body: `${proName} was unable to take on your <strong>${q.service_category}</strong> request at this time.<br><br>You can browse other available pros on HandyCall and submit a new request.`,
            cta: { label: 'Find another pro', url: 'https://handycall.org/search' },
            footer: 'Questions? Contact us at hello@handycall.org',
          }),
        }).catch((err: Error) => this.logger.warn(`Failed to send decline email: ${err.message}`));
      }

      return { quote: updated };
    }

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

    const updated = await this.db.update(
      QUOTE_REQUESTS_TABLE,
      { quote_id: quoteId },
      { status: 'ACCEPTED', thread_id: thread.thread_id, accepted_at: Date.now(), updated_at: Date.now() },
    );

    if (q.contact_email) {
      this.email['send']({
        to: q.contact_email,
        subject: `${proName} accepted your ${q.service_category} request! — HandyCall`,
        html: renderHandycallEmail({
          title: 'Request accepted!',
          greeting: `Hi ${q.contact_name || 'there'},`,
          body: `Great news! <strong>${proName}</strong> has accepted your <strong>${q.service_category}</strong> request and is ready to help.`,
          cta: { label: 'Open chat', url: `https://handycall.org/customer/dashboard/inbox?thread_id=${thread.thread_id}` },
          footer: 'Questions? Contact us at hello@handycall.org',
        }),
      }).catch((err: Error) => this.logger.warn(`Failed to send accept email: ${err.message}`));
    }

    this.logger.log(`Direct quote ${quoteId} accepted by pro ${proId} → thread ${thread.thread_id}`);
    return { quote: updated, thread };
  }

  // ── Pro: lead fee transaction history ────────────────────────────────────

  async listProLeadFeeTransactions(proId: string): Promise<{
    transactions: any[];
    total_charged_halalas: number;
    total_charged_sar: number;
  }> {
    const { items } = await this.db.query(
      LEAD_FEE_TRANSACTIONS_TABLE,
      '#pro_id = :pid',
      { '#pro_id': 'pro_id' },
      { ':pid': proId },
      { indexName: 'pro-transactions-index', scanIndexForward: false, limit: 100 },
    ).catch(() => ({ items: [] }));
    const transactions = items as any[];

    const totalHalalas = transactions.reduce((sum: number, t: any) => {
      return t.transaction_type === 'CHARGE' ? sum + (t.amount_halalas ?? 0) : sum - (t.amount_halalas ?? 0);
    }, 0);

    return {
      transactions: transactions.map((t: any) => ({ ...t, amount_sar: halalasToSar(t.amount_halalas) })),
      total_charged_halalas: totalHalalas,
      total_charged_sar: halalasToSar(totalHalalas),
    };
  }
}
