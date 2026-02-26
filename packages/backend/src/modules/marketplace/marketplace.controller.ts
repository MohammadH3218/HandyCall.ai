import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { CompanyId } from '../../common/decorators/company-id.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly service: MarketplaceService) {}

  @Get('search')
  @Public()
  search(
    @Query('q') query?: string,
    @Query('category') category?: string,
    @Query('zip') zipcode?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.searchProviders({ query, category, zipcode, limit: limit ? Number(limit) : undefined });
  }

  @Get('categories')
  @Public()
  getCategories() {
    return this.service.getCategories();
  }

  @Get('providers/:slug')
  @Public()
  getBySlug(@Param('slug') slug: string) {
    return this.service.getProviderBySlug(slug);
  }

  @Get('provider-by-id/:id')
  @Public()
  getById(@Param('id') id: string) {
    return this.service.getProviderById(id);
  }

  @Put('profile')
  updateProfile(
    @CompanyId() companyId: string,
    @Body() body: {
      public_profile_enabled?: boolean;
      public_slug?: string;
      public_description?: string;
      gallery_urls?: string[];
      service_area_zips?: string[];
    },
  ) {
    return this.service.updatePublicProfile(companyId, body);
  }

  @Get('profile')
  getMyProfile(@CompanyId() companyId: string) {
    return this.service.getProviderById(companyId);
  }
}
