import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Query,
  Headers,
  Req,
  UseGuards,
  Param,
} from '@nestjs/common';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { UsageService } from './usage.service';
import { StripeConnectService } from './stripe-connect.service';
import { CustomerPaymentsService } from './customer-payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyId, UserRoleParam } from '../../common/decorators/auth.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { UserRole as UserRoleEnum } from '@handycall/shared';
import { NotFoundException } from '@nestjs/common';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(
    private billingService: BillingService,
    private usageService: UsageService,
    private stripeConnectService: StripeConnectService,
    private customerPaymentsService: CustomerPaymentsService,
  ) {}

  /**
   * Create setup intent for collecting payment method
   * POST /billing/setup-intent
   */
  @Post('setup-intent')
  async createSetupIntent(@CompanyId() companyId: string) {
    return this.billingService.createSetupIntent(companyId);
  }

  /**
   * Create new subscription
   * POST /billing/subscription
   */
  @Post('subscription')
  async createSubscription(
    @CompanyId() companyId: string,
    @Body() dto: CreateSubscriptionDto
  ) {
    return this.billingService.createSubscription(companyId, dto.plan, dto.payment_method_id);
  }

  /**
   * Update subscription (upgrade/downgrade)
   * PUT /billing/subscription
   */
  @Put('subscription')
  async updateSubscription(
    @CompanyId() companyId: string,
    @Body() dto: UpdateSubscriptionDto
  ) {
    return this.billingService.updateSubscription(companyId, dto.plan);
  }

  /**
   * Cancel subscription
   * DELETE /billing/subscription
   */
  @Delete('subscription')
  async cancelSubscription(
    @CompanyId() companyId: string,
    @Query('immediate') immediate?: string
  ) {
    return this.billingService.cancelSubscription(companyId, immediate === 'true');
  }

  /**
   * Get current subscription info
   * GET /billing/subscription
   */
  @Get('subscription')
  async getSubscription(@CompanyId() companyId: string) {
    return this.billingService.getBillingInfo(companyId);
  }

  /**
   * Get usage stats
   * GET /billing/usage
   */
  @Get('usage')
  async getUsage(
    @CompanyId() companyId: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string
  ) {
    if (startDate || endDate) {
      // Return historical usage
      const history = await this.usageService.getUsageHistory(companyId, startDate, endDate);
      return { history };
    } else {
      // Return current period stats
      return this.billingService.getUsageStats(companyId);
    }
  }

  /**
   * Get invoices
   * GET /billing/invoices
   */
  @Get('invoices')
  async getInvoices(@CompanyId() companyId: string) {
    return this.billingService.getInvoices(companyId);
  }

  /**
   * Update payment method
   * PUT /billing/payment-method
   */
  @Put('payment-method')
  async updatePaymentMethod(
    @CompanyId() companyId: string,
    @Body() body: { payment_method_id: string }
  ) {
    return this.billingService.updatePaymentMethod(companyId, body.payment_method_id);
  }

  /**
   * List payment methods
   * GET /billing/payment-methods
   */
  @Get('payment-methods')
  async listPaymentMethods(@CompanyId() companyId: string) {
    return this.billingService.listPaymentMethods(companyId);
  }

  /**
   * Set default payment method
   * POST /billing/payment-methods/default
   */
  @Post('payment-methods/default')
  async setDefaultPaymentMethod(
    @CompanyId() companyId: string,
    @Body() body: { payment_method_id: string }
  ) {
    return this.billingService.setDefaultPaymentMethod(companyId, body.payment_method_id);
  }

  /**
   * Delete payment method
   * DELETE /billing/payment-methods/:paymentMethodId
   */
  @Delete('payment-methods/:paymentMethodId')
  async deletePaymentMethod(
    @CompanyId() companyId: string,
    @Param('paymentMethodId') paymentMethodId: string
  ) {
    return this.billingService.deletePaymentMethod(companyId, paymentMethodId);
  }

  /**
   * Create/refresh Stripe Connect onboarding link
   * POST /billing/connect/setup
   */
  @Post('connect/setup')
  async setupConnectAccount(@CompanyId() companyId: string) {
    const link = await this.stripeConnectService.createAccountLink(companyId);
    const status = await this.stripeConnectService.getAccountStatus(companyId);
    return {
      ...link,
      status,
    };
  }

  /**
   * Generate a new Stripe Connect onboarding link
   * POST /billing/connect/onboarding-link
   */
  @Post('connect/onboarding-link')
  async createConnectOnboardingLink(@CompanyId() companyId: string) {
    return this.stripeConnectService.createAccountLink(companyId);
  }

  /**
   * Get Stripe Connect status
   * GET /billing/connect/status
   */
  @Get('connect/status')
  async getConnectStatus(@CompanyId() companyId: string) {
    return this.stripeConnectService.getAccountStatus(companyId);
  }

  /**
   * Get customer payments
   * GET /billing/customer-payments
   */
  @Get('customer-payments')
  async getCustomerPayments(
    @CompanyId() companyId: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('contact_id') contactId?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: string,
    @Query('lastEvaluatedKey') lastEvaluatedKey?: string,
  ) {
    let parsedLastKey: any = undefined;
    if (lastEvaluatedKey) {
      try {
        parsedLastKey = JSON.parse(lastEvaluatedKey);
      } catch {
        parsedLastKey = undefined;
      }
    }

    return this.customerPaymentsService.getPaymentsByCompany(companyId, {
      status: status as any,
      type: type as any,
      contact_id: contactId,
      start: start ? Number(start) : undefined,
      end: end ? Number(end) : undefined,
      limit: limit ? Number(limit) : undefined,
      lastEvaluatedKey: parsedLastKey,
    });
  }

  /**
   * Get customer payment revenue stats
   * GET /billing/customer-payments/stats
   */
  @Get('customer-payments/stats')
  async getCustomerPaymentStats(
    @CompanyId() companyId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.customerPaymentsService.getRevenueStats(companyId, {
      start: start ? Number(start) : undefined,
      end: end ? Number(end) : undefined,
    });
  }

  /**
   * Stripe webhook handler
   * POST /billing/webhook
   */
  @Public()
  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: Request
  ) {
    const rawBody = request.body;
    if (!Buffer.isBuffer(rawBody)) {
      throw new Error('Raw body buffer is required for webhook verification');
    }

    await this.billingService.handleWebhook(signature, rawBody as Buffer);
    return { received: true };
  }

  /**
   * Stripe Connect webhook handler
   * POST /billing/connect/webhook
   */
  @Public()
  @Post('connect/webhook')
  async handleConnectWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: Request
  ) {
    const rawBody = request.body;
    if (!Buffer.isBuffer(rawBody)) {
      throw new Error('Raw body buffer is required for webhook verification');
    }

    await this.stripeConnectService.handleConnectWebhook(signature, rawBody as Buffer);
    return { received: true };
  }

  // ============================================================================
  // Admin Endpoints
  // ============================================================================

  /**
   * List all subscriptions (admin only)
   * GET /billing/admin/subscriptions
   */
  @Get('admin/subscriptions')
  async listAllSubscriptions(
    @UserRoleParam() role: UserRoleEnum,
    @Query('status') status?: string,
    @Query('plan') plan?: string
  ) {
    if (role !== UserRoleEnum.ADMIN) {
      throw new NotFoundException('Not found');
    }

    // Implementation would query all companies with subscription data
    // For now, return placeholder
    return { subscriptions: [] };
  }

  /**
   * Get revenue metrics (admin only)
   * GET /billing/admin/revenue
   */
  @Get('admin/revenue')
  async getRevenueMetrics(@UserRoleParam() role: UserRoleEnum) {
    if (role !== UserRoleEnum.ADMIN) {
      throw new NotFoundException('Not found');
    }

    // TODO: Replace placeholder with actual monthly recurring revenue metrics.
    return {
      wrr: 0, // Legacy key; now represents MRR placeholder until metric contract is updated.
      active_subscriptions: 0,
      trial_conversions: 0,
      churn_rate: 0,
    };
  }

  // ============================================================================
  // Admin: Company Billing Management
  // ============================================================================

  /**
   * Get billing info for a specific company (admin only)
   * GET /billing/admin/company/:companyId
   */
  @Get('admin/company/:companyId')
  async getCompanyBilling(
    @UserRoleParam() role: UserRoleEnum,
    @Param('companyId') companyId: string
  ) {
    if (role !== UserRoleEnum.ADMIN) {
      throw new NotFoundException('Not found');
    }
    return this.billingService.getBillingInfo(companyId);
  }

  /**
   * Get invoices for a specific company (admin only)
   * GET /billing/admin/company/:companyId/invoices
   */
  @Get('admin/company/:companyId/invoices')
  async getCompanyInvoices(
    @UserRoleParam() role: UserRoleEnum,
    @Param('companyId') companyId: string
  ) {
    if (role !== UserRoleEnum.ADMIN) {
      throw new NotFoundException('Not found');
    }
    return this.billingService.getInvoices(companyId);
  }

  /**
   * Create subscription for a company (admin only) - no payment required
   * POST /billing/admin/company/:companyId/subscription
   */
  @Post('admin/company/:companyId/subscription')
  async adminCreateSubscription(
    @UserRoleParam() role: UserRoleEnum,
    @Param('companyId') companyId: string,
    @Body() dto: { plan: string }
  ) {
    if (role !== UserRoleEnum.ADMIN) {
      throw new NotFoundException('Not found');
    }
    return this.billingService.createAdminSubscription(companyId, dto.plan);
  }

  /**
   * Update subscription plan for a company (admin only)
   * PUT /billing/admin/company/:companyId/subscription
   */
  @Put('admin/company/:companyId/subscription')
  async adminUpdateSubscription(
    @UserRoleParam() role: UserRoleEnum,
    @Param('companyId') companyId: string,
    @Body() dto: UpdateSubscriptionDto
  ) {
    if (role !== UserRoleEnum.ADMIN) {
      throw new NotFoundException('Not found');
    }
    return this.billingService.updateSubscription(companyId, dto.plan);
  }

  /**
   * Cancel subscription for a company (admin only)
   * DELETE /billing/admin/company/:companyId/subscription
   * Query: immediate=true|false
   */
  @Delete('admin/company/:companyId/subscription')
  async adminCancelSubscription(
    @UserRoleParam() role: UserRoleEnum,
    @Param('companyId') companyId: string,
    @Query('immediate') immediate?: string
  ) {
    if (role !== UserRoleEnum.ADMIN) {
      throw new NotFoundException('Not found');
    }
    return this.billingService.cancelSubscription(companyId, immediate === 'true');
  }

  /**
   * Reactivate a canceled subscription for a company (admin only)
   * POST /billing/admin/company/:companyId/subscription/reactivate
   */
  @Post('admin/company/:companyId/subscription/reactivate')
  async adminReactivateSubscription(
    @UserRoleParam() role: UserRoleEnum,
    @Param('companyId') companyId: string
  ) {
    if (role !== UserRoleEnum.ADMIN) {
      throw new NotFoundException('Not found');
    }
    return this.billingService.reactivateSubscription(companyId);
  }

  /**
   * Admin: reset today's usage to zero
   * POST /billing/admin/company/:companyId/usage/reset
   */
  @Post('admin/company/:companyId/usage/reset')
  async adminResetUsage(
    @UserRoleParam() role: UserRoleEnum,
    @Param('companyId') companyId: string
  ) {
    if (role !== UserRoleEnum.ADMIN) {
      throw new NotFoundException('Not found');
    }
    await this.billingService.resetTodayUsage(companyId);
    return { success: true };
  }

  /**
   * Admin: adjust today's usage by delta (positive adds usage; negative grants credits)
   * POST /billing/admin/company/:companyId/usage/adjust
   */
  @Post('admin/company/:companyId/usage/adjust')
  async adminAdjustUsage(
    @UserRoleParam() role: UserRoleEnum,
    @Param('companyId') companyId: string,
    @Body() body: { minutes?: number; sms?: number; contacts?: number }
  ) {
    if (role !== UserRoleEnum.ADMIN) {
      throw new NotFoundException('Not found');
    }
    await this.billingService.adjustTodayUsage(companyId, body || {});
    return { success: true };
  }
}
