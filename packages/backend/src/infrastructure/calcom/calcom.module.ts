import { Module } from '@nestjs/common';
import { CalcomService } from './calcom.service';

@Module({
  providers: [CalcomService],
  exports: [CalcomService],
})
export class CalcomModule {}

