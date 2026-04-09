'use client';

import { useRouter } from 'next/navigation';
import { IconBolt, IconMapPin, IconStar } from '@tabler/icons-react';

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
  serviceAr: _serviceAr,
  city,
  cityAr: _cityAr,
  rating,
  reviewCount,
  startingFrom,
  badgeEn,
  badgeAr: _badgeAr,
  badgeVariant,
  replyTimeEn,
  replyTimeAr: _replyTimeAr,
}: ProviderCardProps) {
  const router = useRouter();
  const badgeClass =
    badgeVariant === 'top'
      ? 'bg-emerald-600 text-white'
      : 'bg-blue-600 text-white';

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:border-emerald-200 hover:shadow-md">
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        <img
          src={photo}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
        />
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeClass}`}>
          {badgeEn}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-slate-900">{name}</p>
            <p className="text-sm text-slate-500">{serviceEn}</p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-600">
            <IconStar className="h-3.5 w-3.5 fill-current" stroke={1.8} />
            <span className="text-xs font-bold">{rating}</span>
            <span className="text-[11px] text-amber-700/80">({reviewCount})</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <IconMapPin className="h-3.5 w-3.5" stroke={1.8} />
          <span>{city}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <IconBolt className="h-3.5 w-3.5" stroke={1.8} />
          <span>{replyTimeEn}</span>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
          <p className="text-sm font-semibold text-slate-900">
            Starting from{' '}
            <span className="text-emerald-600">SAR {startingFrom}</span>
          </p>
          <button
            onClick={() => router.push('/signup')}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
          >
            View Profile
          </button>
        </div>
      </div>
    </div>
  );
}
