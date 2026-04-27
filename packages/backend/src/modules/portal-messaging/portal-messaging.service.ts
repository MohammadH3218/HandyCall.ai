import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { NotificationsService } from '../notifications/notifications.service';

const THREADS_TABLE = 'threads';
const MESSAGES_TABLE = 'messages';

// In-process SSE event bus — keyed by user ID (pro or customer)
const messageBus = new EventEmitter();
messageBus.setMaxListeners(500);

@Injectable()
export class PortalMessagingService {
  private readonly logger = new Logger(PortalMessagingService.name);

  constructor(
    private db: DynamoDBService,
    private notifications: NotificationsService,
  ) {}

  // ── Thread helpers ──────────────────────────────────────────────────────────

  async getOrCreateThread(params: {
    proId: string;
    customerUserId?: string;
    customerEmail: string;
    customerName?: string;
    quoteContext?: Record<string, any>;
  }): Promise<any> {
    // Look for an existing thread between this pro and customer
    if (params.customerUserId) {
      const { items } = await this.db.query(
        THREADS_TABLE,
        '#pro_id = :pro AND #customer_user_id = :cuid',
        { '#pro_id': 'pro_id', '#customer_user_id': 'customer_user_id' },
        { ':pro': params.proId, ':cuid': params.customerUserId },
        { indexName: 'pro-customer-index', limit: 1 },
      ).catch(() => ({ items: [] }));

      if (items.length > 0) return items[0];
    } else {
      const { items } = await this.db.query(
        THREADS_TABLE,
        '#pro_id = :pro AND #customer_email = :email',
        { '#pro_id': 'pro_id', '#customer_email': 'customer_email' },
        { ':pro': params.proId, ':email': params.customerEmail },
        { indexName: 'pro-email-index', limit: 1 },
      ).catch(() => ({ items: [] }));

      if (items.length > 0) return items[0];
    }

    // Create new thread
    const thread = {
      thread_id: uuidv4(),
      pro_id: params.proId,
      company_id: params.proId,
      customer_user_id: params.customerUserId ?? null,
      customer_email: params.customerEmail,
      customer_name: params.customerName ?? null,
      last_message: '',
      last_at: Date.now(),
      quote_context: params.quoteContext ?? null,
      created_at: Date.now(),
    };

    await this.db.put(THREADS_TABLE, thread);
    return thread;
  }

  async getThreadById(threadId: string): Promise<any> {
    return this.db.get(THREADS_TABLE, { thread_id: threadId });
  }

  async updateThreadLastMessage(threadId: string, body: string): Promise<void> {
    await this.db.update(THREADS_TABLE, { thread_id: threadId }, {
      last_message: body.substring(0, 200),
      last_at: Date.now(),
    });
  }

  // ── Pro: list own threads ──────────────────────────────────────────────────

  async listProThreads(proId: string): Promise<any[]> {
    const { items } = await this.db.query(
      THREADS_TABLE,
      '#pro_id = :pro',
      { '#pro_id': 'pro_id' },
      { ':pro': proId },
      { indexName: 'pro-threads-index', scanIndexForward: false, limit: 50 },
    ).catch(() => ({ items: [] }));

    return items;
  }

  // ── Customer: list own threads ─────────────────────────────────────────────

  async listCustomerThreads(params: {
    customerUserId?: string;
    customerEmail?: string;
  }): Promise<any[]> {
    let items: any[] = [];

    if (params.customerUserId) {
      const res = await this.db.query(
        THREADS_TABLE,
        '#customer_user_id = :cuid',
        { '#customer_user_id': 'customer_user_id' },
        { ':cuid': params.customerUserId },
        { indexName: 'customer-threads-index', scanIndexForward: false, limit: 50 },
      ).catch(() => ({ items: [] }));
      items = res.items;
    } else if (params.customerEmail) {
      const res = await this.db.query(
        THREADS_TABLE,
        '#customer_email = :email',
        { '#customer_email': 'customer_email' },
        { ':email': params.customerEmail },
        { indexName: 'customer-email-index', scanIndexForward: false, limit: 50 },
      ).catch(() => ({ items: [] }));
      items = res.items;
    }

    // Enrich threads with pro info
    const enriched = await Promise.all(
      items.map(async (thread) => {
        try {
          const pro = await this.db.get('pros', { pro_id: thread.pro_id });
          if (pro) {
            const mp = (pro as any).marketplace_profile ?? {};
            return {
              ...thread,
              company_name: `${(pro as any).first_name ?? ''} ${(pro as any).last_name ?? ''}`.trim() || 'Pro',
              pro_photo: mp.profile_photo ?? null,
              pro_category: mp.service_category ?? null,
            };
          }
        } catch {
          // Ignore enrichment errors
        }
        return thread;
      })
    );

    return enriched.sort((a, b) => (b.last_at ?? 0) - (a.last_at ?? 0));
  }

