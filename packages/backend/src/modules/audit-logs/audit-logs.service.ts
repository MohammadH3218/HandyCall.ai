import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
  AUDIT_ACTOR_TYPES,
  AUDIT_LOG_CATEGORIES,
  AUDIT_LOG_OUTCOMES,
  AUDIT_LOG_SEVERITIES,
  AuditActorType,
  AuditLogEvent,
  AuditLogFacetsResponse,
  AuditLogFilter,
  AuditLogListResponse,
  AuditLogOutcome,
  AuditLogSeverity,
} from '@handycall/shared';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';

type RequestLike = {
  method?: string;
  originalUrl?: string;
  ip?: string;
  requestId?: string;
  headers?: Record<string, string | string[] | undefined>;
  user?: Record<string, any>;
};

type CreateAuditEvent = Omit<AuditLogEvent, 'event_id' | 'occurred_at' | 'actor_type'> & {
  occurred_at?: number;
  actor_type?: AuditActorType;
};

type QueryPlan = {
  indexName?: string;
  keyConditionExpression: string;
  expressionAttributeNames: Record<string, string>;
  expressionAttributeValues: Record<string, string>;
};

const DEFAULT_RETENTION_DAYS = 180;

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    private readonly db: DynamoDBService,
    private readonly configService: ConfigService,
  ) {}

  async logEvent(event: CreateAuditEvent): Promise<AuditLogEvent> {
    const occurredAt = event.occurred_at ?? Date.now();
    const eventId = uuidv4();
    const scope = event.company_id ? `company#${event.company_id}` : 'platform';
    const actorKey = this.buildActorKey(event.actor_email, event.actor_id, event.actor_type);
    const occurredKey = this.buildOccurredKey(occurredAt, eventId);
    const retentionDays = Number(
      this.configService.get<string>('AUDIT_LOG_RETENTION_DAYS') || DEFAULT_RETENTION_DAYS,
    );
    const expiresAt = Math.floor((occurredAt + retentionDays * 24 * 60 * 60 * 1000) / 1000);

    const item = {
      ...event,
      event_id: eventId,
      occurred_at: occurredAt,
      actor_type: event.actor_type || 'ANONYMOUS',
      scope,
      global_scope: 'all',
      actor_key: actorKey,
      category_key: `${event.category}#${event.severity}#${event.outcome}`,
      occurred_at_event_id: occurredKey,
      metadata: this.sanitizeMetadata(event.metadata),
      expires_at: expiresAt,
    };

    try {
      await this.db.put('audit_logs', item);
    } catch (error: any) {
      this.logger.warn(
        `Audit log persistence unavailable; continuing without durable log write: ${this.getErrorLabel(error)}`,
      );
    }

    return {
      ...event,
      event_id: eventId,
      occurred_at: occurredAt,
      actor_type: event.actor_type || 'ANONYMOUS',
      metadata: this.sanitizeMetadata(event.metadata),
    };
  }

  async logFromRequest(request: RequestLike | undefined, event: CreateAuditEvent) {
    const requestMeta = this.extractRequestMeta(request);
    const user = request?.user || {};

    return this.logEvent({
      ...event,
      actor_type: event.actor_type ?? this.resolveActorType(user),
      actor_id: event.actor_id ?? this.pickString(user.user_id, user.sub),
      actor_email: event.actor_email ?? this.pickString(user.email),
      actor_role: event.actor_role ?? user.role,
      actor_user_type: event.actor_user_type ?? user.user_type,
      request_id: event.request_id ?? requestMeta.request_id,
      ip_address: event.ip_address ?? requestMeta.ip_address,
      user_agent: event.user_agent ?? requestMeta.user_agent,
      route: event.route ?? requestMeta.route,
      method: event.method ?? requestMeta.method,
    });
  }

  async listLogs(filters: AuditLogFilter = {}): Promise<AuditLogListResponse> {
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
    const exclusiveStartKey = this.decodeCursor(filters.cursor);

    const queryPlan = this.resolveQueryPlan(filters);
    let result;
    try {
      result = await this.db.query(
        'audit_logs',
        queryPlan.keyConditionExpression,
        queryPlan.expressionAttributeNames,
        queryPlan.expressionAttributeValues,
        {
          indexName: queryPlan.indexName,
          limit,
          exclusiveStartKey,
          scanIndexForward: false,
        },
      );
    } catch (error: any) {
      this.logger.warn(
        `Audit log reads unavailable; returning empty result set: ${this.getErrorLabel(error)}`,
      );
      return { items: [], next_cursor: null };
    }

    const items = (result.items as any[]).filter((item) => this.matchesFilters(item, filters));

    return {
      items: items.map((item) => this.toAuditEvent(item)),
      next_cursor: result.lastEvaluatedKey ? this.encodeCursor(result.lastEvaluatedKey) : null,
    };
  }

  async getLog(eventId: string): Promise<AuditLogEvent | null> {
    let result;
    try {
      result = await this.db.query(
        'audit_logs',
        '#event_id = :event_id',
        { '#event_id': 'event_id' },
        { ':event_id': eventId },
        { indexName: 'event-id-index', limit: 1 },
      );
    } catch (error: any) {
      this.logger.warn(
        `Audit log detail lookup unavailable; returning null: ${this.getErrorLabel(error)}`,
      );
      return null;
    }

    const item = result.items[0];
    return item ? this.toAuditEvent(item as Record<string, any>) : null;
  }

  getFacets(): AuditLogFacetsResponse {
    return {
      categories: AUDIT_LOG_CATEGORIES,
      severities: AUDIT_LOG_SEVERITIES,
      outcomes: AUDIT_LOG_OUTCOMES,
      actor_types: AUDIT_ACTOR_TYPES,
    };
  }

  private resolveQueryPlan(filters: AuditLogFilter): QueryPlan {
    if (filters.actor_email) {
      return {
        indexName: 'actor-index',
        keyConditionExpression: '#actor_key = :actor_key',
        expressionAttributeNames: { '#actor_key': 'actor_key' },
        expressionAttributeValues: {
          ':actor_key': this.buildActorKey(filters.actor_email, undefined, 'ANONYMOUS'),
        },
      };
    }

    if (filters.company_id) {
      return {
        keyConditionExpression: '#scope = :scope',
        expressionAttributeNames: { '#scope': 'scope' },
        expressionAttributeValues: {
          ':scope': filters.company_id === 'platform' ? 'platform' : `company#${filters.company_id}`,
        },
      };
    }

    return {
      indexName: 'global-index',
      keyConditionExpression: '#global_scope = :global_scope',
      expressionAttributeNames: { '#global_scope': 'global_scope' },
      expressionAttributeValues: { ':global_scope': 'all' },
    };
  }

  private matchesFilters(item: Record<string, any>, filters: AuditLogFilter) {
    if (filters.actor_type && item.actor_type !== filters.actor_type) return false;
    if (filters.actor_role && item.actor_role !== filters.actor_role) return false;
    if (filters.category && item.category !== filters.category) return false;
    if (filters.severity && item.severity !== filters.severity) return false;
    if (filters.outcome && item.outcome !== filters.outcome) return false;
    if (filters.action && item.action !== filters.action) return false;
    if (filters.route && item.route !== filters.route) return false;
    if (filters.target_type && item.target_type !== filters.target_type) return false;
    if (filters.target_id && item.target_id !== filters.target_id) return false;
    if (filters.request_id && item.request_id !== filters.request_id) return false;
    if (typeof filters.start_date === 'number' && item.occurred_at < filters.start_date) return false;
    if (typeof filters.end_date === 'number' && item.occurred_at > filters.end_date) return false;

    if (filters.search) {
      const search = filters.search.trim().toLowerCase();
      if (search) {
        const haystack = [
          item.event_id,
          item.request_id,
          item.actor_email,
          item.actor_id,
          item.target_id,
          item.action,
          item.route,
          item.ip_address,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
    }

    return true;
  }

  private toAuditEvent(item: Record<string, any>): AuditLogEvent {
    const {
      event_id,
      company_id,
      occurred_at,
      category,
      severity,
      outcome,
      action,
      route,
      method,
      request_id,
      ip_address,
      user_agent,
      metadata,
      actor_type,
      actor_id,
      actor_email,
      actor_role,
      actor_user_type,
      target_type,
      target_id,
    } = item;

    return {
      event_id,
      company_id,
      occurred_at,
      category,
      severity,
      outcome,
      action,
      route,
      method,
      request_id,
      ip_address,
      user_agent,
      metadata,
      actor_type,
      actor_id,
      actor_email,
      actor_role,
      actor_user_type,
      target_type,
      target_id,
    };
  }

  private buildOccurredKey(occurredAt: number, eventId: string) {
    return `${String(occurredAt).padStart(13, '0')}#${eventId}`;
  }

  private buildActorKey(
    actorEmail?: string,
    actorId?: string,
    actorType: AuditActorType = 'ANONYMOUS',
  ) {
    if (actorEmail) return `email#${actorEmail.toLowerCase()}`;
    if (actorId) return `id#${actorId}`;
    return `type#${actorType}`;
  }

  private extractRequestMeta(request: RequestLike | undefined) {
    const forwardedFor = request?.headers?.['x-forwarded-for'];
    const ip = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0]?.trim()
        : request?.ip;
    const userAgentHeader = request?.headers?.['user-agent'];

    return {
      method: request?.method,
      route: request?.originalUrl,
      request_id:
        request?.requestId ||
        this.pickString(
          request?.headers?.['x-request-id'],
          request?.headers?.['x-vercel-id'],
        ),
      ip_address: ip,
      user_agent: this.pickString(userAgentHeader),
    };
  }

  private resolveActorType(user: Record<string, any> | undefined): AuditActorType {
    if (!user) return 'ANONYMOUS';
    if (user.role === 'ADMIN' || user.user_type === 'ADMIN' || user.company_id === 'platform-admin') {
      return 'ADMIN';
    }
    if (user.user_type === 'PRO') return 'PRO';
    if (user.user_type === 'CUSTOMER') return 'CUSTOMER';
    return 'ANONYMOUS';
  }

  private sanitizeMetadata(metadata?: Record<string, unknown>) {
    if (!metadata) return undefined;
    const blockedKeys = new Set([
      'body',
      'message_body',
      'content',
      'raw_body',
      'raw',
      'search_text',
      'message',
      'html',
    ]);

    const sanitizeValue = (value: unknown, depth = 0): unknown => {
      if (depth > 3) return '[truncated]';
      if (value == null) return value;
      if (typeof value === 'string') return value.slice(0, 300);
      if (typeof value === 'number' || typeof value === 'boolean') return value;
      if (Array.isArray(value)) return value.slice(0, 20).map((entry) => sanitizeValue(entry, depth + 1));
      if (typeof value === 'object') {
        return Object.fromEntries(
          Object.entries(value as Record<string, unknown>)
            .filter(([key]) => !blockedKeys.has(key))
            .slice(0, 20)
            .map(([key, entry]) => [key, sanitizeValue(entry, depth + 1)]),
        );
      }
      return String(value).slice(0, 300);
    };

    return sanitizeValue(metadata) as Record<string, unknown>;
  }

  private pickString(...values: Array<string | string[] | undefined | null>) {
    for (const value of values) {
      if (Array.isArray(value) && value[0]) return value[0];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return undefined;
  }

  private encodeCursor(cursor: Record<string, any>) {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64');
  }

  private decodeCursor(cursor?: string) {
    if (!cursor) return undefined;
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as Record<string, any>;
    } catch {
      return undefined;
    }
  }

  private getErrorLabel(error: any) {
    if (typeof error?.name === 'string' && error.name.trim()) {
      return error.name.trim();
    }
    if (typeof error?.message === 'string' && error.message.trim()) {
      return error.message.trim();
    }
    return 'Unknown audit log error';
  }
}
