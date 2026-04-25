import { Module } from '@nestjs/common';
import { AdminAuditLogsController } from './admin-audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { RateLimitService } from './rate-limit.service';

@Module({
  controllers: [AdminAuditLogsController],
  providers: [AuditLogsService, RateLimitService],
  exports: [AuditLogsService, RateLimitService],
})
export class AuditLogsModule {}
