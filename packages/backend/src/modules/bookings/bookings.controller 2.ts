import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MarketplaceAuthContext } from '@handycall/shared';

@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  /** Customer: create a booking */
  @Post()
  async create(
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() dto: CreateBookingDto,
  ) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException('Only customers can create bookings');
    return this.bookingsService.create(user.user_id, dto);
  }

  /** Customer or Pro: list own bookings */
  @Get()
  async list(@CurrentUser() user: MarketplaceAuthContext) {
    return this.bookingsService.listForUser(user.user_id, user.user_type);
  }

  /** Customer or Pro: get booking by ID */
  @Get(':booking_id')
  async findOne(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('booking_id') bookingId: string,
  ) {
    return this.bookingsService.findOne(bookingId, user.user_id, user.user_type);
  }

  /** Pro: confirm booking */
  @Patch(':booking_id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('booking_id') bookingId: string,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.bookingsService.updateStatus(bookingId, 'CONFIRMED', user.user_id, 'PRO');
  }

  /** Pro: mark in progress */
  @Patch(':booking_id/start')
  @HttpCode(HttpStatus.OK)
  async start(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('booking_id') bookingId: string,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.bookingsService.updateStatus(bookingId, 'IN_PROGRESS', user.user_id, 'PRO');
  }

  /** Pro: mark complete */
  @Patch(':booking_id/complete')
  @HttpCode(HttpStatus.OK)
  async complete(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('booking_id') bookingId: string,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.bookingsService.updateStatus(bookingId, 'COMPLETED', user.user_id, 'PRO');
  }

  /** Customer or Pro: cancel booking */
  @Patch(':booking_id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('booking_id') bookingId: string,
    @Body('reason') reason?: string,
  ) {
    return this.bookingsService.updateStatus(
      bookingId,
      'CANCELLED',
      user.user_id,
      user.user_type,
      {
        cancellation_reason: reason,
        cancelled_by: user.user_type,
      },
    );
  }
}
