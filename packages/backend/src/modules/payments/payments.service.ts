import { Injectable, Logger } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';

// STUB: Integrate HyperPay or Moyasar for production.
// Both are SAMA-licensed Saudi payment gateways that support Mada, Apple Pay, and credit cards.
// Data transfer to HyperPay/Moyasar APIs must be documented per PDPL Article 29.

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private db: DynamoDBService) {}

  /** STUB: Create a payment intent. Returns a mock reference for local dev. */
  async createPaymentIntent(bookingId: string, amountHalalas: number, method: string) {
    this.logger.warn(
      `[STUB] Payment intent for booking ${bookingId}: ${amountHalalas / 100} SAR via ${method}`,
    );

    const mockReference = `mock_${bookingId}_${Date.now()}`;

    await this.db.update('bookings', { booking_id: bookingId }, {
      payment_reference: mockReference,
      payment_method: method,
      payment_status: 'HELD',
      updated_at: Date.now(),
    });

    return {
      payment_reference: mockReference,
      amount_sar: amountHalalas / 100,
      currency: 'SAR',
      status: 'pending',
      message: 'STUB: Replace with HyperPay/Moyasar integration for production',
    };
  }

  /** STUB: Handle payment gateway webhook (HyperPay/Moyasar callback). */
  async handleWebhook(payload: any) {
    this.logger.warn('[STUB] Payment webhook received:', JSON.stringify(payload));
    // TODO: Verify webhook signature, update booking payment_status, trigger pro payout
    return { received: true };
  }

  /** STUB: Release payout to pro (Saudi IBAN bank transfer). */
  async releasePayout(bookingId: string) {
    this.logger.warn(`[STUB] Releasing payout for booking ${bookingId}`);
    // TODO: Integrate SADAD/SARIE or bank transfer API
    // Pro IBAN format: SA + 22 digits (validated at onboarding step 5)
    await this.db.update('bookings', { booking_id: bookingId }, {
      payment_status: 'RELEASED',
      updated_at: Date.now(),
    });
    return { message: 'STUB: Payout queued for bank transfer to pro IBAN' };
  }
}
