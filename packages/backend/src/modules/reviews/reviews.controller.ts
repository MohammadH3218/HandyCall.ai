import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, CreateFromQuoteDto, ProReplyDto } from './dto/review.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { MarketplaceAuthContext } from '@handycall/shared';

@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  /** Customer: submit a review for a completed booking */
  @Post()
  async create(
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() dto: CreateReviewDto,
  ) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException('Only customers can leave reviews');
    return this.reviewsService.create(user.user_id, dto);
  }

  /** Customer: submit a review from an accepted quote request */
  @Post('from-quote')
  async createFromQuote(
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() dto: CreateFromQuoteDto,
  ) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException('Only customers can leave reviews');
    return this.reviewsService.createFromQuote(user.user_id, dto);
  }

  /** Pro: add a reply to a review */
  @Patch(':review_id/reply')
  async reply(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('review_id') reviewId: string,
    @Body() dto: ProReplyDto,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.reviewsService.addProReply(user.user_id, reviewId, dto);
  }

  /** Public: list reviews for a pro */
  @Public()
  @Get('pro/:pro_id')
  async listByPro(
    @Param('pro_id') proId: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.listByPro(proId, limit ? parseInt(limit, 10) : 20);
  }
}
