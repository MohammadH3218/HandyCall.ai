import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PublicBookingService } from './public-booking.service';
import {
  PublicBookingCancelDto,
  PublicBookingAvailabilityDto,
  PublicBookingRequestDto,
  PublicBookingPaymentDto,
  PublicBookingRescheduleDto,
  PublicBookingUpdateDto,
} from './dto/public-booking.dto';

@Controller('public/booking')
@Public()
export class PublicBookingController {
  constructor(private readonly bookings: PublicBookingService) {}

  @Get(':token')
  getBookingInfo(@Param('token') token: string) {
    return this.bookings.getBookingInfo(token);
  }

  @Post(':token')
  submitBooking(@Param('token') token: string, @Body() dto: PublicBookingRequestDto) {
    return this.bookings.submitBooking(token, dto);
  }

  @Get(':token/payment-info')
  getPaymentInfo(@Param('token') token: string) {
    return this.bookings.getBookingPaymentInfo(token);
  }

  @Post(':token/pay')
  createPaymentIntent(@Param('token') token: string, @Body() dto: PublicBookingPaymentDto) {
    return this.bookings.createBookingPayment(token, dto);
  }

  @Post(':token/update')
  updateBooking(@Param('token') token: string, @Body() dto: PublicBookingUpdateDto) {
    return this.bookings.updateBooking(token, dto);
  }

  @Post(':token/reschedule')
  rescheduleBooking(@Param('token') token: string, @Body() dto: PublicBookingRescheduleDto) {
    return this.bookings.rescheduleBooking(token, dto);
  }

  @Post(':token/availability')
  getAvailability(@Param('token') token: string, @Body() dto: PublicBookingAvailabilityDto) {
    return this.bookings.getBookingAvailability(token, dto);
  }

  @Post(':token/cancel')
  cancelBooking(@Param('token') token: string, @Body() dto: PublicBookingCancelDto) {
    return this.bookings.cancelBooking(token, dto);
  }
}
