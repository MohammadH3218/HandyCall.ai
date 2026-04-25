export type RateLimitPolicyName =
  | 'AUTH_REGISTER'
  | 'AUTH_LOGIN'
  | 'AUTH_REFRESH'
  | 'AUTH_RECOVERY'
  | 'AUTH_VERIFY'
  | 'MARKETPLACE_READ'
  | 'MARKETPLACE_SEARCH'
  | 'USER_WRITE'
  | 'USER_UPLOAD'
  | 'ADMIN_READ'
  | 'ADMIN_MUTATION'
  | 'WEBHOOK';

type SubjectStrategy = 'ip' | 'ip_email' | 'user' | 'ip_user';

export type RateLimitPolicy = {
  max: number;
  window_ms: number;
  subject: SubjectStrategy;
};

export const RATE_LIMIT_POLICIES: Record<RateLimitPolicyName, RateLimitPolicy> = {
  AUTH_REGISTER: { max: 6, window_ms: 60 * 60 * 1000, subject: 'ip_email' },
  AUTH_LOGIN: { max: 10, window_ms: 15 * 60 * 1000, subject: 'ip_email' },
  AUTH_REFRESH: { max: 40, window_ms: 5 * 60 * 1000, subject: 'ip_user' },
  AUTH_RECOVERY: { max: 6, window_ms: 60 * 60 * 1000, subject: 'ip_email' },
  AUTH_VERIFY: { max: 20, window_ms: 30 * 60 * 1000, subject: 'ip' },
  MARKETPLACE_READ: { max: 120, window_ms: 60 * 1000, subject: 'ip' },
  MARKETPLACE_SEARCH: { max: 45, window_ms: 60 * 1000, subject: 'ip' },
  USER_WRITE: { max: 30, window_ms: 60 * 1000, subject: 'user' },
  USER_UPLOAD: { max: 20, window_ms: 15 * 60 * 1000, subject: 'user' },
  ADMIN_READ: { max: 180, window_ms: 60 * 1000, subject: 'user' },
  ADMIN_MUTATION: { max: 60, window_ms: 60 * 1000, subject: 'user' },
  WEBHOOK: { max: 120, window_ms: 60 * 1000, subject: 'ip' },
};
