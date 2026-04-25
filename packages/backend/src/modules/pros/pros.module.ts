import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ProsController } from './pros.controller';
import { ProsService } from './pros.service';
import { SaudiVerificationService } from './saudi-verification.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [ProsController],
  providers: [ProsService, SaudiVerificationService],
  exports: [ProsService],
})
export class ProsModule {}
