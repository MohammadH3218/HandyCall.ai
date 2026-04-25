import { SetMetadata } from '@nestjs/common';
import { RateLimitPolicyName } from '../rate-limit-policies';

export const RATE_LIMIT_POLICY_KEY = 'rate_limit_policy';

export const RateLimitPolicy = (policy: RateLimitPolicyName) =>
  SetMetadata(RATE_LIMIT_POLICY_KEY, policy);
