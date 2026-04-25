import { ServiceType } from '@/types/shared';
import { HOME_SERVICE_GROUPS, type ServiceGroup } from '@/constants/home-services';

export type MarketplaceServiceCategory = ServiceGroup & {
  templateServiceType: ServiceType;
  setupGuidance: string;
  searchKeywords: string[];
};

const TEMPLATE_SERVICE_TYPE_BY_KEY: Record<string, ServiceType> = {
  'ac-hvac': ServiceType.HVAC,
  plumbing: ServiceType.PLUMBING,
  electrical: ServiceType.ELECTRICIAN,
  'house-cleaning': ServiceType.CLEANING,
  painting: ServiceType.PAINTING,
  carpentry: ServiceType.HANDYMAN,
  'pest-control': ServiceType.PEST_CONTROL,
  landscaping: ServiceType.LANDSCAPING,
  'car-washing': ServiceType.AUTO_MECHANIC,
  'appliance-repair': ServiceType.APPLIANCE_REPAIR,
  moving: ServiceType.MOVING,
  'tile-flooring': ServiceType.FLOORING,
  'security-systems': ServiceType.SECURITY,
  'doors-windows': ServiceType.OTHER,
  'bathroom-renovation': ServiceType.REMODELING,
  handyman: ServiceType.HANDYMAN,
  'pool-water': ServiceType.POOL_SERVICE,
  'roofing-waterproofing': ServiceType.ROOFING,
  'curtains-blinds': ServiceType.HANDYMAN,
  sanitation: ServiceType.PLUMBING,
  'nanny-childcare': ServiceType.OTHER,
  'private-tutoring': ServiceType.OTHER,
  'driver-services': ServiceType.OTHER,
  'network-it': ServiceType.OTHER,
  'healthcare-home': ServiceType.OTHER,
  'laundry-ironing': ServiceType.OTHER,
  'photography-video': ServiceType.OTHER,
  'personal-training': ServiceType.OTHER,
};

const SEARCH_KEYWORDS_BY_KEY: Record<string, string[]> = {
  'ac-hvac': ['air conditioner', 'air conditioning', 'hvac', 'cooling', 'split unit', 'central ac'],
  plumbing: ['pipes', 'leak', 'water heater', 'drain', 'toilet', 'faucet'],
  electrical: ['electrician', 'wiring', 'lights', 'breaker', 'power', 'outlet'],
  'house-cleaning': ['maid', 'deep clean', 'cleaning', 'housekeeping', 'villa cleaning'],
  painting: ['paint', 'wall paint', 'texture', 'decorative paint'],
  carpentry: ['woodwork', 'cabinet', 'wardrobe', 'door install', 'furniture assembly'],
  'pest-control': ['bugs', 'termites', 'rodents', 'cockroaches', 'fumigation'],
  landscaping: ['garden', 'lawn', 'trees', 'irrigation', 'artificial grass'],
  'car-washing': ['car wash', 'detailing', 'polish', 'ceramic coating'],
  'appliance-repair': ['washing machine', 'fridge', 'oven', 'dishwasher', 'microwave'],
  moving: ['moving', 'delivery', 'packing', 'furniture moving', 'junk removal'],
  'tile-flooring': ['tiles', 'flooring', 'marble', 'grout', 'vinyl floor'],
  'security-systems': ['cctv', 'camera', 'alarm', 'smart lock', 'intercom'],
  'doors-windows': ['window', 'door', 'glass', 'mesh', 'screen', 'roller shutter'],
  'bathroom-renovation': ['bathroom remodel', 'shower install', 'bathtub', 'vanity'],
  handyman: ['handyman', 'general repairs', 'mounting', 'minor repairs'],
  'pool-water': ['pool', 'jacuzzi', 'fountain', 'water feature'],
  'roofing-waterproofing': ['roof', 'waterproofing', 'insulation', 'leak repair'],
  'curtains-blinds': ['curtains', 'blinds', 'roller blind', 'curtain rail'],
  sanitation: ['water tank', 'sewer', 'drain unblocking', 'grease trap'],
  'nanny-childcare': ['nanny', 'babysitter', 'elderly care', 'childcare'],
  'private-tutoring': ['tutor', 'lessons', 'quran', 'math tutoring', 'language tutor'],
  'driver-services': ['driver', 'airport transfer', 'school run'],
  'network-it': ['it', 'tech', 'wifi', 'wi-fi', 'mesh', 'ethernet', 'router', 'internet', 'network', 'satellite'],
  'healthcare-home': ['nurse', 'home care', 'physiotherapy', 'iv drip', 'doctor visit'],
  'laundry-ironing': ['laundry', 'ironing', 'dry cleaning'],
  'photography-video': ['photography', 'video', 'wedding photographer', 'drone'],
  'personal-training': ['trainer', 'fitness', 'yoga', 'pilates', 'nutrition'],
};

