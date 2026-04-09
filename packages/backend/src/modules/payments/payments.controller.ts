import { Body, Controller, Param, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { MarketplaceAuthContext } from '@handycall/shared';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  /** Customer: initiate payment for a booking */
  @Post('intent/:booking_id')
  @HttpCode(HttpStatus.OK)
  async createIntent(
    @CurrentUser() _user: MarketplaceAuthContext,
    @Param('booking_id') bookingId: string,
    @Body('method') method = 'MADA',
    @Body('amount_halalas') amountHalalas: number,
  ) {
    return this.paymentsService.createPaymentIntent(bookingId, amountHalalas, method);
  }

  /** Public: payment gateway webhook (HyperPay/Moyasar callback) */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(@Body() payload: any) {
    return this.paymentsService.handleWebhook(payload);
  }
}
