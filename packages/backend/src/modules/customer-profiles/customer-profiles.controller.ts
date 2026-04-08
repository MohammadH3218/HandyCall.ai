import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Auth } from '../../common/decorators/auth.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CustomerJwtAuthGuard } from '../../common/guards/customer-jwt-auth.guard';
import { AuthContext } from '@handycall/shared';
import { CustomerProfilesService } from './customer-profiles.service';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';

@Public()
@Controller('customer/profile')
@UseGuards(CustomerJwtAuthGuard)
export class CustomerProfilesController {
  constructor(private readonly customerProfiles: CustomerProfilesService) {}

  @Get()
  async getMyProfile(@Auth() auth: AuthContext) {
    const profile = await this.customerProfiles.getByUserId(auth.user_id);

    return {
      profile,
      is_complete: this.customerProfiles.isComplete(profile),
    };
  }

  @Put()
  async updateMyProfile(
    @Auth() auth: AuthContext,
    @Body() body: UpdateCustomerProfileDto,
  ) {
    const profile = await this.customerProfiles.update(auth.user_id, body);

    return {
      profile,
      is_complete: this.customerProfiles.isComplete(profile),
    };
  }
}
