import { Module, forwardRef } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { CalendarIntegrationModule } from '../calendar-integration/calendar-integration.module';

@Module({
  imports: [forwardRef(() => CalendarIntegrationModule)],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
