import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ProServicesController } from './pro-services.controller';
import { ProServicesService } from './pro-services.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [ProServicesController],
  providers: [ProServicesService],
  exports: [ProServicesService],
})
export class ProServicesModule {}
