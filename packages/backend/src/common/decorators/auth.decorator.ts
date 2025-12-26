import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthContext } from '@handycall/shared';

/**
 * Extract auth context from request
 * Usage: @Auth() auth: AuthContext
 */
export const Auth = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);

/**
 * Extract company_id from auth context
 * Usage: @CompanyId() companyId: string
 */
export const CompanyId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.company_id;
  }
);

/**
 * Extract user_id from auth context
 * Usage: @UserId() userId: string
 */
export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.user_id;
  }
);
