import { Controller, Get, Query } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimitPolicy } from '../../common/decorators/rate-limit.decorator';
import { ServiceCategory } from '@handycall/shared';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private marketplaceService: MarketplaceService) {}

  /** Public: browse marketplace services */
  @Public()
  @RateLimitPolicy('MARKETPLACE_SEARCH')
  @Get('services')
  browseServices(
    @Query('category') category?: ServiceCategory,
    @Query('district') district?: string,
    @Query('limit') limit?: string,
  ) {
    return this.marketplaceService.browseServices({
      category,
      district,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /** Public: get supported categories and districts for browse UI */
  @Public()
  @RateLimitPolicy('MARKETPLACE_READ')
  @Get('filters')
  getFilters() {
    return this.marketplaceService.getSupportedFilters();
  }
}
