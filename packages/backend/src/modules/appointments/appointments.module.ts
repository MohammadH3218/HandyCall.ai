import { Module, forwardRef } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { CustomerAppointmentsController } from './customer-appointments.controller';
import { CustomerAccountController } from './customer-account.controller';
import { AppointmentsService } from './appointments.service';
import { CalendarIntegrationModule } from '../calendar-integration/calendar-integration.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { FollowUpSequencesModule } from '../follow-up-sequences/follow-up-sequences.module';
import { CompaniesModule } from '../companies/companies.module';
import { AuthModule } from '../auth/auth.module';
import { CustomerProfilesModule } from '../customer-profiles/customer-profiles.module';

@Module({
  imports: [
    forwardRef(() => CalendarIntegrationModule),
    WebhooksModule,
    FollowUpSequencesModule,
    CompaniesModule,
    AuthModule,
    CustomerProfilesModule,
  ],
  controllers: [AppointmentsController, CustomerAppointmentsController, CustomerAccountController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
