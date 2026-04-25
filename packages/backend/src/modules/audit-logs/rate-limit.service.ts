import { Injectable, Logger } from '@nestjs/common';
import { RATE_LIMIT_POLICIES, RateLimitPolicyName } from '../../common/rate-limit-policies';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { AuditLogsService } from './audit-logs.service';

type RequestLike = {
  method?: string;
  originalUrl?: string;
  ip?: string;
  body?: Record<string, any>;
  headers?: Record<string, string | string[] | undefined>;
  user?: Record<string, any>;
  requestId?: string;
};

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly fallbackCounters = new Map<string, { hits: number; expiresAt: number }>();

  constructor(
    private readonly db: DynamoDBService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async checkLimit(request: RequestLike, policyName: RateLimitPolicyName): Promise<boolean> {
    const policy = RATE_LIMIT_POLICIES[policyName];
    const subjectKey = this.resolveSubjectKey(request, policy.subject);
    const now = Date.now();
    const windowBucket = Math.floor(now / policy.window_ms);
    const counterKey = `${policyName}:${subjectKey}:${windowBucket}`;
    const expiresAt = now + policy.window_ms * 2;

    const hits = await this.incrementCounter(counterKey, policyName, subjectKey, expiresAt, now);

    if (hits > policy.max) {
      await this.auditLogs.logFromRequest(request, {
        company_id: request.user?.company_id,
        category: 'SECURITY',
        severity: 'WARN',
        outcome: 'DENIED',
        action: 'security.rate_limit_exceeded',
        metadata: {
          policy: policyName,
          max: policy.max,
          window_ms: policy.window_ms,
          subject_key: subjectKey,
          hits,
        },
      });
      return false;
    }

    return true;
  }

  private async incrementCounter(
    counterKey: string,
    policyName: RateLimitPolicyName,
    subjectKey: string,
    expiresAtMs: number,
    now: number,
  ) {
    try {
      const attributes = await this.db.updateRaw('rate_limit_counters', {
        Key: { counter_key: counterKey },
        UpdateExpression:
          'SET expires_at = if_not_exists(expires_at, :expires_at), created_at = if_not_exists(created_at, :created_at), updated_at = :updated_at, #policy = :policy, subject_key = :subject_key ADD hits :inc',
        ExpressionAttributeNames: {
          '#policy': 'policy',
        },
        ExpressionAttributeValues: {
          ':expires_at': Math.floor(expiresAtMs / 1000),
          ':created_at': now,
          ':updated_at': now,
          ':policy': policyName,
          ':subject_key': subjectKey,
          ':inc': 1,
        },
        ReturnValues: 'ALL_NEW',
      });

      return Number(attributes?.hits ?? 0);
    } catch (error: any) {
      this.logger.warn(
        `Falling back to local rate-limit counter for ${policyName}: ${error?.name || error?.message || error}`,
      );
      return this.incrementFallbackCounter(counterKey, expiresAtMs);
    }
  }

  private incrementFallbackCounter(counterKey: string, expiresAtMs: number) {
    const now = Date.now();
    const existing = this.fallbackCounters.get(counterKey);

    if (!existing || existing.expiresAt <= now) {
      this.fallbackCounters.set(counterKey, { hits: 1, expiresAt: expiresAtMs });
      return 1;
    }

    const next = { hits: existing.hits + 1, expiresAt: existing.expiresAt };
    this.fallbackCounters.set(counterKey, next);
    return next.hits;
  }

  private resolveSubjectKey(
    request: RequestLike,
    subject: 'ip' | 'ip_email' | 'user' | 'ip_user',
  ) {
    const ip = this.getClientIp(request);
    const email = String(request.body?.email || '').trim().toLowerCase() || 'unknown';
    const userId = String(request.user?.user_id || request.user?.sub || '').trim() || 'anonymous';

    switch (subject) {
      case 'ip_email':
        return `${ip}:${email}`;
      case 'user':
        return userId;
      case 'ip_user':
        return `${ip}:${userId}`;
      case 'ip':
      default:
        return ip;
    }
  }

  private getClientIp(request: RequestLike) {
    const forwardedFor = request.headers?.['x-forwarded-for'];
    if (Array.isArray(forwardedFor) && forwardedFor[0]) {
      return forwardedFor[0].split(',')[0].trim();
    }
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
      return forwardedFor.split(',')[0].trim();
    }
    return request.ip || 'unknown';
  }
}
