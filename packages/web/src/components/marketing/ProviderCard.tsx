'use client';

import { useRouter } from 'next/navigation';
import { useMarketingLanguage } from '@/components/providers/marketing-language-provider';

interface ProviderCardProps {
  photo: string;
  name: string;
  serviceEn: string;
  serviceAr: string;
  city: string;
  cityAr: string;
  rating: string;
  reviewCount: number;
  startingFrom: number;
  badgeEn: string;
  badgeAr: string;
  badgeVariant: 'top' | 'verified';
  replyTimeEn: string;
  replyTimeAr: string;
}

export function ProviderCard({
  photo,
  name,
  serviceEn,
  serviceAr,
  city,
  cityAr,
  rating,
  reviewCount,
  startingFrom,
  badgeEn,
  badgeAr,
  badgeVariant,
  replyTimeEn,
  replyTimeAr,
}: ProviderCardProps) {
  const router = useRouter();
  const { isArabic } = useMarketingLanguage();
  const badgeClass = badgeVariant === 'top' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white';

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:border-emerald-200 hover:shadow-md">
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        <img
          src={photo}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
        />
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeClass}`}>
          {isArabic ? badgeAr : badgeEn}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-slate-900">{name}</p>
            <p className="text-sm text-slate-500">{isArabic ? serviceAr : serviceEn}</p>
          </div>
          <div className="flex flex-shrink-0 flex-col items-end">
            <span className="text-sm font-bold text-amber-500">★ {rating}</span>
            <span className="text-xs text-slate-400">
              ({reviewCount}) {isArabic ? 'تقييم' : 'reviews'}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-400">📍 {isArabic ? cityAr : city}</p>
        <p className="text-xs text-slate-400">⚡ {isArabic ? replyTimeAr : replyTimeEn}</p>

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
          <p className="text-sm font-semibold text-slate-900">
            {isArabic ? 'ابتداءً من ' : 'From '}
            <span className="text-emerald-600">
              {startingFrom} {isArabic ? 'ريال' : 'SAR'}
            </span>
          </p>
          <button
            onClick={() => router.push('/search')}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
          >
            {isArabic ? 'احصل على عرض' : 'Get Quote'}
          </button>
        </div>
      </div>
    </div>
  );
}
