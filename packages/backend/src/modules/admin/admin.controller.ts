import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  // ─── Stats ────────────────────────────────────────────────────────────────

  @Get('stats')
  getStats() {
    return this.adminService.platformStats();
  }

  // ─── Pros ─────────────────────────────────────────────────────────────────

  @Get('pros')
  listPros(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listPros({ status, limit: limit ? Number(limit) : undefined });
  }

  @Get('pros/pending')
  listPendingPros() {
    return this.adminService.listPendingPros();
  }

  @Get('pros/:pro_id')
  getPro(@Param('pro_id') proId: string) {
    return this.adminService.getProAdmin(proId);
  }

  @Patch('pros/:pro_id/approve')
  approvePro(@Param('pro_id') proId: string) {
    return this.adminService.approvePro(proId);
  }

  @Patch('pros/:pro_id/reject')
  rejectPro(
    @Param('pro_id') proId: string,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.rejectPro(proId, reason);
  }

  @Patch('pros/:pro_id/suspend')
  suspendPro(@Param('pro_id') proId: string) {
    return this.adminService.suspendPro(proId);
  }

  @Patch('pros/:pro_id/reactivate')
  reactivatePro(@Param('pro_id') proId: string) {
    return this.adminService.reactivatePro(proId);
  }

  @Delete('pros/:pro_id')
  deletePro(@Param('pro_id') proId: string) {
    return this.adminService.deletePro(proId);
  }

  // ─── Customers ────────────────────────────────────────────────────────────

  @Get('customers')
  listCustomers(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listCustomers({ status, limit: limit ? Number(limit) : undefined });
  }

  @Get('customers/:customer_id')
  getCustomer(@Param('customer_id') customerId: string) {
    return this.adminService.getCustomerAdmin(customerId);
  }

  @Patch('customers/:customer_id/suspend')
  suspendCustomer(@Param('customer_id') customerId: string) {
    return this.adminService.suspendCustomer(customerId);
  }

  @Patch('customers/:customer_id/reactivate')
  reactivateCustomer(@Param('customer_id') customerId: string) {
    return this.adminService.reactivateCustomer(customerId);
  }

  @Delete('customers/:customer_id')
  deleteCustomer(@Param('customer_id') customerId: string) {
    return this.adminService.deleteCustomer(customerId);
  }

  // ─── Bookings ─────────────────────────────────────────────────────────────

  @Get('bookings')
  listBookings(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listBookings({ status, limit: limit ? Number(limit) : undefined });
  }

  @Get('bookings/:booking_id')
  getBooking(@Param('booking_id') bookingId: string) {
    return this.adminService.getBookingAdmin(bookingId);
  }

  @Patch('bookings/:booking_id/cancel')
  cancelBooking(
    @Param('booking_id') bookingId: string,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.cancelBooking(bookingId, reason);
  }

  // ─── Reviews ──────────────────────────────────────────────────────────────

  @Get('reviews')
  listReviews(
    @Query('visible') visible?: string,
    @Query('limit') limit?: string,
  ) {
    const visibleFilter = visible === 'true' ? true : visible === 'false' ? false : undefined;
    return this.adminService.listReviews({ visible: visibleFilter, limit: limit ? Number(limit) : undefined });
  }

  @Patch('reviews/:review_id/visibility')
  setReviewVisibility(
    @Param('review_id') reviewId: string,
    @Body('is_visible') isVisible: boolean,
  ) {
    return this.adminService.setReviewVisibility(reviewId, isVisible);
  }

  @Delete('reviews/:review_id')
  deleteReview(@Param('review_id') reviewId: string) {
    return this.adminService.deleteReview(reviewId);
  }

  // ─── Platform Config ──────────────────────────────────────────────────────

  @Get('platform-config')
  getPlatformConfig() {
    return this.adminService.getPlatformConfig();
  }

  @Patch('platform-config/:key')
  updatePlatformConfig(
    @Param('key') key: string,
    @Body('value') value: any,
  ) {
    return this.adminService.updatePlatformConfig(key, value);
  }
}
