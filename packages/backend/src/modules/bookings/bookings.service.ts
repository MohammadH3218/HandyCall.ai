import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Booking, calculateBookingFinancials, BookingStatus, UserType } from '@handycall/shared';

@Injectable()
export class BookingsService {
  constructor(private db: DynamoDBService) {}

  async create(customerId: string, dto: CreateBookingDto): Promise<Booking> {
    // Fetch service to lock price at booking time
    const service = await this.db.get('services', {
      pro_id: dto.pro_id,
      service_id: dto.service_id,
    });

    if (!service || !service.is_active) {
      throw new NotFoundException('Service not found or not available');
    }

    if (!service.price_sar && service.pricing_type !== 'QUOTE') {
      throw new BadRequestException('Service has no price set');
    }

    const servicePriceHalalas = service.price_sar ?? 0;
    const financials = calculateBookingFinancials(servicePriceHalalas);
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
      ...financials,
      payment_status: 'PENDING',
      created_at: now,
      updated_at: now,
    };

    await this.db.put('bookings', booking);

    // Update pro total_bookings
    const pro = (await this.db.get('pros', { pro_id: dto.pro_id })) as any;
    if (pro) {
      await this.db.update('pros', { pro_id: dto.pro_id }, {
        total_bookings: (pro.total_bookings ?? 0) + 1,
        updated_at: now,
      });
    }

    return booking;
  }

  async findOne(bookingId: string, userId: string, userType: UserType): Promise<Booking> {
    const booking = (await this.db.get('bookings', { booking_id: bookingId })) as Booking;
    if (!booking) throw new NotFoundException('Booking not found');

    const owns =
      (userType === 'CUSTOMER' && booking.customer_id === userId) ||
      (userType === 'PRO' && booking.pro_id === userId);
    if (!owns) throw new ForbiddenException();

    return booking;
  }

  async listForUser(userId: string, userType: UserType): Promise<Booking[]> {
    const indexName = userType === 'CUSTOMER' ? 'customer-bookings-index' : 'pro-bookings-index';
    const pkField = userType === 'CUSTOMER' ? 'customer_id' : 'pro_id';

    const { items } = await this.db.query(
      'bookings',
      `#pk = :uid`,
      { '#pk': pkField },
      { ':uid': userId },
      { indexName, scanIndexForward: false },
    );
    return items as Booking[];
  }

  async updateStatus(
    bookingId: string,
    newStatus: BookingStatus,
    userId: string,
    userType: UserType,
    extraFields: Record<string, any> = {},
  ): Promise<Booking> {
    const booking = await this.findOne(bookingId, userId, userType);
    this.assertValidTransition(booking.status, newStatus, userType);

    const now = Date.now();
    const updates: Record<string, any> = {
      status: newStatus,
      updated_at: now,
      ...extraFields,
    };

    if (newStatus === 'IN_PROGRESS') updates.started_at = now;
    if (newStatus === 'COMPLETED') {
      updates.completed_at = now;
      updates.payment_status = 'HELD'; // Payment held pending release
    }
    if (newStatus === 'CANCELLED') updates.cancelled_at = now;

    const result = await this.db.update('bookings', { booking_id: bookingId }, updates);
    return result as Booking;
  }

  private assertValidTransition(current: BookingStatus, next: BookingStatus, actor: UserType) {
    const allowedTransitions: Partial<Record<BookingStatus, { to: BookingStatus[]; actor: UserType[] }>> = {
      PENDING_CONFIRMATION: { to: ['CONFIRMED', 'CANCELLED'], actor: ['PRO', 'CUSTOMER'] },
      CONFIRMED: { to: ['IN_PROGRESS', 'CANCELLED'], actor: ['PRO', 'CUSTOMER'] },
      IN_PROGRESS: { to: ['COMPLETED', 'CANCELLED'], actor: ['PRO'] },
      COMPLETED: { to: [], actor: [] },
      CANCELLED: { to: [], actor: [] },
    };

    const rule = allowedTransitions[current];
    if (!rule || !rule.to.includes(next) || !rule.actor.includes(actor)) {
      throw new BadRequestException(
        `Cannot transition booking from ${current} to ${next} as ${actor}`,
      );
    }
  }
}
