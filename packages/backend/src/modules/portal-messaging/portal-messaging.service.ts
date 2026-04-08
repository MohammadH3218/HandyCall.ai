import { ForbiddenException, Injectable, MessageEvent } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { v4 as uuidv4 } from 'uuid';
import { CompaniesService } from '../companies/companies.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventEmitter } from 'events';
import { Observable } from 'rxjs';

@Injectable()
export class PortalMessagingService {
  private readonly streamEmitter = new EventEmitter();

  constructor(
    private readonly dynamodb: DynamoDBService,
    private readonly companies: CompaniesService,
    private readonly notifications: NotificationsService,
  ) {
    this.streamEmitter.setMaxListeners(0);
  }

  private publishThreadUpdate(event: {
    company_id: string;
    thread_id: string;
    customer_email?: string;
    customer_user_id?: string;
    customer_name?: string;
    quote_context?: any;
    direction: 'INBOUND' | 'OUTBOUND';
    message_type?: string;
    system_event?: string;
    created_at: number;
  }) {
    this.streamEmitter.emit('thread-update', event);
  }

  streamProEvents(companyId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const listener = (event: any) => {
        if (event?.company_id !== companyId) return;
        subscriber.next({ data: event });
      };

      this.streamEmitter.on('thread-update', listener);

      const heartbeat = setInterval(() => {
        subscriber.next({ data: { type: 'heartbeat', ts: Date.now() } });
      }, 25000);

      return () => {
        clearInterval(heartbeat);
        this.streamEmitter.off('thread-update', listener);
      };
    });
  }

  streamCustomerEvents(identity: { email?: string; userId?: string }): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const listener = (event: any) => {
        if (!this.matchesIdentity(event, identity)) return;
        subscriber.next({ data: event });
      };

      this.streamEmitter.on('thread-update', listener);

      const heartbeat = setInterval(() => {
        subscriber.next({ data: { type: 'heartbeat', ts: Date.now() } });
      }, 25000);

      return () => {
        clearInterval(heartbeat);
        this.streamEmitter.off('thread-update', listener);
      };
    });
  }

  private async scanAllPortalMessages(filter?: {
    companyId?: string;
    customerEmail?: string;
    threadId?: string;
  }) {
    const items: any[] = [];
    let lastEvaluatedKey: Record<string, any> | undefined;

    do {
      const result = await this.dynamodb.scan('portal_messages', {
        limit: 200,
        exclusiveStartKey: lastEvaluatedKey,
      });
      items.push(...(result.items || []));
      lastEvaluatedKey = result.lastEvaluatedKey;
    } while (lastEvaluatedKey);

    return items.filter((item: any) => {
      if (filter?.companyId && item.company_id !== filter.companyId) return false;
      if (filter?.customerEmail) {
        const left = String(item.customer_email || '').trim().toLowerCase();
        const right = String(filter.customerEmail || '').trim().toLowerCase();
        if (!left || left !== right) return false;
      }
      if (filter?.threadId && item.thread_id !== filter.threadId) return false;
      return true;
    });
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

  private normalizeIdentity(value?: string) {
    return String(value || '').trim().toLowerCase();
  }

  private isEmailLike(value?: string) {
    return this.normalizeIdentity(value).includes('@');
  }

  private matchesIdentity(
    item: any,
    identity: { email?: string; userId?: string },
  ) {
    const email = this.normalizeIdentity(identity.email);
    const userId = this.normalizeIdentity(identity.userId);
    const customerUserId = this.normalizeIdentity(
      item?.customer_user_id || item?.quote_context?.customer_user_id,
    );
    const customerEmail = this.normalizeIdentity(
      item?.customer_email || item?.quote_context?.contact_email,
    );

    // Prefer the canonical customer identity whenever it is present.
    // Older rows briefly wrote the customer's email into customer_user_id by mistake,
    // so allow those rows to resolve by email until they age out.
    if (customerUserId) {
      if (Boolean(userId) && userId === customerUserId) {
        return true;
      }

      if (this.isEmailLike(customerUserId)) {
        return Boolean(email) && email === customerEmail;
      }

      return Boolean(userId) && userId === customerUserId;
    }

    // Legacy fallback for older rows without a customer_user_id.
    return Boolean(email) && email === customerEmail;
  }

  private buildQuoteLookup(quotes: any[]) {
    const byId = new Map<string, any>();
    for (const quote of quotes) {
      const quoteId = String(quote?.quote_id || '').trim();
      if (quoteId) byId.set(quoteId, quote);
    }
    return byId;
  }

  // Get all message threads for a company (pro-side)
  async getProThreads(companyId: string) {
    const quoteLookup = this.buildQuoteLookup(await this.scanAllQuoteRequests());
    // Group by thread_id
    const threads = new Map<string, any>();
    for (const msg of await this.scanAllPortalMessages({ companyId })) {
      const quoteFromLookup = quoteLookup.get(String(msg?.quote_context?.quote_id || '').trim());
      const mergedMessage = quoteFromLookup
        ? {
            ...msg,
            quote_context: {
              ...quoteFromLookup,
              ...(msg.quote_context || {}),
            },
            customer_user_id: msg.customer_user_id || quoteFromLookup.customer_user_id,
            customer_email: msg.customer_email || quoteFromLookup.contact_email,
          }
        : msg;
      const tid = String(msg.thread_id || '');
      if (!tid) continue;
      const existing = threads.get(tid);
      if (!existing || mergedMessage.created_at > existing.last_at) {
        threads.set(tid, {
          thread_id: tid,
          customer_name: mergedMessage.customer_name || existing?.customer_name || 'Customer',
          customer_email: mergedMessage.customer_email || existing?.customer_email,
          customer_phone: mergedMessage.customer_phone || existing?.customer_phone,
          customer_user_id: mergedMessage.customer_user_id || existing?.customer_user_id,
          quote_context: mergedMessage.quote_context || existing?.quote_context,
          request_status: mergedMessage.request_status || existing?.request_status,
          last_message: mergedMessage.body,
          last_at: mergedMessage.created_at,
          unread: mergedMessage.direction === 'INBOUND' && !mergedMessage.read_at,
        });
      }
    }
    return [...threads.values()].sort((a, b) => b.last_at - a.last_at);
  }

  // Get messages in a thread
  async getThreadMessages(companyId: string, threadId: string) {
    return (await this.scanAllPortalMessages({ companyId, threadId })).sort(
      (a, b) => a.created_at - b.created_at
    );
  }

  // Pro sends a message to customer
  async sendProMessage(
    companyId: string,
    threadId: string,
    body: string,
    options?: {
      customer_email?: string;
      customer_name?: string;
      customer_phone?: string;
      customer_user_id?: string;
      request_status?: string;
      quote_context?: any;
      attachments?: Array<{
        url: string;
        width?: number;
        height?: number;
        mime_type?: string;
        name?: string;
      }>;
      message_type?: string;
      system_event?: string;
    }
  ) {
    const now = Date.now();
    const messageId = `${now}-${uuidv4()}`;
    const company = await this.companies.findById(companyId);
    const messageType = options?.message_type || 'MESSAGE';
    const systemEvent = options?.system_event;
    const normalizedBody =
      messageType === 'SYSTEM' && systemEvent === 'REQUEST_ACCEPTED'
        ? body || `${company?.company_name || 'Pro'} has accepted your request`
        : body;

    await this.dynamodb.put('portal_messages', {
      company_id: companyId,
      company_name: company?.company_name || 'Pro',
      message_id: messageId,
      thread_id: threadId,
      direction: 'OUTBOUND',
      body: normalizedBody,
      customer_email: options?.customer_email,
      customer_name: options?.customer_name,
      customer_phone: options?.customer_phone,
      customer_user_id: options?.customer_user_id,
      request_status: options?.request_status,
      quote_context: options?.quote_context,
      attachments: options?.attachments || [],
      message_type: messageType,
      system_event: systemEvent,
      created_at: now,
      updated_at: now,
    });

    this.publishThreadUpdate({
      company_id: companyId,
      thread_id: threadId,
      customer_email: options?.customer_email,
      customer_name: options?.customer_name,
      customer_user_id: options?.customer_user_id,
      quote_context: options?.quote_context,
      direction: 'OUTBOUND',
      message_type: messageType,
      system_event: systemEvent,
      created_at: now,
    });

    return {
      message_id: messageId,
      body: normalizedBody,
      direction: 'OUTBOUND',
      message_type: messageType,
      system_event: systemEvent,
      created_at: now,
    };
  }

  // Customer sends a message (uses company_id of the pro they're messaging)
  async sendCustomerMessage(
    companyId: string,
    threadId: string,
    body: string,
    customerName?: string,
    customerEmail?: string,
    customerUserId?: string,
    customerPhone?: string,
    quoteContext?: any,
    attachments?: Array<{
      url: string;
      width?: number;
      height?: number;
      mime_type?: string;
      name?: string;
    }>
  ) {
    const now = Date.now();
    const messageId = `${now}-${uuidv4()}`;
    const company = await this.companies.findById(companyId);

    await this.dynamodb.put('portal_messages', {
      company_id: companyId,
      company_name: company?.company_name || 'Pro',
      message_id: messageId,
      thread_id: threadId,
      direction: 'INBOUND',
      body,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_user_id: customerUserId,
      customer_phone: customerPhone,
      quote_context: quoteContext,
      attachments: attachments || [],
      created_at: now,
      updated_at: now,
    });

    this.publishThreadUpdate({
      company_id: companyId,
      thread_id: threadId,
      customer_email: customerEmail,
      customer_name: customerName,
      customer_user_id: customerUserId,
      quote_context: quoteContext,
      direction: 'INBOUND',
      message_type: 'MESSAGE',
      created_at: now,
    });

    await this.notifications.emitMarketplaceMessageReceived(companyId, {
      threadId,
      customerName,
      body,
      quoteId: quoteContext?.quote_id,
    });

    return { message_id: messageId, body, direction: 'INBOUND', created_at: now };
  }

  // Customer gets their threads (across all companies)
  async getCustomerThreads(identity: { email?: string; userId?: string }) {
    const quoteLookup = this.buildQuoteLookup(await this.scanAllQuoteRequests());
    const threads = new Map<string, any>();
    for (const msg of await this.scanAllPortalMessages()) {
      const quoteFromLookup = quoteLookup.get(String(msg?.quote_context?.quote_id || '').trim());
      const mergedMessage = quoteFromLookup
        ? {
            ...msg,
            quote_context: {
              ...quoteFromLookup,
              ...(msg.quote_context || {}),
            },
            customer_user_id: msg.customer_user_id || quoteFromLookup.customer_user_id,
            customer_email: msg.customer_email || quoteFromLookup.contact_email,
          }
        : msg;

      if (!this.matchesIdentity(mergedMessage, identity)) continue;

      const tid = String(msg.thread_id || '');
      if (!tid) continue;
      const existing = threads.get(tid);
      if (!existing || mergedMessage.created_at > existing.last_at) {
        threads.set(tid, {
          thread_id: tid,
          company_id: mergedMessage.company_id,
          company_name: mergedMessage.company_name || existing?.company_name || 'Pro',
          customer_name: mergedMessage.customer_name || existing?.customer_name,
          customer_email: mergedMessage.customer_email || existing?.customer_email,
          customer_user_id: mergedMessage.customer_user_id || existing?.customer_user_id,
          last_message: mergedMessage.body,
          last_at: mergedMessage.created_at,
          direction: mergedMessage.direction,
          quote_context: mergedMessage.quote_context || existing?.quote_context,
        });
      }
    }
    return [...threads.values()].sort((a, b) => b.last_at - a.last_at);
  }

  async getCustomerThreadMessages(
    identity: { email?: string; userId?: string },
    companyId: string,
    threadId: string,
  ) {
    const quoteLookup = this.buildQuoteLookup(await this.scanAllQuoteRequests());
    const messages = await this.getThreadMessages(companyId, threadId);

    const ownsThread = messages.some((msg: any) => {
      const quoteFromLookup = quoteLookup.get(String(msg?.quote_context?.quote_id || '').trim());
      const mergedMessage = quoteFromLookup
        ? {
            ...msg,
            quote_context: {
              ...quoteFromLookup,
              ...(msg.quote_context || {}),
            },
            customer_user_id: msg.customer_user_id || quoteFromLookup.customer_user_id,
            customer_email: msg.customer_email || quoteFromLookup.contact_email,
          }
        : msg;

      return this.matchesIdentity(mergedMessage, identity);
    });

    if (!ownsThread) {
      throw new ForbiddenException('You do not have access to this conversation');
    }

    return messages;
  }

  // Create or get thread ID for a company+customer pair
  getThreadId(companyId: string, customerEmail: string, quoteId?: string): string {
    const key = quoteId
      ? `${companyId}::quote::${quoteId}`
      : `${companyId}::${customerEmail}`;
    return Buffer.from(key).toString('base64url').slice(0, 32);
  }
}
