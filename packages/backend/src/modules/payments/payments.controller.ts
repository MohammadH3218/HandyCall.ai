import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { IsString } from 'class-validator';
import { MarketplaceAuthContext } from '@handycall/shared';

class CreatePaymentIntentDto {
  @IsString()
  booking_id: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  /** Customer: create a payment intent for a booking */
  @Post('intent')
  createIntent(
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException();
    return this.paymentsService.createPaymentIntent(dto.booking_id, user.user_id);
  }

  /** Public webhook — raw body preserved by main.ts for signature verification */
  @Public()
  @Post('webhook')
  handleWebhook(
    @Req() req: Request,
    @Headers('x-hyperpay-signature') hyperpaySignature?: string,
    @Headers('x-moyasar-signature') moyasarSignature?: string,
  ) {
    const signature = hyperpaySignature ?? moyasarSignature ?? '';
    return this.paymentsService.handleWebhook(req.body as Buffer, signature);
  }
}
