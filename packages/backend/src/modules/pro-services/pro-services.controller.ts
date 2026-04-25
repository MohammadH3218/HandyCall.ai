import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ProServicesService } from './pro-services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimitPolicy } from '../../common/decorators/rate-limit.decorator';
import { MarketplaceAuthContext } from '@handycall/shared';

@Controller('pro-services')
export class ProServicesController {
  constructor(private proServicesService: ProServicesService) {}

  /** Public: browse active services by category */
  @Public()
  @RateLimitPolicy('MARKETPLACE_READ')
  @Get()
  async list(
    @Query('category') category?: string,
    @Query('limit') limit?: string,
  ) {
    return this.proServicesService.listByCategory(category, limit ? parseInt(limit, 10) : 20);
  }

  /** Pro: list own services */
  @RateLimitPolicy('USER_WRITE')
  @Get('mine')
  async listMine(@CurrentUser() user: MarketplaceAuthContext) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.proServicesService.listByPro(user.user_id);
  }

  /** Pro: create a new service */
  @RateLimitPolicy('USER_WRITE')
  @Post()
  async create(
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() dto: CreateServiceDto,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.proServicesService.create(user.user_id, dto);
  }

  /** Pro: update a service */
  @RateLimitPolicy('USER_WRITE')
  @Patch(':service_id')
  async update(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('service_id') serviceId: string,
    @Body() dto: Partial<CreateServiceDto>,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.proServicesService.update(user.user_id, serviceId, dto);
  }

  /** Pro: deactivate a service (never hard-delete) */
  @RateLimitPolicy('USER_WRITE')
  @Delete(':service_id')
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('service_id') serviceId: string,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.proServicesService.deactivate(user.user_id, serviceId);
  }
}
