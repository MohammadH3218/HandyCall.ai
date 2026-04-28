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
  Query,
} from '@nestjs/common';
import { QuoteRequestsService } from './quote-requests.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MarketplaceAuthContext } from '@handycall/shared';

@Controller()
export class QuoteRequestsController {
  constructor(private readonly svc: QuoteRequestsService) {}

  // ── Customer endpoints ─────────────────────────────────────────────────────

  /** Customer: submit a direct request to a specific pro */
  @Post('customer/quote-requests')
  @HttpCode(HttpStatus.CREATED)
  async submitRequest(
    @CurrentUser() user: MarketplaceAuthContext,
    @Body()
    body: {
      pro_id: string;
      service_category: string;
      job_description: string;
      district: string;
      contact_name?: string;
      contact_email?: string;
      contact_phone?: string;
      address_line1?: string;
      address_line2?: string;
    }
  ) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException();
    const quote = await this.svc.submitRequest(user.user_id, body);
    return { quote };
  }

  /** Customer: post an open job to the jobs board */
  @Post('customer/quote-requests/open')
  @HttpCode(HttpStatus.CREATED)
  async postOpenJob(
    @CurrentUser() user: MarketplaceAuthContext,
    @Body()
    body: {
      service_category: string;
      job_description: string;
      district: string;
      photos?: string[];
    }
  ) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException();
    const quote = await this.svc.postOpenJob(user.user_id, body);
    return { quote };
  }

  /** Customer: list all own requests (direct + open) */
  @Get('customer/quote-requests')
  async listCustomerRequests(@CurrentUser() user: MarketplaceAuthContext) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException();
    const quotes = await this.svc.listCustomerRequests(user.user_id);
    return { quotes };
  }

  /** Customer: list own open job posts */
  @Get('customer/quote-requests/open')
  async listCustomerOpenJobs(@CurrentUser() user: MarketplaceAuthContext) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException();
    const quotes = await this.svc.listCustomerOpenJobs(user.user_id);
    return { quotes };
  }

  /** Customer: update a pending direct request */
  @Put('customer/quote-requests/:quoteId')
  async updateCustomerRequest(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('quoteId') quoteId: string,
    @Body() body: any
  ) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException();
    const quote = await this.svc.updateCustomerRequest(user.user_id, quoteId, body);
    return { quote };
  }

  // ── Pro endpoints ──────────────────────────────────────────────────────────

  /** Pro: browse open jobs board (filtered to pro's categories/districts) */
  @Get('quote-requests/pro/jobs-board')
  async listJobsBoard(
    @CurrentUser() user: MarketplaceAuthContext,
    @Query('category') category?: string,
    @Query('district') district?: string
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    const jobs = await this.svc.listJobsBoard(user.user_id, { category, district });
    return { jobs };
  }

  /** Pro: claim an open job (first-come-first-served) */
  @Post('quote-requests/:quoteId/claim')
  @HttpCode(HttpStatus.OK)
  async claimJob(@CurrentUser() user: MarketplaceAuthContext, @Param('quoteId') quoteId: string) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    const result = await this.svc.claimOpenJob(user.user_id, quoteId);
    return result;
  }

  /** Pro: list incoming pending direct requests */
  @Get('quote-requests/pro/available')
  async listProAvailable(@CurrentUser() user: MarketplaceAuthContext) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    const quotes = await this.svc.listProAvailableRequests(user.user_id);
    return { quotes };
  }

  /** Pro: list past (accepted/declined/claimed) requests */
  @Get('quote-requests/pro/past')
  async listProPast(@CurrentUser() user: MarketplaceAuthContext) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    const quotes = await this.svc.listProPastRequests(user.user_id);
    return { quotes };
  }

  /** Pro: get a single direct request */
  @Get('quote-requests/:quoteId/pro')
  async getProRequest(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('quoteId') quoteId: string
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    const quote = await this.svc.getProRequest(user.user_id, quoteId);
    return { quote };
  }

  /** Pro: accept or decline a direct request */
  @Post('quote-requests/:quoteId/respond')
  @HttpCode(HttpStatus.OK)
  async respond(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('quoteId') quoteId: string,
    @Body() body: { action: 'ACCEPT' | 'DECLINE' }
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    const result = await this.svc.respondToRequest(user.user_id, quoteId, body.action);
    return result;
  }

  /** Pro: get lead fee transaction history for billing */
  @Get('quote-requests/pro/lead-fees')
  async getLeadFees(@CurrentUser() user: MarketplaceAuthContext) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    const data = await this.svc.listProLeadFeeTransactions(user.user_id);
    return data;
  }
}
