'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  IconArrowRight,
  IconBriefcase,
  IconMapPin,
  IconSearch,
  IconSparkles,
} from '@tabler/icons-react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SearchBar } from '@/components/marketing/SearchBar';
import { CategoryCard } from '@/components/marketing/CategoryCard';
import { useMarketingLanguage } from '@/components/providers/marketing-language-provider';
import { apiClient } from '@/lib/api-client';
import { HOUSTON_METRO_AREAS } from '@/constants/houston-areas';
import {
  FEATURED_MARKETPLACE_CATEGORIES,
  resolveMarketplaceSearchQuery,
  MARKETPLACE_SERVICE_CATEGORIES,
} from '@/constants/marketplace-service-categories';

type DemoProvider = {
  id: string;
  name: string;
  categoryKey: string;
  cityValue: string;
  cityEn: string;
  cityAr: string;
  startingFrom: number;
  rating: string;
  reviews: number;
  hires: number;
  specificServices: string[];
  badgeEn: string;
  badgeAr: string;
  responseEn: string;
  responseAr: string;
  profilePhoto?: string;
  publicSlug?: string;
  isSponsored?: boolean;
  bio?: string;
  contact_for_price?: boolean;
};

const DEMO_PROVIDERS: DemoProvider[] = [
  {
    id: 'meshmasters-riyadh',
    name: 'Mesh Masters KSA',
    categoryKey: 'network-it',
    cityValue: 'riyadh',
    cityEn: 'Austin',
    cityAr: 'Austin',
    startingFrom: 180,
    rating: '4.9',
    reviews: 61,
    hires: 84,
    specificServices: ['Mesh Wi-Fi Install', 'Router Setup', 'Ethernet Cabling', 'Network Troubleshooting'],
    badgeEn: 'Top Match',
    badgeAr: 'أفضل تطابق',
    responseEn: 'Replies in 10 min',
    responseAr: 'يرد خلال 10 دقائق',
  },
  {
    id: 'smartlink-jeddah',
    name: 'SmartLink Home Tech',
    categoryKey: 'network-it',
    cityValue: 'jeddah',
    cityEn: 'Dallas',
    cityAr: 'Dallas',
    startingFrom: 220,
    rating: '4.8',
    reviews: 44,
    hires: 52,
    specificServices: ['Home Network Setup', 'Satellite Receiver Setup', 'Structured Cabling'],
    badgeEn: 'Verified',
    badgeAr: 'موثّق',
    responseEn: 'Replies in 18 min',
    responseAr: 'يرد خلال 18 دقيقة',
  },
  {
    id: 'coolfix-riyadh',
    name: 'CoolFix HVAC',
    categoryKey: 'ac-hvac',
    cityValue: 'riyadh',
    cityEn: 'Austin',
    cityAr: 'Austin',
    startingFrom: 149,
    rating: '4.9',
    reviews: 138,
    hires: 210,
    specificServices: ['AC Repair', 'Split AC Unit Install', 'Duct Cleaning'],
    badgeEn: 'Top Pro',
    badgeAr: 'محترف مميز',
    responseEn: 'Replies in 12 min',
    responseAr: 'يرد خلال 12 دقيقة',
  },
  {
    id: 'katy-pipe-rescue',
    name: 'Katy Pipe Rescue',
    categoryKey: 'plumbing',
    cityValue: 'katy',
    cityEn: 'Katy',
    cityAr: 'Katy',
    startingFrom: 129,
    rating: '4.9',
    reviews: 147,
    hires: 213,
    specificServices: ['Water Heater Repair', 'Emergency Leak Repair', 'Drain Cleaning', 'Toilet Repair', 'Garbage Disposal Replacement'],
    badgeEn: 'Top Pro',
    badgeAr: 'موثّق',
    responseEn: 'Replies in 11 min',
    responseAr: 'يرد خلال 11 دقيقة',
    bio: 'Family-owned plumbing team serving Katy, Cinco Ranch, and nearby neighborhoods with same-day repairs and upfront pricing.',
  },
  {
    id: 'westhouston-rooter',
    name: 'West Houston Rooter Co.',
    categoryKey: 'plumbing',
    cityValue: 'katy-south',
    cityEn: 'Katy South',
    cityAr: 'Katy South',
    startingFrom: 145,
    rating: '4.8',
    reviews: 103,
    hires: 165,
    specificServices: ['Sewer Line Repair', 'Hydro Jetting', 'Drain Cleaning', 'Shower Valve Replacement'],
    badgeEn: 'Verified',
    badgeAr: 'موثّق',
    responseEn: 'Replies in 19 min',
    responseAr: 'يرد خلال 19 دقيقة',
    bio: 'Residential plumbing specialists covering Katy South, Seven Meadows, and Falcon Ranch.',
  },
  {
    id: 'grandparkway-plumbing',
    name: 'Grand Parkway Plumbing',
    categoryKey: 'plumbing',
    cityValue: 'katy-grand-parkway',
    cityEn: 'Katy / Grand Parkway',
    cityAr: 'Katy / Grand Parkway',
    startingFrom: 159,
    rating: '4.8',
    reviews: 88,
    hires: 134,
    specificServices: ['Tankless Water Heater Install', 'Slab Leak Detection', 'Fixture Installation', 'Gas Line Plumbing'],
    badgeEn: 'Verified',
    badgeAr: 'موثّق',
    responseEn: 'Replies in 24 min',
    responseAr: 'يرد خلال 24 دقيقة',
    bio: 'Licensed plumbing crew working across Katy, Fulshear-adjacent communities, and the Grand Parkway corridor.',
  },
  {
    id: 'bear-creek-plumbing',
    name: 'Bear Creek Plumbing & Drain',
    categoryKey: 'plumbing',
    cityValue: 'katy-east-bear-creek',
    cityEn: 'Katy East / Bear Creek',
    cityAr: 'Katy East / Bear Creek',
    startingFrom: 119,
    rating: '4.7',
    reviews: 74,
    hires: 108,
    specificServices: ['Faucet Repair', 'Leak Detection', 'Drain Snaking', 'Kitchen Plumbing'],
    badgeEn: 'Verified',
    badgeAr: 'موثّق',
    responseEn: 'Replies in 17 min',
    responseAr: 'يرد خلال 17 دقيقة',
    bio: 'Fast-turn plumbing help for Bear Creek, Katy East, and nearby west Houston neighborhoods.',
  },
  {
    id: 'brightvolt-dammam',
    name: 'BrightVolt Electrical',
    categoryKey: 'electrical',
    cityValue: 'dammam',
    cityEn: 'Phoenix',
    cityAr: 'Phoenix',
    startingFrom: 160,
    rating: '4.8',
    reviews: 77,
    hires: 95,
    specificServices: ['Lighting Installation', 'Smart Home Wiring', 'Circuit Breaker Repair'],
    badgeEn: 'Top Rated',
    badgeAr: 'عالي التقييم',
    responseEn: 'Replies in 15 min',
    responseAr: 'يرد خلال 15 دقيقة',
  },
  {
    id: 'sparkclean-jeddah',
    name: 'SparkClean Homes',
    categoryKey: 'house-cleaning',
    cityValue: 'jeddah',
    cityEn: 'Dallas',
    cityAr: 'Dallas',
    startingFrom: 120,
    rating: '4.8',
    reviews: 114,
    hires: 143,
    specificServices: ['Deep Cleaning', 'Move-Out Cleaning', 'Villa Cleaning'],
    badgeEn: 'Verified',
    badgeAr: 'موثّق',
    responseEn: 'Replies in 14 min',
    responseAr: 'يرد خلال 14 دقيقة',
  },
  {
    id: 'greenline-riyadh',
    name: 'GreenLine Landscaping',
    categoryKey: 'landscaping',
    cityValue: 'riyadh',
    cityEn: 'Austin',
    cityAr: 'Austin',
    startingFrom: 200,
    rating: '4.7',
    reviews: 51,
    hires: 63,
    specificServices: ['Garden Design', 'Artificial Grass Install', 'Irrigation System Install'],
    badgeEn: 'Verified',
    badgeAr: 'موثّق',
    responseEn: 'Replies in 22 min',
    responseAr: 'يرد خلال 22 دقيقة',
  },
  {
    id: 'fixall-riyadh',
    name: 'FixAll Handyman',
    categoryKey: 'handyman',
    cityValue: 'riyadh',
    cityEn: 'Austin',
    cityAr: 'Austin',
    startingFrom: 110,
    rating: '4.6',
    reviews: 69,
    hires: 88,
    specificServices: ['Furniture Assembly', 'Curtain & Blind Install', 'Minor Repairs'],
    badgeEn: 'Verified',
    badgeAr: 'موثّق',
    responseEn: 'Replies in 19 min',
    responseAr: 'يرد خلال 19 دقيقة',
  },
];

