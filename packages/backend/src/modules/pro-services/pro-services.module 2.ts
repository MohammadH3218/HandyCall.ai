import { Module } from '@nestjs/common';
import { ProServicesController } from './pro-services.controller';
import { ProServicesService } from './pro-services.service';

@Module({
  controllers: [ProServicesController],
  providers: [ProServicesService],
  exports: [ProServicesService],
})
export class ProServicesModule {}
