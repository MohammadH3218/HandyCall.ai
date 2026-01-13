import { Module } from '@nestjs/common';
import { CompanyNumbersModule } from '../company-numbers/company-numbers.module';
import { AgentConfigModule } from '../agent-config/agent-config.module';
import { CompaniesModule } from '../companies/companies.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { RealtimeToolsController } from './realtime-tools.controller';
import { RealtimeToolsService } from './realtime-tools.service';
import { ToolsAuthGuard } from '../../common/guards/tools-auth.guard';

@Module({
  imports: [CompaniesModule, AgentConfigModule, CompanyNumbersModule, KnowledgeModule],
  controllers: [RealtimeToolsController],
  providers: [RealtimeToolsService, ToolsAuthGuard],
})
export class RealtimeToolsModule {}
