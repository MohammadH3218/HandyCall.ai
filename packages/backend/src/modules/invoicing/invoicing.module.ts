import { Module } from '@nestjs/common';
import { InvoicingService } from './invoicing.service';
import { InvoicingController } from './invoicing.controller';
import { CompaniesModule } from '../companies/companies.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [CompaniesModule, BillingModule],
  controllers: [InvoicingController],
  providers: [InvoicingService],
  exports: [InvoicingService],
})
export class InvoicingModule {}
