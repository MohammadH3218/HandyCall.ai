import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_POLICY_KEY } from '../decorators/rate-limit.decorator';
import { RateLimitPolicyName } from '../rate-limit-policies';
import { RateLimitService } from '../../modules/audit-logs/rate-limit.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.getAllAndOverride<RateLimitPolicyName>(RATE_LIMIT_POLICY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!policy) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const allowed = await this.rateLimitService.checkLimit(request, policy);

    if (!allowed) {
      throw new HttpException(
        'Too many requests. Please try again shortly.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
