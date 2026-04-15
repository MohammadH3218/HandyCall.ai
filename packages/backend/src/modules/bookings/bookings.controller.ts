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
import { BookingsService } from './bookings.service';
import { CreateBookingDto, CancelBookingDto } from './dto/create-booking.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MarketplaceAuthContext, BookingStatus } from '@handycall/shared';

@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  /** Customer: create a booking */
  @Post()
  create(
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() dto: CreateBookingDto,
  ) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException();
    return this.bookingsService.createBooking(user.user_id, dto);
  }

  /** Customer or Pro: list own bookings */
  @Get()
  list(
    @CurrentUser() user: MarketplaceAuthContext,
    @Query('status') status?: BookingStatus,
  ) {
    if (user.user_type !== 'CUSTOMER' && user.user_type !== 'PRO') {
      throw new ForbiddenException();
    }
    return this.bookingsService.listBookings(user.user_id, user.user_type, status);
  }

  /** Customer or Pro: get single booking */
  @Get(':booking_id')
  getOne(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('booking_id') bookingId: string,
  ) {
    return this.bookingsService.getBooking(bookingId, user.user_id);
  }

  /** Pro: confirm a booking */
  @Patch(':booking_id/confirm')
  confirm(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('booking_id') bookingId: string,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.bookingsService.confirmBooking(bookingId, user.user_id);
  }

  /** Pro: mark booking as in-progress */
  @Patch(':booking_id/start')
  start(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('booking_id') bookingId: string,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.bookingsService.startBooking(bookingId, user.user_id);
  }

  /** Pro: mark booking as complete */
  @Patch(':booking_id/complete')
  complete(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('booking_id') bookingId: string,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.bookingsService.completeBooking(bookingId, user.user_id);
  }

  /** Customer or Pro: cancel a booking */
  @Patch(':booking_id/cancel')
  cancel(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('booking_id') bookingId: string,
    @Body() dto: CancelBookingDto,
  ) {
    if (user.user_type !== 'CUSTOMER' && user.user_type !== 'PRO') {
      throw new ForbiddenException();
    }
    return this.bookingsService.cancelBooking(bookingId, user.user_id, user.user_type, dto);
  }
}
