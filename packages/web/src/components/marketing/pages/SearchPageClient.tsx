'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IconArrowRight, IconLoader2, IconMapPin, IconSearch, IconStar } from '@tabler/icons-react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SearchBar } from '@/components/marketing/SearchBar';

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
  };
  service_area_zipcodes?: string[];
  service_districts?: string[];
  average_rating?: number;
  total_reviews?: number;
  _matchType?: 'specific' | 'category';
  _matchedServices?: string[];
}

// ── Pro card ──────────────────────────────────────────────────────────────────

function ProCard({ pro, searchDistrict }: { pro: ProResult; searchDistrict: string }) {
  const mp = pro.marketplace_profile ?? {};
  const name = `${pro.first_name} ${pro.last_name}`;
  const initials = `${pro.first_name?.[0] ?? ''}${pro.last_name?.[0] ?? ''}`.toUpperCase();
  const districts: string[] = pro.service_area_zipcodes ?? pro.service_districts ?? [];
  const rating = (pro.average_rating ?? 0) / 100;
  const isSpecificMatch = pro._matchType === 'specific';
  const matchedServices = pro._matchedServices ?? [];

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md sm:flex-row">
      {/* Avatar */}
      <div className="shrink-0">
        {mp.profile_photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mp.profile_photo}
            alt={name}
            className="h-16 w-16 rounded-full object-cover ring-2 ring-slate-100"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700">
            {initials}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start gap-2">
          <h3 className="text-[15px] font-bold text-slate-900">{name}</h3>
          {isSpecificMatch && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              Exact match
            </span>
          )}
        </div>

        {mp.bio && (
          <p className="mt-1 line-clamp-2 text-[13px] text-slate-500">{mp.bio}</p>
        )}

        {/* Matched services */}
        {matchedServices.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {matchedServices.slice(0, 4).map((s) => (
              <span
                key={s}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-slate-400">
          {rating > 0 && (
            <span className="flex items-center gap-1">
              <IconStar className="h-3.5 w-3.5 text-amber-400 fill-amber-400" stroke={1.5} />
              <span className="font-semibold text-slate-700">{rating.toFixed(1)}</span>
              {pro.total_reviews ? <span>({pro.total_reviews})</span> : null}
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

      {/* CTA */}
      <div className="flex items-center sm:flex-col sm:justify-center">
        <Link
          href={`/pros/${pro.pro_id}`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-emerald-700"
        >
          View profile
          <IconArrowRight className="h-3.5 w-3.5" stroke={2} />
        </Link>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function SearchPageClient() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const districtParam = searchParams.get('city') || searchParams.get('district') || '';

  const [results, setResults] = useState<ProResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [detectedCategory, setDetectedCategory] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(async (q: string, district: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setSearched(true);
    setResults([]);
    setDetectedCategory(null);

    try {
      const params = new URLSearchParams({ q: q.trim() });
      if (district) params.set('district', district);

      const res = await fetch(`/api/proxy/marketplace/search?${params.toString()}`, {
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data = await res.json() as any;

      // API returns an array of pros directly
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
                    <div className="space-y-3">
                      {specificMatches.map((pro) => (
                        <ProCard key={pro.pro_id} pro={pro} searchDistrict={districtParam} />
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
                    <div className="space-y-3">
                      {categoryMatches.map((pro) => (
                        <ProCard key={pro.pro_id} pro={pro} searchDistrict={districtParam} />
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
    </div>
  );
}
