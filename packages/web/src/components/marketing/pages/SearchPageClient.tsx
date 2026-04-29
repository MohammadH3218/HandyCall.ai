'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  IconAdjustmentsHorizontal,
  IconArrowRight,
  IconBriefcase,
  IconCheck,
  IconLoader2,
  IconMapPin,
  IconSearch,
  IconStar,
} from '@tabler/icons-react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SearchBar } from '@/components/marketing/SearchBar';

interface ProResult {
  pro_id: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  city?: string;
  bio?: string;
  service_category?: string;
  services_offered?: string[];
  property_types?: string[];
  profile_photo_url?: string;
  profile_photo_s3_key?: string;
  work_photo_urls?: string[];
  service_area_zipcodes?: string[];
  service_area_cities?: string[];
  service_districts?: string[];
  average_rating?: number;
  total_reviews?: number;
  total_hires?: number;
  hires_count?: number;
  years_experience?: number;
  employee_count_range?: string;
  contact_for_price?: boolean;
  starting_price_sar?: number;
  marketplace_profile?: {
    profile_photo?: string;
    bio?: string;
    service_category?: string;
    services_offered?: string[];
    property_types?: string[];
    starting_price?: string | number;
    contact_for_price?: boolean;
    is_licensed?: boolean;
  };
  _matchType?: 'specific' | 'category';
  _matchedServices?: string[];
}

type RatingFilter = 'all' | '4plus' | 'new';
type PricingFilter = 'all' | 'contact' | 'budget' | 'mid' | 'premium';

function normalizeFilterValue(value: string) {
  return value.trim().toLowerCase();
}

function getName(pro: ProResult) {
  return pro.company_name?.trim() || `${pro.first_name} ${pro.last_name}`.trim();
}

function getInitials(pro: ProResult) {
  const name = getName(pro);
  const pieces = name.split(/\s+/).filter(Boolean);
  if (pieces.length === 1) return pieces[0].slice(0, 2).toUpperCase();
  return `${pieces[0][0] ?? ''}${pieces[1][0] ?? ''}`.toUpperCase();
}

function getPhoto(pro: ProResult) {
  return pro.profile_photo_url || pro.marketplace_profile?.profile_photo || '';
}

function getBio(pro: ProResult) {
  return pro.bio || pro.marketplace_profile?.bio || '';
}

function getCategory(pro: ProResult) {
  return pro.service_category || pro.marketplace_profile?.service_category || '';
}

function getMatchedServices(pro: ProResult): string[] {
  if (Array.isArray(pro._matchedServices) && pro._matchedServices.length > 0) {
    return pro._matchedServices;
  }
  return [];
}

function getAllServices(pro: ProResult): string[] {
  if (Array.isArray(pro.services_offered) && pro.services_offered.length > 0) {
    return pro.services_offered;
  }
  if (Array.isArray(pro.marketplace_profile?.services_offered) && pro.marketplace_profile!.services_offered!.length > 0) {
    return pro.marketplace_profile!.services_offered!;
  }
  return [];
}

function getServices(pro: ProResult) {
  return getAllServices(pro);
}

function getPropertyTypes(pro: ProResult) {
  if (Array.isArray(pro.property_types) && pro.property_types.length > 0) return pro.property_types;
  if (Array.isArray(pro.marketplace_profile?.property_types) && pro.marketplace_profile!.property_types!.length > 0) {
    return pro.marketplace_profile!.property_types!;
  }
  return [];
}

function getDistricts(pro: ProResult) {
  if (Array.isArray(pro.service_area_zipcodes) && pro.service_area_zipcodes.length > 0) return pro.service_area_zipcodes;
  if (Array.isArray(pro.service_districts) && pro.service_districts.length > 0) return pro.service_districts;
  if (Array.isArray(pro.service_area_cities) && pro.service_area_cities.length > 0) return pro.service_area_cities;
  return [];
}

function getRating(pro: ProResult) {
  return (pro.average_rating ?? 0) / 100;
}

function getReviewCount(pro: ProResult) {
  return Number(pro.total_reviews ?? 0);
}

function getHires(pro: ProResult) {
  return Number(pro.total_hires ?? pro.hires_count ?? 0);
}

