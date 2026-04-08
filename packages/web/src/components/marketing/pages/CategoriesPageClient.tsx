'use client';

import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { CategoryCard } from '@/components/marketing/CategoryCard';
import { HOME_SERVICE_GROUPS } from '@/constants/home-services';

export function CategoriesPageClient() {
  const copy = {
    home: 'Home',
    categories: 'Categories',
    title: 'Browse All Categories',
    description: 'Find skilled professionals for every home service need in your area.',
    ctaTitle: "Don't see your service?",
    ctaDescription: "Tell us what you need and we'll match you with the right pro.",
    ctaButton: 'Contact Us',
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-16">
        <nav className="mb-6 text-sm text-slate-400">
          <Link href="/" className="hover:text-emerald-600">{copy.home}</Link>
          <span className="mx-2">›</span>
          <span className="font-medium text-slate-700">{copy.categories}</span>
        </nav>

        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900">{copy.title}</h1>
          <p className="mt-3 text-slate-500">{copy.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {HOME_SERVICE_GROUPS.map((cat) => (
            <CategoryCard
              key={cat.slug}
              nameEn={cat.title}
              nameAr={cat.titleAr}
              slug={cat.slug}
              showCount={false}
            />
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-slate-100 bg-slate-50 p-8 text-center">
          <p className="text-lg font-bold text-slate-900">{copy.ctaTitle}</p>
          <p className="mt-2 text-sm text-slate-500">{copy.ctaDescription}</p>
          <Link
            href="/contact"
            className="mt-5 inline-block rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            {copy.ctaButton}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
