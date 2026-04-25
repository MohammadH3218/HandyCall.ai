import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { CreateReviewDto, CreateFromQuoteDto, ProReplyDto } from './dto/review.dto';
import { Review } from '@handycall/shared';

@Injectable()
export class ReviewsService {
  constructor(private db: DynamoDBService) {}

  async create(customerId: string, dto: CreateReviewDto): Promise<Review> {
    // Enforce one review per booking using booking-review-index GSI
    const { items: existing } = await this.db.query(
      'reviews',
      'booking_id = :bid',
      undefined,
      { ':bid': dto.booking_id },
      { indexName: 'booking-review-index', limit: 1 },
    );

    if (existing.length) {
      throw new BadRequestException('This booking has already been reviewed.');
    }

    // Verify the booking belongs to this customer and is COMPLETED
    const booking = await this.db.get('bookings', { booking_id: dto.booking_id }) as any;
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customer_id !== customerId) throw new ForbiddenException();
    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException('You can only review completed bookings.');
    }

    const now = Date.now();
    const review: Review = {
      review_id: uuidv4(),
      booking_id: dto.booking_id,
      customer_id: customerId,
      pro_id: booking.pro_id,
      service_id: booking.service_id,
      rating: dto.rating,
      comment: dto.comment,
      comment_ar: dto.comment_ar,
      is_visible: true,
      created_at: now,
      updated_at: now,
    };

    await this.db.put('reviews', review);

    // Update pro's average_rating and total_reviews
    await this.updateProRating(booking.pro_id);

    return review;
  }

  async addProReply(proId: string, reviewId: string, dto: ProReplyDto): Promise<Review> {
    const review = await this.db.get('reviews', { review_id: reviewId }) as Review;
    if (!review) throw new NotFoundException('Review not found');
    if (review.pro_id !== proId) throw new ForbiddenException();

    const now = Date.now();
    const result = await this.db.update('reviews', { review_id: reviewId }, {
      pro_reply: dto.pro_reply,
      pro_reply_at: now,
      updated_at: now,
    });

    return result as Review;
  }

  async createFromQuote(customerId: string, dto: CreateFromQuoteDto): Promise<any> {
    const quote = await this.db.get('quote_requests', { quote_id: dto.quote_id }) as any;
    if (!quote) throw new NotFoundException('Quote request not found');
    if (quote.customer_user_id !== customerId) throw new ForbiddenException();
    if (quote.status !== 'ACCEPTED') {
      throw new BadRequestException('You can only review after a quote has been accepted.');
    }
    if (quote.reviewed) {
      throw new BadRequestException('You have already reviewed this service.');
    }

    const now = Date.now();
    const review = {
      review_id: uuidv4(),
      quote_id: dto.quote_id,
      customer_id: customerId,
      pro_id: quote.pro_id,
      rating: dto.rating,
      comment: dto.comment,
      customer_name: quote.contact_name || 'Customer',
      is_visible: true,
      created_at: now,
      updated_at: now,
    };

    await this.db.put('reviews', review);
    await this.db.update('quote_requests', { quote_id: dto.quote_id }, { reviewed: true });
    await this.updateProRating(quote.pro_id);

    return review;
  }

  async listByPro(proId: string, limit = 20): Promise<Review[]> {
    const { items } = await this.db.query(
      'reviews',
      'pro_id = :pro_id',
      undefined,
      { ':pro_id': proId },
      { indexName: 'pro-reviews-index', limit, scanIndexForward: false },
    );
    return items.filter((r: any) => r.is_visible) as Review[];
  }

  private async updateProRating(proId: string) {
    const { items } = await this.db.query(
      'reviews',
      'pro_id = :pro_id',
      undefined,
      { ':pro_id': proId },
      { indexName: 'pro-reviews-index' },
    );

    const visible = items.filter((r: any) => r.is_visible);
    if (!visible.length) return;

    const total = visible.length;
    const sum = visible.reduce((acc: number, r: any) => acc + r.rating, 0);
    // Store as integer * 100 for precision (e.g. 450 = 4.50 stars)
    const avgInt = Math.round((sum / total) * 100);

    await this.db.update('pros', { pro_id: proId }, {
      average_rating: avgInt,
      total_reviews: total,
      updated_at: Date.now(),
    });
  }
}