  // ── Messages ───────────────────────────────────────────────────────────────

  async listMessages(threadId: string, limit = 100): Promise<any[]> {
    const { items } = await this.db.query(
      MESSAGES_TABLE,
      '#thread_id = :tid',
      { '#thread_id': 'thread_id' },
      { ':tid': threadId },
      { indexName: 'thread-messages-index', scanIndexForward: true, limit },
    ).catch(() => ({ items: [] }));

    return items;
  }

  async sendMessage(params: {
    threadId: string;
    proId?: string;
    senderType: 'PRO' | 'CUSTOMER';
    body: string;
    attachments?: any[];
    messageType?: string;
    systemEvent?: string;
    customerEmail?: string;
    customerUserId?: string;
    customerName?: string;
    quoteContext?: Record<string, any>;
  }): Promise<any> {
    // Ensure thread exists
    let thread = await this.getThreadById(params.threadId).catch(() => null);
    if (!thread && params.proId && (params.customerEmail || params.customerUserId)) {
      thread = await this.getOrCreateThread({
        proId: params.proId,
        customerUserId: params.customerUserId,
        customerEmail: params.customerEmail!,
        customerName: params.customerName,
        quoteContext: params.quoteContext,
      });
    }

    const message = {
      message_id: uuidv4(),
      thread_id: params.threadId,
      // From the pro's perspective: OUTBOUND = pro sent, INBOUND = customer sent
      direction: params.senderType === 'PRO' ? 'OUTBOUND' : 'INBOUND',
      sender_type: params.senderType,
      body: params.body,
      attachments: params.attachments ?? [],
      message_type: params.messageType ?? 'text',
      system_event: params.systemEvent ?? null,
      created_at: Date.now(),
    };

    await this.db.put(MESSAGES_TABLE, message);
    await this.updateThreadLastMessage(params.threadId, params.body);

    // Emit to in-process SSE subscribers
    const threadProId = thread?.pro_id ?? params.proId;
    const threadCustomerId = thread?.customer_user_id ?? params.customerUserId;
    const threadCustomerEmail = thread?.customer_email ?? params.customerEmail;

    if (threadProId) {
      messageBus.emit(`pro:${threadProId}`, { type: 'message', thread_id: params.threadId, message });
    }
    if (threadCustomerId) {
      messageBus.emit(`customer:${threadCustomerId}`, { type: 'message', thread_id: params.threadId, message });
    } else if (threadCustomerEmail) {
      messageBus.emit(`customer_email:${threadCustomerEmail}`, { type: 'message', thread_id: params.threadId, message });
    }

    // Push real-time notification to the recipient (skip system messages)
    if (params.messageType !== 'system' && params.body?.trim()) {
      const preview = params.body.trim();
      if (params.senderType === 'CUSTOMER' && threadProId) {
        const senderName = params.customerName || 'A customer';
        this.notifications.newMessage({
          recipientId: threadProId,
          senderName,
          preview,
          threadId: params.threadId,
        });
      } else if (params.senderType === 'PRO' && threadCustomerId) {
        // Look up pro name asynchronously — don't block the response
        this.db.get('pros', { pro_id: threadProId }).then((pro: any) => {
          const senderName = pro
            ? `${pro.first_name ?? ''} ${pro.last_name ?? ''}`.trim() || 'Your pro'
            : 'Your pro';
          this.notifications.newMessage({
            recipientId: threadCustomerId!,
            senderName,
            preview,
            threadId: params.threadId,
          });
        }).catch(() => {
          // Non-critical; skip notification on lookup failure
        });
      }
    }

    return message;
  }

  // ── SSE subscriptions ──────────────────────────────────────────────────────

  subscribeProMessages(proId: string, callback: (payload: any) => void): () => void {
    const channel = `pro:${proId}`;
    messageBus.on(channel, callback);
    return () => messageBus.off(channel, callback);
  }

  subscribeCustomerMessages(
    customerUserId: string | null,
    customerEmail: string | null,
    callback: (payload: any) => void,
  ): () => void {
    const channels: string[] = [];
    if (customerUserId) channels.push(`customer:${customerUserId}`);
    if (customerEmail) channels.push(`customer_email:${customerEmail}`);

    channels.forEach((ch) => messageBus.on(ch, callback));
    return () => channels.forEach((ch) => messageBus.off(ch, callback));
  }
}
