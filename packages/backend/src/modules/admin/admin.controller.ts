import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { AdminService } from './admin.service';

// TODO: Add admin-only guard. For MVP, admin endpoints are secured by JWT.
// Consider a separate admin JWT secret or role-based guard post-MVP.
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('pros/pending')
  listPendingPros() {
    return this.adminService.listPendingPros();
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

  @Get('stats')
  getStats() {
    return this.adminService.platformStats();
  }
}
