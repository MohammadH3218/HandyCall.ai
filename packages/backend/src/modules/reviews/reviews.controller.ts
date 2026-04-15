import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, ProReplyDto } from './dto/review.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { MarketplaceAuthContext } from '@handycall/shared';

@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  /** Customer: submit a review for a completed booking */
  @Post()
  create(
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() dto: CreateReviewDto,
  ) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException();
    return this.reviewsService.createReview(user.user_id, dto);
  }

  /** Pro: reply to a review */
  @Patch(':review_id/reply')
  reply(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('review_id') reviewId: string,
    @Body() dto: ProReplyDto,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.reviewsService.addProReply(user.user_id, reviewId, dto);
  }

  /** Public: get all visible reviews for a pro */
  @Public()
  @Get('pro/:pro_id')
  listForPro(@Param('pro_id') proId: string) {
    return this.reviewsService.listProReviews(proId);
  }
}
