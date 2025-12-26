import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyId } from '../../common/decorators/auth.decorator';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company } from '@handycall/shared';

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  @Get('me')
  async getMyCompany(@CompanyId() companyId: string): Promise<Company> {
    const company = await this.companiesService.findById(companyId);
    if (!company) {
      throw new Error('Company not found');
    }
    return company;
  }

  @Put('me')
  async updateMyCompany(
    @CompanyId() companyId: string,
    @Body() dto: UpdateCompanyDto
  ): Promise<Company> {
    return this.companiesService.updateCompany(companyId, dto);
  }
}
