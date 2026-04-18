'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { IconLoader2 } from '@tabler/icons-react';

export default function ProProfilePage() {
  const [pro, setPro] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .getMyPro()
      .then((data) => setPro(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <IconLoader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="px-8 py-10">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-slate-900">My profile</h1>
        <p className="mt-1 text-[15px] text-slate-400">
          Your public listing as it appears to customers.
        </p>
      </div>

      {pro && (
        <div className="max-w-xl space-y-4 rounded-2xl border border-border/80 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
            <span
              className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${
                pro.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700'
                  : pro.status === 'PENDING_REVIEW'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {pro.status ?? 'Unknown'}
            </span>
          </div>

          {pro.bio && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bio</p>
              <p className="mt-1 text-[15px] text-slate-700">{pro.bio}</p>
            </div>
          )}

          {pro.years_experience != null && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Experience</p>
              <p className="mt-1 text-[15px] text-slate-700">{pro.years_experience} years</p>
            </div>
          )}

          {Array.isArray(pro.services) && pro.services.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Services ({pro.services.length})
              </p>
              <ul className="mt-2 space-y-1">
                {pro.services.map((svc: any, i: number) => (
                  <li key={i} className="text-[14px] text-slate-700">
                    {svc.title} — {svc.pricing_type} · {svc.price_sar ? `SAR ${svc.price_sar}` : 'Quote'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
