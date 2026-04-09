import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MarketplaceAuthContext } from '@handycall/shared';

@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: MarketplaceAuthContext) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException();
    return this.customersService.findById(user.user_id);
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() dto: UpdateCustomerDto,
  ) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException();
    return this.customersService.updateProfile(user.user_id, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  async requestDeletion(@CurrentUser() user: MarketplaceAuthContext) {
    if (user.user_type !== 'CUSTOMER') throw new ForbiddenException();
    return this.customersService.requestDeletion(user.user_id);
  }
}
