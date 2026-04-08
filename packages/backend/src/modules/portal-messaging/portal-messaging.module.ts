import { Module } from '@nestjs/common';
import { CompaniesModule } from '../companies/companies.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PortalMessagingService } from './portal-messaging.service';
import { PortalMessagingController } from './portal-messaging.controller';

@Module({
  imports: [CompaniesModule, NotificationsModule],
  providers: [PortalMessagingService],
  controllers: [PortalMessagingController],
  exports: [PortalMessagingService],
})
export class PortalMessagingModule {}
