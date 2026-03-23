'use client';

import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SearchBar } from '@/components/marketing/SearchBar';
import { useMarketingLanguage } from '@/components/providers/marketing-language-provider';

export function SearchPageClient() {
  const { isArabic } = useMarketingLanguage();

  const copy = isArabic
    ? {
        title: 'ابحث عن المحترف المناسب بالقرب منك',
        description: 'نتائج البحث الكاملة قادمة قريبًا. يمكنك تصفح الفئات أو العودة للرئيسية لاكتشاف أفضل المحترفين.',
        browseCategories: 'تصفح الفئات',
        backHome: 'العودة للرئيسية',
      }
    : {
        title: 'Find a Pro Near You',
        description: 'Full search results are coming soon. Browse categories or return home to discover top-rated professionals.',
        browseCategories: 'Browse Categories',
        backHome: 'Back to Home',
      };

  return (
    <div className="flex min-h-screen flex-col bg-white" dir={isArabic ? 'rtl' : 'ltr'}>
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="text-4xl font-extrabold text-slate-900">{copy.title}</h1>
        <p className="mt-3 max-w-md text-slate-500">{copy.description}</p>
        <SearchBar className="mt-8 max-w-xl" />
        <div className="mt-8 flex gap-4">
          <Link
            href="/categories"
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
          >
            {copy.browseCategories}
          </Link>
          <Link
            href="/"
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            {copy.backHome}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
