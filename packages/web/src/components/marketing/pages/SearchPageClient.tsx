'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { IconArrowRight, IconBriefcase, IconLoader2, IconMapPin, IconSearch, IconStar, IconX } from '@tabler/icons-react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SearchBar } from '@/components/marketing/SearchBar';
import { ImageLightbox } from '@/components/ui/image-lightbox';

// ── Login gate popup ──────────────────────────────────────────────────────────

function LoginGateModal({ proId, onClose }: { proId: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-bold text-slate-900">Sign in to view this pro</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <IconX className="h-4 w-4" stroke={2} />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-500 leading-relaxed">
            Create a free account or sign in to view pro profiles, message pros, and request services.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href={`/customer/login?callbackUrl=${encodeURIComponent(`/pros/${proId}`)}`}
              className="block w-full rounded-xl bg-emerald-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.98]"
            >
              Sign in
            </Link>
            <Link
              href={`/customer/login?callbackUrl=${encodeURIComponent(`/pros/${proId}`)}&mode=signup`}
              className="block w-full rounded-xl border border-slate-200 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 active:scale-[0.98]"
            >
              Create free account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProResult {
  pro_id: string;
  first_name: string;
  last_name: string;
  marketplace_profile?: {
    profile_photo?: string;
    bio?: string;
    service_category?: string;
    services_offered?: string[];
    portfolio_photos?: string[];
    starting_price?: number | string;
    contact_for_price?: boolean;
  };
  service_area_zipcodes?: string[];
  service_districts?: string[];
  average_rating?: number;
  total_reviews?: number;
  total_hires?: number;
  hires_count?: number;
  _matchType?: 'specific' | 'category';
  _matchedServices?: string[];
}

// ── Star rating row ───────────────────────────────────────────────────────────

function StarRow({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  const filled = Math.floor(rating);
  return (
    <span className="flex items-center gap-1.5 flex-wrap">
      <span className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <IconStar
            key={i}
            className={`h-3.5 w-3.5 ${i < filled ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`}
            stroke={0}
          />
        ))}
      </span>
      {rating > 0 && (
        <span className="text-sm font-semibold text-slate-700">{rating.toFixed(1)}</span>
      )}
      <span className="text-sm text-slate-400">
        ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
      </span>
    </span>
  );
}

// ── Pro card ──────────────────────────────────────────────────────────────────

