import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { S3Service } from '../../infrastructure/storage/s3.service';
import { ServiceCategory, RIYADH_DISTRICTS } from '@handycall/shared';

const SERVICE_CATEGORIES: ServiceCategory[] = [
  'AC & HVAC',
  'Plumbing',
  'Electrical',
  'House Cleaning',
  'Painting',
  'Carpentry',
  'Pest Control',
  'Landscaping',
  'Car Washing & Detailing',
  'Appliance Repair',
  'Moving & Delivery',
  'Tile & Flooring',
  'Security Systems',
  'Doors & Windows',
  'Bathroom Renovation',
  'Handyman',
  'Pool & Water Features',
  'Roofing & Waterproofing',
  'Curtains & Blinds',
  'Tank & Sanitation',
  'Nanny & Childcare',
  'Private Tutoring',
  'Driver Services',
  'Network & IT Setup',
  'Healthcare at Home',
  'Laundry & Ironing',
  'Photography & Video',
  'Personal Training',
  'Locksmith & Keys',
  'Garage Doors & Gates',
  'Kitchen Renovation',
  'Masonry & Concrete',
  'Metalwork & Welding',
  'Glass & Mirrors',
  'Upholstery & Furniture Repair',
  'Smart Home & Automation',
  'Solar & Energy',
  'Gas Services',
  'Disinfection & Odor Removal',
  'Pressure Washing',
  'Fencing, Awnings & Shades',
  'Decor & Wall Panels',
  'Pet Care at Home',
  'Beauty at Home',
  'Event Home Services',
  'Home Organization',
];

// Models tried in order — if the first returns 429, the next is tried.
const OPENROUTER_MODELS = [
  'google/gemma-4-31b-it:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
];

// English + Arabic stop words for smart fallback keyword extraction
const STOP_WORDS = new Set([
  'i',
  'a',
  'an',
  'the',
  'my',
  'your',
  'our',
  'their',
  'its',
  'me',
  'we',
  'us',
  'is',
  'am',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'shall',
  'can',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'up',
  'down',
  'out',
  'into',
  'through',
  'about',
  'over',
  'this',
  'that',
  'these',
  'those',
  'it',
  'he',
  'she',
  'they',
  'and',
  'or',
  'but',
  'if',
  'so',
  'because',
  'when',
  'where',
  'how',
  'what',
  'which',
  'who',
  'not',
  'no',
  'any',
  'some',
  'there',
  'here',
  'just',
  'also',
  'very',
  'really',
  'get',
  'got',
  'need',
  'want',
  'like',
  'make',
  'go',
  'come',
  'see',
  'know',
  'think',
  // Arabic stop words
  'في',
  'من',
  'إلى',
  'على',
  'مع',
  'عن',
  'هذا',
  'هذه',
  'ذلك',
  'التي',
  'الذي',
  'أن',
  'لا',
  'ما',
  'كان',
]);

