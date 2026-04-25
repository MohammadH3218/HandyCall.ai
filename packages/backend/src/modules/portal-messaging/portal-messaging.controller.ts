import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { PortalMessagingService } from './portal-messaging.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MarketplaceAuthContext } from '@handycall/shared';
import { Public } from '../../common/decorators/public.decorator';

@Controller('portal-messaging')
export class PortalMessagingController {
  constructor(private readonly svc: PortalMessagingService) {}

  // ── Pro endpoints ──────────────────────────────────────────────────────────

  /** Pro: list own conversation threads */
  @Get('pro/threads')
  async getProThreads(@CurrentUser() user: MarketplaceAuthContext) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return { threads: await this.svc.listProThreads(user.user_id) };
  }

  /** Pro: get messages in a thread */
  @Get('pro/threads/:threadId')
  async getProThreadMessages(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('threadId') threadId: string,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    const thread = await this.svc.getThreadById(threadId);
    if (!thread || thread.pro_id !== user.user_id) throw new ForbiddenException();
    const messages = await this.svc.listMessages(threadId);
    return { messages };
  }

  /** Pro: send a message */
  @Post('pro/threads/:threadId/send')
  @HttpCode(HttpStatus.OK)
  async proSendMessage(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('threadId') threadId: string,
    @Body() body: {
      message: string;
      attachments?: any[];
      message_type?: string;
      system_event?: string;
      customer_email?: string;
      customer_user_id?: string;
      customer_name?: string;
      quote_context?: Record<string, any>;
    },
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();

    const message = await this.svc.sendMessage({
      threadId,
      proId: user.user_id,
      senderType: 'PRO',
      body: body.message,
      attachments: body.attachments,
      messageType: body.message_type,
      systemEvent: body.system_event,
      customerEmail: body.customer_email,
      customerUserId: body.customer_user_id,
      customerName: body.customer_name,
      quoteContext: body.quote_context,
    });

    return { message };
  }

  /** Pro: SSE stream for real-time message updates */
  @Get('pro/stream')
  async proStream(
    @CurrentUser() user: MarketplaceAuthContext,
    @Res() res: Response,
  ) {
    if (user.user_type !== 'PRO') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send a keep-alive comment every 25s to prevent proxy timeouts
    const keepAlive = setInterval(() => {
      res.write(': keep-alive\n\n');
    }, 25000);

    const unsubscribe = this.svc.subscribeProMessages(user.user_id, (payload) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    });

    res.on('close', () => {
      clearInterval(keepAlive);
      unsubscribe();
    });
  }

  // ── Customer endpoints ─────────────────────────────────────────────────────

  /** Customer: list own conversation threads */
  @Get('customer/threads')
  async getCustomerThreads(
    @CurrentUser() user: MarketplaceAuthContext,
    @Query('email') email?: string,
    @Query('user_id') userId?: string,
  ) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException();
    const threads = await this.svc.listCustomerThreads({
      customerUserId: user.user_id,
      customerEmail: email,
    });
    return { threads };
  }

  /** Customer: get messages in a thread */
  @Get('customer/threads/:threadId')
  async getCustomerThreadMessages(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('threadId') threadId: string,
    @Query('company_id') companyId?: string,
  ) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException();
    const thread = await this.svc.getThreadById(threadId);
    if (!thread) return { messages: [] };
    // Verify this thread belongs to this customer
    if (thread.customer_user_id && thread.customer_user_id !== user.user_id) {
      throw new ForbiddenException();
    }
    const messages = await this.svc.listMessages(threadId);
    return { messages };
  }

  /** Customer: send a message to a pro */
  @Post('customer/send/:companyId')
  @HttpCode(HttpStatus.OK)
  async customerSendMessage(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('companyId') companyId: string,
    @Body() body: {
      thread_id?: string;
      message: string;
      customer_email?: string;
      customer_user_id?: string;
      customer_name?: string;
      attachments?: any[];
      quote_context?: Record<string, any>;
    },
  ) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException();

    // Resolve or create thread
    let threadId = body.thread_id;
    if (!threadId) {
      const thread = await this.svc.getOrCreateThread({
        proId: companyId,
        customerUserId: user.user_id,
        customerEmail: body.customer_email ?? '',
        customerName: body.customer_name,
        quoteContext: body.quote_context,
      });
      threadId = thread.thread_id;
    }

    const message = await this.svc.sendMessage({
      threadId: threadId!,
      proId: companyId,
      senderType: 'CUSTOMER',
      body: body.message,
      attachments: body.attachments,
      customerEmail: body.customer_email,
      customerUserId: user.user_id,
      customerName: body.customer_name,
      quoteContext: body.quote_context,
    });

    return { message, thread_id: threadId };
  }

  /** Customer: SSE stream for real-time message updates */
  @Get('customer/stream')
  async customerStream(
    @CurrentUser() user: MarketplaceAuthContext,
    @Res() res: Response,
  ) {
    if (user.user_type !== 'CUSTOMER') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const keepAlive = setInterval(() => {
      res.write(': keep-alive\n\n');
    }, 25000);

    const unsubscribe = this.svc.subscribeCustomerMessages(
      user.user_id,
      null,
      (payload) => {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      },
    );

    res.on('close', () => {
      clearInterval(keepAlive);
      unsubscribe();
    });
  }
}