/** Map a raw company/provider object from the API into the DemoProvider shape */
function mapApiProvider(raw: any): DemoProvider | null {
  if (!raw) return null;
  const mp = raw.marketplace_profile || {};
  const name = raw.company_name || raw.name || '';
  if (!name) return null;

  // Resolve category key from the service_category string
  const serviceCategoryTitle = mp.service_category || raw.service_type || '';
  const matchedCat = MARKETPLACE_SERVICE_CATEGORIES.find(
    (cat) =>
      cat.title.toLowerCase() === serviceCategoryTitle.toLowerCase() ||
      cat.titleAr === serviceCategoryTitle
  );
  const categoryKey = matchedCat?.key || raw.category_key || 'handyman';

  // City — take first city from service_cities or service_area_cities
  const cities: string[] =
    mp.service_cities ||
    raw.service_area_cities ||
    [];
  const cityRaw = (cities[0] || '').toLowerCase().trim();

  // Map common Saudi city names to the value keys used by DEMO_PROVIDERS
  const cityMap: Record<string, string> = {
    'riyadh': 'riyadh',
    'الرياض': 'riyadh',
    'jeddah': 'jeddah',
    'جدة': 'jeddah',
    'dammam': 'dammam',
    'الدمام': 'dammam',
    'khobar': 'khobar',
    'الخبر': 'khobar',
    'mecca': 'mecca',
    'مكة': 'mecca',
    'مكة المكرمة': 'mecca',
    'medina': 'medina',
    'المدينة المنورة': 'medina',
    'المدينة': 'medina',
    'abha': 'abha',
    'أبها': 'abha',
  };
  const cityValue = cityMap[cityRaw] || cityRaw || 'riyadh';
  const cityLabels: Record<string, { en: string; ar: string }> = {
    riyadh: { en: 'Riyadh', ar: 'الرياض' },
    jeddah: { en: 'Jeddah', ar: 'جدة' },
    dammam: { en: 'Dammam', ar: 'الدمام' },
    khobar: { en: 'Khobar', ar: 'الخبر' },
    mecca: { en: 'Mecca', ar: 'مكة المكرمة' },
    medina: { en: 'Medina', ar: 'المدينة المنورة' },
    abha: { en: 'Abha', ar: 'أبها' },
  };
  const cityLabel = cityLabels[cityValue] || { en: cityRaw, ar: cityRaw };

  const reviewCount = Number(raw.total_reviews) || 0;
  const rating = reviewCount > 0 ? String(Number(raw.overall_rating || 0).toFixed(1)) : '';

  return {
    id: raw.company_id || raw.id || name,
    name,
    categoryKey,
    cityValue,
    cityEn: cityLabel.en,
    cityAr: cityLabel.ar,
    startingFrom: Number(mp.starting_price) || 0,
    rating,
    reviews: reviewCount,
    hires: Number(raw.total_hires || raw.hires_count || 0),
    specificServices: Array.isArray(mp.services_offered) ? mp.services_offered : [],
    badgeEn: mp.is_licensed ? 'Verified' : 'New',
    badgeAr: mp.is_licensed ? 'موثّق' : 'جديد',
    responseEn: 'Replies soon',
    responseAr: 'يرد قريباً',
    profilePhoto: mp.profile_photo || raw.profile_photo_url || undefined,
    publicSlug: raw.public_slug || raw.company_id,
    isSponsored: raw.subscription_plan === 'MAX',
    bio: mp.bio || raw.public_description || undefined,
    contact_for_price: Boolean(mp.contact_for_price),
  };
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\u0600-\u06ff\s-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cityLabelFromValue(value: string, isArabic: boolean) {
  if (!value) return '';
  const predefined: Record<string, { en: string; ar: string }> = {
    riyadh: { en: 'Riyadh', ar: 'الرياض' },
    jeddah: { en: 'Jeddah', ar: 'جدة' },
    mecca: { en: 'Mecca', ar: 'مكة المكرمة' },
    medina: { en: 'Medina', ar: 'المدينة المنورة' },
    dammam: { en: 'Dammam', ar: 'الدمام' },
    khobar: { en: 'Khobar', ar: 'الخبر' },
    katy: { en: 'Katy', ar: 'Katy' },
    'katy-south': { en: 'Katy South', ar: 'Katy South' },
    'katy-grand-parkway': { en: 'Katy / Grand Parkway', ar: 'Katy / Grand Parkway' },
    'katy-east-bear-creek': { en: 'Katy East / Bear Creek', ar: 'Katy East / Bear Creek' },
  };
  const fromMap = predefined[value];
  if (fromMap) return isArabic ? fromMap.ar : fromMap.en;
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeLocationValue(value: string) {
  const normalized = normalizeSearchText(value).replace(/\s+/g, '-');
  const aliases: Record<string, string> = {
    katy: 'katy',
    'katy-south': 'katy',
    'katy-grand-parkway': 'katy',
    'katy-east-bear-creek': 'katy',
    '77449': 'katy',
    '77450': 'katy',
    '77494': 'katy',
  };

  return aliases[normalized] || normalized;
}

function providerMatchesLocation(providerCityValue: string, selectedLocation: string) {
  if (!selectedLocation) return true;
  return normalizeLocationValue(providerCityValue) === selectedLocation;
}

function isSpecificServiceMatch(service: string, query: string) {
  const normalizedService = normalizeSearchText(service);
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedService || !normalizedQuery) return false;
  if (normalizedService === normalizedQuery) return true;
  if (normalizedService.includes(normalizedQuery) || normalizedQuery.includes(normalizedService)) {
    return true;
  }
  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  return queryTokens.length > 0 && queryTokens.every((token) => normalizedService.includes(token));
}

export function SearchPageClient() {
  const searchParams = useSearchParams();
  const { isArabic: _isArabic } = useMarketingLanguage();
  const isArabic = false;
  const query = searchParams.get('q') || '';
  const categorySlug = searchParams.get('category') || '';
  const city = searchParams.get('city') || '';
  const zip = searchParams.get('zip') || '';

  const [apiProviders, setApiProviders] = useState<DemoProvider[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const matchedArea = useMemo(
    () => HOUSTON_METRO_AREAS.find((area) => area.zip === zip) || null,
    [zip]
  );
  const selectedLocation = useMemo(
    () => normalizeLocationValue(city || matchedArea?.area || zip),
    [city, matchedArea?.area, zip]
  );

  // Fetch real providers from the API whenever query/category/city changes
  useEffect(() => {
    let cancelled = false;
    const fetchProviders = async () => {
      setApiLoading(true);
      try {
        const resolved = resolveMarketplaceSearchQuery(query, categorySlug);
        const categoryTitle = resolved?.category.title || '';
        // When a category is resolved, pass the category title — not the raw query text —
        // so the backend category filter runs. The raw text query is redundant once we have
        // a category, and it can wrongly filter out pros whose name doesn't contain the keyword.
        const apiQuery = categoryTitle ? undefined : (query || undefined);
        const raw = await apiClient.searchProviders(
          apiQuery,
          categoryTitle || undefined,
          city || matchedArea?.area || undefined
        );
        if (cancelled) return;
        const mapped = (Array.isArray(raw) ? raw : [])
          .map(mapApiProvider)
          .filter((p): p is DemoProvider => p !== null);
        setApiProviders(mapped);
      } catch {
        if (!cancelled) setApiProviders([]);
      } finally {
        if (!cancelled) setApiLoading(false);
      }
    };
    void fetchProviders();
    return () => { cancelled = true; };
  }, [query, categorySlug, city, matchedArea?.area]);

  // Merge: real API providers first; use demo providers only for categories not covered by the API
  const allProviders = useMemo(() => {
    if (apiProviders.length === 0) return DEMO_PROVIDERS;
    const apiCategoryKeys = new Set(apiProviders.map((p) => p.categoryKey));
    const demoFallbacks = DEMO_PROVIDERS.filter((p) => !apiCategoryKeys.has(p.categoryKey));
    return [...apiProviders, ...demoFallbacks];
  }, [apiProviders]);

  const resolvedSearch = useMemo(
    () => resolveMarketplaceSearchQuery(query, categorySlug),
    [categorySlug, query]
  );

  const cityProviders = useMemo(
    () => allProviders.filter((provider) => providerMatchesLocation(provider.cityValue, selectedLocation)),
    [allProviders, selectedLocation]
  );

  const exactMatches = useMemo(() => {
    if (!resolvedSearch || !query.trim()) return [];
    return cityProviders.filter(
      (provider) =>
        provider.categoryKey === resolvedSearch.category.key &&
        provider.specificServices.some((service) => isSpecificServiceMatch(service, query))
    );
  }, [cityProviders, query, resolvedSearch]);

  const categoryMatches = useMemo(() => {
    if (!resolvedSearch) return [];
    return cityProviders.filter(
      (provider) =>
        provider.categoryKey === resolvedSearch.category.key &&
        !exactMatches.some((match) => match.id === provider.id)
    );
  }, [cityProviders, exactMatches, resolvedSearch]);

  // Sponsored = real API providers in the matched category; regular = demo fallbacks
  const sponsoredMatches = useMemo(
    () => categoryMatches.filter((p) => p.isSponsored),
    [categoryMatches]
  );
  const regularMatches = useMemo(
    () => categoryMatches.filter((p) => !p.isSponsored),
    [categoryMatches]
  );

  const cityLabel = matchedArea?.area || cityLabelFromValue(city || selectedLocation, isArabic);
  const noRecognizedCategory = Boolean(query.trim()) && !resolvedSearch;
  const noResultsInCity = Boolean(resolvedSearch) && exactMatches.length === 0 && sponsoredMatches.length === 0 && regularMatches.length === 0;

  const copy = isArabic
    ? {
        title: 'ابحث عن المحترف المناسب بالقرب منك',
        subtitle:
          'البحث الذكي يرفع المحترفين الذين يذكرون خدمتك الدقيقة أولاً، ثم يعرض بقية المحترفين في نفس الفئة.',
        matchedTo: 'تمت مطابقة البحث مع',
        exactMatches: 'أفضل النتائج للخدمة المطلوبة',
        moreInCategory: 'محترفون آخرون في نفس الفئة',
        noCategoryTitle: 'الخدمة غير متوفرة حالياً',
        noCategoryBody:
          'لم نتمكن من ربط هذا البحث بفئة أو خدمة واضحة حتى الآن. جرّب عبارة أوضح أو تصفح الفئات الرئيسية.',
        noCityTitle: 'تم العثور على الفئة، لكن لا يوجد محترفون معروضون في هذه المدينة حالياً',
        noCityBody:
          'ما زلنا نعرف الفئة المناسبة، لكن لا توجد نتائج حالية في المدينة المختارة. جرّب مدينة أخرى أو قدّم طلباً عاماً.',
        fallbackMessage: 'لم نجد من يذكر هذه الخدمة الدقيقة، لذلك نعرض بقية المحترفين في نفس الفئة.',
        matchedService: 'الخدمة المطابقة',
        city: 'المدينة',
        requestJob: 'أرسل طلب خدمة',
        viewProfile: 'عرض',
        browseCategories: 'تصفح الفئات',
        featuredTitle: 'فئات رئيسية شائعة',
        featuredBody: 'استخدم فئة رئيسية، أو ابحث بخدمة دقيقة مثل mesh Wi-Fi setup أو water heater repair.',
        startingFrom: 'ابتداءً من',
        reviews: 'تقييم',
        hires: 'توظيف',
        sponsored: 'نتائج مميزة',
        contactForPrice: 'تواصل للتسعير',
      }
    : {
        title: 'Find the Right Pro Near You',
        subtitle:
          'Smart search ranks pros who list your exact need first, then shows the rest of the pros in the closest matching category.',
        matchedTo: 'Search matched to',
        exactMatches: 'Best matches for your exact need',
        moreInCategory: 'More pros in this category',
        noCategoryTitle: 'Not available yet',
        noCategoryBody:
          'We could not confidently map that query to a category or service. Try a clearer search phrase or browse the main categories.',
        noCityTitle: 'We found the category, but no listed pros are available in that city yet',
        noCityBody:
          'The category is recognized, but there are no current results in the selected city. Try another city or send a general request.',
        fallbackMessage:
          "No one currently lists that exact service, so we're showing the closest pros in the same category.",
        matchedService: 'Matched service',
        city: 'City',
        requestJob: 'Request this job',
        viewProfile: 'View',
        browseCategories: 'Browse Categories',
        featuredTitle: 'Popular main categories',
        featuredBody:
          'Search by a broad category, or be specific with phrases like mesh network setup or water heater repair.',
        startingFrom: 'From',
        reviews: 'reviews',
        hires: 'hires',
        sponsored: 'Sponsored Results',
        contactForPrice: 'Contact for price',
      };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />
      <main className="flex-1 px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_45%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 sm:p-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <IconSparkles className="h-3.5 w-3.5" stroke={1.7} />
                {isArabic ? 'بحث ذكي' : 'Smart Search'}
              </div>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                {copy.title}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{copy.subtitle}</p>
            </div>
            <SearchBar className="mt-8 max-w-3xl" size="lg" />
          </div>

          {!query && !categorySlug ? (
            <div className="mt-10 space-y-8">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h2 className="text-xl font-bold text-slate-900">{copy.featuredTitle}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{copy.featuredBody}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {FEATURED_MARKETPLACE_CATEGORIES.map((category) => (
                  <CategoryCard
                    key={category.key}
                    nameEn={category.title}
                    nameAr={category.titleAr}
                    slug={category.slug}
                    showCount={false}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {resolvedSearch ? (
            <div className="mt-10 space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                      {copy.matchedTo}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">{resolvedSearch.category.title}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      {resolvedSearch.category.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {resolvedSearch.matchedSpecificService ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {copy.matchedService}: {resolvedSearch.matchedSpecificService}
                        </span>
                      ) : null}
                      {cityLabel ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {copy.city}: {cityLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <Link
                    href={`/request?category=${encodeURIComponent(resolvedSearch.category.title)}`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    {copy.requestJob}
                    <IconArrowRight className="h-4 w-4" stroke={1.8} />
                  </Link>
                </div>
              </div>

              {resolvedSearch.matchType === 'specific_service' && exactMatches.length === 0 && categoryMatches.length > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {copy.fallbackMessage}
                </div>
              ) : null}

              {sponsoredMatches.length > 0 ? (
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                      {copy.sponsored}
                    </span>
                  </div>
                  <div className="flex flex-col gap-4">
                    {sponsoredMatches.map((provider) => (
                      <ProviderResultCard key={provider.id} provider={provider} isArabic={isArabic} copy={copy} />
                    ))}
                  </div>
                </section>
              ) : null}

              {exactMatches.length > 0 ? (
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <IconSparkles className="h-5 w-5 text-emerald-600" stroke={1.8} />
                    <h3 className="text-xl font-bold text-slate-900">{copy.exactMatches}</h3>
                  </div>
                  <div className="flex flex-col gap-4">
                    {exactMatches.map((provider) => (
                      <ProviderResultCard key={provider.id} provider={provider} isArabic={isArabic} copy={copy} />
                    ))}
                  </div>
                </section>
              ) : null}

              {regularMatches.length > 0 ? (
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <IconSearch className="h-5 w-5 text-slate-600" stroke={1.8} />
                    <h3 className="text-xl font-bold text-slate-900">{copy.moreInCategory}</h3>
                  </div>
                  <div className="flex flex-col gap-4">
                    {regularMatches.map((provider) => (
                      <ProviderResultCard key={provider.id} provider={provider} isArabic={isArabic} copy={copy} />
                    ))}
                  </div>
                </section>
              ) : null}

              {noResultsInCity ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center">
                  <h3 className="text-2xl font-bold text-slate-900">{copy.noCityTitle}</h3>
                  <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">{copy.noCityBody}</p>
                  <Link
                    href="/categories"
                    className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                  >
                    {copy.browseCategories}
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}

          {noRecognizedCategory ? (
            <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center">
              <h2 className="text-3xl font-bold text-slate-900">{copy.noCategoryTitle}</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">{copy.noCategoryBody}</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/categories"
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  {copy.browseCategories}
                </Link>
                <Link
                  href="/request"
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  {copy.requestJob}
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function ProviderResultCard({
  provider,
  isArabic,
  copy,
}: {
  provider: DemoProvider;
  isArabic: boolean;
  copy: {
    startingFrom: string;
    reviews: string;
    hires: string;
    viewProfile: string;
    sponsored: string;
    contactForPrice: string;
  };
}) {
  const badgeClass =
    provider.badgeEn === 'Top Match' || provider.badgeEn === 'Top Pro'
      ? 'bg-emerald-600 text-white'
      : provider.badgeEn === 'New'
      ? 'bg-slate-100 text-slate-600'
      : 'bg-slate-900 text-white';

  const profileHref = provider.publicSlug
    ? `/pros/${provider.publicSlug}`
    : `/search?q=${encodeURIComponent(provider.name)}`;

  const rating = Number(provider.rating || 0);
  const filledStars = Math.floor(rating);
  const shownTags = provider.specificServices.slice(0, 10);
  const extraTags = provider.specificServices.length - shownTags.length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-emerald-200 hover:shadow-md">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {provider.profilePhoto ? (
          <img
            src={provider.profilePhoto}
            alt={provider.name}
            className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-slate-100"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-2xl font-bold text-emerald-700">
            {provider.name.charAt(0)}
          </div>
        )}

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 leading-tight">{provider.name}</h3>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeClass}`}>
              {isArabic ? provider.badgeAr : provider.badgeEn}
            </span>
          </div>

          <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
            <IconMapPin className="h-3.5 w-3.5 shrink-0" stroke={1.8} />
            {isArabic ? provider.cityAr : provider.cityEn}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <svg key={i} viewBox="0 0 20 20" className={`h-3.5 w-3.5 ${i < filledStars ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="ml-1 text-xs font-semibold text-slate-700">{rating > 0 ? rating.toFixed(1) : '0.0'}</span>
              <span className="text-xs text-slate-400">({provider.reviews} {copy.reviews})</span>
            </div>
            {provider.hires > 0 && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <IconBriefcase className="h-3.5 w-3.5 text-slate-400" stroke={1.8} />
                {provider.hires} {copy.hires}
              </div>
            )}
          </div>

          {provider.bio && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">{provider.bio}</p>
          )}

          {shownTags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {shownTags.map((service) => (
                <span
                  key={service}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600"
                >
                  {service}
                </span>
              ))}
              {extraTags > 0 && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                  +{extraTags}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: price + CTA */}
        <div className="flex shrink-0 flex-col items-end gap-2.5">
          {provider.contact_for_price ? (
            <p className="text-right text-sm font-semibold text-slate-600">{copy.contactForPrice}</p>
          ) : provider.startingFrom > 0 ? (
            <div className="text-right">
              <p className="text-xs text-slate-400">{copy.startingFrom}</p>
              <p className="text-xl font-extrabold text-emerald-600">${provider.startingFrom}</p>
            </div>
          ) : null}
          <Link
            href={profileHref}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 active:scale-[0.97]"
          >
            {copy.viewProfile}
            <IconArrowRight className="h-3.5 w-3.5" stroke={2} />
          </Link>
        </div>
      </div>
    </div>
  );
}
