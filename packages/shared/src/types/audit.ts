import type { Timestamp, UserRole } from './domain';
import type { UserType } from './marketplace';

export type AuditLogCategory =
  | 'AUTH'
  | 'ACCOUNT'
  | 'MARKETPLACE'
  | 'BOOKING'
  | 'REVIEW'
  | 'PAYMENT'
  | 'ADMIN'
  | 'SECURITY'
  | 'MESSAGE';

export type AuditLogSeverity = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
export type AuditLogOutcome = 'SUCCESS' | 'FAILURE' | 'DENIED';
export type AuditActorType = 'ADMIN' | 'PRO' | 'CUSTOMER' | 'SYSTEM' | 'ANONYMOUS';

export const AUDIT_LOG_CATEGORIES: AuditLogCategory[] = [
  'AUTH',
  'ACCOUNT',
  'MARKETPLACE',
  'BOOKING',
  'REVIEW',
  'PAYMENT',
  'ADMIN',
  'SECURITY',
  'MESSAGE',
];

export const AUDIT_LOG_SEVERITIES: AuditLogSeverity[] = ['INFO', 'WARN', 'ERROR', 'CRITICAL'];
export const AUDIT_LOG_OUTCOMES: AuditLogOutcome[] = ['SUCCESS', 'FAILURE', 'DENIED'];
export const AUDIT_ACTOR_TYPES: AuditActorType[] = [
  'ADMIN',
  'PRO',
  'CUSTOMER',
  'SYSTEM',
  'ANONYMOUS',
];

export interface AuditActor {
  actor_type: AuditActorType;
  actor_id?: string;
  actor_email?: string;
  actor_role?: UserRole;
  actor_user_type?: UserType | 'ADMIN';
}

export interface AuditTarget {
  target_type?: string;
  target_id?: string;
}

export interface AuditLogEvent extends AuditActor, AuditTarget {
  event_id: string;
  company_id?: string;
  occurred_at: Timestamp;
  category: AuditLogCategory;
  severity: AuditLogSeverity;
  outcome: AuditLogOutcome;
  action: string;
  route?: string;
  method?: string;
  request_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilter {
  company_id?: string;
  actor_email?: string;
  actor_type?: AuditActorType;
  actor_role?: UserRole;
  category?: AuditLogCategory;
  severity?: AuditLogSeverity;
  outcome?: AuditLogOutcome;
  action?: string;
  route?: string;
  target_type?: string;
  target_id?: string;
  request_id?: string;
  search?: string;
  start_date?: Timestamp;
  end_date?: Timestamp;
  limit?: number;
  cursor?: string;
}

export interface AuditLogListResponse {
  items: AuditLogEvent[];
  next_cursor?: string | null;
}

export interface AuditLogFacetsResponse {
  categories: AuditLogCategory[];
  severities: AuditLogSeverity[];
  outcomes: AuditLogOutcome[];
  actor_types: AuditActorType[];
}
