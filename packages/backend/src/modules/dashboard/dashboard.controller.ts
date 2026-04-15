import { Controller, ForbiddenException, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MarketplaceAuthContext } from '@handycall/shared';

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get()
  getDashboard(@CurrentUser() user: MarketplaceAuthContext) {
    if (user.user_type === 'CUSTOMER') {
      return this.dashboardService.getCustomerDashboard(user.user_id);
    }
    if (user.user_type === 'PRO') {
      return this.dashboardService.getProDashboard(user.user_id);
    }
    throw new ForbiddenException();
  }
}
