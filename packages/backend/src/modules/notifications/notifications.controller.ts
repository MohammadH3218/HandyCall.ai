import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MarketplaceAuthContext } from '@handycall/shared';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  /**
   * SSE stream — both pros and customers use this same endpoint.
   * The JWT guard (applied globally) validates the token before we get here.
   */
  @Get('stream')
  stream(
    @CurrentUser() user: MarketplaceAuthContext,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Keep-alive ping every 25 s to survive proxy idle timeouts
    const keepAlive = setInterval(() => {
      res.write(': keep-alive\n\n');
    }, 25000);

    const unsubscribe = this.svc.subscribe(user.user_id, (payload) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    });

    res.on('close', () => {
      clearInterval(keepAlive);
      unsubscribe();
    });
  }
}
