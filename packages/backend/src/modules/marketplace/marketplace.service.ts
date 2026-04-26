import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { S3Service } from '../../infrastructure/storage/s3.service';
import { ServiceCategory, RIYADH_DISTRICTS } from '@handycall/shared';

const SERVICE_CATEGORIES: ServiceCategory[] = [
  'AC_HVAC', 'PLUMBING', 'ELECTRICAL', 'PAINTING', 'CLEANING',
  'PEST_CONTROL', 'CARPENTRY', 'MOVING', 'APPLIANCE_REPAIR',
  'SATELLITE_DISH', 'LANDSCAPING', 'GENERAL_HANDYMAN',
];

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private db: DynamoDBService,
    private config: ConfigService,
    private storageService: S3Service,
  ) {}

  /** Browse active services by category and/or district */
  async browseServices(params: {
    category?: ServiceCategory;
    district?: string;
    limit?: number;
  }) {
    let services: any[] = [];

    if (params.category) {
      const { items } = await this.db.query(
        'services',
        '#cat = :cat AND begins_with(is_active_created, :active)',
        { '#cat': 'category' },
        { ':cat': params.category, ':active': '1#' },
        { indexName: 'category-active-index', limit: params.limit ?? 20 },
      );
      services = items;
    } else {
      const { items } = await this.db.scan('services', {
        filterExpression: 'is_active = :true',
        expressionAttributeValues: { ':true': true },
        limit: params.limit ?? 20,
      });
      services = items;
    }

    return services;
  }

  /** AI-powered pro search: natural language query → ranked pro list */
  async aiSearch(params: { q: string; district?: string }): Promise<any[]> {
    // 1. Classify the query via OpenRouter
    const { category, keywords } = await this.classifyQuery(params.q);
    this.logger.log(`AI search: q="${params.q}" → category=${category}, keywords=${keywords.join(', ')}`);

    // 2. Fetch all ACTIVE pros who have completed their profile
    const { items: pros } = await this.db.scan('pros', {
      filterExpression: '#status = :active AND marketplace_profile_completed = :done',
      expressionAttributeNames: { '#status': 'status' },
      expressionAttributeValues: { ':active': 'ACTIVE', ':done': true },
    });

    if (pros.length === 0) return [];

    // 3. Score each pro
    const normalizedKeywords = keywords.map((k: string) => k.toLowerCase());

    const scored = await Promise.all(pros.map(async (pro: any) => {
      // Strip sensitive fields
      const {
        password_hash, iban, national_id, iqama_number,
        id_document_s3_key, id_number, ...safe
      } = pro;

      const mp = (pro.marketplace_profile as Record<string, any>) ?? {};
      const servicesOffered: string[] = Array.isArray(pro.services_offered)
        ? pro.services_offered
        : Array.isArray(mp.services_offered)
          ? mp.services_offered
          : [];
      const proCategory: string = pro.service_category ?? mp.service_category ?? '';
      const proDistricts: string[] =
        Array.isArray(pro.service_area_zipcodes) ? pro.service_area_zipcodes
        : Array.isArray(pro.service_districts) ? pro.service_districts
        : [];

      // Score: 2 = specific service match, 1 = category match, 0 = no match
      const normalizedServices = servicesOffered.map((s) => s.toLowerCase());
      const specificMatch = normalizedKeywords.some((kw) =>
        normalizedServices.some((s) => s.includes(kw)),
      );
      const categoryMatch =
        proCategory.toUpperCase() === category.toUpperCase();

      const score = specificMatch ? 2 : categoryMatch ? 1 : 0;

      // District match bonus for tiebreaking
      const districtMatch =
        params.district &&
        proDistricts.some(
          (d) => d.toLowerCase() === (params.district ?? '').toLowerCase(),
        )
          ? 1
          : 0;

      // Highlight which services matched
      const matchedServices = specificMatch
        ? servicesOffered.filter((s) =>
            normalizedKeywords.some((kw) => s.toLowerCase().includes(kw)),
          )
        : [];

      const decorated = await this.decorateMarketplaceMedia({
        ...safe,
        services_offered: servicesOffered,
        service_category: proCategory,
      });

      return {
        ...decorated,
        _score: score,
        _districtMatch: districtMatch,
        _matchedServices: matchedServices,
        _matchType: specificMatch ? 'specific' : categoryMatch ? 'category' : 'none',
      };
    }));

    // 4. Filter to relevant results; if a district was specified, only include pros who serve it
    return scored
      .filter((p) => p._score > 0 && (!params.district || p._districtMatch > 0))
      .sort((a, b) => b._score - a._score || b._districtMatch - a._districtMatch)
      .map(({ _score, _districtMatch, ...pro }) => pro);
  }

  /** Call OpenRouter to classify the query into a category + keywords */
  private async classifyQuery(
    query: string,
  ): Promise<{ category: string; keywords: string[] }> {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY') ?? '';
    if (!apiKey) {
      this.logger.warn('OPENROUTER_API_KEY not set — falling back to keyword search');
      return { category: 'GENERAL_HANDYMAN', keywords: [query] };
    }

    const prompt = `You are a classification assistant for a home services marketplace in Saudi Arabia (Riyadh).

Customer query: "${query}"

Available service categories: ${SERVICE_CATEGORIES.join(', ')}

Task:
1. Pick the single best matching category from the list above.
2. Extract 3–6 specific keywords or phrases the customer's problem maps to (what a service pro might list in their services).
3. Include both English and Arabic variants of key terms if applicable.

Reply with ONLY valid JSON — no explanation, no markdown:
{"category": "CATEGORY_NAME", "keywords": ["keyword1", "keyword2", "keyword3"]}`;

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://handycall.org',
          'X-Title': 'HandyCall Search',
        },
        body: JSON.stringify({
          model: 'google/gemma-4-31b-it:free',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          max_tokens: 200,
          temperature: 0.1,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        this.logger.warn(`OpenRouter error ${res.status}: ${errText}`);
        return { category: 'GENERAL_HANDYMAN', keywords: [query] };
      }

      const data = await res.json() as any;
      const content: string = data?.choices?.[0]?.message?.content ?? '{}';

      // Strip markdown code fences if model ignores the instruction
      const cleaned = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const category = (parsed.category as string ?? 'GENERAL_HANDYMAN').toUpperCase();
      const keywords = Array.isArray(parsed.keywords) ? parsed.keywords as string[] : [query];

      // Validate category is known
      const validCategory = SERVICE_CATEGORIES.includes(category as ServiceCategory)
        ? category
        : 'GENERAL_HANDYMAN';

      return { category: validCategory, keywords };
    } catch (e: any) {
      this.logger.warn(`classifyQuery failed: ${e?.message}`);
      return { category: 'GENERAL_HANDYMAN', keywords: [query] };
    }
  }

  /** Get all supported categories and districts for the browse UI */
  getSupportedFilters() {
    return {
      categories: SERVICE_CATEGORIES,
      districts: RIYADH_DISTRICTS,
      city: 'Riyadh',
    };
  }

  private async decorateMarketplaceMedia<T extends Record<string, any>>(pro: T): Promise<T> {
    if (!pro || typeof pro !== 'object') return pro;

    const profilePhotoKey =
      typeof pro.profile_photo_s3_key === 'string' && pro.profile_photo_s3_key.trim()
        ? pro.profile_photo_s3_key.trim()
        : '';
    const workPhotoKeys = Array.isArray(pro.work_photo_s3_keys)
      ? pro.work_photo_s3_keys.filter((key: unknown): key is string => typeof key === 'string' && key.trim().length > 0)
      : [];
    const marketplaceProfile =
      pro.marketplace_profile && typeof pro.marketplace_profile === 'object'
        ? { ...pro.marketplace_profile }
        : {};

    try {
      if (profilePhotoKey) {
        const profilePhotoUrl = await this.storageService.getDocumentUrl(profilePhotoKey);
        (pro as any).profile_photo_url = profilePhotoUrl;
        marketplaceProfile.profile_photo = profilePhotoUrl;
      }

      if (workPhotoKeys.length > 0) {
        const workPhotoUrls = await this.storageService.getDocumentUrls(workPhotoKeys);
        (pro as any).work_photo_urls = workPhotoUrls;
        marketplaceProfile.portfolio_photos = workPhotoUrls;
      }
    } catch (error: any) {
      this.logger.warn(`decorateMarketplaceMedia[${pro.pro_id || 'unknown'}] failed: ${error?.message || error}`);
    }

    if (Object.keys(marketplaceProfile).length > 0) {
      (pro as any).marketplace_profile = marketplaceProfile;
    }

    return pro;
  }
}
