import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PublicBookingService } from './public-booking.service';
import { PublicBookingRequestDto } from './dto/public-booking.dto';

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
}
