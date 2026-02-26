import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { CompaniesService } from '../companies/companies.service';
import Stripe from 'stripe';
import { CustomerPaymentsService } from './customer-payments.service';

type ConnectStatus = {
  connected: boolean;
  account_id?: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  requirements_due?: string[];
  disabled_reason?: string | null;
};

@Injectable()
export class StripeConnectService {
  private readonly stripe: Stripe;

  constructor(
    private readonly config: ConfigService,
    private readonly dynamodb: DynamoDBService,
    private readonly companies: CompaniesService,
    private readonly customerPayments: CustomerPaymentsService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  async createConnectedAccount(companyId: string): Promise<{ account_id: string }> {
    const company = await this.companies.findById(companyId);
    if (!company) throw new NotFoundException('Company not found');

    if (company.stripe_connect_account_id) {
      return { account_id: company.stripe_connect_account_id };
    }

    const account = await this.stripe.accounts.create({
      type: 'express',
      business_type: 'company',
      email: company.email || undefined,
      metadata: {
        company_id: companyId,
      },
    });

    await this.companies.updateCompany(companyId, {
      stripe_connect_account_id: account.id,
      stripe_connect_onboarding_complete: false,
    } as any);

    await this.upsertConnectedAccount(companyId, account);
    return { account_id: account.id };
  }

  async createAccountLink(
    companyId: string,
    options?: { refresh_url?: string; return_url?: string },
  ): Promise<{ account_id: string; url: string; expires_at: number }> {
    const { account_id } = await this.createConnectedAccount(companyId);

    const frontendBase = (this.config.get<string>('FRONTEND_URL') || 'https://handycall.org').replace(/\/$/, '');
    const refresh_url =
      options?.refresh_url || `${frontendBase}/dashboard/settings?payments=connect&state=refresh`;
    const return_url =
      options?.return_url || `${frontendBase}/dashboard/settings?payments=connect&state=return`;

    const link = await this.stripe.accountLinks.create({
      account: account_id,
      type: 'account_onboarding',
      refresh_url,
      return_url,
    });

    return {
      account_id,
      url: link.url,
      expires_at: link.expires_at * 1000,
    };
  }

  async getAccountStatus(companyId: string): Promise<ConnectStatus> {
    const company = await this.companies.findById(companyId);
    if (!company) throw new NotFoundException('Company not found');

    if (!company.stripe_connect_account_id) {
      return { connected: false };
    }

    const account = await this.stripe.accounts.retrieve(company.stripe_connect_account_id);
    await this.upsertConnectedAccount(companyId, account);

    const onboardingComplete = Boolean(account.details_submitted && account.charges_enabled);
    if (company.stripe_connect_onboarding_complete !== onboardingComplete) {
      await this.companies.updateCompany(companyId, {
        stripe_connect_onboarding_complete: onboardingComplete,
      } as any);
    }

    return {
      connected: true,
      account_id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      requirements_due: account.requirements?.currently_due || [],
      disabled_reason: account.requirements?.disabled_reason || null,
    };
  }

  async createPaymentIntent(
    companyId: string,
    input: {
      amount_cents: number;
      currency?: string;
      metadata?: Record<string, string>;
      description?: string;
      customer_email?: string;
    },
  ): Promise<Stripe.PaymentIntent> {
    if (!Number.isFinite(input.amount_cents) || input.amount_cents < 50) {
      throw new BadRequestException('amount_cents must be at least 50');
    }

    const status = await this.getAccountStatus(companyId);
    if (!status.connected || !status.account_id) {
      throw new BadRequestException('Stripe Connect account is not set up');
    }
    if (!status.charges_enabled) {
      throw new BadRequestException('Stripe Connect onboarding is incomplete. Charges are not enabled yet.');
    }

    const currency = (input.currency || 'usd').toLowerCase();
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(input.amount_cents),
      currency,
      description: input.description,
      receipt_email: input.customer_email || undefined,
      automatic_payment_methods: { enabled: true },
      transfer_data: {
        destination: status.account_id,
      },
      on_behalf_of: status.account_id,
      metadata: {
        company_id: companyId,
        ...(input.metadata || {}),
      },
    });

    return paymentIntent;
  }

  async handleConnectWebhook(signature: string, rawBody: Buffer): Promise<void> {
    const event = this.constructConnectWebhookEvent(rawBody, signature);
    if (event.type === 'account.updated') {
      await this.handleAccountUpdated(event.data.object as Stripe.Account);
      return;
    }

    if (event.type.startsWith('payment_intent.')) {
      await this.customerPayments.syncFromPaymentIntent(event.data.object as Stripe.PaymentIntent);
    }
  }

  constructConnectWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.config.get<string>('STRIPE_CONNECT_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('STRIPE_CONNECT_WEBHOOK_SECRET is not configured');
    }
    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  private async handleAccountUpdated(account: Stripe.Account): Promise<void> {
    const companyId = await this.findCompanyByConnectAccountId(account.id);
    if (!companyId) return;

    await this.upsertConnectedAccount(companyId, account);
    const onboardingComplete = Boolean(account.details_submitted && account.charges_enabled);
    await this.companies.updateCompany(companyId, {
      stripe_connect_onboarding_complete: onboardingComplete,
    } as any);
  }

  private async findCompanyByConnectAccountId(accountId: string): Promise<string | null> {
    const result = await this.dynamodb.scan('companies', {
      filterExpression: '#stripe_connect_account_id = :account_id',
      expressionAttributeNames: {
        '#stripe_connect_account_id': 'stripe_connect_account_id',
      },
      expressionAttributeValues: {
        ':account_id': accountId,
      },
      limit: 1,
    });
    const company = result.items?.[0] as any;
    return company?.company_id ? String(company.company_id) : null;
  }

  private async upsertConnectedAccount(companyId: string, account: Stripe.Account): Promise<void> {
    const now = Date.now();
    const existing = await this.dynamodb.get('connected_accounts', { company_id: companyId });

    await this.dynamodb.put('connected_accounts', {
      company_id: companyId,
      stripe_account_id: account.id,
      charges_enabled: Boolean(account.charges_enabled),
      payouts_enabled: Boolean(account.payouts_enabled),
      details_submitted: Boolean(account.details_submitted),
      requirements_due: account.requirements?.currently_due || [],
      disabled_reason: account.requirements?.disabled_reason || null,
      created_at: Number(existing?.created_at || now),
      updated_at: now,
    });
  }
}
