import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { ToolsAuthGuard } from '../../common/guards/tools-auth.guard';
import { CreateLeadDto } from './dto/create-lead.dto';
import { KnowledgeSearchDto } from './dto/knowledge-search.dto';
import { ResolveTenantDto } from './dto/resolve-tenant.dto';
import { SaveCallDto } from './dto/save-call.dto';
import { RealtimeToolsService } from './realtime-tools.service';

@Controller()
@Public()
@UseGuards(ToolsAuthGuard)
export class RealtimeToolsController {
  constructor(private readonly tools: RealtimeToolsService) {}

  @Post('tenant/resolve')
  resolveTenant(@Body() dto: ResolveTenantDto) {
    const toNumber = dto.to_number ?? dto.dialedNumber;
    if (!toNumber) throw new BadRequestException('to_number is required');
    return this.tools.resolveTenant(toNumber);
  }

  @Post('tools/create_lead')
  createLead(@Body() dto: CreateLeadDto) {
    return this.tools.createLead(dto);
  }

  @Post('tools/save_call')
  saveCall(@Body() dto: SaveCallDto) {
    return this.tools.saveCall(dto);
  }

  @Post('tools/knowledge_search')
  knowledgeSearch(@Body() dto: KnowledgeSearchDto) {
    return this.tools.knowledgeSearch(dto);
  }
}
