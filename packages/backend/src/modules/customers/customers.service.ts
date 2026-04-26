import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Customer } from '@handycall/shared';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

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

  async deleteAccount(customerId: string): Promise<{ message: string }> {
    const raw = await this.db.get('customers', { customer_id: customerId });
    if (!raw) throw new NotFoundException('Customer not found');
    const customer = raw as Customer & { password_hash?: string };

    const proIdsToRefresh = new Set<string>();

    const threadsByUserId = await this.queryAll(
      'threads',
      '#customer_user_id = :customerId',
      { '#customer_user_id': 'customer_user_id' },
      { ':customerId': customerId },
      { indexName: 'customer-threads-index' },
    ).catch(() => []);

    const threadsByEmail = customer.email
      ? await this.queryAll(
          'threads',
          '#customer_email = :email',
          { '#customer_email': 'customer_email' },
          { ':email': customer.email.toLowerCase() },
          { indexName: 'customer-email-index' },
        ).catch(() => [])
      : [];

    const threads = Array.from(
      new Map(
        [...threadsByUserId, ...threadsByEmail].map((thread: any) => [thread.thread_id, thread]),
      ).values(),
    );

    for (const thread of threads) {
      if (thread.pro_id) proIdsToRefresh.add(String(thread.pro_id));
      const messages = await this.queryAll(
        'messages',
        '#thread_id = :threadId',
        { '#thread_id': 'thread_id' },
        { ':threadId': thread.thread_id },
        { indexName: 'thread-messages-index' },
      ).catch(() => []);

      await Promise.all(
        messages.map((message: any) => this.db.delete('messages', { message_id: message.message_id })),
      );
      await this.db.delete('threads', { thread_id: thread.thread_id }).catch((error) => {
        this.logger.warn(`deleteAccount[${customerId}] thread cleanup failed for ${thread.thread_id}: ${error}`);
      });
    }

    const quotes = await this.queryAll(
      'quote_requests',
      '#customer_user_id = :customerId',
      { '#customer_user_id': 'customer_user_id' },
      { ':customerId': customerId },
      { indexName: 'customer-quotes-index' },
    ).catch(() => []);

    await Promise.all(
      quotes.map((quote: any) => {
        if (quote.pro_id) proIdsToRefresh.add(String(quote.pro_id));
        return this.db.delete('quote_requests', { quote_id: quote.quote_id });
      }),
    );

    const bookings = await this.queryAll(
      'bookings',
      '#customer_id = :customerId',
      { '#customer_id': 'customer_id' },
      { ':customerId': customerId },
      { indexName: 'customer-bookings-index' },
    ).catch(() => []);

    await Promise.all(
      bookings.map((booking: any) => {
        if (booking.pro_id) proIdsToRefresh.add(String(booking.pro_id));
        return this.db.delete('bookings', { booking_id: booking.booking_id });
      }),
    );

    const reviews = await this.scanAll('reviews', {
      filterExpression: '#customer_id = :customerId',
      expressionAttributeNames: { '#customer_id': 'customer_id' },
      expressionAttributeValues: { ':customerId': customerId },
    }).catch(() => []);

    await Promise.all(
      reviews.map((review: any) => {
        if (review.pro_id) proIdsToRefresh.add(String(review.pro_id));
        return this.db.delete('reviews', { review_id: review.review_id });
      }),
    );

    const emailVerifications = customer.email
      ? await this.scanAll('email_verifications', {
          filterExpression: '#email = :email',
          expressionAttributeNames: { '#email': 'email' },
          expressionAttributeValues: { ':email': customer.email.toLowerCase() },
        }).catch(() => [])
      : [];

    await Promise.all(
      emailVerifications.map((record: any) =>
        this.db.delete('email_verifications', { token: record.token }),
      ),
    );

    const passwordResets = customer.email
      ? await this.scanAll('password_resets', {
          filterExpression: '#email = :email',
          expressionAttributeNames: { '#email': 'email' },
          expressionAttributeValues: { ':email': customer.email.toLowerCase() },
        }).catch(() => [])
      : [];

    await Promise.all(
      passwordResets.map((record: any) => this.db.delete('password_resets', { token: record.token })),
    );

    await this.db.delete('customers', { customer_id: customerId });
    await this.refreshProAggregates([...proIdsToRefresh]);

    this.logger.log(`Customer account ${customerId} (${customer.email}) permanently deleted.`);
    return {
      message: 'Your account and associated customer data have been permanently deleted.',
    };
  }

  private async queryAll(
    tableName: string,
    keyConditionExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>,
    options?: {
      indexName?: string;
      scanIndexForward?: boolean;
    },
  ) {
    const items: any[] = [];
    let exclusiveStartKey: Record<string, any> | undefined;

    do {
      const response = await this.db.query(
        tableName,
        keyConditionExpression,
        expressionAttributeNames,
        expressionAttributeValues,
        {
          ...options,
          exclusiveStartKey,
        },
      );
      items.push(...response.items);
      exclusiveStartKey = response.lastEvaluatedKey;
    } while (exclusiveStartKey);

    return items;
  }

  private async scanAll(
    tableName: string,
    options?: {
      filterExpression?: string;
      expressionAttributeNames?: Record<string, string>;
      expressionAttributeValues?: Record<string, any>;
    },
  ) {
    const items: any[] = [];
    let exclusiveStartKey: Record<string, any> | undefined;

    do {
      const response = await this.db.scan(tableName, {
        ...options,
        exclusiveStartKey,
      });
      items.push(...response.items);
      exclusiveStartKey = response.lastEvaluatedKey;
    } while (exclusiveStartKey);

    return items;
  }

  private async refreshProAggregates(proIds: string[]) {
    await Promise.all(
      [...new Set(proIds.filter(Boolean))].map(async (proId) => {
        try {
          const pro = await this.db.get('pros', { pro_id: proId });
          if (!pro) return;

          const remainingBookings = await this.queryAll(
            'bookings',
            '#pro_id = :proId',
            { '#pro_id': 'pro_id' },
            { ':proId': proId },
            { indexName: 'pro-bookings-index' },
          ).catch(() => []);

          const remainingReviews = await this.queryAll(
            'reviews',
            '#pro_id = :proId',
            { '#pro_id': 'pro_id' },
            { ':proId': proId },
            { indexName: 'pro-reviews-index' },
          ).catch(() => []);

          const visibleReviews = remainingReviews.filter((review: any) => review.is_visible !== false);
          const totalReviews = visibleReviews.length;
          const averageRating = totalReviews
            ? Math.round(
                visibleReviews.reduce((sum: number, review: any) => sum + Number(review.rating || 0), 0) /
                  totalReviews *
                  100,
              )
            : 0;

          await this.db.update('pros', { pro_id: proId }, {
            total_bookings: remainingBookings.length,
            total_reviews: totalReviews,
            average_rating: averageRating,
            updated_at: Date.now(),
          });
        } catch (error) {
          this.logger.warn(`deleteAccount refreshProAggregates[${proId}] failed: ${error}`);
        }
      }),
    );
  }
}
