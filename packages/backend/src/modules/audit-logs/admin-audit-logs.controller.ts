import { Controller, Get, Param, Query } from '@nestjs/common';
import { UserRole } from '@handycall/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RateLimitPolicy } from '../../common/decorators/rate-limit.decorator';
import { AuditLogsService } from './audit-logs.service';

@Roles(UserRole.ADMIN)
@Controller('admin/logs')
export class AdminAuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @RateLimitPolicy('ADMIN_READ')
  @Get('facets')
  getFacets() {
    return this.auditLogsService.getFacets();
  }

  @RateLimitPolicy('ADMIN_READ')
  @Get()
  listLogs(
    @Query('company_id') companyId?: string,
    @Query('actor_email') actorEmail?: string,
    @Query('actor_type') actorType?: string,
    @Query('actor_role') actorRole?: string,
    @Query('category') category?: string,
    @Query('severity') severity?: string,
    @Query('outcome') outcome?: string,
    @Query('action') action?: string,
    @Query('route') route?: string,
    @Query('target_type') targetType?: string,
    @Query('target_id') targetId?: string,
    @Query('request_id') requestId?: string,
    @Query('search') search?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.auditLogsService.listLogs({
      company_id: companyId,
      actor_email: actorEmail,
      actor_type: actorType as any,
      actor_role: actorRole as UserRole | undefined,
      category: category as any,
      severity: severity as any,
      outcome: outcome as any,
      action,
      route,
      target_type: targetType,
      target_id: targetId,
      request_id: requestId,
      search,
      start_date: startDate ? Number(startDate) : undefined,
      end_date: endDate ? Number(endDate) : undefined,
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
  }

  @RateLimitPolicy('ADMIN_READ')
  @Get(':event_id')
  getLog(@Param('event_id') eventId: string) {
    return this.auditLogsService.getLog(eventId);
  }
}
