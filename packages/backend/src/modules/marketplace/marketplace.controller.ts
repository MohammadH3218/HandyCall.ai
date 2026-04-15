import { Controller, Get, Query } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private marketplaceService: MarketplaceService) {}

  /** Public: featured pros for the home page */
  @Public()
  @Get('featured-pros')
  getFeaturedPros(@Query('limit') limit?: string) {
    return this.marketplaceService.getFeaturedPros(limit ? parseInt(limit, 10) : undefined);
  }

  /** Public: browse services by category / district */
  @Public()
  @Get('services')
  browseServices(
    @Query('category') category?: string,
    @Query('district') district?: string,
    @Query('limit') limit?: string,
  ) {
    return this.marketplaceService.browseServices({
      category,
      district,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /** Public: list Riyadh districts for dropdowns */
  @Public()
  @Get('districts')
  getDistricts() {
    return this.marketplaceService.getDistricts();
  }

  /** Public: list service categories with bilingual labels */
  @Public()
  @Get('categories')
  getCategories() {
    return this.marketplaceService.getCategories();
  }
}
