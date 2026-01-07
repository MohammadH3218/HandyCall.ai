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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyId, UserRole } from '../../common/decorators/auth.decorator';
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
    private usageService: UsageService
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

  // ============================================================================
  // Admin Endpoints
  // ============================================================================

  /**
   * List all subscriptions (admin only)
   * GET /billing/admin/subscriptions
   */
  @Get('admin/subscriptions')
  async listAllSubscriptions(
    @UserRole() role: UserRoleEnum,
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
  async getRevenueMetrics(@UserRole() role: UserRoleEnum) {
    if (role !== UserRoleEnum.ADMIN) {
      throw new NotFoundException('Not found');
    }

    // Calculate total weekly recurring revenue, active subscriptions, etc.
    return {
      wrr: 0, // Weekly Recurring Revenue
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
    @UserRole() role: UserRoleEnum,
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
    @UserRole() role: UserRoleEnum,
    @Param('companyId') companyId: string
  ) {
    if (role !== UserRoleEnum.ADMIN) {
      throw new NotFoundException('Not found');
    }
    return this.billingService.getInvoices(companyId);
  }

  /**
   * Update subscription plan for a company (admin only)
   * PUT /billing/admin/company/:companyId/subscription
   */
  @Put('admin/company/:companyId/subscription')
  async adminUpdateSubscription(
    @UserRole() role: UserRoleEnum,
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
    @UserRole() role: UserRoleEnum,
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
    @UserRole() role: UserRoleEnum,
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
    @UserRole() role: UserRoleEnum,
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
    @UserRole() role: UserRoleEnum,
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
