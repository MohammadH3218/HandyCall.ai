import { Injectable } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { UserType } from '@handycall/shared';

@Injectable()
export class DashboardService {
  constructor(private db: DynamoDBService) {}

  async getDashboard(userId: string, userType: UserType) {
    if (userType === 'CUSTOMER') return this.customerDashboard(userId);
    if (userType === 'PRO') return this.proDashboard(userId);
    return this.adminDashboard();
  }

  private async customerDashboard(customerId: string) {
    const { items } = await this.db.query(
      'bookings',
      'customer_id = :cid',
      undefined,
      { ':cid': customerId },
      { indexName: 'customer-bookings-index', scanIndexForward: false, limit: 50 },
    );

    const upcoming = items.filter(
      (b: any) => ['PENDING_CONFIRMATION', 'CONFIRMED'].includes(b.status) && b.scheduled_start > Date.now(),
    );
    const completed = items.filter((b: any) => b.status === 'COMPLETED');

    return {
      upcoming_bookings: upcoming.slice(0, 5),
      upcoming_count: upcoming.length,
      completed_count: completed.length,
      total_bookings: items.length,
    };
  }

  private async proDashboard(proId: string) {
    const pro = (await this.db.get('pros', { pro_id: proId })) as any;

    const { items } = await this.db.query(
      'bookings',
      'pro_id = :pid',
      undefined,
      { ':pid': proId },
      { indexName: 'pro-bookings-index', scanIndexForward: false, limit: 100 },
    );

    const now = Date.now();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const todayBookings = items.filter(
      (b: any) => b.scheduled_start >= todayStart.getTime() && b.status !== 'CANCELLED',
    );

    const thisMonthEarnings = items
      .filter((b: any) => b.status === 'COMPLETED' && b.completed_at >= monthStart.getTime())
      .reduce((sum: number, b: any) => sum + (b.pro_payout_sar ?? 0), 0);

    return {
      today_bookings: todayBookings.length,
      today_bookings_detail: todayBookings.slice(0, 5),
      earnings_this_month_sar: thisMonthEarnings / 100, // Display in SAR
      average_rating: (pro?.average_rating ?? 0) / 100, // e.g. 450 → 4.50
      total_reviews: pro?.total_reviews ?? 0,
      completion_rate: pro?.completion_rate ?? 0,
      onboarding_step: pro?.onboarding_step ?? 1,
      status: pro?.status,
    };
  }

  private async adminDashboard() {
    const [activePros, completedBookings, pendingPros] = await Promise.all([
      this.db.scan('pros', {
        filterExpression: '#s = :active',
        expressionAttributeNames: { '#s': 'status' },
        expressionAttributeValues: { ':active': 'ACTIVE' },
        select: 'COUNT',
      }),
      this.db.scan('bookings', {
        filterExpression: '#s = :completed',
        expressionAttributeNames: { '#s': 'status' },
        expressionAttributeValues: { ':completed': 'COMPLETED' },
      }),
      this.db.query(
        'pros',
        '#s = :pending',
        { '#s': 'status' },
        { ':pending': 'PENDING_REVIEW' },
        { indexName: 'status-index', select: 'COUNT' },
      ),
    ]);

    const totalRevenue = completedBookings.items.reduce(
      (sum: number, b: any) => sum + (b.platform_fee_sar ?? 0),
      0,
    );

    return {
      active_pros: activePros.count,
      pending_review_pros: pendingPros.count,
      completed_bookings: completedBookings.count,
      platform_revenue_sar: totalRevenue / 100,
    };
  }
}
