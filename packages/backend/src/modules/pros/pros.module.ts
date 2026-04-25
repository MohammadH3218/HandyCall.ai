import { Module } from '@nestjs/common';
import { ProsController } from './pros.controller';
import { ProsService } from './pros.service';
import { SaudiVerificationService } from './saudi-verification.service';

@Module({
  controllers: [ProsController],
  providers: [ProsService, SaudiVerificationService],
  exports: [ProsService],
})
export class ProsModule {}
