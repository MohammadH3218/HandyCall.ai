import { Module } from '@nestjs/common';
import { FlaggedQuestionsController } from './flagged-questions.controller';
import { FlaggedQuestionsService } from './flagged-questions.service';

@Module({
  controllers: [FlaggedQuestionsController],
  providers: [FlaggedQuestionsService],
})
export class FlaggedQuestionsModule {}
