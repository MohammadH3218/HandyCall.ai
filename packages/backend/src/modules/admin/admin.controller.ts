import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsOptional, IsString } from 'class-validator';
import { MarketplaceAuthContext } from '@handycall/shared';

class RejectProDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

class UpdateConfigDto {
  @IsString()
  value: string;
}

// Simple admin guard: requires user_type === 'ADMIN'
// For MVP you can set user_type to 'ADMIN' directly in the JWT or use a separate admin secret.
function assertAdmin(user: MarketplaceAuthContext) {
  if ((user as any).user_type !== 'ADMIN') {
    throw new UnauthorizedException('Admin access required');
  }
}

@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  getStats(@CurrentUser() user: MarketplaceAuthContext) {
    assertAdmin(user);
    return this.adminService.getStats();
  }

  @Get('pros/pending')
  listPendingPros(@CurrentUser() user: MarketplaceAuthContext) {
    assertAdmin(user);
    return this.adminService.listPendingPros();
  }

  @Patch('pros/:pro_id/approve')
  approvePro(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('pro_id') proId: string,
  ) {
    assertAdmin(user);
    return this.adminService.approvePro(proId);
  }

  @Patch('pros/:pro_id/reject')
  rejectPro(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('pro_id') proId: string,
    @Body() dto: RejectProDto,
  ) {
    assertAdmin(user);
    return this.adminService.rejectPro(proId, dto.reason);
  }

  @Patch('pros/:pro_id/suspend')
  suspendPro(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('pro_id') proId: string,
  ) {
    assertAdmin(user);
    return this.adminService.suspendPro(proId);
  }

  @Get('platform-config')
  getConfig(@CurrentUser() user: MarketplaceAuthContext) {
    assertAdmin(user);
    return this.adminService.getPlatformConfig();
  }

  @Patch('platform-config/:key')
  updateConfig(
    @CurrentUser() user: MarketplaceAuthContext,
    @Param('key') key: string,
    @Body() dto: UpdateConfigDto,
  ) {
    assertAdmin(user);
    return this.adminService.updatePlatformConfig(key, dto.value, user.user_id);
  }
}
