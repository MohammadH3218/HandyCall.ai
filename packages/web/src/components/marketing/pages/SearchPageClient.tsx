'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  IconArrowRight,
  IconMapPin,
  IconSearch,
  IconSparkles,
} from '@tabler/icons-react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SearchBar } from '@/components/marketing/SearchBar';
import { CategoryCard } from '@/components/marketing/CategoryCard';
import { useMarketingLanguage } from '@/components/providers/marketing-language-provider';
import {
  FEATURED_MARKETPLACE_CATEGORIES,
  resolveMarketplaceSearchQuery,
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
  specificServices: string[];
  badgeEn: string;
  badgeAr: string;
  responseEn: string;
  responseAr: string;
};

const DEMO_PROVIDERS: DemoProvider[] = [
  {
    id: 'meshmasters-riyadh',
    name: 'Mesh Masters KSA',
    categoryKey: 'network-it',
    cityValue: 'riyadh',
    cityEn: 'Riyadh',
    cityAr: 'الرياض',
    startingFrom: 180,
    rating: '4.9',
    reviews: 61,
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
    cityEn: 'Jeddah',
    cityAr: 'جدة',
    startingFrom: 220,
    rating: '4.8',
    reviews: 44,
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
    cityEn: 'Riyadh',
    cityAr: 'الرياض',
    startingFrom: 149,
    rating: '4.9',
    reviews: 138,
    specificServices: ['AC Repair', 'Split AC Unit Install', 'Duct Cleaning'],
    badgeEn: 'Top Pro',
    badgeAr: 'محترف مميز',
    responseEn: 'Replies in 12 min',
    responseAr: 'يرد خلال 12 دقيقة',
  },
  {
    id: 'pipeflow-khobar',
    name: 'PipeFlow Plumbing',
    categoryKey: 'plumbing',
    cityValue: 'khobar',
    cityEn: 'Khobar',
    cityAr: 'الخبر',
    startingFrom: 130,
    rating: '4.7',
    reviews: 92,
    specificServices: ['Leak Detection', 'Drain Cleaning', 'Water Heater Repair'],
    badgeEn: 'Verified',
    badgeAr: 'موثّق',
    responseEn: 'Replies in 20 min',
    responseAr: 'يرد خلال 20 دقيقة',
  },
  {
    id: 'brightvolt-dammam',
    name: 'BrightVolt Electrical',
    categoryKey: 'electrical',
    cityValue: 'dammam',
    cityEn: 'Dammam',
    cityAr: 'الدمام',
    startingFrom: 160,
    rating: '4.8',
    reviews: 77,
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
    cityEn: 'Jeddah',
    cityAr: 'جدة',
    startingFrom: 120,
    rating: '4.8',
    reviews: 114,
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
    cityEn: 'Riyadh',
    cityAr: 'الرياض',
    startingFrom: 200,
    rating: '4.7',
    reviews: 51,
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
    cityEn: 'Riyadh',
    cityAr: 'الرياض',
    startingFrom: 110,
    rating: '4.6',
    reviews: 69,
    specificServices: ['Furniture Assembly', 'Curtain & Blind Install', 'Minor Repairs'],
    badgeEn: 'Verified',
    badgeAr: 'موثّق',
    responseEn: 'Replies in 19 min',
    responseAr: 'يرد خلال 19 دقيقة',
  },
];

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
  };
  const fromMap = predefined[value];
  if (fromMap) return isArabic ? fromMap.ar : fromMap.en;
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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
  const { isArabic } = useMarketingLanguage();
  const query = searchParams.get('q') || '';
  const categorySlug = searchParams.get('category') || '';
  const city = searchParams.get('city') || '';

  const resolvedSearch = useMemo(
    () => resolveMarketplaceSearchQuery(query, categorySlug),
    [categorySlug, query]
  );

  const cityProviders = useMemo(
    () => DEMO_PROVIDERS.filter((provider) => !city || provider.cityValue === city),
    [city]
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

  const cityLabel = cityLabelFromValue(city, isArabic);
  const noRecognizedCategory = Boolean(query.trim()) && !resolvedSearch;
  const noResultsInCity = Boolean(resolvedSearch) && exactMatches.length === 0 && categoryMatches.length === 0;

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
        browseCategories: 'تصفح الفئات',
        featuredTitle: 'فئات رئيسية شائعة',
        featuredBody: 'استخدم فئة رئيسية، أو ابحث بخدمة دقيقة مثل mesh Wi-Fi setup أو water heater repair.',
        startingFrom: 'ابتداءً من',
        reviews: 'تقييم',
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
        browseCategories: 'Browse Categories',
        featuredTitle: 'Popular main categories',
        featuredBody:
          'Search by a broad category, or be specific with phrases like mesh network setup or water heater repair.',
        startingFrom: 'From',
        reviews: 'reviews',
      };

  return (
    <div className="flex min-h-screen flex-col bg-white" dir={isArabic ? 'rtl' : 'ltr'}>
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

              {exactMatches.length > 0 ? (
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <IconSparkles className="h-5 w-5 text-emerald-600" stroke={1.8} />
                    <h3 className="text-xl font-bold text-slate-900">{copy.exactMatches}</h3>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {exactMatches.map((provider) => (
                      <ProviderResultCard key={provider.id} provider={provider} isArabic={isArabic} copy={copy} />
                    ))}
                  </div>
                </section>
              ) : null}

              {categoryMatches.length > 0 ? (
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <IconSearch className="h-5 w-5 text-slate-600" stroke={1.8} />
                    <h3 className="text-xl font-bold text-slate-900">{copy.moreInCategory}</h3>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {categoryMatches.map((provider) => (
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
    requestJob: string;
  };
}) {
  const badgeClass =
    provider.badgeEn === 'Top Match' || provider.badgeEn === 'Top Pro'
      ? 'bg-emerald-600 text-white'
      : 'bg-slate-900 text-white';

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-base font-bold text-emerald-700">
            {provider.name.charAt(0)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">{provider.name}</h3>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${badgeClass}`}>
                {isArabic ? provider.badgeAr : provider.badgeEn}
              </span>
            </div>
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-slate-500">
              <IconMapPin className="h-4 w-4" stroke={1.6} />
              {isArabic ? provider.cityAr : provider.cityEn}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-amber-500">★ {provider.rating}</p>
          <p className="text-xs text-slate-400">
            {provider.reviews} {copy.reviews}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {provider.specificServices.map((service) => (
          <span
            key={service}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
          >
            {service}
          </span>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {copy.startingFrom}{' '}
            <span className="text-emerald-600">
              SAR {provider.startingFrom}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {isArabic ? provider.responseAr : provider.responseEn}
          </p>
        </div>
        <Link
          href="/request"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {copy.requestJob}
          <IconArrowRight className="h-4 w-4" stroke={1.8} />
        </Link>
      </div>
    </div>
  );
}
