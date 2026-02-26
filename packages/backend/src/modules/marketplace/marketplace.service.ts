import { Injectable } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';

@Injectable()
export class MarketplaceService {
  constructor(private readonly dynamodb: DynamoDBService) {}

  async searchProviders(params: {
    query?: string;
    category?: string;
    zipcode?: string;
    limit?: number;
  }) {
    const limit = params.limit || 20;

    // Get companies with public profiles enabled
    const result = await this.dynamodb.scan('companies', {
      filterExpression: '#public_profile_enabled = :enabled AND #status = :active',
      expressionAttributeNames: {
        '#public_profile_enabled': 'public_profile_enabled',
        '#status': 'status',
      },
      expressionAttributeValues: {
        ':enabled': true,
        ':active': 'ACTIVE',
      },
      limit: limit * 3, // Over-fetch for filtering
    });

    let providers = (result.items || []) as any[];

    // Filter by category
    if (params.category) {
      providers = providers.filter((p) => {
        const cats = p.categories || p.service_types || [];
        return cats.some((c: string) => c.toUpperCase().includes(params.category!.toUpperCase()));
      });
    }

    // Filter by zipcode (simple match - real implementation would use geo)
    if (params.zipcode) {
      providers = providers.filter((p) => {
        const area = (p.service_area_zips || []) as string[];
        return area.length === 0 || area.includes(params.zipcode!);
      });
    }

    // Text search on name/description
    if (params.query) {
      const q = params.query.toLowerCase();
      providers = providers.filter((p) => {
        const name = String(p.company_name || '').toLowerCase();
        const desc = String(p.public_description || p.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    // Sort by rating desc, then by total_reviews desc
    providers.sort((a, b) => {
      const ratingDiff = (b.overall_rating || 0) - (a.overall_rating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      return (b.total_reviews || 0) - (a.total_reviews || 0);
    });

    return providers.slice(0, limit).map((p) => this.sanitizeProvider(p));
  }

  async getProviderBySlug(slug: string) {
    const result = await this.dynamodb.scan('companies', {
      filterExpression: '#public_slug = :slug AND #public_profile_enabled = :enabled',
      expressionAttributeNames: {
        '#public_slug': 'public_slug',
        '#public_profile_enabled': 'public_profile_enabled',
      },
      expressionAttributeValues: { ':slug': slug, ':enabled': true },
      limit: 1,
    });

    if (!result.items?.length) return null;
    return this.sanitizeProvider(result.items[0] as any);
  }

  async getProviderById(companyId: string) {
    const item = await this.dynamodb.get('companies', { company_id: companyId });
    if (!item) return null;
    const p = item as any;
    if (!p.public_profile_enabled) return null;
    return this.sanitizeProvider(p);
  }

  async updatePublicProfile(companyId: string, updates: {
    public_profile_enabled?: boolean;
    public_slug?: string;
    public_description?: string;
    profile_photo_url?: string;
    gallery_urls?: string[];
    service_area_zips?: string[];
    verified?: boolean;
  }) {
    const validUpdates: Record<string, any> = { updated_at: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) validUpdates[key] = value;
    }
    await this.dynamodb.update('companies', { company_id: companyId }, validUpdates);
    return this.dynamodb.get('companies', { company_id: companyId });
  }

  private sanitizeProvider(p: any) {
    return {
      company_id: p.company_id,
      company_name: p.company_name,
      public_slug: p.public_slug,
      public_description: p.public_description || p.description,
      profile_photo_url: p.profile_photo_url,
      gallery_urls: p.gallery_urls || [],
      categories: p.categories || p.service_types || [],
      overall_rating: p.overall_rating || 0,
      total_reviews: p.total_reviews || 0,
      response_time_minutes: p.response_time_minutes,
      verified: p.verified || false,
      badges: p.badges || [],
      city: p.city,
      state: p.state,
      service_area_zips: p.service_area_zips || [],
    };
  }

  async getCategories() {
    return [
      { slug: 'plumbing', label: 'Plumbing', icon: '🔧' },
      { slug: 'hvac', label: 'HVAC', icon: '❄️' },
      { slug: 'electrical', label: 'Electrical', icon: '⚡' },
      { slug: 'pest-control', label: 'Pest Control', icon: '🐛' },
      { slug: 'cleaning', label: 'Cleaning', icon: '🧹' },
      { slug: 'landscaping', label: 'Landscaping', icon: '🌿' },
      { slug: 'roofing', label: 'Roofing', icon: '🏠' },
      { slug: 'painting', label: 'Painting', icon: '🎨' },
      { slug: 'appliance-repair', label: 'Appliance Repair', icon: '🔌' },
      { slug: 'general-handyman', label: 'Handyman', icon: '🔨' },
    ];
  }
}
