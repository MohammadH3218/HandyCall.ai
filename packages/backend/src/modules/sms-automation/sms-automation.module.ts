import { Module } from '@nestjs/common';
import { SmsAutomationService } from './sms-automation.service';
import { SmsAutomationController } from './sms-automation.controller';
import { CompaniesModule } from '../companies/companies.module';
import { ContactsModule } from '../contacts/contacts.module';
import { SmsModule } from '../../infrastructure/sms/sms.module';
import { BillingModule } from '../billing/billing.module';
import { PlanFeatureGuard } from '../../common/guards/plan-feature.guard';

@Module({
  imports: [CompaniesModule, ContactsModule, SmsModule, BillingModule],
  controllers: [SmsAutomationController],
  providers: [SmsAutomationService, PlanFeatureGuard],
  exports: [SmsAutomationService],
})
export class SmsAutomationModule {}
