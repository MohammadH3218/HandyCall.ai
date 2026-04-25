import { Module } from '@nestjs/common';
import { PortalMessagingController } from './portal-messaging.controller';
import { PortalMessagingService } from './portal-messaging.service';

@Module({
  controllers: [PortalMessagingController],
  providers: [PortalMessagingService],
  exports: [PortalMessagingService],
})
export class PortalMessagingModule {}
