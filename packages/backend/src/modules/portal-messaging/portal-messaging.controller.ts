import { Controller, Post, Get, Body, Param, UseGuards, Query, Sse, MessageEvent } from '@nestjs/common';
import { PortalMessagingService } from './portal-messaging.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Auth, CompanyId } from '../../common/decorators/auth.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CustomerJwtAuthGuard } from '../../common/guards/customer-jwt-auth.guard';
import { AuthContext } from '@handycall/shared';
import { Observable } from 'rxjs';

@Controller('portal-messaging')
export class PortalMessagingController {
  constructor(private readonly service: PortalMessagingService) {}

  // Pro: get their message threads
  @UseGuards(JwtAuthGuard)
  @Get('pro/threads')
  async getProThreads(@CompanyId() companyId: string) {
    return { threads: await this.service.getProThreads(companyId) };
  }

  // Pro: get messages in a thread
  @UseGuards(JwtAuthGuard)
  @Get('pro/threads/:threadId')
  async getThreadMessages(
    @CompanyId() companyId: string,
    @Param('threadId') threadId: string,
  ) {
    return { messages: await this.service.getThreadMessages(companyId, threadId) };
  }

  @UseGuards(JwtAuthGuard)
  @Sse('pro/stream')
  streamProMessages(@CompanyId() companyId: string): Observable<MessageEvent> {
    return this.service.streamProEvents(companyId);
  }

  // Pro: send a message
  @UseGuards(JwtAuthGuard)
  @Post('pro/threads/:threadId/send')
  async sendProMessage(
    @CompanyId() companyId: string,
    @Param('threadId') threadId: string,
    @Body()
    body: {
      message: string;
      customer_email?: string;
      customer_name?: string;
      customer_phone?: string;
      customer_user_id?: string;
      request_status?: string;
      quote_context?: any;
      attachments?: Array<{
        url: string;
        width?: number;
        height?: number;
        mime_type?: string;
        name?: string;
      }>;
      message_type?: string;
      system_event?: string;
    },
  ) {
    return this.service.sendProMessage(companyId, threadId, body.message, {
      customer_email: body.customer_email,
      customer_name: body.customer_name,
      customer_phone: body.customer_phone,
      customer_user_id: body.customer_user_id,
      request_status: body.request_status,
      quote_context: body.quote_context,
      attachments: body.attachments,
      message_type: body.message_type,
      system_event: body.system_event,
    });
  }

  // Public/Customer: send message to a provider (by companyId)
  @Public()
  @UseGuards(CustomerJwtAuthGuard)
  @Post('customer/send/:companyId')
  async sendCustomerMessage(
    @Param('companyId') companyId: string,
    @Auth() auth: AuthContext,
    @Body()
    body: {
      thread_id?: string;
      message: string;
      customer_name?: string;
      customer_email?: string;
      customer_user_id?: string;
      customer_phone?: string;
      quote_context?: any;
      attachments?: Array<{
        url: string;
        width?: number;
        height?: number;
        mime_type?: string;
        name?: string;
      }>;
    },
  ) {
    const customerEmail = auth.email || body.customer_email;
    const customerUserId = auth.user_id || body.customer_user_id;
    const threadId = body.thread_id || (
      customerEmail
        ? this.service.getThreadId(companyId, customerEmail, body.quote_context?.quote_id)
        : `anon-${Date.now()}`
    );
    return this.service.sendCustomerMessage(
      companyId,
      threadId,
      body.message,
      body.customer_name || auth.email,
      customerEmail,
      customerUserId,
      body.customer_phone,
      body.quote_context,
      body.attachments,
    );
  }

  // Customer: get their threads
  @Public()
  @UseGuards(CustomerJwtAuthGuard)
  @Get('customer/threads')
  async getCustomerThreads(
    @Auth() auth: AuthContext,
  ) {
    if (!auth.email && !auth.user_id) return { threads: [] };
    return { threads: await this.service.getCustomerThreads({ email: auth.email, userId: auth.user_id }) };
  }

  // Customer: get thread messages
  @Public()
  @UseGuards(CustomerJwtAuthGuard)
  @Get('customer/threads/:threadId')
  async getCustomerThread(
    @Auth() auth: AuthContext,
    @Param('threadId') threadId: string,
    @Query('company_id') companyId: string,
  ) {
    if (!companyId) return { messages: [] };
    return {
      messages: await this.service.getCustomerThreadMessages(
        { email: auth.email, userId: auth.user_id },
        companyId,
        threadId,
      ),
    };
  }

  @Public()
  @UseGuards(CustomerJwtAuthGuard)
  @Sse('customer/stream')
  streamCustomerMessages(@Auth() auth: AuthContext): Observable<MessageEvent> {
    return this.service.streamCustomerEvents({ email: auth.email, userId: auth.user_id });
  }
}