function ProCard({
  pro,
  searchDistrict,
  isCustomer,
  onLoginRequired,
}: {
  pro: ProResult;
  searchDistrict: string;
  isCustomer: boolean;
  onLoginRequired: (proId: string) => void;
}) {
  const router = useRouter();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const mp = pro.marketplace_profile ?? {};
  const name = `${pro.first_name} ${pro.last_name}`;
  const initials = `${pro.first_name?.[0] ?? ''}${pro.last_name?.[0] ?? ''}`.toUpperCase();
  const districts: string[] = pro.service_area_zipcodes ?? pro.service_districts ?? [];
  const rating = (pro.average_rating ?? 0) / 100;
  const reviewCount = Number(pro.total_reviews ?? 0);
  const hires = Number(pro.total_hires ?? pro.hires_count ?? 0);
  const isSpecificMatch = pro._matchType === 'specific';
  const matchedServices = pro._matchedServices ?? [];
  const portfolioPhotos = Array.isArray(mp.portfolio_photos) ? mp.portfolio_photos.filter(Boolean) : [];
  const PHOTO_VISIBLE = 3;

  const priceText = mp.contact_for_price
    ? 'Contact for price'
    : mp.starting_price
    ? `From ${mp.starting_price} SAR`
    : null;

  function handleViewProfile(e: React.MouseEvent) {
    e.preventDefault();
    if (!isCustomer) {
      onLoginRequired(pro.pro_id);
      return;
    }
    // Save scroll position so "Back to search" can restore it
    sessionStorage.setItem('hc_search_scroll', String(window.scrollY));
    router.push(`/pros/${pro.pro_id}`);
  }

  return (
    <>
      <div className="flex flex-col gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-md sm:flex-row">
        {/* Avatar */}
        <div className="shrink-0">
          {mp.profile_photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mp.profile_photo}
              alt={name}
              className="h-28 w-28 rounded-2xl object-cover ring-2 ring-slate-100 shadow-sm"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-emerald-100 text-4xl font-extrabold text-emerald-700 shadow-sm">
              {initials}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* Name + badges */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <h3 className="text-lg font-bold text-slate-900">{name}</h3>
              {isSpecificMatch && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  Exact match
                </span>
              )}
            </div>
            {mp.service_category && (
              <p className="text-sm font-semibold text-emerald-600">{mp.service_category}</p>
            )}
          </div>

          {/* Rating — always shown */}
          <StarRow rating={rating} reviewCount={reviewCount} />

          {/* Bio */}
          {mp.bio && (
            <p className="line-clamp-2 text-sm text-slate-500 leading-relaxed">{mp.bio}</p>
          )}

          {/* Matched / offered services */}
          {matchedServices.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {matchedServices.slice(0, 5).map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : mp.services_offered && mp.services_offered.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {mp.services_offered.slice(0, 4).map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : null}

          {/* Portfolio photo strip */}
          {portfolioPhotos.length > 0 && (
            <div className="flex items-center gap-2">
              {portfolioPhotos.slice(0, PHOTO_VISIBLE).map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-100 transition hover:border-emerald-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
              {portfolioPhotos.length > PHOTO_VISIBLE && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(PHOTO_VISIBLE); }}
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  +{portfolioPhotos.length - PHOTO_VISIBLE}
                </button>
              )}
            </div>
          )}

          {/* Meta + hires */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
            {hires > 0 && (
              <span className="flex items-center gap-1 text-slate-500">
                <IconBriefcase className="h-3.5 w-3.5 text-slate-400" stroke={1.8} />
                <span className="font-medium">{hires}</span>
                {' '}{hires === 1 ? 'hire' : 'hires'}
              </span>
            )}
            {districts.length > 0 && (
              <span className="flex items-center gap-1">
                <IconMapPin className="h-3.5 w-3.5" stroke={1.5} />
                {districts.slice(0, 3).join(', ')}
                {districts.length > 3 && ` +${districts.length - 3} more`}
              </span>
            )}
          </div>
        </div>

        {/* CTA column */}
        <div className="flex sm:flex-col sm:items-center sm:justify-center sm:gap-3 items-center gap-4">
          {priceText && (
            <p className={`text-center text-xs font-semibold ${mp.contact_for_price ? 'text-slate-500' : 'text-emerald-700'}`}>
              {priceText}
            </p>
          )}
          <button
            type="button"
            onClick={handleViewProfile}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.98] whitespace-nowrap"
          >
            View profile
            <IconArrowRight className="h-4 w-4" stroke={2} />
          </button>
          {!isCustomer && (
            <p className="hidden sm:block text-center text-[10px] text-slate-400">Sign in to view</p>
          )}
        </div>
      </div>

      {/* Lightbox for portfolio photos */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={portfolioPhotos.map((src, i) => ({ src, alt: `${name} photo ${i + 1}` }))}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function SearchPageClient() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const districtParam = searchParams.get('city') || searchParams.get('district') || '';
  const { data: session } = useSession();
  const isCustomer = (session as any)?.poolType === 'customer';

  const [results, setResults] = useState<ProResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [loginGateProId, setLoginGateProId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(async (q: string, district: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }

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
      });

      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data = await res.json() as any;

      const pros: ProResult[] = Array.isArray(data) ? data : (data.results ?? []);
      setResults(pros);
    } catch (e: any) {
      if (e?.name !== 'AbortError') setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runSearch(query, districtParam);
  }, [query, districtParam, runSearch]);

  // Restore scroll position when returning from a pro profile
  useEffect(() => {
    if (results.length > 0) {
      const saved = sessionStorage.getItem('hc_search_scroll');
      if (saved) {
        sessionStorage.removeItem('hc_search_scroll');
        requestAnimationFrame(() => {
          window.scrollTo({ top: parseInt(saved, 10), behavior: 'instant' });
        });
      }
    }
  }, [results]);

  const specificMatches = results.filter((p) => p._matchType === 'specific');
  const categoryMatches = results.filter((p) => p._matchType === 'category');

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="mx-auto w-full max-w-4xl px-4 py-16">
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">
            Find Services
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900">
            Search Riyadh services
          </h1>
          <p className="mt-3 max-w-xl text-slate-500">
            Describe your problem in plain language — Arabic or English — and we'll find the right pro.
          </p>
        </div>

        <SearchBar className="mb-10" size="lg" />

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
            <IconLoader2 className="h-7 w-7 animate-spin text-emerald-500" />
            <p className="text-sm">Finding the best pros for you...</p>
          </div>
        )}

        {/* Results */}
        {!loading && searched && (
          <>
            {results.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <IconSearch className="h-5 w-5 text-slate-400" stroke={1.8} />
                </div>
                <h2 className="text-base font-bold text-slate-900">No pros found for this search</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Try a different description or broaden your location.
                </p>
                <Link
                  href="/categories"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Browse all categories
                </Link>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Specific matches */}
                {specificMatches.length > 0 && (
                  <section>
                    <div className="mb-4 flex items-center gap-2">
                      <h2 className="text-[13px] font-bold uppercase tracking-widest text-emerald-700">
                        Exact service matches
                      </h2>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        {specificMatches.length}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {specificMatches.map((pro) => (
                        <ProCard
                          key={pro.pro_id}
                          pro={pro}
                          searchDistrict={districtParam}
                          isCustomer={isCustomer}
                          onLoginRequired={setLoginGateProId}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Category fallback */}
                {categoryMatches.length > 0 && (
                  <section>
                    <div className="mb-4 flex items-center gap-2">
                      <h2 className="text-[13px] font-bold uppercase tracking-widest text-slate-500">
                        {specificMatches.length > 0 ? 'Other pros in this category' : 'Pros in this category'}
                      </h2>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                        {categoryMatches.length}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {categoryMatches.map((pro) => (
                        <ProCard
                          key={pro.pro_id}
                          pro={pro}
                          searchDistrict={districtParam}
                          isCustomer={isCustomer}
                          onLoginRequired={setLoginGateProId}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!loading && !searched && (
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <IconSearch className="h-6 w-6 text-emerald-700" stroke={1.8} />
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">
              Describe your problem
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              For example: "My AC is leaking", "مشكلة في السباكة", or "rat infestation in kitchen"
            </p>
          </div>
        )}
      </main>

      <SiteFooter />

      {loginGateProId && (
        <LoginGateModal proId={loginGateProId} onClose={() => setLoginGateProId(null)} />
      )}
    </div>
  );
}
