import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ProServicesService } from './pro-services.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/create-service.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { MarketplaceAuthContext } from '@handycall/shared';

@Controller('pro-services')
export class ProServicesController {
  constructor(private proServicesService: ProServicesService) {}

  /** Public: browse active services by category/district */
  @Public()
  @Get()
  browse(
    @Query('category') category?: string,
    @Query('district') district?: string,
    @Query('limit') limit?: string,
  ) {
    return this.proServicesService.browse({
      category,
      district,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /** Pro: list own services */
  @Get('mine')
  listMine(@CurrentUser() user: MarketplaceAuthContext) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.proServicesService.listByPro(user.user_id);
  }

  /** Pro: create a service */
  @Post()
  create(
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() dto: CreateServiceDto,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.proServicesService.createService(user.user_id, dto);
  }

  /** Pro: update a service */
  @Patch(':service_id')
  update(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('service_id') serviceId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.proServicesService.updateService(user.user_id, serviceId, dto);
  }

  /** Pro: deactivate a service (soft delete) */
  @Delete(':service_id')
  deactivate(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('service_id') serviceId: string,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.proServicesService.deactivateService(user.user_id, serviceId);
  }
}
