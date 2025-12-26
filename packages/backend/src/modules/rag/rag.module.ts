import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [KnowledgeModule],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
