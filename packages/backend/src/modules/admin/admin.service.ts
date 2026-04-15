import { Injectable, NotFoundException } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { Pro, ProStatus } from '@handycall/shared';

@Injectable()
export class AdminService {
  constructor(private db: DynamoDBService) {}

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

  async approvePro(proId: string): Promise<{ message: string }> {
    const pro = await this.db.get('pros', { pro_id: proId }) as any;
    if (!pro) throw new NotFoundException('Pro not found');

    await this.db.update('pros', { pro_id: proId }, {
      status: 'ACTIVE' as ProStatus,
      is_available: true,
      updated_at: Date.now(),
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

    return { message: `Pro ${proId} rejected.` };
  }

  async getPlatformConfig(): Promise<Record<string, any>> {
    const { items } = await this.db.scan('platform_config');
    return Object.fromEntries(
      items.map((item: any) => {
        let value: any = item.config_value;
        try { value = JSON.parse(item.config_value); } catch {}
        return [item.config_key, value];
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

  async platformStats() {
    const [prosResult, bookingsResult] = await Promise.all([
      this.db.scan('pros', {
        filterExpression: '#status = :active',
        expressionAttributeNames: { '#status': 'status' },
        expressionAttributeValues: { ':active': 'ACTIVE' },
        select: 'COUNT',
      }),
      this.db.scan('bookings', {
        filterExpression: '#status = :completed',
        expressionAttributeNames: { '#status': 'status' },
        expressionAttributeValues: { ':completed': 'COMPLETED' },
      }),
    ]);

    const totalRevenue = bookingsResult.items.reduce(
      (sum: number, b: any) => sum + (b.platform_fee_sar ?? 0),
      0,
    );

    return {
      active_pros: prosResult.count,
      completed_bookings: bookingsResult.count,
      platform_revenue_sar: totalRevenue / 100, // Convert to SAR for display
    };
  }
}
