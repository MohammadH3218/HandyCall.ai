import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MarketplaceAuthContext } from '@handycall/shared';

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get()
  getDashboard(@CurrentUser() user: MarketplaceAuthContext) {
    return this.dashboardService.getDashboard(user.user_id, user.user_type);
  }
}
