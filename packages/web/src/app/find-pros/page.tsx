'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import {
  IconSearch,
  IconMapPin,
  IconStar,
  IconCircleCheck,
  IconChevronRight,
  IconSparkles,
  IconLoader2,
} from '@tabler/icons-react';

type Provider = {
  company_id: string;
  company_name: string;
  public_slug?: string;
  public_description?: string;
  categories: string[];
  overall_rating: number;
  total_reviews: number;
  verified: boolean;
  city?: string;
  state?: string;
  distance_miles?: number | null;
};

const QUICK_FILTERS = [
  'Plumbing', 'HVAC', 'Electrical', 'Pest Control',
  'Cleaning', 'Landscaping', 'Roofing', 'Painting',
];

function FindProsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [zip, setZip] = useState(searchParams.get('zip') || '');
  const [results, setResults] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [matchedCategory, setMatchedCategory] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const initialSearchDone = useRef(false);
  const suggestionBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    async (overrideQuery?: string, overrideZip?: string) => {
      const q = overrideQuery ?? query;
      const z = overrideZip ?? zip;

      setLoading(true);
      setSearched(true);
      setSuggestionsOpen(false);

      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (z) params.set('zip', z);
      router.replace(`/find-pros${params.size ? `?${params.toString()}` : ''}`, { scroll: false });

      try {
        const endpoint = q
          ? `/api/proxy/marketplace/ai-search?q=${encodeURIComponent(q)}${z ? `&zip=${encodeURIComponent(z)}` : ''}`
          : `/api/proxy/marketplace/search${z ? `?zip=${encodeURIComponent(z)}` : ''}`;

        const res = await fetch(endpoint);
        const data = await res.json();
        const list: Provider[] = Array.isArray(data) ? data : [];
        setResults(list);
        setMatchedCategory(
          list.length > 0 && list[0].categories?.length ? list[0].categories[0] : null,
        );
      } catch {
        setResults([]);
        setMatchedCategory(null);
      } finally {
        setLoading(false);
      }
    },
    [query, zip, router],
  );

  useEffect(() => {
    if (!initialSearchDone.current) {
      initialSearchDone.current = true;
      const qParam = searchParams.get('q');
      const zipParam = searchParams.get('zip');
      const categoryParam = searchParams.get('category');
      if (qParam || zipParam || categoryParam) {
        const effectiveQ = qParam || categoryParam || '';
        setQuery(effectiveQ);
        search(effectiveQ, zipParam || '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQuickFilter = (category: string) => {
    setQuery(category);
    setSuggestionsOpen(false);
    search(category, zip);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setQuery(suggestion);
    setSuggestionsOpen(false);
    search(suggestion, zip);
  };

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      setSuggestionsLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const res = await fetch(`/api/proxy/marketplace/ai-suggestions?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        if (!cancelled) {
          setSuggestions(list.filter((item) => typeof item === 'string').slice(0, 5));
          setSuggestionsOpen(true);
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
          setSuggestionsOpen(false);
        }
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    return () => {
      if (suggestionBlurTimer.current) {
        clearTimeout(suggestionBlurTimer.current);
      }
    };
  }, []);

  const hasGeo = results.some((r) => r.distance_miles != null);

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />

      {/* Search bar */}
      <div className="bg-white border-b border-slate-100">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Find Home Service Pros</h1>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <IconSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                stroke={1.5}
              />
              <input
                type="text"
                placeholder="Describe your issue or project…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setSuggestionsOpen(true);
                }}
                onBlur={() => {
                  suggestionBlurTimer.current = setTimeout(() => setSuggestionsOpen(false), 120);
                }}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
              {(suggestionsOpen || suggestionsLoading) && (
                <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 rounded-lg border border-slate-200 bg-white shadow-sm">
                  {suggestionsLoading ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500">
                      <IconLoader2 className="h-3.5 w-3.5 animate-spin" stroke={1.5} />
                      Getting suggestions...
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-500">No suggestions yet.</div>
                  ) : (
                    <ul className="py-1">
                      {suggestions.map((suggestion) => (
                        <li key={suggestion}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSuggestionSelect(suggestion)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <IconSearch className="h-3.5 w-3.5 text-slate-400" stroke={1.5} />
                            {suggestion}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="relative sm:w-40">
              <IconMapPin
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                stroke={1.5}
              />
              <input
                type="text"
                placeholder="ZIP code"
                value={zip}
                maxLength={10}
                onChange={(e) => setZip(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <button
              onClick={() => search()}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
            >
              {loading
                ? <IconLoader2 className="h-4 w-4 animate-spin" stroke={2} />
                : <IconSearch className="h-4 w-4" stroke={2} />}
              Search
            </button>
          </div>

          {/* Quick-filter chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_FILTERS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleQuickFilter(cat)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition"
              >
                {cat}
              </button>
            ))}
            <Link
              href="/categories"
              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition"
            >
              All categories →
            </Link>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-5xl px-4 py-8">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        ) : !searched ? (
          <div className="py-20 text-center">
            <IconSparkles className="mx-auto h-10 w-10 text-slate-300 mb-3" stroke={1} />
            <p className="text-base font-medium text-slate-500">
              Describe your project above and we&apos;ll find the right pro.
            </p>
            <p className="mt-1 text-sm text-slate-400">Add a ZIP code to see pros near you.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-base font-semibold text-slate-600">No providers found.</p>
            <p className="mt-1 text-sm text-slate-400">
              Try a different description or a nearby ZIP code.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-slate-500">
              {results.length} provider{results.length !== 1 ? 's' : ''} found
              {matchedCategory && (
                <>
                  {' '}&mdash; matched{' '}
                  <span className="font-semibold text-slate-700 capitalize">
                    {matchedCategory.replace(/-/g, ' ')}
                  </span>
                </>
              )}
              {hasGeo && zip && (
                <>
                  {' '}within 25 mi of{' '}
                  <span className="font-semibold text-slate-700">{zip}</span>
                </>
              )}
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              {results.map((p) => (
                <Link
                  key={p.company_id}
                  href={`/find-pros/${p.public_slug || p.company_id}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 hover:border-emerald-200 hover:shadow-md transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 shrink-0 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center text-lg font-bold text-slate-600">
                      {p.company_name?.[0] ?? '?'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-slate-900 truncate">{p.company_name}</h3>
                        {p.verified && (
                          <IconCircleCheck className="h-4 w-4 shrink-0 text-emerald-600" stroke={2} />
                        )}
                      </div>

                      {p.overall_rating > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <IconStar className="h-3.5 w-3.5 fill-amber-400 text-amber-400" stroke={0} />
                          <span className="text-sm font-semibold text-slate-800">
                            {p.overall_rating.toFixed(1)}
                          </span>
                          <span className="text-xs text-slate-400">({p.total_reviews})</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {p.city && (
                          <span className="flex items-center gap-0.5 text-xs text-slate-400">
                            <IconMapPin className="h-3 w-3" stroke={1.5} />
                            {p.city}{p.state ? `, ${p.state}` : ''}
                          </span>
                        )}
                        {p.distance_miles != null && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            {p.distance_miles} mi away
                          </span>
                        )}
                      </div>

                      {p.public_description && (
                        <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">
                          {p.public_description}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.categories.slice(0, 3).map((c) => (
                          <span
                            key={c}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 capitalize"
                          >
                            {c.replace(/[-_]/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>

                    <IconChevronRight
                      className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500 mt-1 transition"
                      stroke={2}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}

export default function FindProsPage() {
  return (
    <Suspense>
      <FindProsContent />
    </Suspense>
  );
}
