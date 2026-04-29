import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ProBillingController } from './pro-billing.controller';
import { ProBillingService } from './pro-billing.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [PaymentsController, ProBillingController],
  providers: [PaymentsService, ProBillingService],
  exports: [PaymentsService, ProBillingService],
})
export class PaymentsModule {}
