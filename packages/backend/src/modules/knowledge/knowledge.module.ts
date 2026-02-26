import { Module } from '@nestjs/common';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { RagModule } from '../rag/rag.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [RagModule, CompaniesModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
