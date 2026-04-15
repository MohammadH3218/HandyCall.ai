import { Global, Module } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';

@Global()
@Module({
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
