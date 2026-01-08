import { Module } from '@nestjs/common';
import { TelephonyService } from './telephony.service';
import { TelephonyController } from './telephony.controller';
import { ConnectService } from '../../infrastructure/aws/connect.service';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [CompaniesModule],
  controllers: [TelephonyController],
  providers: [TelephonyService, ConnectService],
  exports: [TelephonyService],
})
export class TelephonyModule {}
