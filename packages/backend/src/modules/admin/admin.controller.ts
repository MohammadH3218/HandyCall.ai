import { Body, Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@handycall/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RateLimitPolicy } from '../../common/decorators/rate-limit.decorator';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AdminService } from './admin.service';

@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  @RateLimitPolicy('ADMIN_READ')
  @Get('pros/pending')
  listPendingPros() {
    return this.adminService.listPendingPros();
  }

  @RateLimitPolicy('ADMIN_MUTATION')
  @Patch('pros/:pro_id/approve')
  async approvePro(@Req() req: Request, @Param('pro_id') proId: string) {
    const result = await this.adminService.approvePro(proId);
    await this.auditLogs.logFromRequest(req, {
      category: 'ADMIN',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'admin.pro_approved',
      target_type: 'pro',
      target_id: proId,
    });
    return result;
  }

  @RateLimitPolicy('ADMIN_MUTATION')
  @Patch('pros/:pro_id/reject')
  async rejectPro(
    @Req() req: Request,
    @Param('pro_id') proId: string,
    @Body('reason') reason?: string,
  ) {
    const result = await this.adminService.rejectPro(proId, reason);
    await this.auditLogs.logFromRequest(req, {
      category: 'ADMIN',
      severity: 'WARN',
      outcome: 'SUCCESS',
      action: 'admin.pro_rejected',
      target_type: 'pro',
      target_id: proId,
      metadata: { reason },
    });
    return result;
  }

  @RateLimitPolicy('ADMIN_READ')
  @Get('platform-config')
  getPlatformConfig() {
    return this.adminService.getPlatformConfig();
  }

  @RateLimitPolicy('ADMIN_MUTATION')
  @Patch('platform-config/:key')
  async updatePlatformConfig(
    @Req() req: Request,
    @Param('key') key: string,
    @Body('value') value: any,
  ) {
    const result = await this.adminService.updatePlatformConfig(key, value);
    await this.auditLogs.logFromRequest(req, {
      category: 'ADMIN',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'admin.platform_config_updated',
      target_type: 'platform_config',
      target_id: key,
      metadata: { value_type: typeof value },
    });
    return result;
  }

  @RateLimitPolicy('ADMIN_READ')
  @Get('stats')
  getStats() {
    return this.adminService.platformStats();
  }
}
