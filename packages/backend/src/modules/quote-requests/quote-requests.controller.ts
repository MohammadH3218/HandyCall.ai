import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { QuoteRequestsService } from './quote-requests.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MarketplaceAuthContext } from '@handycall/shared';

@Controller()
export class QuoteRequestsController {
  constructor(private readonly svc: QuoteRequestsService) {}

  // ── Customer endpoints ─────────────────────────────────────────────────────

  /** Customer: submit a request to a specific pro */
  @Post('customer/quote-requests')
  @HttpCode(HttpStatus.CREATED)
  async submitRequest(
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() body: {
      pro_id: string;
      service_category: string;
      job_description: string;
      district: string;
      contact_name?: string;
      contact_email?: string;
      contact_phone?: string;
      address_line1?: string;
      address_line2?: string;
    },
  ) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException();
    const quote = await this.svc.submitRequest(user.user_id, body);
    return { quote };
  }

  /** Customer: list own requests */
  @Get('customer/quote-requests')
  async listCustomerRequests(@CurrentUser() user: MarketplaceAuthContext) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException();
    const quotes = await this.svc.listCustomerRequests(user.user_id);
    return { quotes };
  }

  /** Customer: update a pending request */
  @Put('customer/quote-requests/:quoteId')
  async updateCustomerRequest(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('quoteId') quoteId: string,
    @Body() body: any,
  ) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException();
    const quote = await this.svc.updateCustomerRequest(user.user_id, quoteId, body);
    return { quote };
  }

  // ── Pro endpoints ──────────────────────────────────────────────────────────

  /** Pro: list incoming pending requests */
  @Get('quote-requests/pro/available')
  async listProAvailable(@CurrentUser() user: MarketplaceAuthContext) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    const quotes = await this.svc.listProAvailableRequests(user.user_id);
    return { quotes };
  }

  /** Pro: list past (accepted/declined) requests */
  @Get('quote-requests/pro/past')
  async listProPast(@CurrentUser() user: MarketplaceAuthContext) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    const quotes = await this.svc.listProPastRequests(user.user_id);
    return { quotes };
  }

  /** Pro: get a single request */
  @Get('quote-requests/:quoteId/pro')
  async getProRequest(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('quoteId') quoteId: string,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    const quote = await this.svc.getProRequest(user.user_id, quoteId);
    return { quote };
  }

  /** Pro: accept or decline a request */
  @Post('quote-requests/:quoteId/respond')
  @HttpCode(HttpStatus.OK)
  async respond(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('quoteId') quoteId: string,
    @Body() body: { action: 'ACCEPT' | 'DECLINE' },
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    const result = await this.svc.respondToRequest(user.user_id, quoteId, body.action);
    return result;
  }
}
