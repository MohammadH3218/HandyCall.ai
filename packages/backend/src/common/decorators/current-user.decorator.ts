import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { MarketplaceAuthContext } from '@handycall/shared';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): MarketplaceAuthContext => {
    return ctx.switchToHttp().getRequest().user;
  },
);
