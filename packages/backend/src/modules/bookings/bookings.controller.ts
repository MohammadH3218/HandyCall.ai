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
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateLimitPolicy } from '../../common/decorators/rate-limit.decorator';
import { MarketplaceAuthContext } from '@handycall/shared';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Controller('bookings')
export class BookingsController {
  constructor(
    private bookingsService: BookingsService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  /** Customer: create a booking */
  @RateLimitPolicy('USER_WRITE')
  @Post()
  async create(
    @Req() req: Request,
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() dto: CreateBookingDto,
  ) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException('Only customers can create bookings');
    const result = await this.bookingsService.create(user.user_id, dto);
    await this.auditLogs.logFromRequest(req, {
      category: 'BOOKING',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'booking.created',
      target_type: 'booking',
      target_id: result.booking_id,
      metadata: { pro_id: dto.pro_id, service_id: dto.service_id },
    });
    return result;
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
  @RateLimitPolicy('USER_WRITE')
  @Patch(':booking_id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(
    @Req() req: Request,
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('booking_id') bookingId: string,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    const result = await this.bookingsService.updateStatus(bookingId, 'CONFIRMED', user.user_id, 'PRO');
    await this.auditLogs.logFromRequest(req, {
      category: 'BOOKING',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'booking.confirmed',
      target_type: 'booking',
      target_id: bookingId,
    });
    return result;
  }

  /** Pro: mark in progress */
  @RateLimitPolicy('USER_WRITE')
  @Patch(':booking_id/start')
  @HttpCode(HttpStatus.OK)
  async start(
    @Req() req: Request,
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('booking_id') bookingId: string,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    const result = await this.bookingsService.updateStatus(bookingId, 'IN_PROGRESS', user.user_id, 'PRO');
    await this.auditLogs.logFromRequest(req, {
      category: 'BOOKING',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'booking.started',
      target_type: 'booking',
      target_id: bookingId,
    });
    return result;
  }

  /** Pro: mark complete */
  @RateLimitPolicy('USER_WRITE')
  @Patch(':booking_id/complete')
  @HttpCode(HttpStatus.OK)
  async complete(
    @Req() req: Request,
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('booking_id') bookingId: string,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    const result = await this.bookingsService.updateStatus(bookingId, 'COMPLETED', user.user_id, 'PRO');
    await this.auditLogs.logFromRequest(req, {
      category: 'BOOKING',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'booking.completed',
      target_type: 'booking',
      target_id: bookingId,
    });
    return result;
  }

  /** Customer or Pro: cancel booking */
  @RateLimitPolicy('USER_WRITE')
  @Patch(':booking_id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Req() req: Request,
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('booking_id') bookingId: string,
    @Body('reason') reason?: string,
  ) {
    const result = await this.bookingsService.updateStatus(
      bookingId,
      'CANCELLED',
      user.user_id,
      user.user_type,
      {
        cancellation_reason: reason,
        cancelled_by: user.user_type,
      },
    );
    await this.auditLogs.logFromRequest(req, {
      category: 'BOOKING',
      severity: 'WARN',
      outcome: 'SUCCESS',
      action: 'booking.cancelled',
      target_type: 'booking',
      target_id: bookingId,
      metadata: { cancelled_by: user.user_type, reason },
    });
    return result;
  }
}
