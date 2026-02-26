import { Module, forwardRef } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { UsageService } from './usage.service';
import { StripeConnectService } from './stripe-connect.service';
import { CustomerPaymentsService } from './customer-payments.service';
import { UsageGateService } from './usage-gate.service';
import { CompaniesModule } from '../companies/companies.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => CompaniesModule), NotificationsModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    StripeService,
    UsageService,
    StripeConnectService,
    CustomerPaymentsService,
    UsageGateService,
  ],
  exports: [
    BillingService,
    UsageService,
    StripeConnectService,
    CustomerPaymentsService,
    UsageGateService,
  ],
})
export class BillingModule {}
