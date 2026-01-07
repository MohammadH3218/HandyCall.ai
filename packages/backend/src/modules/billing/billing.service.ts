import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { UsageService } from './usage.service';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { CompaniesService } from '../companies/companies.service';
import { SubscriptionPlan, SubscriptionStatus, CompanyStatus } from '@handycall/shared';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';

@Injectable()
export class BillingService {
  constructor(
    private stripeService: StripeService,
    private usageService: UsageService,
    private dynamodb: DynamoDBService,
    private companiesService: CompaniesService
  ) {}

  /**
   * Create setup intent for collecting payment method
   */
  async createSetupIntent(companyId: string): Promise<{ client_secret: string }> {
    const company = await this.companiesService.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    let customerId = company.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await this.stripeService.createCustomer(
        company.email,
        company.company_name,
        { company_id: companyId }
      );
      customerId = customer.id;

      // Update company with customer ID
      await this.companiesService.updateCompany(companyId, {
        stripe_customer_id: customerId,
      });
    }

    const setupIntent = await this.stripeService.createSetupIntent(customerId);
    return { client_secret: setupIntent.client_secret! };
  }

  /**
   * Create subscription for a company
   */
  async createSubscription(
    companyId: string,
    plan: SubscriptionPlan,
    paymentMethodId: string
  ): Promise<{ subscription: any }> {
    const company = await this.companiesService.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check if already has active subscription
    if (company.stripe_subscription_id) {
      throw new BadRequestException('Company already has an active subscription');
    }

    let customerId = company.stripe_customer_id;

    // Create customer if doesn't exist
    if (!customerId) {
      const customer = await this.stripeService.createCustomer(
        company.email,
        company.company_name,
        { company_id: companyId }
      );
      customerId = customer.id;
    }

    // Get price ID for plan
    const priceId = this.stripeService.getPriceIdForPlan(plan);

    const eligibleForProTrial = plan === SubscriptionPlan.PRO && !company.trial_used_at;
    const trialDays = eligibleForProTrial ? 14 : 0;

    // Create subscription with trial (Pro only, once)
    const subscription = await this.stripeService.createSubscription(
      customerId,
      priceId,
      paymentMethodId,
      companyId,
      trialDays
    );

    // Get payment method details for UI display
    const paymentMethod = await this.stripeService.getPaymentMethod(paymentMethodId);
    const paymentDetails =
      paymentMethod.card && paymentMethod.card.last4
        ? {
            payment_method_last4: paymentMethod.card.last4,
            payment_method_brand: paymentMethod.card.brand,
          }
        : {};

    const trialEndsAt = subscription.trial_end
      ? subscription.trial_end * 1000
      : trialDays
      ? Date.now() + trialDays * 24 * 60 * 60 * 1000
      : null;
    const trialStartAt = subscription.trial_start ? subscription.trial_start * 1000 : null;

    // Update company record
    await this.companiesService.updateCompany(companyId, {
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      subscription_plan: plan,
      subscription_status: this.mapStripeStatus(subscription.status),
      current_period_start: subscription.current_period_start * 1000,
      current_period_end: subscription.current_period_end * 1000,
      cancel_at_period_end: false,
      ...paymentDetails,
      status: this.getCompanyStatus(subscription.status),
      trial_ends_at: eligibleForProTrial ? trialEndsAt : null,
      ...(eligibleForProTrial ? { trial_used_at: trialStartAt || Date.now() } : {}),
      calls_enabled: true,
      sms_enabled: true,
    });

    return { subscription };
  }

  /**
   * Create subscription for a company (admin-initiated, no payment required)
   */
  async createAdminSubscription(
    companyId: string,
    plan: string
  ): Promise<{ subscription: any }> {
    const company = await this.companiesService.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check if already has active subscription
    if (company.stripe_subscription_id) {
      throw new BadRequestException('Company already has an active subscription. Use update endpoint instead.');
    }

    // For admin-created subscriptions, we don't create Stripe subscription
    // Just update company record with plan details
    const now = Date.now();
    const oneWeekFromNow = now + (7 * 24 * 60 * 60 * 1000); // 1 week billing period

    await this.companiesService.updateCompany(companyId, {
      subscription_plan: plan as SubscriptionPlan,
      subscription_status: SubscriptionStatus.ACTIVE,
      current_period_start: now,
      current_period_end: oneWeekFromNow,
      cancel_at_period_end: false,
      status: CompanyStatus.ACTIVE,
      trial_ends_at: null,
      calls_enabled: true,
      sms_enabled: true,
    });

    return {
      subscription: {
        id: `admin_sub_${companyId}`,
        plan,
        status: 'active',
        current_period_start: Math.floor(now / 1000),
        current_period_end: Math.floor(oneWeekFromNow / 1000),
      }
    };
  }

  /**
   * Update subscription (upgrade/downgrade)
   */
  async updateSubscription(
    companyId: string,
    newPlan: SubscriptionPlan
  ): Promise<{ subscription: any }> {
    const company = await this.companiesService.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (!company.stripe_subscription_id) {
      if (!company.subscription_plan) {
        throw new BadRequestException('No active subscription found');
      }

      const updated = await this.companiesService.updateCompany(companyId, {
        subscription_plan: newPlan,
        subscription_status: SubscriptionStatus.ACTIVE,
        cancel_at_period_end: false,
        status: CompanyStatus.ACTIVE,
      });

      return {
        subscription: {
          id: `admin_sub_${companyId}`,
          plan: newPlan,
          status: 'active',
          current_period_start: Math.floor((updated.current_period_start || Date.now()) / 1000),
          current_period_end: Math.floor((updated.current_period_end || Date.now()) / 1000),
        },
      };
    }

    const newPriceId = this.stripeService.getPriceIdForPlan(newPlan);
    const subscription = await this.stripeService.updateSubscription(
      company.stripe_subscription_id,
      newPriceId
    );

    // Update company record
    await this.companiesService.updateCompany(companyId, {
      subscription_plan: newPlan,
      current_period_start: subscription.current_period_start * 1000,
      current_period_end: subscription.current_period_end * 1000,
    });

    return { subscription };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    companyId: string,
    immediate: boolean = false
  ): Promise<{ subscription: any }> {
    const company = await this.companiesService.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (!company.stripe_subscription_id) {
      if (!company.subscription_plan) {
        throw new BadRequestException('No active subscription found');
      }

      if (immediate) {
        await this.companiesService.updateCompany(companyId, {
          subscription_plan: null,
          subscription_status: null,
          current_period_start: null,
          current_period_end: null,
          cancel_at_period_end: false,
          status: CompanyStatus.INACTIVE,
          trial_ends_at: null,
          calls_enabled: false,
          sms_enabled: false,
        });
      } else {
        await this.companiesService.updateCompany(companyId, {
          cancel_at_period_end: true,
          status: CompanyStatus.CANCELLED,
        });
      }

      return {
        subscription: {
          id: `admin_sub_${companyId}`,
          status: immediate ? 'canceled' : 'active',
          cancel_at_period_end: !immediate,
        },
      };
    }

    const subscription = await this.stripeService.cancelSubscription(
      company.stripe_subscription_id,
      immediate
    );

    const cancelUpdates = immediate
      ? {
          cancel_at_period_end: false,
          subscription_status: SubscriptionStatus.CANCELED,
          subscription_plan: null,
          stripe_subscription_id: null,
          current_period_start: null,
          current_period_end: null,
          status: CompanyStatus.INACTIVE,
          trial_ends_at: null,
          calls_enabled: false,
          sms_enabled: false,
        }
      : {
          cancel_at_period_end: true,
          status: CompanyStatus.CANCELLED,
        };

    await this.companiesService.updateCompany(companyId, cancelUpdates);

    return { subscription };
  }

  /**
   * Reactivate subscription (admin)
   */
  async reactivateSubscription(companyId: string): Promise<{ subscription: any }> {
    const company = await this.companiesService.findById(companyId);
    if (!company?.stripe_subscription_id) {
      if (!company?.subscription_plan) {
        throw new BadRequestException('No subscription to reactivate');
      }

      const updated = await this.companiesService.updateCompany(companyId, {
        cancel_at_period_end: false,
        subscription_status: SubscriptionStatus.ACTIVE,
        status: CompanyStatus.ACTIVE,
        calls_enabled: true,
        sms_enabled: true,
      });

      return {
        subscription: {
          id: `admin_sub_${companyId}`,
          status: 'active',
          current_period_start: Math.floor((updated.current_period_start || Date.now()) / 1000),
          current_period_end: Math.floor((updated.current_period_end || Date.now()) / 1000),
        },
      };
    }

    const subscription = await this.stripeService.reactivateSubscription(company.stripe_subscription_id);

    await this.companiesService.updateCompany(companyId, {
      cancel_at_period_end: false,
      subscription_status: this.mapStripeStatus(subscription.status),
      status: this.getCompanyStatus(subscription.status),
      current_period_start: subscription.current_period_start * 1000,
      current_period_end: subscription.current_period_end * 1000,
    });

    return { subscription };
  }

  /**
   * Get billing info for a company
   */
  async getBillingInfo(companyId: string): Promise<any> {
    let company = await this.companiesService.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (
      !company.stripe_subscription_id &&
      company.cancel_at_period_end &&
      company.current_period_end &&
      company.current_period_end <= Date.now()
    ) {
      company = await this.companiesService.updateCompany(companyId, {
        subscription_plan: null,
        subscription_status: null,
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
        status: CompanyStatus.INACTIVE,
        trial_ends_at: null,
        calls_enabled: false,
        sms_enabled: false,
      });
    }

    let subscription = null;
    let paymentMethod = null;

    if (company.stripe_subscription_id) {
      subscription = await this.stripeService.getSubscription(company.stripe_subscription_id);
    }

    if (company.stripe_customer_id) {
      const customer = await this.stripeService.getCustomer(company.stripe_customer_id);
      const pmId = (customer as any).invoice_settings?.default_payment_method;
      if (pmId) {
        // Get payment method details would go here
        paymentMethod = {
          last4: company.payment_method_last4,
          brand: company.payment_method_brand,
        };
      }
    }

    return {
      company_id: companyId,
      subscription_plan: company.subscription_plan,
      subscription_status: company.subscription_status,
      current_period_start: company.current_period_start,
      current_period_end: company.current_period_end,
      cancel_at_period_end: company.cancel_at_period_end,
      payment_method: paymentMethod,
      stripe_subscription: subscription,
    };
  }

  /**
   * Get invoices for a company
   */
  async getInvoices(companyId: string): Promise<any[]> {
    const company = await this.companiesService.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (!company.stripe_customer_id) {
      return [];
    }

    const invoices = await this.stripeService.listInvoices(company.stripe_customer_id);
    return invoices;
  }

  /**
   * Update payment method for a company
   */
  async updatePaymentMethod(companyId: string, paymentMethodId: string): Promise<any> {
    const company = await this.companiesService.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (!company.stripe_customer_id) {
      throw new BadRequestException('No Stripe customer found');
    }

    // Attach payment method to customer and set as default
    await this.stripeService.updateCustomerPaymentMethod(company.stripe_customer_id, paymentMethodId);

    // Get payment method details
    const paymentMethod = await this.stripeService.getPaymentMethod(paymentMethodId);
    const paymentDetails =
      paymentMethod.card && paymentMethod.card.last4
        ? {
            payment_method_last4: paymentMethod.card.last4,
            payment_method_brand: paymentMethod.card.brand,
          }
        : {};

    // Update company record
    await this.companiesService.updateCompany(companyId, paymentDetails);

    return { success: true, ...paymentDetails };
  }

  /**
   * Get usage stats for a company
   */
  async getUsageStats(companyId: string): Promise<any> {
    const company = await this.companiesService.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const periodStart = company.current_period_start || Date.now();
    const usage = await this.usageService.getCurrentWeekUsage(companyId, periodStart);
    const plan = company.subscription_plan;
    const limits = plan ? await this.usageService.checkLimitsExceeded(companyId, plan, periodStart) : null;

    if (plan && limits) {
      const updates: { calls_enabled?: boolean; sms_enabled?: boolean } = {};
      if (limits.minutes.exceeded && company.calls_enabled) {
        updates.calls_enabled = false;
      }
      if (limits.sms.exceeded && company.sms_enabled) {
        updates.sms_enabled = false;
      }
      if (Object.keys(updates).length > 0) {
        await this.companiesService.updateCompany(companyId, updates);
      }
    }

    return {
      usage,
      limits,
      plan_limits: plan ? this.usageService.getPlanLimits(plan) : undefined,
    };
  }

  /**
   * Admin: reset today's usage to zero
   */
  async resetTodayUsage(companyId: string): Promise<void> {
    await this.usageService.setTodayUsage(companyId, { minutes: 0, sms: 0, contacts: 0 });
  }

  /**
   * Admin: adjust today's usage by delta (positive adds usage, negative gives credits back)
   */
  async adjustTodayUsage(
    companyId: string,
    deltas: { minutes?: number; sms?: number; contacts?: number }
  ): Promise<void> {
    await this.usageService.adjustTodayUsage(companyId, deltas);
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(signature: string, rawBody: Buffer): Promise<void> {
    let event: Stripe.Event;

    try {
      event = this.stripeService.constructWebhookEvent(rawBody, signature);
    } catch (err) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // Check for duplicate events
    const existingEvent = await this.dynamodb.query(
      'billing_events',
      '#stripe_event_id = :event_id',
      { '#stripe_event_id': 'stripe_event_id' },
      { ':event_id': event.id },
      { indexName: 'stripe_event_id-index', limit: 1 }
    );

    if (existingEvent.items.length > 0) {
      console.log('[BillingService] Duplicate webhook event, skipping:', event.id);
      return;
    }

    // Process event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log('[BillingService] Unhandled event type:', event.type);
    }

    // Log event
    await this.logBillingEvent(event);
  }

  /**
   * Handle subscription updated webhook
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const companyId = subscription.metadata.company_id;
    if (!companyId) {
      console.warn('[BillingService] Subscription missing company_id metadata:', subscription.id);
      return;
    }

    const priceId = subscription.items.data[0]?.price?.id;
    const plan = this.stripeService.getPlanFromPriceId(priceId);
    const isCanceling = subscription.cancel_at_period_end === true;
    const isTrialing = subscription.status === 'trialing';
    const trialEndsAt = subscription.trial_end ? subscription.trial_end * 1000 : null;
    const trialStartedAt = subscription.trial_start ? subscription.trial_start * 1000 : null;
    const isProTrial = plan === SubscriptionPlan.PRO && isTrialing;

    await this.companiesService.updateCompany(companyId, {
      subscription_status: this.mapStripeStatus(subscription.status),
      current_period_start: subscription.current_period_start * 1000,
      current_period_end: subscription.current_period_end * 1000,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      subscription_plan: plan ?? undefined,
      status: isCanceling ? CompanyStatus.CANCELLED : this.getCompanyStatus(subscription.status),
      trial_ends_at: isProTrial ? trialEndsAt : null,
      ...(isProTrial ? { trial_used_at: trialStartedAt || Date.now() } : {}),
    });
  }

  /**
   * Handle subscription deleted webhook
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const companyId = subscription.metadata.company_id;
    if (!companyId) return;

    await this.companiesService.updateCompany(companyId, {
      subscription_status: null,
      subscription_plan: null,
      stripe_subscription_id: null,
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      status: CompanyStatus.INACTIVE,
      trial_ends_at: null,
      calls_enabled: false,
      sms_enabled: false,
    });
  }

  /**
   * Handle invoice paid webhook
   */
  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    // Log successful payment
    console.log('[BillingService] Invoice paid:', invoice.id);
  }

  /**
   * Handle invoice payment failed webhook
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    // Log failed payment, could send notification
    console.error('[BillingService] Invoice payment failed:', invoice.id);
  }

  /**
   * Log billing event to DynamoDB
   */
  private async logBillingEvent(event: Stripe.Event): Promise<void> {
    const eventId = `${Date.now()}-${uuidv4()}`;
    const companyId = (event.data.object as any)?.metadata?.company_id || 'unknown';

    await this.dynamodb.put('billing_events', {
      company_id: companyId,
      event_id: eventId,
      event_type: event.type,
      stripe_event_id: event.id,
      data: event.data.object,
      created_at: Date.now(),
    });
  }

  /**
   * Map Stripe subscription status to our enum
   */
  private mapStripeStatus(stripeStatus: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      trialing: SubscriptionStatus.TRIALING,
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELED,
      unpaid: SubscriptionStatus.UNPAID,
      incomplete: SubscriptionStatus.INCOMPLETE,
    };
    return statusMap[stripeStatus] || SubscriptionStatus.ACTIVE;
  }

  /**
   * Map subscription status to company status
   */
  private getCompanyStatus(stripeStatus: string): CompanyStatus {
    switch (stripeStatus) {
      case 'active':
        return CompanyStatus.ACTIVE;
      case 'trialing':
        return CompanyStatus.TRIAL;
      case 'past_due':
      case 'unpaid':
        return CompanyStatus.SUSPENDED;
      case 'canceled':
        return CompanyStatus.INACTIVE;
      default:
        return CompanyStatus.SUSPENDED;
    }
  }
}
