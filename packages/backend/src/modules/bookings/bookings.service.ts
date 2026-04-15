import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { EmailService } from '../email/email.service';
import { CreateBookingDto, CancelBookingDto } from './dto/create-booking.dto';
import {
  Booking,
  BookingStatus,
  CancelledBy,
  calculateBookingFinancials,
} from '@handycall/shared';

@Injectable()
export class BookingsService {
  constructor(
    private db: DynamoDBService,
    private email: EmailService,
  ) {}

  async createBooking(customerId: string, dto: CreateBookingDto): Promise<Booking> {
    if (dto.scheduled_start <= Date.now()) {
      throw new BadRequestException('Scheduled start must be in the future');
    }
    if (dto.scheduled_end <= dto.scheduled_start) {
      throw new BadRequestException('Scheduled end must be after scheduled start');
    }

    // Fetch service to lock price at booking time
    const service = await this.db.get('services', {
      pro_id: dto.pro_id,
      service_id: dto.service_id,
    });
    if (!service || !service.is_active) {
      throw new NotFoundException('Service not found or inactive');
    }

    const servicePrice = service.price_sar as number;
    if (!servicePrice) {
      throw new BadRequestException(
        'Service does not have a fixed price. Request a quote instead.',
      );
    }

    const financials = calculateBookingFinancials(servicePrice);
    const now = Date.now();

    const booking: Booking = {
      booking_id: uuidv4(),
      customer_id: customerId,
      pro_id: dto.pro_id,
      service_id: dto.service_id,
      scheduled_start: dto.scheduled_start,
      scheduled_end: dto.scheduled_end,
      address_district: dto.address_district,
      address_detail: dto.address_detail,
      address_notes: dto.address_notes,
      city: 'Riyadh',
      status: 'PENDING_CONFIRMATION',
      service_price_sar: financials.service_price_sar,
      vat_amount_sar: financials.vat_amount_sar,
      platform_fee_sar: financials.platform_fee_sar,
      pro_payout_sar: financials.pro_payout_sar,
      payment_status: 'PENDING',
      created_at: now,
      updated_at: now,
    };

    await this.db.put('bookings', booking);

    // Send notification emails (fire-and-forget; don't fail booking on email error)
    this.notifyNewBooking(booking).catch(() => {});

    return booking;
  }

  async getBooking(bookingId: string, requesterId: string): Promise<Booking> {
    const booking = await this.db.get('bookings', { booking_id: bookingId });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.customer_id !== requesterId && booking.pro_id !== requesterId) {
      throw new ForbiddenException('Access denied');
    }

