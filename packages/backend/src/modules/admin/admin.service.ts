import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { EmailService } from '../email/email.service';
import { ProsService } from '../pros/pros.service';
import { Pro, ProStatus, Customer } from '@handycall/shared';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private db: DynamoDBService,
    private email: EmailService,
    private config: ConfigService,
    private prosService: ProsService,
  ) {}

  // ─── Pros ─────────────────────────────────────────────────────────────────

  async listPros(filters: { status?: string; limit?: number } = {}) {
    const limit = filters.limit ?? 50;

    if (filters.status) {
      const { items } = await this.db.query(
        'pros',
        '#status = :s',
        { '#status': 'status' },
        { ':s': filters.status },
        { indexName: 'status-index', scanIndexForward: false },
      );
      return items.map(this.stripSensitive);
    }

    const { items } = await this.db.scan('pros', { limit });
    return items.map(this.stripSensitive);
  }

  /** List pros pending admin review */
  async listPendingPros(): Promise<Pro[]> {
    const { items } = await this.db.query(
      'pros',
      '#status = :pending',
      { '#status': 'status' },
      { ':pending': 'PENDING_REVIEW' },
      { indexName: 'status-index', scanIndexForward: false },
    );
    return items.map((p: any) => {
      const { password_hash, ...safe } = p;
      return safe as Pro;
    });
  }

  async getProAdmin(proId: string) {
    const pro = await this.db.get('pros', { pro_id: proId }) as any;
    if (!pro) throw new NotFoundException('Pro not found');
    const { password_hash, ...safe } = pro;

    // Attach services
    try {
      const { items: services } = await this.db.query(
        'services',
        'pro_id = :pid',
        { '#pid': 'pro_id' },
        { ':pid': proId },
        { indexName: undefined },
      );
      safe.services = services;
    } catch {
      safe.services = [];
    }

    // Attach availability
    try {
      const { items: availability } = await this.db.query(
        'pro_availability',
        'pro_id = :pid',
        { '#pid': 'pro_id' },
        { ':pid': proId },
        { indexName: undefined },
      );
      safe.availability = availability;
    } catch {
      safe.availability = [];
    }

    return safe;
  }

  async approvePro(proId: string): Promise<{ message: string }> {
    const pro = await this.db.get('pros', { pro_id: proId }) as any;
    if (!pro) throw new NotFoundException('Pro not found');

    await this.db.update('pros', { pro_id: proId }, {
      status: 'ACTIVE' as ProStatus,
      is_available: true,
      updated_at: Date.now(),
    });

    // Send approval email — fire-and-forget so it never blocks the admin action
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'https://handycall.org';
    const dashboardUrl = `${frontendUrl}/pro/dashboard`;
    this.email.sendProApproved(pro as Pro, dashboardUrl).catch((err: any) => {
      this.logger.warn(`approvePro[${proId}] email failed: ${err?.message}`);
    });

    return { message: `Pro ${proId} approved and set to ACTIVE.` };
  }

  async rejectPro(proId: string, reason?: string): Promise<{ message: string }> {
    const pro = await this.db.get('pros', { pro_id: proId }) as any;
    if (!pro) throw new NotFoundException('Pro not found');

    await this.db.update('pros', { pro_id: proId }, {
      status: 'REJECTED' as ProStatus,
      rejection_reason: reason,
      updated_at: Date.now(),
    });

    // Send rejection email — fire-and-forget
    this.email.sendProRejected(pro as Pro, reason).catch((err: any) => {
      this.logger.warn(`rejectPro[${proId}] email failed: ${err?.message}`);
    });

    return { message: `Pro ${proId} rejected.` };
  }

  async suspendPro(proId: string): Promise<{ message: string }> {
    const pro = await this.db.get('pros', { pro_id: proId }) as any;
    if (!pro) throw new NotFoundException('Pro not found');
    await this.db.update('pros', { pro_id: proId }, { status: 'SUSPENDED', updated_at: Date.now() });
    return { message: `Pro ${proId} suspended.` };
  }

  async reactivatePro(proId: string): Promise<{ message: string }> {
    const pro = await this.db.get('pros', { pro_id: proId }) as any;
    if (!pro) throw new NotFoundException('Pro not found');
    await this.db.update('pros', { pro_id: proId }, { status: 'ACTIVE', updated_at: Date.now() });
    return { message: `Pro ${proId} reactivated.` };
  }

  async deletePro(proId: string): Promise<{ message: string }> {
    // Delegate to ProsService.deleteAccount which handles DynamoDB, S3, and Cognito
    await this.prosService.deleteAccount(proId);
    return { message: `Pro ${proId} and all associated data permanently deleted.` };
  }

  // ─── Customers ────────────────────────────────────────────────────────────

  async listCustomers(filters: { status?: string; limit?: number } = {}) {
    const limit = filters.limit ?? 50;
    if (filters.status) {
      const { items } = await this.db.query(
        'customers',
        '#status = :s',
        { '#status': 'status' },
        { ':s': filters.status },
        { indexName: 'status-index', scanIndexForward: false },
      );
      return items.map(this.stripSensitive);
    }
    const { items } = await this.db.scan('customers', { limit });
    return items.map(this.stripSensitive);
  }

  async getCustomerAdmin(customerId: string) {
    const customer = await this.db.get('customers', { customer_id: customerId }) as any;
    if (!customer) throw new NotFoundException('Customer not found');
    const { password_hash, ...safe } = customer;
    return safe;
  }

  async suspendCustomer(customerId: string): Promise<{ message: string }> {
    const c = await this.db.get('customers', { customer_id: customerId }) as any;
    if (!c) throw new NotFoundException('Customer not found');
    await this.db.update('customers', { customer_id: customerId }, { status: 'SUSPENDED', updated_at: Date.now() });
    return { message: `Customer ${customerId} suspended.` };
  }

  async reactivateCustomer(customerId: string): Promise<{ message: string }> {
    const c = await this.db.get('customers', { customer_id: customerId }) as any;
    if (!c) throw new NotFoundException('Customer not found');
    await this.db.update('customers', { customer_id: customerId }, { status: 'ACTIVE', updated_at: Date.now() });
    return { message: `Customer ${customerId} reactivated.` };
  }

  async deleteCustomer(customerId: string): Promise<{ message: string }> {
    const c = await this.db.get('customers', { customer_id: customerId }) as any;
    if (!c) throw new NotFoundException('Customer not found');
    await this.db.delete('customers', { customer_id: customerId });
    return { message: `Customer ${customerId} permanently deleted.` };
  }

  // ─── Bookings ─────────────────────────────────────────────────────────────

  async listBookings(filters: { status?: string; limit?: number } = {}) {
    const limit = filters.limit ?? 50;
    if (filters.status) {
      const { items } = await this.db.query(
        'bookings',
        '#status = :s',
        { '#status': 'status' },
        { ':s': filters.status },
        { indexName: 'status-index', scanIndexForward: false },
      );
      return items;
    }
    const { items } = await this.db.scan('bookings', { limit });
    return items;
  }

  async getBookingAdmin(bookingId: string) {
    const booking = await this.db.get('bookings', { booking_id: bookingId }) as any;
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async cancelBooking(bookingId: string, reason?: string): Promise<{ message: string }> {
    const booking = await this.db.get('bookings', { booking_id: bookingId }) as any;
    if (!booking) throw new NotFoundException('Booking not found');
    await this.db.update('bookings', { booking_id: bookingId }, {
      status: 'CANCELLED',
      cancelled_by: 'PLATFORM',
      cancellation_reason: reason ?? 'Cancelled by admin',
      updated_at: Date.now(),
    });
    return { message: `Booking ${bookingId} cancelled.` };
  }

  // ─── Reviews ──────────────────────────────────────────────────────────────

  async listReviews(filters: { visible?: boolean; limit?: number } = {}) {
    const limit = filters.limit ?? 50;
    if (filters.visible !== undefined) {
      const { items } = await this.db.scan('reviews', {
        filterExpression: 'is_visible = :v',
        expressionAttributeNames: {} as any,
        expressionAttributeValues: { ':v': filters.visible },
        limit,
      });
      return items;
    }
    const { items } = await this.db.scan('reviews', { limit });
    return items;
  }

  async setReviewVisibility(reviewId: string, isVisible: boolean): Promise<{ message: string }> {
    const review = await this.db.get('reviews', { review_id: reviewId }) as any;
    if (!review) throw new NotFoundException('Review not found');
    await this.db.update('reviews', { review_id: reviewId }, { is_visible: isVisible, updated_at: Date.now() });
    return { message: `Review ${reviewId} visibility set to ${isVisible}.` };
  }

  async deleteReview(reviewId: string): Promise<{ message: string }> {
    const review = await this.db.get('reviews', { review_id: reviewId }) as any;
    if (!review) throw new NotFoundException('Review not found');
    await this.db.delete('reviews', { review_id: reviewId });
    return { message: `Review ${reviewId} permanently deleted.` };
  }

  // ─── Platform Config ──────────────────────────────────────────────────────

  async getPlatformConfig(): Promise<Record<string, any>> {
    const { items } = await this.db.scan('platform_config');
    return Object.fromEntries(
      items.map((item: any) => {
        let value: any = item.config_value;
        try { value = JSON.parse(item.config_value); } catch {}
        return [item.config_key, { value, updated_at: item.updated_at }];
      }),
    );
  }

  async updatePlatformConfig(key: string, value: any): Promise<{ message: string }> {
    await this.db.update(
      'platform_config',
      { config_key: key },
      {
        config_value: typeof value === 'string' ? value : JSON.stringify(value),
        updated_at: Date.now(),
        updated_by: 'admin',
      },
    );
    return { message: `Config key "${key}" updated.` };
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  async platformStats() {
    const [prosAll, prosActive, prosPending, customersAll, bookingsAll] = await Promise.all([
      this.db.scan('pros', { select: 'COUNT' }),
      this.db.scan('pros', {
        filterExpression: '#status = :active',
        expressionAttributeNames: { '#status': 'status' },
        expressionAttributeValues: { ':active': 'ACTIVE' },
        select: 'COUNT',
      }),
      this.db.scan('pros', {
        filterExpression: '#status = :pending',
        expressionAttributeNames: { '#status': 'status' },
        expressionAttributeValues: { ':pending': 'PENDING_REVIEW' },
        select: 'COUNT',
      }),
      this.db.scan('customers', { select: 'COUNT' }),
      this.db.scan('bookings', {}),
    ]);

    const completedBookings = bookingsAll.items.filter((b: any) => b.status === 'COMPLETED');
    const totalRevenue = completedBookings.reduce(
      (sum: number, b: any) => sum + (b.platform_fee_sar ?? 0),
      0,
    );

    return {
      total_pros: prosAll.count ?? 0,
      active_pros: prosActive.count ?? 0,
      pending_pros: prosPending.count ?? 0,
      total_customers: customersAll.count ?? 0,
      total_bookings: bookingsAll.items.length,
      completed_bookings: completedBookings.length,
      platform_revenue_sar: totalRevenue / 100,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private stripSensitive(item: any) {
    const { password_hash, iban, national_id, iqama_number, ...safe } = item;
    return safe;
  }
}
