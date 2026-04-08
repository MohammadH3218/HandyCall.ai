import { Module } from '@nestjs/common';
import { QuoteRequestsService } from './quote-requests.service';
import { QuoteRequestsController } from './quote-requests.controller';
import { CustomerQuoteRequestsController } from './customer-quote-requests.controller';
import { CustomerProfilesModule } from '../customer-profiles/customer-profiles.module';
import { AuthModule } from '../auth/auth.module';
import { ContactsModule } from '../contacts/contacts.module';

@Module({
  imports: [AuthModule, CustomerProfilesModule, ContactsModule],
  providers: [QuoteRequestsService],
  controllers: [QuoteRequestsController, CustomerQuoteRequestsController],
  exports: [QuoteRequestsService],
})
export class QuoteRequestsModule {}
