'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { IconArrowRight, IconMapPin, IconSearch } from '@tabler/icons-react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SearchBar } from '@/components/marketing/SearchBar';
import { SAUDI_MARKETPLACE_CITIES } from '@/constants/riyadh-districts';
import {
  MARKETPLACE_SERVICE_CATEGORIES,
  resolveMarketplaceSearchQuery,
} from '@/constants/marketplace-service-categories';

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function SearchPageClient() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const categorySlug = searchParams.get('category') || '';
  const districtValue = searchParams.get('city') || '';

  const matchedCategory = useMemo(
    () => resolveMarketplaceSearchQuery(query, categorySlug)?.category || null,
    [categorySlug, query],
  );

  const selectedDistrict = useMemo(
    () =>
      SAUDI_MARKETPLACE_CITIES.find(
        (district) =>
          district.value === districtValue ||
          normalize(district.label) === normalize(districtValue),
      ) || null,
    [districtValue],
  );

  const hasSearch = Boolean(query.trim() || categorySlug.trim() || districtValue.trim());

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">
            Find Services
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900">
            Search Riyadh services
          </h1>
          <p className="mt-3 max-w-3xl text-slate-500">
            Enter a service and a Riyadh district to narrow down your search. Nothing is pre-filled here unless you search for it.
          </p>
        </div>

        <SearchBar className="mb-10" size="lg" />

        {hasSearch ? (
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
                <IconSearch className="h-5 w-5 text-emerald-700" stroke={1.8} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Search received
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  We&apos;re using your filters to shape the marketplace experience, but we are not showing placeholder providers or fake listings.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {query.trim() ? (
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
                  Service: {query.trim()}
                </span>
              ) : null}
              {matchedCategory ? (
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
                  Category: {matchedCategory.title}
                </span>
              ) : null}
              {selectedDistrict ? (
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
                  <IconMapPin className="mr-1 inline h-3.5 w-3.5 text-slate-400" stroke={1.8} />
                  {selectedDistrict.label}
                </span>
              ) : districtValue ? (
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
                  <IconMapPin className="mr-1 inline h-3.5 w-3.5 text-slate-400" stroke={1.8} />
                  {districtValue}
                </span>
              ) : null}
            </div>

            <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center">
              <p className="text-lg font-semibold text-slate-900">
                No default results are shown here.
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Once live provider data is connected for this search flow, matching results can appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <IconSearch className="h-6 w-6 text-emerald-700" stroke={1.8} />
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">
              Start with a service and a Riyadh district
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              We do not show preset examples or fake provider cards on this page.
            </p>
          </div>
        )}

        <div className="mt-16 rounded-3xl border border-slate-100 bg-slate-50 p-8 text-center">
          <h2 className="text-2xl font-extrabold text-slate-900">
            Need an account to continue later?
          </h2>
          <p className="mt-2 text-slate-500">
            Create a customer account when you want to save searches, requests, and bookings.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Sign Up
              <IconArrowRight className="h-4 w-4" stroke={1.8} />
            </Link>
            <Link
              href="/categories"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Browse Categories
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
