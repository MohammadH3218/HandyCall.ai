import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

type RequestLike = Request & { requestId?: string; body?: any };
type MoyasarInvoice = Record<string, any>;
type MoyasarPayment = Record<string, any>;

const LEAD_FEE_TRANSACTIONS_TABLE = 'lead_fee_transactions';
const PRO_BILLING_INVOICES_TABLE = 'pro_billing_invoices';
const PRO_PAYMENT_METHODS_TABLE = 'pro_payment_methods';
const PRO_CREDIT_TRANSACTIONS_TABLE = 'pro_credit_transactions';
const MOYASAR_BASE_URL = 'https://api.moyasar.com/v1';
const MIN_CREDIT_TOP_UP_HALALAS = 2_000;
const MAX_CREDIT_BALANCE_HALALAS = 500_000;

@Injectable()
export class ProBillingService {
  private readonly logger = new Logger(ProBillingService.name);

  constructor(
    private readonly db: DynamoDBService,
    private readonly config: ConfigService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  getConfig() {
    const samsungPayServiceId = this.config.get<string>('MOYASAR_SAMSUNG_PAY_SERVICE_ID')?.trim() || null;
    const applePayValidateUrl =
      this.config.get<string>('MOYASAR_APPLE_PAY_VALIDATE_URL')?.trim() ||
      'https://api.moyasar.com/v1/applepay/initiate';
    return {
      provider: 'moyasar',
      publishable_key: this.config.get<string>('MOYASAR_PUBLISHABLE_KEY') || null,
      currency: 'SAR',
      minimum_credit_top_up_halalas: MIN_CREDIT_TOP_UP_HALALAS,
      maximum_credit_balance_halalas: MAX_CREDIT_BALANCE_HALALAS,
      supported_methods: {
        creditcard: true,
        applepay: true,
        samsungpay: Boolean(samsungPayServiceId),
        stcpay: true,
      },
      wallet_config: {
        apple_pay: {
          country: 'SA',
          label: 'HandyCall',
          validate_merchant_url: applePayValidateUrl,
          save_card: true,
        },
        samsung_pay: samsungPayServiceId
          ? {
              service_id: samsungPayServiceId,
              country: 'SA',
              environment: this.config.get<string>('MOYASAR_SAMSUNG_PAY_ENVIRONMENT') || 'PRODUCTION',
              label: 'HandyCall',
              save_card: true,
            }
          : null,
      },
    };
  }

  async getProBillingOverview(proId: string) {
    const [leadFees, invoices, methods, creditLedger, autoRecharge] = await Promise.all([
      this.getLeadFeeBalance(proId),
      this.listInvoices(proId),
      this.listPaymentMethods(proId),
      this.getCreditLedger(proId),
      this.getAutoRechargeSettings(proId),
    ]);

    return {
      provider: 'moyasar',
      subscription_plan: 'PREPAID_CREDITS',
      subscription_status: creditLedger.balance_halalas > 0 ? 'CREDITS_ACTIVE' : 'NO_CREDITS',
      current_period_start: leadFees.current_period_start,
      current_period_end: leadFees.current_period_end,
      credit_balance_halalas: creditLedger.balance_halalas,
      credit_balance_sar: this.halalasToSar(creditLedger.balance_halalas),
      balance_halalas: creditLedger.balance_halalas,
      balance_sar: this.halalasToSar(creditLedger.balance_halalas),
      unpaid_lead_count: 0,
      next_billing_date: leadFees.current_period_end,
      default_payment_method: methods.find((method) => method.is_default) || methods[0] || null,
      recent_invoice: invoices[0] || null,
      auto_recharge: autoRecharge,
      recent_credit_transactions: creditLedger.transactions.slice(0, 10),
    };
  }

  async getCreditLedger(proId: string) {
    const { items } = await this.db
      .query(
        PRO_CREDIT_TRANSACTIONS_TABLE,
        '#pro_id = :pid',
        { '#pro_id': 'pro_id' },
        { ':pid': proId },
        { indexName: 'pro-credit-transactions-index', scanIndexForward: false, limit: 250 },
      )
      .catch(() => ({ items: [] }));

    const transactions = (items as any[]).sort((a, b) => Number(b.created_at || 0) - Number(a.created_at || 0));
    const balanceHalalas = transactions.reduce((sum, item) => {
      const amount = Number(item.amount_halalas || 0);
      return this.isCreditTransaction(item.transaction_type) ? sum + amount : sum - amount;
    }, 0);

    return {
      balance_halalas: Math.max(0, balanceHalalas),
      balance_sar: this.halalasToSar(balanceHalalas),
      transactions: transactions.map((item) => ({
        ...item,
        amount_sar: this.halalasToSar(item.amount_halalas),
        direction: this.isCreditTransaction(item.transaction_type) ? 'CREDIT' : 'DEBIT',
      })),
    };
  }

  async prepareCreditTopUp(request: RequestLike, proId: string, amountHalalas: number) {
    const amount = this.validateCreditAmount(amountHalalas);
    await this.ensureCreditLimit(proId, amount);

    const now = Date.now();
    const invoice = {
      invoice_id: uuidv4(),
      pro_id: proId,
      provider: 'moyasar',
      status: 'INITIATED',
      billing_purpose: 'CREDIT_TOP_UP',
      amount_halalas: amount,
      amount_due: amount,
      amount_paid: 0,
      currency: 'SAR',
      description: 'HandyCall credit top-up',
      hosted_invoice_url: null,
      created_at: now,
      updated_at: now,
    };

    await this.db.put(PRO_BILLING_INVOICES_TABLE, invoice);
    await this.auditLogs.logFromRequest(request, {
      category: 'PAYMENT',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'billing.credit_topup_prepared',
      target_type: 'pro',
      target_id: proId,
      metadata: {
        provider: 'moyasar',
        invoice_id: invoice.invoice_id,
        amount_halalas: amount,
      },
    });

    return { invoice: this.normalizeInvoice(invoice) };
  }

  async updateAutoRecharge(request: RequestLike, proId: string, input: Record<string, any>) {
    const enabled = Boolean(input?.enabled);
    const threshold = this.validateCreditAmount(input?.threshold_halalas ?? MIN_CREDIT_TOP_UP_HALALAS);
    const amount = this.validateCreditAmount(input?.recharge_amount_halalas ?? MIN_CREDIT_TOP_UP_HALALAS);

    await this.db.update('pros', { pro_id: proId }, {
      billing_auto_recharge_enabled: enabled,
      billing_auto_recharge_threshold_halalas: threshold,
      billing_auto_recharge_amount_halalas: amount,
      updated_at: Date.now(),
    });

    await this.auditLogs.logFromRequest(request, {
      category: 'PAYMENT',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'billing.auto_recharge_updated',
      target_type: 'pro',
      target_id: proId,
      metadata: {
        enabled,
        threshold_halalas: threshold,
        recharge_amount_halalas: amount,
      },
    });

    return { auto_recharge: { enabled, threshold_halalas: threshold, recharge_amount_halalas: amount } };
  }

  async recordLeadFeeCharge(proId: string, quoteId: string, amountHalalas: number, description: string) {
    const amount = Math.max(Number(amountHalalas || 0), 0);
    if (amount < 1) throw new BadRequestException('Lead fee amount is invalid.');

    const ledger = await this.getCreditLedger(proId);
    if (ledger.balance_halalas < amount) {
      throw new BadRequestException('Add credits before buying this lead.');
    }

    const now = Date.now();
    const leadFee = {
      transaction_id: uuidv4(),
      pro_id: proId,
      quote_id: quoteId,
      amount_halalas: amount,
      transaction_type: 'CHARGE',
      billing_status: 'PAID_WITH_CREDITS',
      description,
      created_at: now,
      updated_at: now,
    };

    await this.db.put(LEAD_FEE_TRANSACTIONS_TABLE, leadFee);
    await this.db.put(PRO_CREDIT_TRANSACTIONS_TABLE, {
      transaction_id: uuidv4(),
      pro_id: proId,
      transaction_type: 'LEAD_FEE_DEBIT',
      amount_halalas: amount,
      description,
      quote_id: quoteId,
      lead_fee_transaction_id: leadFee.transaction_id,
      created_at: now,
      updated_at: now,
    });

    await this.maybeAutoRecharge(proId, ledger.balance_halalas - amount);
    return leadFee;
  }

  async listInvoices(proId: string) {
    const { items } = await this.db
      .query(
        PRO_BILLING_INVOICES_TABLE,
        '#pro_id = :pid',
        { '#pro_id': 'pro_id' },
        { ':pid': proId },
        { indexName: 'pro-invoices-index', scanIndexForward: false, limit: 100 },
      )
      .catch(() => ({ items: [] }));

    return (items as any[]).map((invoice) => this.normalizeInvoice(invoice));
  }

  async listPaymentMethods(proId: string) {
    const { items } = await this.db
      .query(
        PRO_PAYMENT_METHODS_TABLE,
        '#pro_id = :pid',
        { '#pro_id': 'pro_id' },
        { ':pid': proId },
        { indexName: 'pro-payment-methods-index', scanIndexForward: false, limit: 25 },
      )
      .catch(() => ({ items: [] }));

    return (items as any[])
      .filter((method) => method.status !== 'DELETED')
      .map((method) => ({
        id: method.method_id,
        method_id: method.method_id,
        provider: 'moyasar',
        is_default: Boolean(method.is_default),
        is_preferred: Boolean(method.is_default),
        card: {
          brand: method.card_brand || 'Card',
          last4: method.card_last4 || '',
        },
        created_at: method.created_at,
        updated_at: method.updated_at,
      }));
  }

  async setDefaultPaymentMethod(proId: string, methodId: string) {
    const method = (await this.db.get(PRO_PAYMENT_METHODS_TABLE, { method_id: methodId })) as any;
    if (!method || method.pro_id !== proId || method.status === 'DELETED') {
      throw new NotFoundException('Payment method not found');
    }

    const methods = await this.listPaymentMethods(proId);
    await Promise.all(
      methods.map((item) =>
        this.db
          .update(PRO_PAYMENT_METHODS_TABLE, { method_id: item.method_id }, {
            is_default: item.method_id === methodId,
            updated_at: Date.now(),
          })
          .catch(() => null),
      ),
    );

    return { message: 'Default payment method updated.' };
  }

  async savePaymentMethodToken(request: RequestLike, proId: string, token: string) {
    const normalizedToken = String(token || '').trim();
    if (!normalizedToken) {
      throw new BadRequestException('Payment method token is required.');
    }

    const tokenDetails = await this.fetchMoyasarToken(normalizedToken);
    const method = await this.upsertPaymentMethodFromToken(proId, tokenDetails);

    await this.auditLogs.logFromRequest(request, {
      category: 'PAYMENT',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'billing.payment_method_saved',
      target_type: 'pro',
      target_id: proId,
      metadata: {
        provider: 'moyasar',
        payment_method_id: method.method_id,
        card_brand: method.card_brand,
        card_last4: method.card_last4,
      },
    });

    return { payment_method: this.normalizePaymentMethod(method) };
  }

  async deletePaymentMethod(proId: string, methodId: string) {
    const method = (await this.db.get(PRO_PAYMENT_METHODS_TABLE, { method_id: methodId })) as any;
    if (!method || method.pro_id !== proId) {
      throw new NotFoundException('Payment method not found');
    }

    await this.db.update(PRO_PAYMENT_METHODS_TABLE, { method_id: methodId }, {
      status: 'DELETED',
      is_default: false,
      updated_at: Date.now(),
    });

    return { message: 'Payment method removed.' };
  }

  async createCurrentBalanceInvoice(request: RequestLike, proId: string) {
    const balance = await this.getLeadFeeBalance(proId);
    if (balance.balance_halalas < 100) {
      throw new BadRequestException('No payable lead-fee balance is due.');
    }

    const existing = await this.findOpenInvoice(proId);
    if (existing) {
      return { invoice: this.normalizeInvoice(existing), reused: true };
    }

    const pro = (await this.db.get('pros', { pro_id: proId }).catch(() => null)) as any;
    const description = `HandyCall lead fees ${balance.period_label}`;
    const moyasarInvoice = await this.createMoyasarInvoice({
      amount: balance.balance_halalas,
      description,
      proId,
      period: balance.period_label,
    });

    const now = Date.now();
    const invoice = {
      invoice_id: uuidv4(),
      pro_id: proId,
      provider: 'moyasar',
      moyasar_invoice_id: moyasarInvoice.id,
      status: this.normalizeMoyasarStatus(moyasarInvoice.status),
      amount_halalas: balance.balance_halalas,
      amount_due: balance.balance_halalas,
      amount_paid: 0,
      currency: 'SAR',
      description,
      hosted_invoice_url: moyasarInvoice.url,
      provider_payload: this.compactMoyasarInvoice(moyasarInvoice),
      included_transaction_ids: balance.unpaid_transactions.map((item) => item.transaction_id),
      pro_email: pro?.email ?? null,
      pro_name: this.proName(pro),
      period_label: balance.period_label,
      created_at: now,
      updated_at: now,
    };

    await this.db.put(PRO_BILLING_INVOICES_TABLE, invoice);
    await Promise.all(
      invoice.included_transaction_ids.map((transactionId: string) =>
        this.db
          .update(LEAD_FEE_TRANSACTIONS_TABLE, { transaction_id: transactionId }, {
            billing_status: 'INVOICED',
            billing_invoice_id: invoice.invoice_id,
            updated_at: now,
          })
          .catch((error) => {
            this.logger.warn(`Failed to mark lead fee ${transactionId} invoiced: ${error?.message || error}`);
          }),
      ),
    );

    await this.auditLogs.logFromRequest(request, {
      category: 'PAYMENT',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'billing.pro_invoice_created',
      target_type: 'pro',
      target_id: proId,
      metadata: {
        provider: 'moyasar',
        invoice_id: invoice.invoice_id,
        amount_halalas: invoice.amount_halalas,
        transaction_count: invoice.included_transaction_ids.length,
      },
    });

    return { invoice: this.normalizeInvoice(invoice), reused: false };
  }

  async payCurrentBalanceWithDefaultMethod(request: RequestLike, proId: string) {
    const methods = await this.listPaymentMethods(proId);
    const method = methods.find((item) => item.is_default) || methods[0];
    if (!method) {
      throw new BadRequestException('No saved Moyasar payment method is available.');
    }

    const stored = (await this.db.get(PRO_PAYMENT_METHODS_TABLE, { method_id: method.method_id })) as any;
    if (!stored?.moyasar_token) {
      throw new BadRequestException('Saved payment method is missing a Moyasar token.');
    }

    const balance = await this.getLeadFeeBalance(proId);
    if (balance.balance_halalas < 100) {
      throw new BadRequestException('No payable lead-fee balance is due.');
    }

    const payment = await this.createMoyasarTokenPayment({
      amount: balance.balance_halalas,
      token: stored.moyasar_token,
      proId,
      period: balance.period_label,
    });

    const now = Date.now();
    const invoice = {
      invoice_id: uuidv4(),
      pro_id: proId,
      provider: 'moyasar',
      moyasar_payment_id: payment.id,
      status: this.normalizeMoyasarStatus(payment.status),
      amount_halalas: balance.balance_halalas,
      amount_due: balance.balance_halalas,
      amount_paid: payment.status === 'paid' ? balance.balance_halalas : 0,
      currency: 'SAR',
      description: `HandyCall lead fees ${balance.period_label}`,
      hosted_invoice_url: null,
      included_transaction_ids: balance.unpaid_transactions.map((item) => item.transaction_id),
      period_label: balance.period_label,
      created_at: now,
      updated_at: now,
    };

    await this.db.put(PRO_BILLING_INVOICES_TABLE, invoice);
    if (invoice.status === 'PAID') {
      await this.markInvoicePaid(invoice, payment);
    }

    await this.auditLogs.logFromRequest(request, {
      category: 'PAYMENT',
      severity: invoice.status === 'PAID' ? 'INFO' : 'WARN',
      outcome: invoice.status === 'PAID' ? 'SUCCESS' : 'FAILURE',
      action: 'billing.pro_balance_autopay_attempted',
      target_type: 'pro',
      target_id: proId,
      metadata: {
        provider: 'moyasar',
        invoice_id: invoice.invoice_id,
        amount_halalas: invoice.amount_halalas,
        status: invoice.status,
      },
    });

    return { invoice: this.normalizeInvoice(invoice), payment_status: payment.status };
  }

  async rechargeCreditsWithDefaultMethod(
    request: RequestLike,
    proId: string,
    amountHalalas: number,
    paymentMethodId?: string,
  ) {
    const amount = this.validateCreditAmount(amountHalalas);
    await this.ensureCreditLimit(proId, amount);

    const method = await this.resolveStoredPaymentMethod(proId, paymentMethodId);
    if (!method) {
      throw new BadRequestException('No saved Moyasar payment method is available.');
    }

    if (!method.moyasar_token) {
      throw new BadRequestException('Saved payment method is missing a Moyasar token.');
    }

    const invoice = await this.createLocalCreditInvoice(proId, amount, 'AUTO_RECHARGE', 'HandyCall credit recharge');
    const payment = await this.createMoyasarTokenPayment({
      amount,
      token: method.moyasar_token,
      proId,
      period: 'credits',
      description: 'HandyCall credit recharge',
      purpose: 'pro_credit_top_up',
      invoiceId: invoice.invoice_id,
    });

    const status = this.normalizeMoyasarStatus(payment.status);
    const updates: Record<string, any> = {
      status,
      moyasar_payment_id: payment.id,
      amount_paid: status === 'PAID' ? amount : 0,
      provider_payload: this.compactMoyasarInvoice(payment),
      updated_at: Date.now(),
    };
    if (status === 'PAID') updates.paid_at = Date.now();
    await this.db.update(PRO_BILLING_INVOICES_TABLE, { invoice_id: invoice.invoice_id }, updates);
    if (status === 'PAID') {
      await this.markInvoicePaid({ ...invoice, ...updates }, payment);
    }

    await this.auditLogs.logFromRequest(request, {
      category: 'PAYMENT',
      severity: status === 'PAID' ? 'INFO' : 'WARN',
      outcome: status === 'PAID' ? 'SUCCESS' : 'FAILURE',
      action: 'billing.credit_recharge_attempted',
      target_type: 'pro',
      target_id: proId,
      metadata: {
        provider: 'moyasar',
        invoice_id: invoice.invoice_id,
        payment_method_id: method.method_id,
        amount_halalas: amount,
        status,
      },
    });

    return {
      invoice: this.normalizeInvoice({ ...invoice, ...updates }),
      payment_status: status,
      action_url: this.getPaymentActionUrl(payment),
    };
  }

  async verifyProPayment(request: RequestLike, proId: string, paymentId: string) {
    const normalizedPaymentId = String(paymentId || '').trim();
    if (!normalizedPaymentId) {
      throw new BadRequestException('payment_id is required.');
    }

    const payment = await this.fetchMoyasarPayment(normalizedPaymentId);
    const invoice = await this.findInvoiceForMoyasarObject(normalizedPaymentId, payment);
    if (!invoice || invoice.pro_id !== proId) {
      throw new NotFoundException('Payment invoice not found.');
    }

    const status = this.normalizeMoyasarStatus(payment.status);
    const updates: Record<string, any> = {
      status,
      moyasar_payment_id: payment.id,
      provider_payload: this.compactMoyasarInvoice(payment),
      updated_at: Date.now(),
    };
    if (status === 'PAID') {
      updates.amount_paid = invoice.amount_halalas;
      updates.paid_at = Date.now();
    }

    await this.db.update(PRO_BILLING_INVOICES_TABLE, { invoice_id: invoice.invoice_id }, updates);
    if (status === 'PAID') {
      await this.markInvoicePaid({ ...invoice, ...updates }, payment);
    }

    await this.auditLogs.logFromRequest(request, {
      category: 'PAYMENT',
      severity: status === 'PAID' ? 'INFO' : 'WARN',
      outcome: status === 'PAID' ? 'SUCCESS' : 'FAILURE',
      action: 'billing.pro_payment_verified',
      target_type: 'pro_billing_invoice',
      target_id: invoice.invoice_id,
      metadata: {
        provider: 'moyasar',
        payment_id: normalizedPaymentId,
        status,
      },
    });

    return { invoice: this.normalizeInvoice({ ...invoice, ...updates }), payment_status: status };
  }

  async handleMoyasarWebhook(request: RequestLike, payload: Record<string, any>) {
    const configuredSecret = this.config.get<string>('PAYMENTS_WEBHOOK_SECRET')?.trim();
    const payloadSecret = String(payload.secret_token || '').trim();
    if (configuredSecret && payloadSecret !== configuredSecret) {
      await this.auditLogs.logFromRequest(request, {
        category: 'SECURITY',
        severity: 'WARN',
        outcome: 'DENIED',
        action: 'security.payment_webhook_invalid_secret',
        metadata: { provider: 'moyasar' },
      });
      throw new ForbiddenException('Invalid webhook secret.');
    }

    const object = payload.data && typeof payload.data === 'object' ? payload.data : payload;
    const objectId = String(object.id || payload.id || '').trim();
    const invoice = await this.findInvoiceForMoyasarObject(objectId, object);
    if (!invoice) {
      return { received: true, ignored: true, reason: 'billing_invoice_not_found' };
    }

    const status = this.normalizeMoyasarStatus(object.status || payload.type);
    const updates: Record<string, any> = {
      status,
      provider_payload: this.compactMoyasarInvoice(object),
      updated_at: Date.now(),
    };

    if (status === 'PAID') {
      updates.amount_paid = invoice.amount_halalas;
      updates.paid_at = Date.now();
      await this.db.update(PRO_BILLING_INVOICES_TABLE, { invoice_id: invoice.invoice_id }, updates);
      await this.markInvoicePaid({ ...invoice, ...updates }, this.extractPaymentFromInvoiceObject(object));
    } else {
      await this.db.update(PRO_BILLING_INVOICES_TABLE, { invoice_id: invoice.invoice_id }, updates);
    }

    await this.auditLogs.logFromRequest(request, {
      category: 'PAYMENT',
      severity: status === 'FAILED' ? 'WARN' : 'INFO',
      outcome: status === 'FAILED' ? 'FAILURE' : 'SUCCESS',
      action: 'billing.moyasar_webhook_processed',
      target_type: 'pro_billing_invoice',
      target_id: invoice.invoice_id,
      metadata: {
        provider: 'moyasar',
        status,
        moyasar_object_id: objectId,
      },
    });

    return { received: true, invoice_id: invoice.invoice_id, status };
  }

  async listAdminPayments(filters: { status?: string; search?: string; limit?: number }) {
    const limit = Math.min(Math.max(filters.limit ?? 80, 1), 200);
    const [invoiceResult, leadFeeResult, creditResult] = await Promise.all([
      this.db.scan(PRO_BILLING_INVOICES_TABLE, { limit }).catch(() => ({ items: [] })),
      this.db.scan(LEAD_FEE_TRANSACTIONS_TABLE, { limit }).catch(() => ({ items: [] })),
      this.db.scan(PRO_CREDIT_TRANSACTIONS_TABLE, { limit }).catch(() => ({ items: [] })),
    ]);

    const invoices: any[] = (invoiceResult.items as any[]).map((item) => ({
      ...this.normalizeInvoice(item),
      record_type: 'INVOICE',
    }));
    const leadFees: any[] = (leadFeeResult.items as any[]).map((item) => ({
      record_type: 'LEAD_FEE',
      transaction_id: item.transaction_id,
      pro_id: item.pro_id,
      quote_id: item.quote_id,
      status: item.billing_status || 'UNBILLED',
      amount_halalas: item.amount_halalas,
      amount_sar: this.halalasToSar(item.amount_halalas),
      description: item.description,
      created_at: item.created_at,
      updated_at: item.updated_at,
      transaction_type: item.transaction_type,
    }));
    const credits: any[] = (creditResult.items as any[]).map((item) => ({
      record_type: 'CREDIT',
      transaction_id: item.transaction_id,
      pro_id: item.pro_id,
      status: item.transaction_type,
      amount_halalas: item.amount_halalas,
      amount_sar: this.halalasToSar(item.amount_halalas),
      description: item.description,
      source_invoice_id: item.source_invoice_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
      transaction_type: item.transaction_type,
      direction: this.isCreditTransaction(item.transaction_type) ? 'CREDIT' : 'DEBIT',
    }));

    const search = String(filters.search || '').trim().toLowerCase();
    const records: any[] = [...invoices, ...leadFees, ...credits]
      .filter((item) => !filters.status || filters.status === 'ALL' || item.status === filters.status)
      .filter((item) => {
        if (!search) return true;
        return JSON.stringify({
          pro_id: item.pro_id,
          invoice_id: item.invoice_id,
          transaction_id: item.transaction_id,
          source_invoice_id: item.source_invoice_id,
          quote_id: item.quote_id,
          description: item.description,
          status: item.status,
        })
          .toLowerCase()
          .includes(search);
      })
      .sort((a, b) => Number(b.created_at || 0) - Number(a.created_at || 0))
      .slice(0, limit);

    return { items: records };
  }

  async getAdminProBilling(proId: string) {
    const pro = (await this.db.get('pros', { pro_id: proId })) as any;
    if (!pro) throw new NotFoundException('Pro not found');
    const [overview, invoices, methods, leadFees, credits] = await Promise.all([
      this.getProBillingOverview(proId),
      this.listInvoices(proId),
      this.listPaymentMethods(proId),
      this.getLeadFeeBalance(proId),
      this.getCreditLedger(proId),
    ]);

    return {
      pro: {
        pro_id: proId,
        email: pro.email,
        name: this.proName(pro),
        status: pro.status,
      },
      overview,
      invoices,
      payment_methods: methods,
      lead_fees: {
        transactions: leadFees.transactions,
        balance_halalas: leadFees.balance_halalas,
        balance_sar: this.halalasToSar(leadFees.balance_halalas),
      },
      credits,
    };
  }

  async refundInvoice(request: RequestLike, invoiceId: string, amountHalalas?: number, reason?: string) {
    const invoice = (await this.db.get(PRO_BILLING_INVOICES_TABLE, { invoice_id: invoiceId })) as any;
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== 'PAID') {
      throw new BadRequestException('Only paid invoices can be refunded.');
    }

    const refundAmount = Math.min(
      Math.max(Number(amountHalalas || invoice.amount_paid || invoice.amount_halalas), 1),
      Number(invoice.amount_paid || invoice.amount_halalas),
    );

    if (invoice.moyasar_payment_id) {
      await this.refundMoyasarPayment(invoice.moyasar_payment_id, refundAmount);
    }

    await this.db.update(PRO_BILLING_INVOICES_TABLE, { invoice_id: invoiceId }, {
      status: refundAmount >= Number(invoice.amount_paid || invoice.amount_halalas)
        ? 'REFUNDED'
        : 'PARTIALLY_REFUNDED',
      refunded_halalas: (Number(invoice.refunded_halalas || 0) + refundAmount),
      refund_reason: reason || 'Refunded by admin',
      updated_at: Date.now(),
    });

    if (['CREDIT_TOP_UP', 'AUTO_RECHARGE'].includes(String(invoice.billing_purpose || ''))) {
      await this.db.put(PRO_CREDIT_TRANSACTIONS_TABLE, {
        transaction_id: uuidv4(),
        pro_id: invoice.pro_id,
        transaction_type: 'REFUND_DEBIT',
        amount_halalas: refundAmount,
        source_invoice_id: invoice.invoice_id,
        description: reason || `Refund for credit purchase ${invoice.invoice_id}`,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
    } else {
      await this.db.put(LEAD_FEE_TRANSACTIONS_TABLE, {
        transaction_id: uuidv4(),
        pro_id: invoice.pro_id,
        quote_id: invoice.invoice_id,
        amount_halalas: refundAmount,
        transaction_type: 'REFUND',
        billing_status: 'REFUNDED',
        billing_invoice_id: invoice.invoice_id,
        description: reason || `Refund for invoice ${invoice.invoice_id}`,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
    }

    await this.auditLogs.logFromRequest(request, {
      category: 'PAYMENT',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'billing.pro_invoice_refunded',
      target_type: 'pro_billing_invoice',
      target_id: invoiceId,
      metadata: {
        provider: 'moyasar',
        amount_halalas: refundAmount,
        pro_id: invoice.pro_id,
      },
    });

    return { message: 'Refund recorded.', amount_halalas: refundAmount };
  }

  private async getLeadFeeBalance(proId: string) {
    const { items } = await this.db
      .query(
        LEAD_FEE_TRANSACTIONS_TABLE,
        '#pro_id = :pid',
        { '#pro_id': 'pro_id' },
        { ':pid': proId },
        { indexName: 'pro-transactions-index', scanIndexForward: false, limit: 200 },
      )
      .catch(() => ({ items: [] }));

    const transactions = (items as any[]).sort(
      (a, b) => Number(b.created_at || 0) - Number(a.created_at || 0),
    );
    const unpaidTransactions = transactions.filter((item) => {
      if (item.transaction_type !== 'CHARGE') return false;
      return !['PAID', 'PAID_WITH_CREDITS', 'REFUNDED'].includes(String(item.billing_status || 'UNBILLED'));
    });
    const refundHalalas = transactions
      .filter((item) => item.transaction_type === 'REFUND' && !item.applied_to_invoice_id)
      .reduce((sum, item) => sum + Number(item.amount_halalas || 0), 0);
    const chargeHalalas = unpaidTransactions.reduce(
      (sum, item) => sum + Number(item.amount_halalas || 0),
      0,
    );

    const now = new Date();
    const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() - 1;

    return {
      transactions: transactions.map((item) => ({
        ...item,
        amount_sar: this.halalasToSar(item.amount_halalas),
      })),
      unpaid_transactions: unpaidTransactions,
      balance_halalas: Math.max(0, chargeHalalas - refundHalalas),
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      period_label: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    };
  }

  private async findOpenInvoice(proId: string) {
    const invoices = (await this.listInvoices(proId)) as any[];
    const open = invoices.find((invoice) => ['INITIATED', 'PENDING', 'ON_HOLD'].includes(invoice.status));
    if (!open?.invoice_id) return null;
    return this.db.get(PRO_BILLING_INVOICES_TABLE, { invoice_id: open.invoice_id });
  }

  private async findInvoiceForMoyasarObject(objectId: string, object: Record<string, any>) {
    if (!objectId) return null;
    const byInvoice = await this.db
      .scan(PRO_BILLING_INVOICES_TABLE, {
        filterExpression: '#mid = :mid OR #mpid = :mid',
        expressionAttributeNames: { '#mid': 'moyasar_invoice_id', '#mpid': 'moyasar_payment_id' },
        expressionAttributeValues: { ':mid': objectId },
        limit: 1,
      })
      .catch(() => ({ items: [] }));
    if (byInvoice.items[0]) return byInvoice.items[0] as any;

    const invoiceId = String(object.invoice_id || '').trim();
    const metadataInvoiceId = String(object.metadata?.pro_billing_invoice_id || '').trim();
    if (metadataInvoiceId) {
      const localInvoice = await this.db
        .get(PRO_BILLING_INVOICES_TABLE, { invoice_id: metadataInvoiceId })
        .catch(() => null);
      if (localInvoice) return localInvoice as any;
    }

    if (!invoiceId) return null;
    const byPaymentInvoice = await this.db
      .scan(PRO_BILLING_INVOICES_TABLE, {
        filterExpression: '#mid = :mid',
        expressionAttributeNames: { '#mid': 'moyasar_invoice_id' },
        expressionAttributeValues: { ':mid': invoiceId },
        limit: 1,
      })
      .catch(() => ({ items: [] }));
    return byPaymentInvoice.items[0] as any;
  }

  private async markInvoicePaid(invoice: Record<string, any>, payment?: MoyasarPayment | null) {
    const now = Date.now();
    const updates: Record<string, any> = {
      status: 'PAID',
      amount_paid: invoice.amount_halalas,
      paid_at: invoice.paid_at || now,
      updated_at: now,
    };

    if (payment?.id) updates.moyasar_payment_id = payment.id;
    await this.db.update(PRO_BILLING_INVOICES_TABLE, { invoice_id: invoice.invoice_id }, updates);

    if (['CREDIT_TOP_UP', 'AUTO_RECHARGE'].includes(String(invoice.billing_purpose || ''))) {
      await this.applyCreditForPaidInvoice({ ...invoice, ...updates }, payment);
      return;
    }

    await Promise.all(
      (invoice.included_transaction_ids || []).map((transactionId: string) =>
        this.db
          .update(LEAD_FEE_TRANSACTIONS_TABLE, { transaction_id: transactionId }, {
            billing_status: 'PAID',
            billing_invoice_id: invoice.invoice_id,
            paid_at: now,
            updated_at: now,
          })
          .catch((error) => {
            this.logger.warn(`Failed to mark lead fee ${transactionId} paid: ${error?.message || error}`);
          }),
      ),
    );

    await this.upsertPaymentMethodFromPayment(invoice.pro_id, payment);
  }

  private async applyCreditForPaidInvoice(invoice: Record<string, any>, payment?: MoyasarPayment | null) {
    const existing = await this.db
      .scan(PRO_CREDIT_TRANSACTIONS_TABLE, {
        filterExpression: '#invoice_id = :invoice_id',
        expressionAttributeNames: { '#invoice_id': 'source_invoice_id' },
        expressionAttributeValues: { ':invoice_id': invoice.invoice_id },
        limit: 1,
      })
      .catch(() => ({ items: [] }));

    if (!existing.items[0]) {
      await this.ensureCreditLimit(invoice.pro_id, Number(invoice.amount_halalas || 0));
      await this.db.put(PRO_CREDIT_TRANSACTIONS_TABLE, {
        transaction_id: uuidv4(),
        pro_id: invoice.pro_id,
        transaction_type: invoice.billing_purpose === 'AUTO_RECHARGE' ? 'AUTO_RECHARGE' : 'CREDIT_TOP_UP',
        amount_halalas: Number(invoice.amount_halalas || 0),
        description: invoice.description || 'HandyCall credit top-up',
        source_invoice_id: invoice.invoice_id,
        moyasar_payment_id: payment?.id || invoice.moyasar_payment_id || null,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
    }

    await this.upsertPaymentMethodFromPayment(invoice.pro_id, payment);
  }

  private async createLocalCreditInvoice(
    proId: string,
    amountHalalas: number,
    purpose: 'CREDIT_TOP_UP' | 'AUTO_RECHARGE',
    description: string,
  ) {
    const now = Date.now();
    const invoice = {
      invoice_id: uuidv4(),
      pro_id: proId,
      provider: 'moyasar',
      status: 'INITIATED',
      billing_purpose: purpose,
      amount_halalas: amountHalalas,
      amount_due: amountHalalas,
      amount_paid: 0,
      currency: 'SAR',
      description,
      hosted_invoice_url: null,
      created_at: now,
      updated_at: now,
    };
    await this.db.put(PRO_BILLING_INVOICES_TABLE, invoice);
    return invoice;
  }

  private async getAutoRechargeSettings(proId: string) {
    const pro = (await this.db.get('pros', { pro_id: proId }).catch(() => null)) as any;
    return {
      enabled: Boolean(pro?.billing_auto_recharge_enabled),
      threshold_halalas: Number(pro?.billing_auto_recharge_threshold_halalas || MIN_CREDIT_TOP_UP_HALALAS),
      threshold_sar: this.halalasToSar(pro?.billing_auto_recharge_threshold_halalas || MIN_CREDIT_TOP_UP_HALALAS),
      recharge_amount_halalas: Number(pro?.billing_auto_recharge_amount_halalas || MIN_CREDIT_TOP_UP_HALALAS),
      recharge_amount_sar: this.halalasToSar(pro?.billing_auto_recharge_amount_halalas || MIN_CREDIT_TOP_UP_HALALAS),
      maximum_balance_halalas: MAX_CREDIT_BALANCE_HALALAS,
      minimum_recharge_halalas: MIN_CREDIT_TOP_UP_HALALAS,
    };
  }

  private async maybeAutoRecharge(proId: string, remainingBalanceHalalas: number) {
    const settings = await this.getAutoRechargeSettings(proId);
    if (!settings.enabled || remainingBalanceHalalas > settings.threshold_halalas) return;

    const method = await this.resolveStoredPaymentMethod(proId);
    if (!method) return;

    if (!method.moyasar_token) return;

    try {
      await this.ensureCreditLimit(proId, settings.recharge_amount_halalas);
      const invoice = await this.createLocalCreditInvoice(
        proId,
        settings.recharge_amount_halalas,
        'AUTO_RECHARGE',
        'HandyCall automatic credit recharge',
      );
      const payment = await this.createMoyasarTokenPayment({
        amount: settings.recharge_amount_halalas,
        token: method.moyasar_token,
        proId,
        period: 'credits',
        description: 'HandyCall automatic credit recharge',
        purpose: 'pro_auto_recharge',
        invoiceId: invoice.invoice_id,
      });
      if (this.normalizeMoyasarStatus(payment.status) === 'PAID') {
        await this.markInvoicePaid(invoice, payment);
      }
    } catch (error: any) {
      this.logger.warn(`Auto recharge failed for pro ${proId}: ${error?.message || error}`);
    }
  }

  private validateCreditAmount(amountHalalas: number) {
    const amount = Math.round(Number(amountHalalas || 0));
    if (!Number.isFinite(amount) || amount < MIN_CREDIT_TOP_UP_HALALAS) {
      throw new BadRequestException('Minimum credit purchase is SAR 20.');
    }
    if (amount > MAX_CREDIT_BALANCE_HALALAS) {
      throw new BadRequestException('Credit purchase cannot exceed SAR 5,000.');
    }
    return amount;
  }

  private async ensureCreditLimit(proId: string, additionalHalalas: number) {
    const ledger = await this.getCreditLedger(proId);
    if (ledger.balance_halalas + Number(additionalHalalas || 0) > MAX_CREDIT_BALANCE_HALALAS) {
      throw new BadRequestException('Credit balance cannot exceed SAR 5,000.');
    }
  }

  private isCreditTransaction(type: unknown) {
    return ['CREDIT_TOP_UP', 'AUTO_RECHARGE', 'ADMIN_CREDIT', 'REFUND_CREDIT'].includes(String(type || ''));
  }

  private async upsertPaymentMethodFromPayment(proId: string, payment?: MoyasarPayment | null) {
    const source = payment?.source;
    const token = source?.token;
    if (!token) return;

    await this.upsertPaymentMethodRecord(proId, {
      token,
      brand: source.company || 'Card',
      last4: this.last4(source.number),
      masked: source.number || null,
    });
  }

  private async upsertPaymentMethodFromToken(proId: string, tokenDetails: Record<string, any>) {
    const token = String(tokenDetails.id || tokenDetails.token || '').trim();
    if (!token) {
      throw new BadRequestException('Moyasar token response did not include a token id.');
    }

    const status = String(tokenDetails.status || '').toLowerCase();
    if (status && status !== 'active') {
      throw new BadRequestException('Moyasar token is not active.');
    }

    return this.upsertPaymentMethodRecord(proId, {
      token,
      brand: tokenDetails.brand || tokenDetails.company || 'Card',
      last4: tokenDetails.last_four || tokenDetails.last4 || this.last4(tokenDetails.number),
      masked: tokenDetails.number || null,
    });
  }

  private async upsertPaymentMethodRecord(
    proId: string,
    input: { token: string; brand: string; last4: string; masked?: string | null },
  ) {
    const token = String(input.token || '').trim();
    if (!token) {
      throw new BadRequestException('Payment method token is required.');
    }

    const existing = await this.db
      .scan(PRO_PAYMENT_METHODS_TABLE, {
        filterExpression: '#pro_id = :pid AND #token = :token',
        expressionAttributeNames: { '#pro_id': 'pro_id', '#token': 'moyasar_token' },
        expressionAttributeValues: { ':pid': proId, ':token': token },
        limit: 1,
      })
      .catch(() => ({ items: [] }));

    const now = Date.now();
    const methods = await this.listPaymentMethods(proId);
    const hasPreferredMethod = methods.some((method) => method.is_default);
    const shouldBePreferred = Boolean(existing.items[0]?.is_default) || !hasPreferredMethod;
    const item = {
      method_id: existing.items[0]?.method_id || uuidv4(),
      pro_id: proId,
      provider: 'moyasar',
      moyasar_token: token,
      card_brand: input.brand || 'Card',
      card_last4: input.last4 || '',
      card_masked: input.masked || null,
      status: 'ACTIVE',
      is_default: shouldBePreferred,
      created_at: existing.items[0]?.created_at || now,
      updated_at: now,
    };

    if (shouldBePreferred) {
      await this.clearPreferredPaymentMethods(proId, now, item.method_id);
    }
    await this.db.put(PRO_PAYMENT_METHODS_TABLE, item);
    return item;
  }

  private async clearPreferredPaymentMethods(proId: string, now = Date.now(), exceptMethodId?: string) {
    const methods = await this.listPaymentMethods(proId);
    await Promise.all(
      methods
        .filter((method) => method.method_id !== exceptMethodId)
        .map((method) =>
          this.db
            .update(PRO_PAYMENT_METHODS_TABLE, { method_id: method.method_id }, {
              is_default: false,
              updated_at: now,
            })
            .catch(() => null),
        ),
    );
  }

  private async resolveStoredPaymentMethod(proId: string, paymentMethodId?: string) {
    const normalizedMethodId = String(paymentMethodId || '').trim();
    if (normalizedMethodId) {
      const method = (await this.db.get(PRO_PAYMENT_METHODS_TABLE, { method_id: normalizedMethodId })) as any;
      if (!method || method.pro_id !== proId || method.status === 'DELETED') {
        throw new NotFoundException('Payment method not found');
      }
      return method;
    }

    const methods = await this.listPaymentMethods(proId);
    const method = methods.find((item) => item.is_default) || methods[0];
    if (!method) return null;
    return this.db.get(PRO_PAYMENT_METHODS_TABLE, { method_id: method.method_id }) as Promise<any>;
  }

  private async createMoyasarInvoice(input: {
    amount: number;
    description: string;
    proId: string;
    period: string;
  }) {
    return this.moyasarRequest('/invoices', {
      method: 'POST',
      body: {
        amount: input.amount,
        currency: 'SAR',
        description: input.description,
        success_url: this.frontendUrl(`/pro/dashboard/billing?moyasar_status=paid&period=${encodeURIComponent(input.period)}`),
        back_url: this.frontendUrl('/pro/dashboard/billing'),
      },
    });
  }

  private async createMoyasarTokenPayment(input: {
    amount: number;
    token: string;
    proId: string;
    period: string;
    description?: string;
    purpose?: string;
    invoiceId?: string;
  }) {
    return this.moyasarRequest('/payments', {
      method: 'POST',
      body: {
        given_id: uuidv4(),
        amount: input.amount,
        currency: 'SAR',
        description: input.description || `HandyCall lead fees ${input.period}`,
        callback_url: this.frontendUrl('/pro/dashboard/billing'),
        source: {
          type: 'token',
          token: input.token,
        },
        metadata: {
          pro_id: input.proId,
          billing_period: input.period,
          purpose: input.purpose || 'pro_lead_fees',
          pro_billing_invoice_id: input.invoiceId,
        },
      },
    });
  }

  private async refundMoyasarPayment(paymentId: string, amount: number) {
    return this.moyasarRequest(`/payments/${encodeURIComponent(paymentId)}/refund`, {
      method: 'POST',
      body: { amount },
    });
  }

  private async fetchMoyasarPayment(paymentId: string) {
    return this.moyasarRequest(`/payments/${encodeURIComponent(paymentId)}`, {
      method: 'GET',
    });
  }

  private async fetchMoyasarToken(token: string) {
    return this.moyasarRequest(`/tokens/${encodeURIComponent(token)}`, {
      method: 'GET',
    });
  }

  private async moyasarRequest(path: string, options: { method: string; body?: Record<string, any> }) {
    const secretKey = this.config.get<string>('MOYASAR_SECRET_KEY')?.trim();
    if (!secretKey) {
      throw new ServiceUnavailableException('Moyasar secret key is not configured.');
    }

    const response = await fetch(`${MOYASAR_BASE_URL}${path}`, {
      method: options.method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) {
      throw new BadRequestException(data?.message || data?.errors || 'Moyasar request failed.');
    }
    return data;
  }

  private normalizeInvoice(invoice: Record<string, any>): any {
    return {
      ...invoice,
      id: invoice.invoice_id,
      number: invoice.invoice_id ? String(invoice.invoice_id).slice(0, 8).toUpperCase() : undefined,
      amount_sar: this.halalasToSar(invoice.amount_halalas),
      amount_due: invoice.amount_due ?? invoice.amount_halalas,
      amount_paid: invoice.amount_paid ?? 0,
      total: invoice.amount_halalas,
      currency: invoice.currency || 'SAR',
      hosted_invoice_url: invoice.hosted_invoice_url || invoice.url || null,
      moyasar_invoice_id: invoice.moyasar_invoice_id || null,
      moyasar_payment_id: invoice.moyasar_payment_id || null,
    };
  }

  private normalizePaymentMethod(method: Record<string, any>): any {
    return {
      id: method.method_id,
      method_id: method.method_id,
      provider: 'moyasar',
      is_default: Boolean(method.is_default),
      is_preferred: Boolean(method.is_default),
      card: {
        brand: method.card_brand || 'Card',
        last4: method.card_last4 || '',
      },
      created_at: method.created_at,
      updated_at: method.updated_at,
    };
  }

  private normalizeMoyasarStatus(rawStatus: unknown) {
    const normalized = String(rawStatus || '').toLowerCase();
    if (normalized.includes('paid') || normalized.includes('captured') || normalized.includes('authorized')) {
      return 'PAID';
    }
    if (normalized.includes('refund')) return 'REFUNDED';
    if (normalized.includes('fail') || normalized.includes('void') || normalized.includes('cancel')) {
      return 'FAILED';
    }
    if (normalized.includes('hold')) return 'ON_HOLD';
    if (normalized.includes('expire')) return 'EXPIRED';
    return 'INITIATED';
  }

  private extractPaymentFromInvoiceObject(object: MoyasarInvoice): MoyasarPayment | null {
    if (Array.isArray(object.payments) && object.payments[0]) return object.payments[0];
    if (object.source) return object as MoyasarPayment;
    return null;
  }

  private compactMoyasarInvoice(invoice: Record<string, any>) {
    return {
      id: invoice.id,
      status: invoice.status,
      amount: invoice.amount,
      currency: invoice.currency,
      url: invoice.url,
      created_at: invoice.created_at,
      updated_at: invoice.updated_at,
      payments: Array.isArray(invoice.payments)
        ? invoice.payments.map((payment: any) => ({
            id: payment.id,
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
            source: payment.source
              ? {
                  type: payment.source.type,
                  company: payment.source.company,
                  number: payment.source.number,
                  token: payment.source.token,
                }
              : undefined,
          }))
        : undefined,
    };
  }

  private getPaymentActionUrl(payment?: Record<string, any> | null) {
    return payment?.source?.transaction_url || payment?.transaction_url || payment?.url || null;
  }

  private backendUrl(path: string) {
    const base =
      this.config.get<string>('BACKEND_PUBLIC_URL') ||
      this.config.get<string>('API_PUBLIC_URL') ||
      'https://handycall-api.fly.dev/api/v1';
    return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private frontendUrl(path: string) {
    const base = this.config.get<string>('FRONTEND_URL') || 'https://handycall.org';
    return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private halalasToSar(amount?: number) {
    return Number(((Number(amount || 0)) / 100).toFixed(2));
  }

  private proName(pro: any) {
    return [pro?.first_name, pro?.last_name].filter(Boolean).join(' ').trim() || pro?.email || 'Pro';
  }

  private last4(masked?: string) {
    const digits = String(masked || '').replace(/\D/g, '');
    return digits.slice(-4);
  }
}
