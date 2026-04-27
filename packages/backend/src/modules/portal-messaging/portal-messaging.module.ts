import { Module } from '@nestjs/common';
import { PortalMessagingController } from './portal-messaging.controller';
import { PortalMessagingService } from './portal-messaging.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [PortalMessagingController],
  providers: [PortalMessagingService],
  exports: [PortalMessagingService],
})
export class PortalMessagingModule {}