function isVerified(pro: ProResult) {
  return Boolean(pro.marketplace_profile?.is_licensed);
}

function getDisplayPrice(pro: ProResult) {
  if (pro.contact_for_price || pro.marketplace_profile?.contact_for_price) {
    return 'Contact for price';
  }

  if (typeof pro.starting_price_sar === 'number' && pro.starting_price_sar > 0) {
    return `From SAR ${Math.round(pro.starting_price_sar / 100)}`;
  }

  const legacy = pro.marketplace_profile?.starting_price;
  if (typeof legacy === 'number' && legacy > 0) return `From SAR ${legacy}`;
  if (typeof legacy === 'string' && legacy.trim()) return `From SAR ${legacy.trim()}`;
  return 'Price on request';
}

function matchesPricingFilter(pro: ProResult, filter: PricingFilter) {
  if (filter === 'all') return true;
  const amount = typeof pro.starting_price_sar === 'number' ? pro.starting_price_sar / 100 : 0;
  const isContact = Boolean(pro.contact_for_price || pro.marketplace_profile?.contact_for_price || amount <= 0);
  if (filter === 'contact') return isContact;
  if (isContact) return false;
  if (filter === 'budget') return amount > 0 && amount <= 250;
  if (filter === 'mid') return amount > 250 && amount <= 500;
  if (filter === 'premium') return amount > 500;
  return true;
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-slate-100 pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 space-y-2.5">{children}</div>
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
  meta,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  meta?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
      />
      <span className="min-w-0">
        <span className="block font-medium text-slate-700">{label}</span>
        {meta ? <span className="block text-xs text-slate-400">{meta}</span> : null}
      </span>
    </label>
  );
}

function RadioRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-600">
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
      />
      <span className="font-medium text-slate-700">{label}</span>
    </label>
  );
}

