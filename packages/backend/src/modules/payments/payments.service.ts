import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { MarketplaceAuthContext, PaymentMethod, PaymentStatus } from '@handycall/shared';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProBillingService } from './pro-billing.service';

type WebhookPayload = Record<string, any>;
type MutableRequest = Request & { requestId?: string; body?: any };

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly db: DynamoDBService,
    private readonly config: ConfigService,
    private readonly auditLogs: AuditLogsService,
    private readonly proBilling: ProBillingService,
  ) {}

  async createPaymentIntent(
    request: MutableRequest,
    user: MarketplaceAuthContext,
    bookingId: string,
  ) {
    if (user.user_type !== 'CUSTOMER') {
      throw new ForbiddenException('Only customers can initiate booking payments.');
    }

    const booking = await this.db.get('bookings', { booking_id: bookingId }) as Record<string, any> | undefined;
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.customer_id !== user.user_id) {
      throw new ForbiddenException('You can only pay for your own bookings.');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Cancelled bookings cannot be paid.');
    }

    if (booking.payment_status === 'HELD' || booking.payment_status === 'RELEASED') {
      throw new ConflictException('This booking payment has already been captured.');
    }

    const normalizedMethod = this.normalizePaymentMethod(
      booking.payment_method || 'MADA',
    );
    const amountHalalas =
      Number(booking.service_price_sar || 0) + Number(booking.vat_amount_sar || 0);

    if (!Number.isFinite(amountHalalas) || amountHalalas <= 0) {
      throw new BadRequestException('This booking does not have a valid payable amount.');
    }

    const now = Date.now();
    const mockReference = `mock_${bookingId}_${now}`;

    await this.db.update('bookings', { booking_id: bookingId }, {
      payment_reference: mockReference,
      payment_method: normalizedMethod,
      payment_status: 'PENDING' as PaymentStatus,
      updated_at: now,
    });

    await this.auditLogs.logFromRequest(request, {
      category: 'PAYMENT',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'payment.intent_created',
      target_type: 'booking',
      target_id: bookingId,
      metadata: {
        payment_method: normalizedMethod,
        amount_halalas: amountHalalas,
      },
    });

    this.logger.warn(
      `[STUB] Payment intent for booking ${bookingId}: ${amountHalalas / 100} SAR via ${normalizedMethod}`,
    );

    return {
      payment_reference: mockReference,
      amount_sar: amountHalalas / 100,
      currency: 'SAR',
      status: 'pending',
      message: 'Gateway integration is stubbed; booking amount is server-derived and protected.',
    };
  }

  async handleWebhook(request: MutableRequest) {
    const rawBody = this.getRawBody(request.body);
    let parsedPayload: WebhookPayload | null = null;
    try {
      parsedPayload = JSON.parse(rawBody || '{}');
    } catch {
      throw new BadRequestException('Webhook payload must be valid JSON.');
    }

    if (this.isMoyasarPayload(parsedPayload)) {
      const moyasarPayload = parsedPayload as WebhookPayload;
      const eventId = String(
        moyasarPayload.id ||
          moyasarPayload.data?.id ||
          moyasarPayload.data?.invoice_id ||
          moyasarPayload.reference ||
          '',
      ).trim();
      if (!eventId) {
        throw new BadRequestException('Moyasar webhook payload is missing an event id.');
      }

      const receiptKey = `moyasar:${eventId}`;
      try {
        await this.db.putWithCondition(
          'webhook_receipts',
          {
            receipt_key: receiptKey,
            provider: 'moyasar',
            event_id: eventId,
            created_at: Date.now(),
            expires_at: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
          },
          {
            ConditionExpression: 'attribute_not_exists(receipt_key)',
          },
        );
      } catch (error: any) {
        if (error?.name === 'ConditionalCheckFailedException') {
          await this.auditLogs.logFromRequest(request, {
            category: 'SECURITY',
            severity: 'WARN',
            outcome: 'DENIED',
            action: 'security.payment_webhook_replay_rejected',
            target_type: 'webhook',
            target_id: receiptKey,
            metadata: { provider: 'moyasar', event_id: eventId },
          });
          return { received: true, duplicate: true };
        }
        throw error;
      }

      return this.proBilling.handleMoyasarWebhook(request, moyasarPayload);
    }

    const secret = this.config.get<string>('PAYMENTS_WEBHOOK_SECRET')?.trim();
    if (!secret) {
      await this.auditLogs.logFromRequest(request, {
        category: 'PAYMENT',
        severity: 'ERROR',
        outcome: 'FAILURE',
        action: 'payment.webhook_rejected',
        metadata: { reason: 'missing_webhook_secret' },
      });
      throw new ServiceUnavailableException('Payment webhook secret is not configured.');
    }

    const signature = this.extractSignature(
      request.headers as Record<string, string | string[] | undefined>,
    );

    if (!signature) {
      await this.auditLogs.logFromRequest(request, {
        category: 'SECURITY',
        severity: 'WARN',
        outcome: 'DENIED',
        action: 'security.payment_webhook_missing_signature',
      });
      throw new UnauthorizedException('Missing webhook signature.');
    }

    if (!this.isValidSignature(rawBody, signature, secret)) {
      await this.auditLogs.logFromRequest(request, {
        category: 'SECURITY',
        severity: 'WARN',
        outcome: 'DENIED',
        action: 'security.payment_webhook_invalid_signature',
      });
      throw new UnauthorizedException('Invalid webhook signature.');
    }

    const payload = parsedPayload || {};

    const provider = String(payload.provider || payload.gateway || 'payment-gateway').slice(0, 64);
    const eventId = String(
      payload.event_id ||
        payload.id ||
        payload.transaction_id ||
        payload.reference ||
        '',
    ).trim();

    if (!eventId) {
      throw new BadRequestException('Webhook payload is missing an event id.');
    }

    const receiptKey = `${provider}:${eventId}`;
    const bookingId = String(
      payload.booking_id ||
        payload.reference_id ||
        payload.metadata?.booking_id ||
        '',
    ).trim();

    try {
      await this.db.putWithCondition(
        'webhook_receipts',
        {
          receipt_key: receiptKey,
          provider,
          event_id: eventId,
          booking_id: bookingId || undefined,
          created_at: Date.now(),
          expires_at: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
        },
        {
          ConditionExpression: 'attribute_not_exists(receipt_key)',
        },
      );
    } catch (error: any) {
      if (error?.name === 'ConditionalCheckFailedException') {
        await this.auditLogs.logFromRequest(request, {
          category: 'SECURITY',
          severity: 'WARN',
          outcome: 'DENIED',
          action: 'security.payment_webhook_replay_rejected',
          target_type: 'webhook',
          target_id: receiptKey,
          metadata: { provider, event_id: eventId },
        });
        return { received: true, duplicate: true };
      }
      throw error;
    }

    if (!bookingId) {
      await this.auditLogs.logFromRequest(request, {
        category: 'PAYMENT',
        severity: 'WARN',
        outcome: 'FAILURE',
        action: 'payment.webhook_ignored',
        target_type: 'webhook',
        target_id: receiptKey,
        metadata: { provider, event_id: eventId, reason: 'missing_booking_id' },
      });
      return { received: true, ignored: true };
    }

    const booking = await this.db.get('bookings', { booking_id: bookingId }) as Record<string, any> | undefined;
    if (!booking) {
      await this.auditLogs.logFromRequest(request, {
        category: 'PAYMENT',
        severity: 'WARN',
        outcome: 'FAILURE',
        action: 'payment.webhook_ignored',
        target_type: 'booking',
        target_id: bookingId,
        metadata: { provider, event_id: eventId, reason: 'booking_not_found' },
      });
      return { received: true, ignored: true };
    }

    const normalizedStatus = this.normalizeWebhookStatus(
      payload.status ||
        payload.payment_status ||
        payload.event_type ||
        payload.result,
    );
    const normalizedMethod = this.normalizePaymentMethod(
      payload.method ||
        payload.payment_method ||
        booking.payment_method ||
        'MADA',
    );
    const updates: Record<string, any> = {
      updated_at: Date.now(),
      payment_method: normalizedMethod,
    };

    if (normalizedStatus) {
      updates.payment_status = normalizedStatus;
    }
    if (payload.payment_reference || payload.reference) {
      updates.payment_reference = String(payload.payment_reference || payload.reference);
    }

    await this.db.update('bookings', { booking_id: bookingId }, updates);

    await this.auditLogs.logFromRequest(request, {
      category: 'PAYMENT',
      severity: normalizedStatus === 'FAILED' ? 'WARN' : 'INFO',
      outcome: normalizedStatus === 'FAILED' ? 'FAILURE' : 'SUCCESS',
      action: 'payment.webhook_processed',
      target_type: 'booking',
      target_id: bookingId,
      metadata: {
        provider,
        event_id: eventId,
        payment_status: updates.payment_status || booking.payment_status,
        payment_method: normalizedMethod,
      },
    });

    return {
      received: true,
      booking_id: bookingId,
      payment_status: updates.payment_status || booking.payment_status,
    };
  }

  async releasePayout(bookingId: string) {
    this.logger.warn(`[STUB] Releasing payout for booking ${bookingId}`);
    await this.db.update('bookings', { booking_id: bookingId }, {
      payment_status: 'RELEASED',
      updated_at: Date.now(),
    });
    return { message: 'STUB: Payout queued for bank transfer to pro IBAN' };
  }

  private normalizePaymentMethod(method: string): PaymentMethod {
    const normalized = String(method || '').trim().toUpperCase();
    if (normalized === 'APPLE_PAY' || normalized === 'APPLEPAY') return 'APPLE_PAY';
    if (
      normalized === 'CREDIT_CARD' ||
      normalized === 'CARD' ||
      normalized === 'VISA' ||
      normalized === 'MASTERCARD'
    ) {
      return 'CREDIT_CARD';
    }
    return 'MADA';
  }

  private normalizeWebhookStatus(rawStatus: unknown): PaymentStatus | undefined {
    const normalized = String(rawStatus || '').trim().toLowerCase();
    if (!normalized) return undefined;
    if (['pending', 'processing', 'created', 'initiated'].includes(normalized)) return 'PENDING';
    if (['paid', 'captured', 'authorized', 'completed', 'success', 'held'].includes(normalized)) {
      return 'HELD';
    }
    if (['released', 'settled', 'payout_sent'].includes(normalized)) return 'RELEASED';
    if (['refunded', 'refund'].includes(normalized)) return 'REFUNDED';
    if (['failed', 'declined', 'error'].includes(normalized)) return 'FAILED';
    return undefined;
  }

  private isMoyasarPayload(payload: WebhookPayload | null) {
    if (!payload || typeof payload !== 'object') return false;
    const type = String(payload.type || '').toLowerCase();
    return Boolean(
      payload.secret_token ||
        type.startsWith('payment_') ||
        type.startsWith('invoice_') ||
        payload.data?.source ||
        payload.data?.payments ||
        payload.url,
    );
  }

  private getRawBody(body: unknown) {
    if (Buffer.isBuffer(body)) return body.toString('utf8');
    if (typeof body === 'string') return body;
    if (body && typeof body === 'object') return JSON.stringify(body);
    return '';
  }

  private extractSignature(headers: Record<string, string | string[] | undefined>) {
    const configuredHeader = this.config
      .get<string>('PAYMENTS_WEBHOOK_SIGNATURE_HEADER')
      ?.trim()
      .toLowerCase();
    const candidateHeaders = [
      configuredHeader,
      'x-signature',
      'x-webhook-signature',
      'x-payment-signature',
      'x-moyasar-signature',
      'x-hyperpay-signature',
    ].filter(Boolean) as string[];

    for (const headerName of candidateHeaders) {
      const value = headers?.[headerName] ?? headers?.[headerName.toLowerCase()];
      if (Array.isArray(value) && value[0]) return value[0];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }

    return null;
  }

  private isValidSignature(rawBody: string, signatureHeader: string, secret: string) {
    const expectedHex = createHmac('sha256', secret).update(rawBody).digest('hex');
    const expectedBase64 = createHmac('sha256', secret).update(rawBody).digest('base64');
    const candidates = signatureHeader
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => value.replace(/^sha256=/i, '').replace(/^v1=/i, ''));

    return candidates.some((candidate) =>
      this.safeCompare(candidate, expectedHex) || this.safeCompare(candidate, expectedBase64),
    );
  }

  private safeCompare(left: string, right: string) {
    if (!left || !right || left.length !== right.length) return false;
    return timingSafeEqual(Buffer.from(left), Buffer.from(right));
  }
}
