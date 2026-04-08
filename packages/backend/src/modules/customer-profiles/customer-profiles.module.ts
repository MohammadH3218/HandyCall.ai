import { Module } from '@nestjs/common';
import { CustomerProfilesController } from './customer-profiles.controller';
import { CustomerProfilesService } from './customer-profiles.service';

@Module({
  imports: [],
  providers: [CustomerProfilesService],
  controllers: [CustomerProfilesController],
  exports: [CustomerProfilesService],
})
export class CustomerProfilesModule {}
