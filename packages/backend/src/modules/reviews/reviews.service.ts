import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { CreateReviewDto, ProReplyDto } from './dto/review.dto';
import { Review } from '@handycall/shared';

@Injectable()
export class ReviewsService {
  constructor(private db: DynamoDBService) {}

  async createReview(customerId: string, dto: CreateReviewDto): Promise<Review> {
    // Verify booking exists and belongs to this customer
    const booking = await this.db.get('bookings', { booking_id: dto.booking_id });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customer_id !== customerId) throw new ForbiddenException();
    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException('Can only review completed bookings');
    }

    // Enforce one review per booking
    const { items: existing } = await this.db.query(
      'reviews',
      '#booking_id = :bid',
      { '#booking_id': 'booking_id' },
      { ':bid': dto.booking_id },
      { indexName: 'booking-review-index' },
    );
    if (existing.length) {
      throw new BadRequestException('You have already reviewed this booking');
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

    // Update pro's aggregate rating
    await this.updateProRating(booking.pro_id);

    return review;
  }

  async addProReply(proId: string, reviewId: string, dto: ProReplyDto): Promise<Review> {
    const review = await this.db.get('reviews', { review_id: reviewId });
    if (!review) throw new NotFoundException('Review not found');
    if (review.pro_id !== proId) throw new ForbiddenException();
    if (review.pro_reply) throw new BadRequestException('Reply already added');

    const updated = await this.db.update(
      'reviews',
      { review_id: reviewId },
      { pro_reply: dto.pro_reply, pro_reply_at: Date.now(), updated_at: Date.now() },
    );
    return updated as Review;
  }

  async listProReviews(proId: string): Promise<Review[]> {
    const { items } = await this.db.query(
      'reviews',
      '#pro_id = :pro_id',
      { '#pro_id': 'pro_id' },
      { ':pro_id': proId },
      { indexName: 'pro-reviews-index', scanIndexForward: false },
    );
    return (items as Review[]).filter((r) => r.is_visible);
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private async updateProRating(proId: string) {
    const { items } = await this.db.query(
      'reviews',
      '#pro_id = :pro_id',
      { '#pro_id': 'pro_id' },
      { ':pro_id': proId },
      { indexName: 'pro-reviews-index' },
    );

    const visible = items.filter((r) => r.is_visible);
    if (!visible.length) return;

    const total = visible.length;
    const sum = visible.reduce((acc, r) => acc + (r.rating as number), 0);
    // Store as integer * 100 (e.g. 4.5 → 450)
    const averageRating = Math.round((sum / total) * 100);

    await this.db.update(
      'pros',
      { pro_id: proId },
      { average_rating: averageRating, total_reviews: total, updated_at: Date.now() },
    );
  }
}