    return booking as Booking;
  }

  async listBookings(
    userId: string,
    userType: 'CUSTOMER' | 'PRO',
    status?: BookingStatus,
  ): Promise<Booking[]> {
    const pkField = userType === 'CUSTOMER' ? 'customer_id' : 'pro_id';
    const indexName = userType === 'CUSTOMER' ? 'customer-index' : 'pro-index';

    const opts: any = {};
    if (status) {
      opts.filterExpression = '#status = :status';
      opts.expressionAttributeNames = { [`#${pkField}`]: pkField, '#status': 'status' };
      opts.expressionAttributeValues = { [`:${pkField}`]: userId, ':status': status };
    }

    const { items } = await this.db.query(
      'bookings',
      `#${pkField} = :${pkField}`,
      { [`#${pkField}`]: pkField },
      { [`:${pkField}`]: userId },
      { indexName, ...opts, scanIndexForward: false },
    );

    return items as Booking[];
  }

  async confirmBooking(bookingId: string, proId: string): Promise<Booking> {
    const booking = await this.assertBookingOwnership(bookingId, proId, 'pro');
    this.assertStatus(booking, 'PENDING_CONFIRMATION');

    const updated = await this.db.update(
      'bookings',
      { booking_id: bookingId },
      { status: 'CONFIRMED', updated_at: Date.now() },
    );

    this.notifyBookingConfirmed(updated as Booking).catch(() => {});
    return updated as Booking;
  }

  async startBooking(bookingId: string, proId: string): Promise<Booking> {
    const booking = await this.assertBookingOwnership(bookingId, proId, 'pro');
    this.assertStatus(booking, 'CONFIRMED');

    const updated = await this.db.update(
      'bookings',
      { booking_id: bookingId },
      { status: 'IN_PROGRESS', started_at: Date.now(), updated_at: Date.now() },
    );
    return updated as Booking;
  }

  async completeBooking(bookingId: string, proId: string): Promise<Booking> {
    const booking = await this.assertBookingOwnership(bookingId, proId, 'pro');
    this.assertStatus(booking, 'IN_PROGRESS');

    const now = Date.now();
    const updated = await this.db.update(
      'bookings',
      { booking_id: bookingId },
      {
        status: 'COMPLETED',
        completed_at: now,
        payment_status: 'RELEASED',
        updated_at: now,
      },
    );

    this.notifyBookingCompleted(updated as Booking).catch(() => {});
    return updated as Booking;
  }

  async cancelBooking(
    bookingId: string,
    requesterId: string,
    requesterType: 'CUSTOMER' | 'PRO',
    dto: CancelBookingDto,
  ): Promise<Booking> {
    const booking = await this.db.get('bookings', { booking_id: bookingId });
    if (!booking) throw new NotFoundException('Booking not found');

    const isOwner =
      (requesterType === 'CUSTOMER' && booking.customer_id === requesterId) ||
      (requesterType === 'PRO' && booking.pro_id === requesterId);
    if (!isOwner) throw new ForbiddenException();

    const cancellableStatuses: BookingStatus[] = ['PENDING_CONFIRMATION', 'CONFIRMED'];
    if (!cancellableStatuses.includes(booking.status as BookingStatus)) {
      throw new BadRequestException(
        `Cannot cancel a booking with status: ${booking.status}`,
      );
    }

    const cancelledBy: CancelledBy = requesterType;
    const now = Date.now();
    const updated = await this.db.update(
      'bookings',
      { booking_id: bookingId },
      {
        status: 'CANCELLED',
        cancelled_by: cancelledBy,
        cancelled_at: now,
        cancellation_reason: dto.cancellation_reason,
        payment_status: 'REFUNDED',
        updated_at: now,
      },
    );

    this.notifyBookingCancelled(updated as Booking, cancelledBy).catch(() => {});
    return updated as Booking;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async assertBookingOwnership(
    bookingId: string,
    userId: string,
    as: 'customer' | 'pro',
  ): Promise<Booking> {
    const booking = await this.db.get('bookings', { booking_id: bookingId });
    if (!booking) throw new NotFoundException('Booking not found');
    const field = as === 'customer' ? 'customer_id' : 'pro_id';
    if (booking[field] !== userId) throw new ForbiddenException();
    return booking as Booking;
  }

  private assertStatus(booking: Booking, expected: BookingStatus) {
    if (booking.status !== expected) {
      throw new BadRequestException(
        `Action requires status ${expected}, but booking is ${booking.status}`,
      );
    }
  }

  private async notifyNewBooking(booking: Booking) {
    const [customer, pro] = await Promise.all([
      this.db.get('customers', { customer_id: booking.customer_id }),
      this.db.get('pros', { pro_id: booking.pro_id }),
    ]);
    if (customer && pro) {
      await Promise.all([
        this.email.sendBookingConfirmationCustomer(booking, customer as any, pro as any),
        this.email.sendNewBookingNotificationPro(booking, customer as any, pro as any),
      ]);
    }
  }

  private async notifyBookingConfirmed(booking: Booking) {
    const [customer, pro] = await Promise.all([
      this.db.get('customers', { customer_id: booking.customer_id }),
      this.db.get('pros', { pro_id: booking.pro_id }),
    ]);
    if (customer && pro) {
      await this.email.sendBookingConfirmedCustomer(booking, customer as any, pro as any);
    }
  }

  private async notifyBookingCompleted(booking: Booking) {
    const customer = await this.db.get('customers', { customer_id: booking.customer_id });
    if (customer) {
      await this.email.sendBookingCompletedAndReviewPrompt(booking, customer as any);
    }
  }

  private async notifyBookingCancelled(booking: Booking, cancelledBy: CancelledBy) {
    const [customer, pro] = await Promise.all([
      this.db.get('customers', { customer_id: booking.customer_id }),
      this.db.get('pros', { pro_id: booking.pro_id }),
    ]);
    if (customer) await this.email.sendBookingCancelled(booking, customer as any, cancelledBy);
    if (pro) await this.email.sendBookingCancelled(booking, pro as any, cancelledBy);
  }
}
