import { Controller, Get, Query } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { Public } from '../../common/decorators/public.decorator';
import { ServiceCategory } from '@handycall/shared';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private marketplaceService: MarketplaceService) {}

  /** Public: AI-powered natural-language pro search */
  @Public()
  @Get('search')
  async search(
    @Query('q') q?: string,
    @Query('district') district?: string,
  ) {
    if (!q?.trim()) return { results: [], category: null, keywords: [] };
    return this.marketplaceService.aiSearch({ q: q.trim(), district });
  }

  /** Public: browse marketplace services */
  @Public()
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
  @Get('filters')
  getFilters() {
    return this.marketplaceService.getSupportedFilters();
  }
}
