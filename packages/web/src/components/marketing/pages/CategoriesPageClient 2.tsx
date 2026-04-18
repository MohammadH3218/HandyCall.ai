'use client';

import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { CategoryCard } from '@/components/marketing/CategoryCard';
import { HOME_SERVICE_GROUPS } from '@/constants/home-services';

export function CategoriesPageClient() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-4 py-16">
        <nav className="mb-6 text-sm text-slate-400">
          <Link href="/" className="hover:text-emerald-600">
            Home
          </Link>
          <span className="mx-2">›</span>
          <span className="font-medium text-slate-700">Categories</span>
        </nav>

        <div className="mb-10 max-w-3xl">
          <span className="inline-flex rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700">
            Browse Services
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
            Explore every home service category
          </h1>
          <p className="mt-3 text-slate-500">
            Start with the service you need, then narrow your search by district in Riyadh.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {HOME_SERVICE_GROUPS.map((category) => (
            <CategoryCard
              key={category.slug}
              nameEn={category.title}
              nameAr={category.titleAr}
              slug={category.slug}
              showCount={false}
            />
          ))}
        </div>

        <div className="mt-16 rounded-3xl border border-slate-100 bg-slate-50 p-8 text-center">
          <p className="text-lg font-bold text-slate-900">
            Ready to search in Riyadh?
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Use the search page to combine a service category with a district or neighborhood.
          </p>
          <Link
            href="/search"
            className="mt-5 inline-block rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Start Searching
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
