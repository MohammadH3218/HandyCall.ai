import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyId, UserRole as UserRoleDecorator } from '../../common/decorators/auth.decorator';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { AdminUpdateCompanyDto } from './dto/admin-update-company.dto';
import { Company, UserRole } from '@handycall/shared';
import { CompanyStats } from './companies.service';

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(
    private companiesService: CompaniesService,
    private usersService: UsersService
  ) {}

  @Get('me')
  async getMyCompany(@CompanyId() companyId: string): Promise<Company> {
    console.log('[CompaniesController] getMyCompany called with companyId:', companyId);

    // Handle case where user doesn't have a company yet (newly created user)
    if (companyId === 'no-company' || !companyId) {
      console.log('[CompaniesController] User has no company yet (temp account)');
      throw new NotFoundException('User has not completed company setup');
    }

    try {
      const company = await this.companiesService.findById(companyId);
      console.log('[CompaniesController] Company found:', company ? 'yes' : 'no');
      if (!company) {
        throw new NotFoundException('Company not found');
      }
      return company;
    } catch (error) {
      console.error('[CompaniesController] Error in getMyCompany:', error);
      throw error;
    }
  }

  @Put('me')
  async updateMyCompany(
    @CompanyId() companyId: string,
    @Body() dto: UpdateCompanyDto
  ): Promise<Company> {
    return this.companiesService.updateCompany(companyId, dto);
  }

  // ============================================================================
  // ADMIN ENDPOINTS - Require admin role
  // ============================================================================

  /**
   * List all companies (admin only)
   */
  @Get()
  async listCompanies(
    @UserRoleDecorator() role: UserRole,
    @Query('limit') limit?: string,
    @Query('search') search?: string
  ): Promise<Company[]> {
    if (role !== UserRole.ADMIN) {
      throw new NotFoundException('Not found');
    }

    if (search) {
      return this.companiesService.searchCompanies(search);
    }

    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.companiesService.listAll(limitNum);
  }

  /**
   * Get company by ID (admin only)
   */
  @Get(':id')
  async getCompanyById(
    @UserRoleDecorator() role: UserRole,
    @Param('id') id: string
  ): Promise<Company> {
    if (role !== UserRole.ADMIN) {
      throw new NotFoundException('Not found');
    }

    const company = await this.companiesService.findById(id);
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  /**
   * Get company statistics (admin only)
   */
  @Get(':id/stats')
  async getCompanyStats(
    @UserRoleDecorator() role: UserRole,
    @Param('id') id: string
  ): Promise<CompanyStats> {
    if (role !== UserRole.ADMIN) {
      throw new NotFoundException('Not found');
    }

    return this.companiesService.getCompanyStats(id);
  }

  /**
   * Create a new company (admin only)
   */
  @Post()
  async createCompany(
    @UserRoleDecorator() role: UserRole,
    @Body() dto: CreateCompanyDto
  ): Promise<Company> {
    if (role !== UserRole.ADMIN) {
      throw new NotFoundException('Not found');
    }

    const company = await this.companiesService.createCompany(
      dto.company_name,
      dto.service_type,
      dto.email,
      dto.phone_number,
      dto.timezone
    );

    // Create initial admin user if provided
    if (dto.initial_admin_email && dto.initial_admin_password) {
      const [firstName, ...lastNameParts] = (dto.initial_admin_name || 'Admin User').split(' ');
      const lastName = lastNameParts.join(' ') || 'User';

      await this.usersService.createUser(
        company.company_id,
        dto.initial_admin_email,
        dto.initial_admin_password,
        firstName,
        lastName,
        UserRole.OWNER
      );
    }

    return company;
  }

  /**
   * Update a company (admin only)
   */
  @Put(':id')
  async updateCompanyById(
    @UserRoleDecorator() role: UserRole,
    @Param('id') id: string,
    @Body() dto: AdminUpdateCompanyDto
  ): Promise<Company> {
    if (role !== UserRole.ADMIN) {
      throw new NotFoundException('Not found');
    }

    return this.companiesService.updateCompany(id, dto);
  }

  /**
   * Delete a company (admin only)
   * WARNING: This will delete all associated data
   */
  @Delete(':id')
  async deleteCompany(
    @UserRoleDecorator() role: UserRole,
    @Param('id') id: string
  ): Promise<{ message: string }> {
    if (role !== UserRole.ADMIN) {
      throw new NotFoundException('Not found');
    }

    await this.companiesService.deleteCompany(id);
    return { message: 'Company deleted successfully' };
  }

  /**
   * Get all users for a company (admin only)
   */
  @Get(':companyId/users')
  async getCompanyUsers(
    @UserRoleDecorator() role: UserRole,
    @Param('companyId') companyId: string
  ) {
    if (role !== UserRole.ADMIN) {
      throw new NotFoundException('Not found');
    }

    return this.usersService.listCompanyUsers(companyId);
  }
}
