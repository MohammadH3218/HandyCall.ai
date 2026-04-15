import { Injectable } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';

@Injectable()
export class DashboardService {
  constructor(private db: DynamoDBService) {}

  async getCustomerDashboard(customerId: string) {
    const { items: bookings } = await this.db.query(
      'bookings',
      '#customer_id = :cid',
      { '#customer_id': 'customer_id' },
      { ':cid': customerId },
      { indexName: 'customer-index', scanIndexForward: false },
    );

    const now = Date.now();
    const upcoming = bookings.filter(
      (b) =>
        b.scheduled_start > now &&
        ['PENDING_CONFIRMATION', 'CONFIRMED'].includes(b.status as string),
    );
    const completed = bookings.filter((b) => b.status === 'COMPLETED');
    const cancelled = bookings.filter((b) => b.status === 'CANCELLED');

    return {
      upcoming_bookings: upcoming.slice(0, 5),
      total_bookings: bookings.length,
      completed_bookings: completed.length,
      cancelled_bookings: cancelled.length,
    };
  }

  async getProDashboard(proId: string) {
    const { items: bookings } = await this.db.query(
      'bookings',
      '#pro_id = :pid',
      { '#pro_id': 'pro_id' },
      { ':pid': proId },
      { indexName: 'pro-index', scanIndexForward: false },
    );

    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayBookings = bookings.filter(
      (b) => b.scheduled_start >= todayStart.getTime() && b.scheduled_start < todayStart.getTime() + 86400000,
    );

    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const completedThisMonth = bookings.filter(
      (b) => b.status === 'COMPLETED' && b.completed_at >= thisMonthStart.getTime(),
    );

    const earningsThisMonth = completedThisMonth.reduce(
      (sum, b) => sum + ((b.pro_payout_sar as number) ?? 0),
      0,
    );

    const completed = bookings.filter((b) => b.status === 'COMPLETED');
    const nonCancelled = bookings.filter((b) => b.status !== 'CANCELLED');
    const completionRate = nonCancelled.length
      ? Math.round((completed.length / nonCancelled.length) * 100)
      : 0;

    const pro = await this.db.get('pros', { pro_id: proId });

    return {
      today_bookings: todayBookings,
      earnings_this_month_sar: earningsThisMonth, // Halalas
      total_reviews: pro?.total_reviews ?? 0,
      average_rating: pro?.average_rating ?? 0, // integer * 100
      completion_rate: completionRate,
      total_bookings: bookings.length,
    };
  }
}