function extractKeywordsFromQuery(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z\u0600-\u06ff\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private db: DynamoDBService,
    private config: ConfigService,
    private storageService: S3Service
  ) {}

  /** Browse active services by category and/or district */
  async browseServices(params: { category?: ServiceCategory; district?: string; limit?: number }) {
    let services: any[] = [];

    if (params.category) {
      const { items } = await this.db.query(
        'services',
        '#cat = :cat AND begins_with(is_active_created, :active)',
        { '#cat': 'category' },
        { ':cat': params.category, ':active': '1#' },
        { indexName: 'category-active-index', limit: params.limit ?? 20 }
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
    // 1. In parallel: classify query + fetch all active pros
    const [{ category, keywords }, { items: pros }] = await Promise.all([
      this.classifyQuery(params.q),
      this.db.scan('pros', {
        filterExpression: '#status = :active AND marketplace_profile_completed = :done',
        expressionAttributeNames: { '#status': 'status' },
        expressionAttributeValues: { ':active': 'ACTIVE', ':done': true },
      }),
    ]);

    this.logger.log(
      `AI search: q="${params.q}" → category=${category}, keywords=${keywords.join(', ')}`
    );

    if (pros.length === 0) return [];

    // 2. Collect all unique specific services listed by pros
    const allServices = new Set<string>();
    for (const pro of pros) {
      const mp = (pro.marketplace_profile as Record<string, any>) ?? {};
      const services: string[] = Array.isArray(pro.services_offered)
        ? pro.services_offered
        : Array.isArray(mp.services_offered)
          ? mp.services_offered
          : [];
      services.forEach((s) => allServices.add(s));
    }

    // 3. Semantically match services to the query via a second LLM call
    const semanticMatches = await this.matchServicesToQuery(params.q, [...allServices]);
    const semanticMatchSet = new Set(semanticMatches.map((s) => s.toLowerCase()));
    this.logger.log(`Semantic service matches: ${semanticMatches.join(', ') || 'none'}`);

    // 4. Score each pro
    const normalizedKeywords = keywords.map((k: string) => k.toLowerCase());

    const scored = await Promise.all(
      pros.map(async (pro: any) => {
        // Strip sensitive fields
        const {
          password_hash,
          iban,
          national_id,
          iqama_number,
          id_document_s3_key,
          id_number,
          ...safe
        } = pro;

        const mp = (pro.marketplace_profile as Record<string, any>) ?? {};
        const servicesOffered: string[] = Array.isArray(pro.services_offered)
          ? pro.services_offered
          : Array.isArray(mp.services_offered)
            ? mp.services_offered
            : [];
        const proCategory: string = pro.service_category ?? mp.service_category ?? '';
        const proDistricts: string[] = Array.isArray(pro.service_area_zipcodes)
          ? pro.service_area_zipcodes
          : Array.isArray(pro.service_districts)
            ? pro.service_districts
            : [];

        const normalizedServices = servicesOffered.map((s) => s.toLowerCase());

        // Keyword match (fast path)
        const keywordMatch = normalizedKeywords.some((kw) =>
          normalizedServices.some((s) => s.includes(kw))
        );
        // Semantic match: LLM identified this service as relevant to the query
        const aiServiceMatch = normalizedServices.some((s) => semanticMatchSet.has(s));

        const specificMatch = keywordMatch || aiServiceMatch;
        const categoryMatch = proCategory.toUpperCase() === category.toUpperCase();

        // Score: 2 = specific service match, 1 = category match, 0 = no match
        const score = specificMatch ? 2 : categoryMatch ? 1 : 0;

        // District match bonus for tiebreaking
        const districtMatch =
          params.district &&
          proDistricts.some((d) => d.toLowerCase() === (params.district ?? '').toLowerCase())
            ? 1
            : 0;

        // Highlight which services matched (keyword or semantic)
        const matchedServices = specificMatch
          ? servicesOffered.filter(
              (s) =>
                normalizedKeywords.some((kw) => s.toLowerCase().includes(kw)) ||
                semanticMatchSet.has(s.toLowerCase())
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
      })
    );

    // 5. Filter to relevant results; if a district was specified, only include pros who serve it
    return scored
      .filter((p) => p._score > 0 && (!params.district || p._districtMatch > 0))
      .sort((a, b) => b._score - a._score || b._districtMatch - a._districtMatch)
      .map(({ _score, _districtMatch, ...pro }) => pro);
  }

  /** Call OpenRouter to semantically match service listings against the user's query.
   *  Tries each model in OPENROUTER_MODELS order; skips on 429. */
  private async matchServicesToQuery(
    query: string,
    candidateServices: string[]
  ): Promise<string[]> {
    if (candidateServices.length === 0) return [];

    const apiKey = this.config.get<string>('OPENROUTER_API_KEY') ?? '';
    if (!apiKey) return [];

    const prompt = `You are a matching assistant for a home services marketplace in Saudi Arabia (Riyadh).

Customer query: "${query}"

Services listed by professionals on the platform:
${candidateServices.map((s, i) => `${i + 1}. "${s}"`).join('\n')}

Task: Identify which of the above services are relevant to what the customer is asking for. Consider synonyms, related problems, and implied needs. For example, "I have a leak in my sprinkler system in my grass" should match "Sprinkler Leak Detection & Repair".

Reply with ONLY valid JSON — no explanation, no markdown:
{"matched": ["exact service name from the list above", ...]}`;

    for (const model of OPENROUTER_MODELS) {
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
            model,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            max_tokens: 300,
            temperature: 0.1,
          }),
        });

        if (res.status === 429) {
          this.logger.warn(`matchServicesToQuery: ${model} rate-limited, trying next model`);
          continue;
        }

        if (!res.ok) {
          this.logger.warn(`matchServicesToQuery: ${model} error ${res.status}`);
          continue;
        }

        const data = (await res.json()) as any;
        const content: string = data?.choices?.[0]?.message?.content ?? '{}';
        const cleaned = content
          .replace(/```json?\n?/g, '')
          .replace(/```/g, '')
          .trim();
        const parsed = JSON.parse(cleaned);

        this.logger.log(`matchServicesToQuery: used ${model}`);
        return Array.isArray(parsed.matched) ? (parsed.matched as string[]) : [];
      } catch (e: any) {
        this.logger.warn(`matchServicesToQuery: ${model} threw: ${e?.message}`);
        continue;
      }
    }

    this.logger.warn('matchServicesToQuery: all models failed');
    return [];
  }

  /** Call OpenRouter to classify the query into a category + keywords.
   *  Tries each model in OPENROUTER_MODELS order; skips on 429. */
  private async classifyQuery(query: string): Promise<{ category: string; keywords: string[] }> {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY') ?? '';
    const fallbackKeywords = extractKeywordsFromQuery(query);
    if (!apiKey) {
      this.logger.warn('OPENROUTER_API_KEY not set — using keyword fallback');
      return { category: 'Handyman', keywords: fallbackKeywords };
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

    for (const model of OPENROUTER_MODELS) {
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
            model,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            max_tokens: 200,
            temperature: 0.1,
          }),
        });

        if (res.status === 429) {
          this.logger.warn(`classifyQuery: ${model} rate-limited, trying next model`);
          continue;
        }

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          this.logger.warn(`classifyQuery: ${model} error ${res.status}: ${errText}`);
          continue;
        }

        const data = (await res.json()) as any;
        const content: string = data?.choices?.[0]?.message?.content ?? '{}';
        const cleaned = content
          .replace(/```json?\n?/g, '')
          .replace(/```/g, '')
          .trim();
        const parsed = JSON.parse(cleaned);

        const category = String(parsed.category ?? 'Handyman').trim();
        const keywords: string[] = Array.isArray(parsed.keywords)
          ? (parsed.keywords as string[])
          : fallbackKeywords;

        const validCategory =
          SERVICE_CATEGORIES.find((item) => item.toLowerCase() === category.toLowerCase()) ||
          'Handyman';

        this.logger.log(`classifyQuery: used ${model}`);
        return { category: validCategory, keywords };
      } catch (e: any) {
        this.logger.warn(`classifyQuery: ${model} threw: ${e?.message}`);
        continue;
      }
    }

    // All models failed — use smart keyword extraction so individual words still match
    this.logger.warn('classifyQuery: all models failed, using keyword fallback');
    return { category: 'Handyman', keywords: fallbackKeywords };
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
      ? pro.work_photo_s3_keys.filter(
          (key: unknown): key is string => typeof key === 'string' && key.trim().length > 0
        )
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
      this.logger.warn(
        `decorateMarketplaceMedia[${pro.pro_id || 'unknown'}] failed: ${error?.message || error}`
      );
    }

    if (Object.keys(marketplaceProfile).length > 0) {
      (pro as any).marketplace_profile = marketplaceProfile;
    }

    return pro;
  }
}
