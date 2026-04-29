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
const MOYASAR_BASE_URL = 'https://api.moyasar.com/v1';

@Injectable()
export class ProBillingService {
  private readonly logger = new Logger(ProBillingService.name);

  constructor(
    private readonly db: DynamoDBService,
    private readonly config: ConfigService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  getConfig() {
    return {
      provider: 'moyasar',
      publishable_key: this.config.get<string>('MOYASAR_PUBLISHABLE_KEY') || null,
      currency: 'SAR',
    };
  }

  async getProBillingOverview(proId: string) {
    const [leadFees, invoices, methods] = await Promise.all([
      this.getLeadFeeBalance(proId),
      this.listInvoices(proId),
      this.listPaymentMethods(proId),
    ]);

    return {
      provider: 'moyasar',
      subscription_plan: 'LEAD_FEES_MONTHLY',
      subscription_status: leadFees.balance_halalas > 0 ? 'BALANCE_DUE' : 'CURRENT',
      current_period_start: leadFees.current_period_start,
      current_period_end: leadFees.current_period_end,
      balance_halalas: leadFees.balance_halalas,
      balance_sar: this.halalasToSar(leadFees.balance_halalas),
      unpaid_lead_count: leadFees.unpaid_transactions.length,
      next_billing_date: leadFees.current_period_end,
      default_payment_method: methods.find((method) => method.is_default) || methods[0] || null,
      recent_invoice: invoices[0] || null,
    };
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
    const [invoiceResult, leadFeeResult] = await Promise.all([
      this.db.scan(PRO_BILLING_INVOICES_TABLE, { limit }).catch(() => ({ items: [] })),
      this.db.scan(LEAD_FEE_TRANSACTIONS_TABLE, { limit }).catch(() => ({ items: [] })),
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

    const search = String(filters.search || '').trim().toLowerCase();
    const records: any[] = [...invoices, ...leadFees]
      .filter((item) => !filters.status || filters.status === 'ALL' || item.status === filters.status)
      .filter((item) => {
        if (!search) return true;
        return JSON.stringify({
          pro_id: item.pro_id,
          invoice_id: item.invoice_id,
          transaction_id: item.transaction_id,
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
    const [overview, invoices, methods, leadFees] = await Promise.all([
      this.getProBillingOverview(proId),
      this.listInvoices(proId),
      this.listPaymentMethods(proId),
      this.getLeadFeeBalance(proId),
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
      return !['PAID', 'REFUNDED'].includes(String(item.billing_status || 'UNBILLED'));
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

  private async upsertPaymentMethodFromPayment(proId: string, payment?: MoyasarPayment | null) {
    const source = payment?.source;
    const token = source?.token;
    if (!token) return;

    const existing = await this.db
      .scan(PRO_PAYMENT_METHODS_TABLE, {
        filterExpression: '#pro_id = :pid AND #token = :token',
        expressionAttributeNames: { '#pro_id': 'pro_id', '#token': 'moyasar_token' },
        expressionAttributeValues: { ':pid': proId, ':token': token },
        limit: 1,
      })
      .catch(() => ({ items: [] }));

    const now = Date.now();
    const item = {
      method_id: existing.items[0]?.method_id || uuidv4(),
      pro_id: proId,
      provider: 'moyasar',
      moyasar_token: token,
      card_brand: source.company || 'Card',
      card_last4: this.last4(source.number),
      card_masked: source.number || null,
      status: 'ACTIVE',
      is_default: true,
      created_at: existing.items[0]?.created_at || now,
      updated_at: now,
    };

    const methods = await this.listPaymentMethods(proId);
    await Promise.all(
      methods.map((method) =>
        this.db
          .update(PRO_PAYMENT_METHODS_TABLE, { method_id: method.method_id }, {
            is_default: false,
            updated_at: now,
          })
          .catch(() => null),
      ),
    );
    await this.db.put(PRO_PAYMENT_METHODS_TABLE, item);
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
  }) {
    return this.moyasarRequest('/payments', {
      method: 'POST',
      body: {
        given_id: uuidv4(),
        amount: input.amount,
        currency: 'SAR',
        description: `HandyCall lead fees ${input.period}`,
        callback_url: this.frontendUrl('/pro/dashboard/billing'),
        source: {
          type: 'token',
          token: input.token,
        },
        metadata: {
          pro_id: input.proId,
          billing_period: input.period,
          purpose: 'pro_lead_fees',
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
