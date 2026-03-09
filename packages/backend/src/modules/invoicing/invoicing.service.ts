import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { CompaniesService } from '../companies/companies.service';
import { CreateInvoiceDto, UpdateInvoiceDto, InvoiceStatus } from './dto/invoice.dto';
import { sendSesEmail } from '../public-booking/email.util';
import { renderHandycallEmail } from '../../common/email-templates';

@Injectable()
export class InvoicingService {
  constructor(
    private readonly dynamodb: DynamoDBService,
    private readonly companies: CompaniesService,
    private readonly config: ConfigService,
  ) {}

  private calculateTotals(lineItems: any[], taxRate = 0, discountCents = 0) {
    const subtotal = lineItems.reduce((sum, item) => {
      return sum + Math.round(item.quantity * item.unit_price_cents);
    }, 0);
    const taxAmount = Math.round(subtotal * (taxRate / 100));
    const total = Math.max(0, subtotal + taxAmount - discountCents);
    return { subtotal, tax_amount: taxAmount, total };
  }

  private generateInvoiceNumber(slug: string, seq: number): string {
    const s = slug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'HC';
    return `${s}-${String(seq).padStart(4, '0')}`;
  }

  private formatMoney(cents: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency || 'USD').toUpperCase(),
    }).format((cents || 0) / 100);
  }

  private getCompanyReplyAddress(company: any): string {
    return (
      company?.email_from ||
      company?.booking_from_email ||
      company?.email ||
      this.config.get<string>('CONTACT_EMAIL_TO') ||
      'hello@handycall.org'
    );
  }

  private buildInvoiceEmail(invoice: any, company: any): { subject: string; text: string; html: string } {
    const lineItems = Array.isArray(invoice?.line_items) ? invoice.line_items : [];
    const currency = String(lineItems[0]?.currency || 'USD').toUpperCase();
    const lineList = lineItems
      .map((item: any) => {
        const qty = Math.max(1, Number(item?.quantity || 1));
        const amount = this.formatMoney(Number(item?.unit_price_cents || 0), currency);
        return `<li style="margin:0 0 8px;"><strong>${item?.description || 'Invoice item'}</strong> x${qty} - ${amount}</li>`;
      })
      .join('');

    const textLineList = lineItems
      .map((item: any) => {
        const qty = Math.max(1, Number(item?.quantity || 1));
        const amount = this.formatMoney(Number(item?.unit_price_cents || 0), currency);
        return `- ${item?.description || 'Invoice item'} x${qty} - ${amount}`;
      })
      .join('\n');

    const totalLabel = this.formatMoney(Number(invoice?.total_cents || 0), currency);
    const notesBlock = invoice?.notes
      ? `<p style="margin:16px 0 0;"><strong>Notes:</strong><br />${String(invoice.notes)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br />')}</p>`
      : '';

    const body = [
      `<p style="margin:0 0 16px;">${company?.company_name || 'Your service provider'} sent you invoice <strong>${invoice?.invoice_number}</strong>.</p>`,
      `<p style="margin:0 0 16px;"><strong>Total due:</strong> ${totalLabel}</p>`,
      `<p style="margin:0 0 12px;"><strong>Invoice details</strong></p>`,
      `<ul style="margin:0 0 12px 18px;padding:0;">${lineList}</ul>`,
      notesBlock,
      `<p style="margin:16px 0 0;">If you have any questions about this invoice, reply to this email and ${company?.company_name || 'the business'} can help you directly.</p>`,
    ].join('');

    const subject = `${company?.company_name || 'HandyCall'} invoice ${invoice?.invoice_number}`;
    const text = [
      `${company?.company_name || 'Your service provider'} sent you invoice ${invoice?.invoice_number}.`,
      ``,
      `Total due: ${totalLabel}`,
      ``,
      `Invoice details:`,
      textLineList,
      invoice?.notes ? `\nNotes:\n${invoice.notes}` : '',
      '',
      `Reply to this email if you have any questions.`,
    ].join('\n');

    const html = renderHandycallEmail({
      title: `Invoice ${invoice?.invoice_number}`,
      preheader: `${company?.company_name || 'HandyCall'} sent you an invoice for ${totalLabel}.`,
      greeting: invoice?.customer_name ? `Hi ${invoice.customer_name},` : undefined,
      body,
      footer: `Sent by HandyCall on behalf of ${company?.company_name || 'your service provider'}.`,
    });

    return { subject, text, html };
  }

  async create(companyId: string, dto: CreateInvoiceDto) {
    const company = await this.companies.findById(companyId);
    if (!company) throw new NotFoundException('Company not found');

    const now = Date.now();
    const invoiceId = uuidv4();

    // Get next sequence number
    const existing = await this.dynamodb.scan('invoices', {
      filterExpression: '#company_id = :company_id',
      expressionAttributeNames: { '#company_id': 'company_id' },
      expressionAttributeValues: { ':company_id': companyId },
      limit: 1000,
    });
    const seq = (existing.items?.length || 0) + 1;

    const slug = (company as any).company_slug || (company as any).company_name?.toLowerCase().replace(/\s+/g, '-') || 'hc';
    const invoiceNumber = this.generateInvoiceNumber(slug, seq);

    const totals = this.calculateTotals(dto.line_items, dto.tax_rate, dto.discount_amount_cents);

    const invoice = {
      company_id: companyId,
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      customer_name: dto.customer_name,
      customer_email: dto.customer_email,
      customer_phone: dto.customer_phone,
      contact_id: dto.contact_id,
      line_items: dto.line_items,
      subtotal_cents: totals.subtotal,
      tax_rate: dto.tax_rate || 0,
      tax_amount_cents: totals.tax_amount,
      discount_amount_cents: dto.discount_amount_cents || 0,
      total_cents: totals.total,
      status: InvoiceStatus.DRAFT,
      sender_email: 'no-reply@handycall.org',
      reply_to_email: this.getCompanyReplyAddress(company),
      notes: dto.notes,
      due_date: dto.due_date,
      created_at: now,
      updated_at: now,
    };

    await this.dynamodb.put('invoices', invoice);
    return invoice;
  }

  async list(companyId: string, options?: { status?: string; limit?: number }) {
    const result = await this.dynamodb.query(
      'invoices',
      '#company_id = :company_id',
      { '#company_id': 'company_id' },
      { ':company_id': companyId },
      { limit: options?.limit || 50 },
    );

    let items = result.items || [];
    if (options?.status) {
      items = items.filter((i: any) => i.status === options.status);
    }

    return items.sort((a: any, b: any) => (b.created_at || 0) - (a.created_at || 0));
  }

  async getById(companyId: string, invoiceId: string) {
    const item = await this.dynamodb.get('invoices', { company_id: companyId, invoice_id: invoiceId });
    if (!item) throw new NotFoundException('Invoice not found');
    return item;
  }

  async update(companyId: string, invoiceId: string, dto: UpdateInvoiceDto) {
    const invoice = await this.getById(companyId, invoiceId) as any;
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot modify a paid invoice');
    }

    const updates: Record<string, any> = { updated_at: Date.now() };
    if (dto.status !== undefined) updates.status = dto.status;
    if (dto.notes !== undefined) updates.notes = dto.notes;
    if (dto.due_date !== undefined) updates.due_date = dto.due_date;

    if (dto.line_items) {
      const totals = this.calculateTotals(dto.line_items, dto.tax_rate ?? invoice.tax_rate, dto.discount_amount_cents ?? invoice.discount_amount_cents);
      updates.line_items = dto.line_items;
      updates.subtotal_cents = totals.subtotal;
      updates.tax_rate = dto.tax_rate ?? invoice.tax_rate;
      updates.tax_amount_cents = totals.tax_amount;
      updates.discount_amount_cents = dto.discount_amount_cents ?? invoice.discount_amount_cents;
      updates.total_cents = totals.total;
    }

    await this.dynamodb.update('invoices', { company_id: companyId, invoice_id: invoiceId }, updates);
    return this.getById(companyId, invoiceId);
  }

  async markAsSent(companyId: string, invoiceId: string) {
    const [invoice, company] = await Promise.all([
      this.getById(companyId, invoiceId) as Promise<any>,
      this.companies.findById(companyId),
    ]);
    if (!company) throw new NotFoundException('Company not found');
    if (!invoice.customer_email?.trim()) {
      throw new BadRequestException('Customer email is required to send an invoice');
    }

    const email = this.buildInvoiceEmail(invoice, company);
    await sendSesEmail({
      region: this.config.get<string>('AWS_REGION') || 'us-east-1',
      from: 'no-reply@handycall.org',
      to: [invoice.customer_email.trim()],
      replyTo: [this.getCompanyReplyAddress(company)],
      subject: email.subject,
      text: email.text,
      html: email.html,
    });

    await this.dynamodb.update(
      'invoices',
      { company_id: companyId, invoice_id: invoiceId },
      {
        status: InvoiceStatus.SENT,
        sent_at: Date.now(),
        updated_at: Date.now(),
        sender_email: 'no-reply@handycall.org',
        reply_to_email: this.getCompanyReplyAddress(company),
      },
    );
    return this.getById(companyId, invoiceId);
  }

  async markAsPaid(companyId: string, invoiceId: string) {
    await this.dynamodb.update(
      'invoices',
      { company_id: companyId, invoice_id: invoiceId },
      { status: InvoiceStatus.PAID, paid_at: Date.now(), updated_at: Date.now() },
    );
    return this.getById(companyId, invoiceId);
  }

  async delete(companyId: string, invoiceId: string) {
    const invoice = await this.getById(companyId, invoiceId) as any;
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot delete a paid invoice');
    }
    await this.dynamodb.delete('invoices', { company_id: companyId, invoice_id: invoiceId });
    return { deleted: true };
  }

  async getStats(companyId: string) {
    const all = await this.list(companyId, { limit: 1000 }) as any[];
    const paid = all.filter((i) => i.status === InvoiceStatus.PAID);
    const outstanding = all.filter((i) => i.status === InvoiceStatus.SENT || i.status === InvoiceStatus.OVERDUE || i.status === InvoiceStatus.VIEWED);

    return {
      total_invoices: all.length,
      paid_invoices: paid.length,
      outstanding_invoices: outstanding.length,
      total_revenue_cents: paid.reduce((s: number, i: any) => s + (i.total_cents || 0), 0),
      outstanding_amount_cents: outstanding.reduce((s: number, i: any) => s + (i.total_cents || 0), 0),
    };
  }
}
