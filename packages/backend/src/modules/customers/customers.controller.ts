import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CustomersService } from './customers.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateLimitPolicy } from '../../common/decorators/rate-limit.decorator';
import { MarketplaceAuthContext } from '@handycall/shared';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Controller('customers')
export class CustomersController {
  constructor(
    private customersService: CustomersService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  @RateLimitPolicy('USER_WRITE')
  @Get('me')
  async getMe(@CurrentUser() user: MarketplaceAuthContext) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException();
    return this.customersService.findById(user.user_id);
  }

  @RateLimitPolicy('USER_WRITE')
  @Patch('me')
  async updateMe(
    @Req() req: Request,
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() dto: UpdateCustomerDto,
  ) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException();
    const result = await this.customersService.updateProfile(user.user_id, dto);
    await this.auditLogs.logFromRequest(req, {
      category: 'ACCOUNT',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'customer.profile_updated',
      target_type: 'customer',
      target_id: user.user_id,
    });
    return result;
  }

  @RateLimitPolicy('USER_WRITE')
  @Delete('me')
  @HttpCode(HttpStatus.OK)
  async deleteMe(@Req() req: Request, @CurrentUser() user: MarketplaceAuthContext) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException();
    const result = await this.customersService.deleteAccount(user.user_id);
    await this.auditLogs.logFromRequest(req, {
      category: 'ACCOUNT',
      severity: 'WARN',
      outcome: 'SUCCESS',
      action: 'customer.deleted',
      target_type: 'customer',
      target_id: user.user_id,
    });
    return result;
  }
}
