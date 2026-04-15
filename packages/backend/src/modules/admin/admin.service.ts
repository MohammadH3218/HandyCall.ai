import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { Pro } from '@handycall/shared';

@Injectable()
export class AdminService {
  constructor(private db: DynamoDBService) {}

  // ─── Pro Approval Queue ──────────────────────────────────────────────────────

  async listPendingPros(): Promise<Partial<Pro>[]> {
    const { items } = await this.db.scan('pros', {
      filterExpression: '#status = :pending',
      expressionAttributeNames: { '#status': 'status' },
      expressionAttributeValues: { ':pending': 'PENDING_REVIEW' },
    });

    return items.map((pro: any) => {
      const { password_hash, iban, ...safe } = pro;
      return safe;
    });
  }

  async approvePro(proId: string): Promise<{ pro_id: string; status: string }> {
    const pro = await this.db.get('pros', { pro_id: proId });
    if (!pro) throw new NotFoundException('Pro not found');
    if (pro.status !== 'PENDING_REVIEW') {
      throw new BadRequestException(`Pro is not in PENDING_REVIEW status (current: ${pro.status})`);
    }

    await this.db.update('pros', { pro_id: proId }, {
      status: 'ACTIVE',
      is_available: true,
      updated_at: Date.now(),
    });

    return { pro_id: proId, status: 'ACTIVE' };
  }

  async rejectPro(
    proId: string,
    reason?: string,
  ): Promise<{ pro_id: string; status: string }> {
    const pro = await this.db.get('pros', { pro_id: proId });
    if (!pro) throw new NotFoundException('Pro not found');
    if (pro.status !== 'PENDING_REVIEW') {
      throw new BadRequestException(`Pro is not in PENDING_REVIEW status (current: ${pro.status})`);
    }

    await this.db.update('pros', { pro_id: proId }, {
      status: 'REJECTED',
      rejection_reason: reason,
      updated_at: Date.now(),
    });

    return { pro_id: proId, status: 'REJECTED' };
  }

  async suspendPro(proId: string): Promise<{ pro_id: string; status: string }> {
    const pro = await this.db.get('pros', { pro_id: proId });
    if (!pro) throw new NotFoundException('Pro not found');

    await this.db.update('pros', { pro_id: proId }, {
      status: 'SUSPENDED',
      is_available: false,
      updated_at: Date.now(),
    });

    return { pro_id: proId, status: 'SUSPENDED' };
  }

  // ─── Platform Config ─────────────────────────────────────────────────────────

  async getPlatformConfig(): Promise<Record<string, any>[]> {
    const { items } = await this.db.scan('platform_config');
    return items;
  }

  async updatePlatformConfig(
    key: string,
    value: string,
    updatedBy: string,
  ): Promise<{ config_key: string; config_value: string }> {
    await this.db.update(
      'platform_config',
      { config_key: key },
      { config_value: value, updated_at: Date.now(), updated_by: updatedBy },
    );
    return { config_key: key, config_value: value };
  }

  // ─── Admin Stats ─────────────────────────────────────────────────────────────

  async getStats(): Promise<Record<string, any>> {
    const [prosResult, bookingsResult, customersResult] = await Promise.all([
      this.db.scan('pros', {
        filterExpression: '#status = :active',
        expressionAttributeNames: { '#status': 'status' },
        expressionAttributeValues: { ':active': 'ACTIVE' },
      }),
      this.db.scan('bookings'),
      this.db.scan('customers', {
        filterExpression: '#status = :active',
        expressionAttributeNames: { '#status': 'status' },
        expressionAttributeValues: { ':active': 'ACTIVE' },
      }),
    ]);

    const completedBookings = bookingsResult.items.filter(
      (b) => b.status === 'COMPLETED',
    );
    const platformRevenue = completedBookings.reduce(
      (sum, b) => sum + ((b.platform_fee_sar as number) ?? 0),
      0,
    );

    return {
      active_pros: prosResult.items.length,
      pending_pros: (await this.listPendingPros()).length,
      total_bookings: bookingsResult.items.length,
      completed_bookings: completedBookings.length,
      active_customers: customersResult.items.length,
      platform_revenue_sar: platformRevenue, // in Halalas
    };
  }
}
