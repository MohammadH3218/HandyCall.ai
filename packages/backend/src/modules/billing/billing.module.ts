import { Module, forwardRef } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { UsageService } from './usage.service';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [forwardRef(() => CompaniesModule)],
  controllers: [BillingController],
  providers: [BillingService, StripeService, UsageService],
  exports: [BillingService, UsageService],
})
export class BillingModule {}
