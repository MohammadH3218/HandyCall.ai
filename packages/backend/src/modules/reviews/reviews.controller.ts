import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, ProReplyDto } from './dto/review.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimitPolicy } from '../../common/decorators/rate-limit.decorator';
import { MarketplaceAuthContext } from '@handycall/shared';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Controller('reviews')
export class ReviewsController {
  constructor(
    private reviewsService: ReviewsService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  /** Customer: submit a review for a completed booking */
  @RateLimitPolicy('USER_WRITE')
  @Post()
  async create(
    @Req() req: Request,
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() dto: CreateReviewDto,
  ) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException('Only customers can leave reviews');
    const result = await this.reviewsService.create(user.user_id, dto);
    await this.auditLogs.logFromRequest(req, {
      category: 'REVIEW',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'review.created',
      target_type: 'review',
      target_id: result.review_id,
      metadata: { booking_id: dto.booking_id, rating: dto.rating },
    });
    return result;
  }

  /** Pro: add a reply to a review */
  @RateLimitPolicy('USER_WRITE')
  @Patch(':review_id/reply')
  async reply(
    @Req() req: Request,
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('review_id') reviewId: string,
    @Body() dto: ProReplyDto,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    const result = await this.reviewsService.addProReply(user.user_id, reviewId, dto);
    await this.auditLogs.logFromRequest(req, {
      category: 'REVIEW',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'review.reply_added',
      target_type: 'review',
      target_id: reviewId,
    });
    return result;
  }

  /** Public: list reviews for a pro */
  @Public()
  @RateLimitPolicy('MARKETPLACE_READ')
  @Get('pro/:pro_id')
  async listByPro(
    @Param('pro_id') proId: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.listByPro(proId, limit ? parseInt(limit, 10) : 20);
  }
}
