import { Module } from '@nestjs/common';
import { FollowUpSequencesService } from './follow-up-sequences.service';
import { FollowUpSequencesController } from './follow-up-sequences.controller';
import { CompaniesModule } from '../companies/companies.module';
import { TelephonyModule } from '../telephony/telephony.module';

@Module({
  imports: [CompaniesModule, TelephonyModule],
  controllers: [FollowUpSequencesController],
  providers: [FollowUpSequencesService],
  exports: [FollowUpSequencesService],
})
export class FollowUpSequencesModule {}

