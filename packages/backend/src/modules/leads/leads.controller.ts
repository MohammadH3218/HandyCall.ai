import { Controller, Get } from '@nestjs/common';
import { LeadScoringService } from './lead-scoring.service';
import { CompanyId } from '../../common/decorators/auth.decorator';

@Controller('leads')
export class LeadsController {
  constructor(private readonly scoring: LeadScoringService) {}

  @Get()
  listLeads(@CompanyId() companyId: string) {
    return this.scoring.listLeads(companyId);
  }
}
