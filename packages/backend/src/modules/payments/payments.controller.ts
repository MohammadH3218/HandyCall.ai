import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { MarketplaceAuthContext } from '@handycall/shared';
import { RateLimitPolicy } from '../../common/decorators/rate-limit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  /** Customer: initiate payment for a booking */
  @RateLimitPolicy('USER_WRITE')
  @Post('intent/:booking_id')
  @HttpCode(HttpStatus.OK)
  async createIntent(
    @Req() req: Request,
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('booking_id') bookingId: string,
  ) {
    return this.paymentsService.createPaymentIntent(req as Request, user, bookingId);
  }

  /** Public: payment gateway webhook callback */
  @Public()
  @RateLimitPolicy('WEBHOOK')
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(@Req() req: Request) {
    return this.paymentsService.handleWebhook(req as Request);
  }
}
