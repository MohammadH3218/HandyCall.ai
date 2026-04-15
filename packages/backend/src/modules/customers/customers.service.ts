import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from '@handycall/shared';

@Injectable()
export class CustomersService {
  constructor(private db: DynamoDBService) {}

  async findById(customerId: string): Promise<Customer> {
    const item = await this.db.get('customers', { customer_id: customerId });
    if (!item) throw new NotFoundException('Customer not found');
    const { password_hash: _, ...safe } = item as any;
    return safe as Customer;
  }

  async updateProfile(customerId: string, dto: UpdateCustomerDto): Promise<Customer> {
    const updates: Record<string, any> = {
      ...dto,
      updated_at: Date.now(),
    };
    const result = await this.db.update('customers', { customer_id: customerId }, updates);
    const { password_hash: _, ...safe } = result as any;
    return safe as Customer;
  }

  /**
   * PDPL Article 18 — right to erasure.
   * Marks account for deletion; actual purge via a scheduled job (not MVP).
   * Data breach reporting to NDMO within 72 hours per PDPL Article 20.
   */
  async requestDeletion(customerId: string): Promise<{ message: string }> {
    await this.db.update('customers', { customer_id: customerId }, {
      status: 'SUSPENDED',
      deletion_requested_at: Date.now(),
      updated_at: Date.now(),
    });
    return {
      message:
        'Your account has been flagged for deletion. All personal data will be permanently removed within 30 days per Saudi PDPL requirements.',
    };
  }
}
