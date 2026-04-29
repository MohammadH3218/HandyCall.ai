import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { MarketplaceAuthContext } from '@handycall/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateLimitPolicy } from '../../common/decorators/rate-limit.decorator';
import { AdminGuard } from '../admin/admin.guard';
import { ProBillingService } from './pro-billing.service';

@Controller('billing')
export class ProBillingController {
  constructor(private readonly proBilling: ProBillingService) {}

  @RateLimitPolicy('USER_WRITE')
  @Get('config')
  getConfig() {
    return this.proBilling.getConfig();
  }

  @RateLimitPolicy('USER_WRITE')
  @Get('subscription')
  getSubscription(@CurrentUser() user: MarketplaceAuthContext) {
    this.assertPro(user);
    return this.proBilling.getProBillingOverview(user.user_id);
  }

  @RateLimitPolicy('USER_WRITE')
  @Get('credits')
  getCredits(@CurrentUser() user: MarketplaceAuthContext) {
    this.assertPro(user);
    return this.proBilling.getCreditLedger(user.user_id);
  }

  @RateLimitPolicy('USER_WRITE')
  @Post('credits/top-up')
  @HttpCode(HttpStatus.OK)
  prepareCreditTopUp(
    @Req() req: Request,
    @CurrentUser() user: MarketplaceAuthContext,
    @Body('amount_halalas') amountHalalas: number,
  ) {
    this.assertPro(user);
    return this.proBilling.prepareCreditTopUp(req as Request, user.user_id, amountHalalas);
  }

  @RateLimitPolicy('USER_WRITE')
  @Post('credits/recharge-default')
  @HttpCode(HttpStatus.OK)
  rechargeCreditsWithDefaultMethod(
    @Req() req: Request,
    @CurrentUser() user: MarketplaceAuthContext,
    @Body('amount_halalas') amountHalalas: number,
    @Body('payment_method_id') paymentMethodId?: string,
  ) {
    this.assertPro(user);
    return this.proBilling.rechargeCreditsWithDefaultMethod(req as Request, user.user_id, amountHalalas, paymentMethodId);
  }

  @RateLimitPolicy('USER_WRITE')
  @Put('auto-recharge')
  updateAutoRecharge(
    @Req() req: Request,
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() body: { enabled?: boolean; threshold_halalas?: number; recharge_amount_halalas?: number },
  ) {
    this.assertPro(user);
    return this.proBilling.updateAutoRecharge(req as Request, user.user_id, body || {});
  }

  @RateLimitPolicy('USER_WRITE')
  @Get('invoices')
  listInvoices(@CurrentUser() user: MarketplaceAuthContext) {
    this.assertPro(user);
    return this.proBilling.listInvoices(user.user_id);
  }

  @RateLimitPolicy('USER_WRITE')
  @Post('invoices/current')
  @HttpCode(HttpStatus.OK)
  createCurrentInvoice(@Req() req: Request, @CurrentUser() user: MarketplaceAuthContext) {
    this.assertPro(user);
    return this.proBilling.createCurrentBalanceInvoice(req as Request, user.user_id);
  }

  @RateLimitPolicy('USER_WRITE')
  @Post('pay-current')
  @HttpCode(HttpStatus.OK)
  payCurrentWithDefaultMethod(@Req() req: Request, @CurrentUser() user: MarketplaceAuthContext) {
    this.assertPro(user);
    return this.proBilling.payCurrentBalanceWithDefaultMethod(req as Request, user.user_id);
  }

  @RateLimitPolicy('USER_WRITE')
  @Post('payments/:payment_id/verify')
  @HttpCode(HttpStatus.OK)
  verifyPayment(
    @Req() req: Request,
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('payment_id') paymentId: string,
  ) {
    this.assertPro(user);
    return this.proBilling.verifyProPayment(req as Request, user.user_id, paymentId);
  }

  @RateLimitPolicy('USER_WRITE')
  @Get('payment-methods')
  async getPaymentMethods(@CurrentUser() user: MarketplaceAuthContext) {
    this.assertPro(user);
    return { payment_methods: await this.proBilling.listPaymentMethods(user.user_id) };
  }

  @RateLimitPolicy('USER_WRITE')
  @Post('payment-methods/default')
  @HttpCode(HttpStatus.OK)
  setDefaultPaymentMethod(
    @CurrentUser() user: MarketplaceAuthContext,
    @Body('payment_method_id') paymentMethodId: string,
  ) {
    this.assertPro(user);
    return this.proBilling.setDefaultPaymentMethod(user.user_id, paymentMethodId);
  }

  @RateLimitPolicy('USER_WRITE')
  @Post('payment-methods/token')
  @HttpCode(HttpStatus.OK)
  savePaymentMethodToken(
    @Req() req: Request,
    @CurrentUser() user: MarketplaceAuthContext,
    @Body('token') token: string,
  ) {
    this.assertPro(user);
    return this.proBilling.savePaymentMethodToken(req as Request, user.user_id, token);
  }

  @RateLimitPolicy('USER_WRITE')
  @Delete('payment-methods/:payment_method_id')
  deletePaymentMethod(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('payment_method_id') paymentMethodId: string,
  ) {
    this.assertPro(user);
    return this.proBilling.deletePaymentMethod(user.user_id, paymentMethodId);
  }

  @UseGuards(AdminGuard)
  @RateLimitPolicy('ADMIN_READ')
  @Get('admin/payments')
  listAdminPayments(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    return this.proBilling.listAdminPayments({
      status,
      search,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @UseGuards(AdminGuard)
  @RateLimitPolicy('ADMIN_READ')
  @Get('admin/pro/:pro_id')
  getAdminProBilling(@Param('pro_id') proId: string) {
    return this.proBilling.getAdminProBilling(proId);
  }

  @UseGuards(AdminGuard)
  @RateLimitPolicy('ADMIN_MUTATION')
  @Post('admin/invoices/:invoice_id/refund')
  @HttpCode(HttpStatus.OK)
  refundInvoice(
    @Req() req: Request,
    @Param('invoice_id') invoiceId: string,
    @Body() body: { amount_halalas?: number; reason?: string },
  ) {
    return this.proBilling.refundInvoice(req as Request, invoiceId, body?.amount_halalas, body?.reason);
  }

  private assertPro(user: MarketplaceAuthContext) {
    if (user.user_type !== 'PRO') {
      throw new ForbiddenException('Pro access required.');
    }
  }
}