const SETUP_GUIDANCE_BY_KEY: Record<string, string> = {
  'network-it':
    'Be specific with the exact jobs customers might type, like mesh Wi-Fi setup, ethernet cabling, router configuration, or satellite receiver setup.',
  'ac-hvac':
    'List the exact AC jobs you handle, like split AC repair, duct cleaning, central AC maintenance, or thermostat installation.',
  plumbing:
    'List the exact plumbing work you want leads for, like leak detection, drain cleaning, water heater repair, or faucet installation.',
  electrical:
    'Be specific with electrical work like outlet installation, lighting upgrades, breaker repair, smart home wiring, or EV charger setup.',
};

export const FEATURED_MARKETPLACE_CATEGORY_KEYS = [
  'ac-hvac',
  'plumbing',
  'electrical',
  'house-cleaning',
  'painting',
  'carpentry',
  'pest-control',
  'landscaping',
  'appliance-repair',
  'moving',
  'handyman',
  'network-it',
];

export const MARKETPLACE_SERVICE_CATEGORIES: MarketplaceServiceCategory[] = HOME_SERVICE_GROUPS.map(
  (group) => ({
    ...group,
    templateServiceType: TEMPLATE_SERVICE_TYPE_BY_KEY[group.key] ?? ServiceType.OTHER,
    setupGuidance:
      SETUP_GUIDANCE_BY_KEY[group.key] ??
      `Be specific with the jobs you actually want customers to search for, like ${group.services
        .slice(0, 3)
        .join(', ')}.`,
    searchKeywords: Array.from(
      new Set([
        group.title,
        group.titleAr,
        group.slug.replace(/-/g, ' '),
        ...group.services,
        ...(group.arServices || []),
        ...(SEARCH_KEYWORDS_BY_KEY[group.key] || []),
      ])
    ),
  })
);

export const FEATURED_MARKETPLACE_CATEGORIES = FEATURED_MARKETPLACE_CATEGORY_KEYS.map((key) =>
  MARKETPLACE_SERVICE_CATEGORIES.find((category) => category.key === key)
).filter(Boolean) as MarketplaceServiceCategory[];

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\u0600-\u06ff\s-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreCandidate(candidate: string, normalizedQuery: string) {
  const normalizedCandidate = normalizeSearchText(candidate);
  if (!normalizedCandidate || !normalizedQuery) return 0;
  if (normalizedCandidate === normalizedQuery) return 120;
  if (normalizedCandidate.includes(normalizedQuery)) return 95;
  if (normalizedQuery.includes(normalizedCandidate) && normalizedCandidate.length >= 4) return 88;

  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  const candidateTokens = normalizedCandidate.split(' ').filter(Boolean);
  const overlap = queryTokens.filter((token) =>
    candidateTokens.some((candidateToken) => candidateToken.includes(token) || token.includes(candidateToken))
  ).length;

  if (!overlap) return 0;
  return overlap * 14 + Math.min(queryTokens.length, candidateTokens.length) * 5;
}

export function getMarketplaceCategoryByTitle(title?: string | null) {
  const normalizedTitle = normalizeSearchText(title || '');
  if (!normalizedTitle) return null;
  return (
    MARKETPLACE_SERVICE_CATEGORIES.find(
      (category) => normalizeSearchText(category.title) === normalizedTitle
    ) || null
  );
}

export function getMarketplaceCategoryBySlug(slug?: string | null) {
  if (!slug) return null;
  return MARKETPLACE_SERVICE_CATEGORIES.find((category) => category.slug === slug) || null;
}

export function getSpecificServicesForCategory(title?: string | null) {
  return getMarketplaceCategoryByTitle(title)?.services || [];
}

export function resolveMarketplaceSearchQuery(query?: string | null, categorySlug?: string | null) {
  const directCategory = getMarketplaceCategoryBySlug(categorySlug);
  if (directCategory) {
    return {
      category: directCategory,
      matchType: 'category' as const,
      matchedSpecificService: null,
    };
  }

  const normalizedQuery = normalizeSearchText(query || '');
  if (!normalizedQuery) return null;

  const ranked = MARKETPLACE_SERVICE_CATEGORIES.map((category) => {
    let matchedSpecificService: string | null = null;
    let bestSpecificScore = 0;

    for (const service of category.services) {
      const score = scoreCandidate(service, normalizedQuery);
      if (score > bestSpecificScore) {
        bestSpecificScore = score;
        matchedSpecificService = service;
      }
    }

    const titleScore = Math.max(
      scoreCandidate(category.title, normalizedQuery),
      scoreCandidate(category.titleAr, normalizedQuery),
      scoreCandidate(category.slug.replace(/-/g, ' '), normalizedQuery)
    );

    const keywordScore = Math.max(
      0,
      ...category.searchKeywords.map((keyword) => scoreCandidate(keyword, normalizedQuery))
    );

    const score = Math.max(bestSpecificScore, titleScore, keywordScore);
    const matchType = bestSpecificScore >= Math.max(titleScore, keywordScore)
      ? 'specific_service'
      : 'category';

    return {
      category,
      score,
      matchType,
      matchedSpecificService: matchType === 'specific_service' ? matchedSpecificService : null,
    };
  })
    .filter((item) => item.score >= 28)
    .sort((a, b) => b.score - a.score);

  return ranked[0] || null;
}
