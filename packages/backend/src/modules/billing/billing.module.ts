import { Module, forwardRef } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { UsageService } from './usage.service';
import { CompaniesModule } from '../companies/companies.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => CompaniesModule), NotificationsModule],
  controllers: [BillingController],
  providers: [BillingService, StripeService, UsageService],
  exports: [BillingService, UsageService],
})
export class BillingModule {}