function ProCard({
  pro,
  isCustomer,
}: {
  pro: ProResult;
  isCustomer: boolean;
}) {
  const router = useRouter();
  const name = getName(pro);
  const initials = getInitials(pro);
  const photo = getPhoto(pro);
  const bio = getBio(pro);
  const category = getCategory(pro);
  const services = getServices(pro);
  const matchedServices = getMatchedServices(pro);
  const unmatchedServices = services.filter((s) => !matchedServices.includes(s));
  const districts = getDistricts(pro);
  const rating = getRating(pro);
  const reviewCount = getReviewCount(pro);
  const hires = getHires(pro);
  const exactMatch = pro._matchType === 'specific';
  const price = getDisplayPrice(pro);
  const primaryDistrict = districts[0] || pro.city || '';
  const propertyTypes = getPropertyTypes(pro);

  function handleViewProfile(e: React.MouseEvent) {
    e.preventDefault();
    if (!isCustomer) {
      router.push(`/customer/login?callbackUrl=${encodeURIComponent(`/pros/${pro.pro_id}`)}`);
      return;
    }
    router.push(`/pros/${pro.pro_id}`);
  }

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <div className="shrink-0">
          {photo ? (
            <img
              src={photo}
              alt={name}
              className="h-28 w-28 rounded-[28px] object-cover ring-2 ring-slate-100 shadow-sm sm:h-32 sm:w-32"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-[28px] bg-emerald-100 text-4xl font-extrabold text-emerald-700 shadow-sm sm:h-32 sm:w-32">
              {initials}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{name}</h2>
            {isVerified(pro) ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <IconCheck className="h-3.5 w-3.5" stroke={2.2} />
                Verified
              </span>
            ) : null}
            {exactMatch ? (
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                Exact match
              </span>
            ) : null}
          </div>

          {category ? (
            <p className="mt-1 text-base font-semibold text-emerald-600">{category}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, i) => {
                  const filled = rating > 0 && i < Math.round(rating);
                  return (
                    <IconStar
                      key={i}
                      className={`h-4 w-4 ${filled ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`}
                      stroke={0}
                    />
                  );
                })}
              </div>
              <span className="font-semibold text-slate-700">
                {rating > 0 ? rating.toFixed(1) : 'New'}
              </span>
              <span>
                {reviewCount > 0 ? `(${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'})` : '(0 reviews)'}
              </span>
            </span>

            {primaryDistrict ? (
              <span className="flex items-center gap-1.5">
                <IconMapPin className="h-4 w-4 text-slate-400" stroke={1.8} />
                {primaryDistrict}
                {districts.length > 1 ? ` +${districts.length - 1} more` : ''}
              </span>
            ) : null}

            {hires > 0 ? (
              <span className="flex items-center gap-1.5">
                <IconBriefcase className="h-4 w-4 text-slate-400" stroke={1.8} />
                {hires} {hires === 1 ? 'hire' : 'hires'}
              </span>
            ) : null}

            {pro.years_experience ? (
              <span>{pro.years_experience}+ years experience</span>
            ) : null}
          </div>

          {bio ? (
            <p className="mt-4 line-clamp-3 max-w-3xl text-[15px] leading-7 text-slate-600">
              {bio}
            </p>
          ) : null}

          {services.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {/* Matched services in green */}
              {matchedServices.map((service) => (
                <span
                  key={service}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700"
                >
                  {service}
                </span>
              ))}
              {/* Remaining services in slate */}
              {unmatchedServices.slice(0, Math.max(0, 6 - matchedServices.length)).map((service) => (
                <span
                  key={service}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500"
                >
                  {service}
                </span>
              ))}
              {services.length > 6 ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
                  +{services.length - 6} more
                </span>
              ) : null}
            </div>
          ) : null}

          {propertyTypes.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {propertyTypes.slice(0, 3).map((propertyType) => (
                <span
                  key={propertyType}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500"
                >
                  {propertyType}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex min-w-[210px] shrink-0 flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 xl:self-stretch">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Pricing</p>
            <p className="mt-2 text-xl font-bold text-slate-900">{price}</p>
            {!isCustomer ? (
              <p className="mt-2 text-xs text-slate-400">Sign in to view the full profile and request a quote.</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleViewProfile}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            View profile
            <IconArrowRight className="h-4 w-4" stroke={2} />
          </button>
        </div>
      </div>
    </article>
  );
}

export function SearchPageClient() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const districtParam = searchParams.get('city') || searchParams.get('district') || '';
  const { data: session } = useSession();
  const isCustomer = (session as any)?.poolType === 'customer';

  const [results, setResults] = useState<ProResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [exactOnly, setExactOnly] = useState(false);
  const [withPhotosOnly, setWithPhotosOnly] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [pricingFilter, setPricingFilter] = useState<PricingFilter>('all');
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(async (q: string, district: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setSearched(true);
    setResults([]);

    try {
      const params = new URLSearchParams({ q: q.trim() });
      if (district) params.set('district', district);

      const res = await fetch(`/api/proxy/marketplace/search?${params.toString()}`, {
        signal: abortRef.current.signal,
        cache: 'no-store',
      });

      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data = (await res.json()) as any;
      const pros: ProResult[] = Array.isArray(data) ? data : (data.results ?? []);
      setResults(pros);
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runSearch(query, districtParam);
  }, [query, districtParam, runSearch]);

  useEffect(() => {
    setSelectedDistricts((current) => {
      if (!districtParam) return current;
      const normalizedDistrict = normalizeFilterValue(districtParam);
      if (current.some((district) => normalizeFilterValue(district) === normalizedDistrict)) {
        return current;
      }
      return [districtParam];
    });
  }, [districtParam]);

  const availableDistricts = useMemo(() => {
    return Array.from(new Set(results.flatMap((pro) => getDistricts(pro)).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [results]);

  const availablePropertyTypes = useMemo(() => {
    return Array.from(new Set(results.flatMap((pro) => getPropertyTypes(pro)).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [results]);

  const filteredResults = useMemo(() => {
    return results.filter((pro) => {
      if (verifiedOnly && !isVerified(pro)) return false;
      if (exactOnly && pro._matchType !== 'specific') return false;
      if (withPhotosOnly && !getPhoto(pro)) return false;

      const rating = getRating(pro);
      const reviews = getReviewCount(pro);
      if (ratingFilter === '4plus' && rating < 4) return false;
      if (ratingFilter === 'new' && reviews > 0) return false;

      if (!matchesPricingFilter(pro, pricingFilter)) return false;

      if (selectedDistricts.length > 0) {
        const districts = getDistricts(pro);
        const normalizedDistricts = districts.map(normalizeFilterValue);
        if (
          !selectedDistricts.some((district) =>
            normalizedDistricts.includes(normalizeFilterValue(district)),
          )
        ) {
          return false;
        }
      }

      if (selectedPropertyTypes.length > 0) {
        const propertyTypes = getPropertyTypes(pro);
        if (!selectedPropertyTypes.some((propertyType) => propertyTypes.includes(propertyType))) return false;
      }

      return true;
    });
  }, [exactOnly, pricingFilter, ratingFilter, results, selectedDistricts, selectedPropertyTypes, verifiedOnly, withPhotosOnly]);

  const activeFilterCount =
    Number(verifiedOnly) +
    Number(exactOnly) +
    Number(withPhotosOnly) +
    (ratingFilter !== 'all' ? 1 : 0) +
    (pricingFilter !== 'all' ? 1 : 0) +
    selectedDistricts.length +
    selectedPropertyTypes.length;

  const exactMatches = filteredResults.filter((pro) => pro._matchType === 'specific');
  const categoryMatches = filteredResults.filter((pro) => pro._matchType === 'category');

  function toggleDistrict(district: string) {
    setSelectedDistricts((current) =>
      current.includes(district) ? current.filter((item) => item !== district) : [...current, district],
    );
  }

  function togglePropertyType(propertyType: string) {
    setSelectedPropertyTypes((current) =>
      current.includes(propertyType)
        ? current.filter((item) => item !== propertyType)
        : [...current, propertyType],
    );
  }

  function clearFilters() {
    setVerifiedOnly(false);
    setExactOnly(false);
    setWithPhotosOnly(false);
    setRatingFilter('all');
    setPricingFilter('all');
    setSelectedDistricts(districtParam ? [districtParam] : []);
    setSelectedPropertyTypes([]);
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl px-4 py-12 lg:py-16">
        <div className="mb-10 max-w-3xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Search Riyadh services</h1>
          <p className="mt-3 text-lg leading-8 text-slate-500">
            Describe the job, narrow the results, and compare real marketplace profiles before you reach out.
          </p>
        </div>

        <SearchBar
          className="shadow-sm"
          size="lg"
          initialQuery={query}
          initialLocation={districtParam}
        />

        <div className="mb-10 mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-sm font-semibold text-slate-900">Can&apos;t find the right pro?</p>
            <p className="mt-0.5 text-sm leading-6 text-slate-500">
              Post a custom job request and available Riyadh pros can claim it and message you directly.
            </p>
          </div>
          <Link
            href="/customer/dashboard/post-job"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Start custom request
            <IconArrowRight className="h-4 w-4" stroke={2} />
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
            <IconLoader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-sm">Finding the best pros for you...</p>
          </div>
        ) : searched ? (
          <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <IconAdjustmentsHorizontal className="h-5 w-5 text-slate-500" stroke={1.8} />
                    <h2 className="text-lg font-bold text-slate-900">Filters</h2>
                  </div>
                  {activeFilterCount > 0 ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-xs font-semibold text-emerald-600 transition hover:text-emerald-700"
                    >
                      Clear all
                    </button>
                  ) : null}
                </div>

                <div className="mt-5 space-y-5">
                  <FilterSection title="Profile quality">
                    <CheckboxRow
                      label="Verified pros"
                      checked={verifiedOnly}
                      onChange={() => setVerifiedOnly((value) => !value)}
                    />
                    <CheckboxRow
                      label="Exact service matches"
                      checked={exactOnly}
                      onChange={() => setExactOnly((value) => !value)}
                    />
                    <CheckboxRow
                      label="Has profile photo"
                      checked={withPhotosOnly}
                      onChange={() => setWithPhotosOnly((value) => !value)}
                    />
                  </FilterSection>

                  <FilterSection title="Rating">
                    <RadioRow
                      label="Show all"
                      checked={ratingFilter === 'all'}
                      onChange={() => setRatingFilter('all')}
                    />
                    <RadioRow
                      label="4.0 and up"
                      checked={ratingFilter === '4plus'}
                      onChange={() => setRatingFilter('4plus')}
                    />
                    <RadioRow
                      label="New pros"
                      checked={ratingFilter === 'new'}
                      onChange={() => setRatingFilter('new')}
                    />
                  </FilterSection>

                  <FilterSection title="Price">
                    <RadioRow
                      label="Show all"
                      checked={pricingFilter === 'all'}
                      onChange={() => setPricingFilter('all')}
                    />
                    <RadioRow
                      label="Contact for price"
                      checked={pricingFilter === 'contact'}
                      onChange={() => setPricingFilter('contact')}
                    />
                    <RadioRow
                      label="Up to SAR 250"
                      checked={pricingFilter === 'budget'}
                      onChange={() => setPricingFilter('budget')}
                    />
                    <RadioRow
                      label="SAR 251 to 500"
                      checked={pricingFilter === 'mid'}
                      onChange={() => setPricingFilter('mid')}
                    />
                    <RadioRow
                      label="Above SAR 500"
                      checked={pricingFilter === 'premium'}
                      onChange={() => setPricingFilter('premium')}
                    />
                  </FilterSection>

                  {availableDistricts.length > 0 ? (
                    <FilterSection title="Locations served">
                      {availableDistricts.slice(0, 8).map((district) => (
                        <CheckboxRow
                          key={district}
                          label={district}
                          checked={selectedDistricts.includes(district)}
                          onChange={() => toggleDistrict(district)}
                        />
                      ))}
                    </FilterSection>
                  ) : null}

                  {availablePropertyTypes.length > 0 ? (
                    <FilterSection title="Property types">
                      {availablePropertyTypes.map((propertyType) => (
                        <CheckboxRow
                          key={propertyType}
                          label={propertyType}
                          checked={selectedPropertyTypes.includes(propertyType)}
                          onChange={() => togglePropertyType(propertyType)}
                        />
                      ))}
                    </FilterSection>
                  ) : null}
                </div>
              </div>
            </aside>

            <section className="min-w-0">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    {filteredResults.length} {filteredResults.length === 1 ? 'pro' : 'pros'} for “{query}”
                  </h2>
                  {districtParam ? (
                    <p className="mt-1 text-sm text-slate-500">Serving {districtParam} and nearby Riyadh districts.</p>
                  ) : null}
                </div>
                {activeFilterCount > 0 ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} applied
                  </span>
                ) : null}
              </div>

              {filteredResults.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <IconSearch className="h-5 w-5 text-slate-400" stroke={1.8} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">No pros match these filters</h3>
                  <p className="mt-2 text-sm text-slate-500">Try clearing a filter or broadening the service description.</p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-5 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {exactMatches.length > 0 ? (
                    <section>
                      <div className="mb-4 flex items-center gap-2">
                        <h3 className="text-[13px] font-bold uppercase tracking-widest text-emerald-700">
                          Exact service matches
                        </h3>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          {exactMatches.length}
                        </span>
                      </div>
                      <div className="space-y-4">
                        {exactMatches.map((pro) => (
                          <ProCard key={pro.pro_id} pro={pro} isCustomer={isCustomer} />
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {categoryMatches.length > 0 ? (
                    <section>
                      <div className="mb-4 flex items-center gap-2">
                        <h3 className="text-[13px] font-bold uppercase tracking-widest text-slate-500">
                          {exactMatches.length > 0 ? 'Other pros in this category' : 'Pros in this category'}
                        </h3>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                          {categoryMatches.length}
                        </span>
                      </div>
                      <div className="space-y-4">
                        {categoryMatches.map((pro) => (
                          <ProCard key={pro.pro_id} pro={pro} isCustomer={isCustomer} />
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <IconSearch className="h-6 w-6 text-emerald-700" stroke={1.8} />
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">Describe your problem</h2>
            <p className="mt-2 text-sm text-slate-500">
              For example: “pipe leak in kitchen”, “drain cleaning in Qortubah”, or “مشكلة سباكة في المطبخ”.
            </p>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
