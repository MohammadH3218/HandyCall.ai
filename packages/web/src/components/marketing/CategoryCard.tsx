'use client';

import Link from 'next/link';
import { useMarketingLanguage } from '@/components/providers/marketing-language-provider';
import { CATEGORY_ICON_MAP, type CategoryIconSlug } from '@/lib/category-icons';

interface CategoryCardProps {
  nameEn: string;
  nameAr: string;
  proCount?: string;
  slug: string;
  /** When false, renders a plain <div> instead of a <Link>. Defaults to true. */
  clickable?: boolean;
  /** When false, hides the proCount line. Defaults to true. */
  showCount?: boolean;
  /** @deprecated pass iconSlug instead — emoji are no longer supported */
  emoji?: string;
}

export function CategoryCard({
  nameEn,
  nameAr,
  proCount,
  slug,
  clickable = true,
  showCount = true,
}: CategoryCardProps) {
  const { isArabic } = useMarketingLanguage();
  const config = CATEGORY_ICON_MAP[slug as CategoryIconSlug];

  const inner = (
    <>
      {config ? (
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${config.bg} transition group-hover:brightness-95`}
        >
          <config.Icon className={`h-6 w-6 ${config.color}`} stroke={1.8} />
        </div>
      ) : (
        /* Fallback: neutral placeholder for unknown slugs */
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
      )}
      <p className="text-sm font-bold text-slate-900">{isArabic ? nameAr : nameEn}</p>
      {showCount && proCount !== undefined && (
        <p className="text-xs font-semibold text-emerald-600">
          {proCount} {isArabic ? 'محترف' : 'pros'}
        </p>
      )}
    </>
  );

  const sharedClassName =
    'group flex flex-col items-center gap-2.5 rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md';

  if (!clickable) {
    return <div className={sharedClassName}>{inner}</div>;
  }

  return (
    <Link href={`/search?category=${encodeURIComponent(slug)}`} className={sharedClassName}>
      {inner}
    </Link>
  );
}
