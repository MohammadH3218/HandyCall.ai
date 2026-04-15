import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';

// STUB: Integrate HyperPay or Moyasar — both are SAMA-licensed Saudi payment gateways.
// HyperPay: https://wordpresshyperpay.docs.oppwa.com/
// Moyasar: https://moyasar.com/docs/
// Both support MADA, Apple Pay, and credit cards. Choose based on pricing and integration ease.

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private db: DynamoDBService) {}

  /** Create a payment intent (stub — replace with HyperPay/Moyasar API call) */
  async createPaymentIntent(
    bookingId: string,
    customerId: string,
  ): Promise<{ payment_reference: string; checkout_url: string; amount_sar: number }> {
    const booking = await this.db.get('bookings', { booking_id: bookingId });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customer_id !== customerId) {
      throw new NotFoundException('Booking not found');
    }

    const paymentReference = `HC-${uuidv4().split('-')[0].toUpperCase()}`;
    const customerTotal = booking.service_price_sar + booking.vat_amount_sar;

    // Stub: In production, call HyperPay/Moyasar here to create a checkout session
    this.logger.log(
      `[PAYMENT STUB] Creating intent for booking ${bookingId}: ` +
      `${(customerTotal / 100).toFixed(2)} SAR, ref=${paymentReference}`,
    );

    await this.db.update(
      'bookings',
      { booking_id: bookingId },
      { payment_reference: paymentReference, updated_at: Date.now() },
    );

    return {
      payment_reference: paymentReference,
      checkout_url: `https://checkout.handycall.sa/pay/${paymentReference}`, // stub URL
      amount_sar: customerTotal,
    };
  }

  /** Handle payment webhook from HyperPay/Moyasar (stub) */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<{ received: boolean }> {
    // STUB: Verify HMAC signature before processing
    // HyperPay: verify X-HyperPay-Signature header
    // Moyasar: verify X-Moyasar-Signature header
    this.logger.log(`[PAYMENT WEBHOOK STUB] Received webhook, sig=${signature?.slice(0, 16)}...`);

    // In production:
    // 1. Verify signature using WEBHOOK_SECRET
    // 2. Parse event type (payment.captured, payment.failed, etc.)
    // 3. Update booking.payment_status accordingly
    // 4. Trigger payout notification email on payment.captured

    return { received: true };
  }
}
