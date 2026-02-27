'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconRefresh, IconCalendarCheck, IconAlertCircle, IconCircleCheck, IconCircleX, IconClock } from '@tabler/icons-react';

interface Subscription {
  id: string;
  service_name: string;
  provider_name: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  next_service_date: string;
  price_cents: number;
  status: 'active' | 'paused' | 'cancelled';
  created_at: string;
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Every week',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  quarterly: 'Every 3 months',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof IconCircleCheck }> = {
  active: { label: 'Active', color: 'border border-emerald-100 bg-emerald-50 text-emerald-700', icon: IconCircleCheck },
  paused: { label: 'Paused', color: 'border border-amber-100 bg-amber-50 text-amber-700', icon: IconClock },
  cancelled: { label: 'Cancelled', color: 'border border-slate-200 bg-slate-100 text-slate-600', icon: IconCircleX },
};

export default function PortalSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: integrate with customer subscriptions API when portal auth is ready
    setLoading(false);
    setSubscriptions([]);
  }, []);

  const formatCents = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Recurring Services</h1>
        <p className="mt-1 text-slate-500">
          Manage your recurring bookings and scheduled service plans.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-5 w-40 rounded bg-slate-200" />
                  <div className="h-4 w-28 rounded bg-slate-100" />
                </div>
                <div className="h-6 w-16 rounded-full bg-slate-100" />
              </div>
              <div className="mt-4 flex gap-4">
                <div className="h-4 w-24 rounded bg-slate-100" />
                <div className="h-4 w-24 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
              <IconRefresh className="h-7 w-7 text-slate-400" stroke={1.5} />
            </div>
          </div>
          <p className="font-semibold text-slate-900">No recurring services</p>
          <p className="mt-1 text-sm text-slate-500">
            Set up a recurring plan with a pro to have services scheduled automatically.
          </p>
          <Link
            href="/find-pros"
            className="mt-5 inline-flex rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Browse Service Pros
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((sub) => {
            const statusCfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.active;
            const StatusIcon = statusCfg.icon;

            return (
              <div
                key={sub.id}
                className={`rounded-xl border bg-white p-5 transition-opacity ${
                  sub.status === 'cancelled' ? 'opacity-60 border-slate-200' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                      <IconCalendarCheck className="h-5 w-5 text-slate-600" stroke={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{sub.service_name}</h3>
                      <p className="text-sm text-slate-500">{sub.provider_name}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCfg.color}`}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {statusCfg.label}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Frequency</p>
                    <p className="font-medium text-slate-800">{FREQUENCY_LABELS[sub.frequency] ?? sub.frequency}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Next Service</p>
                    <p className="font-medium text-slate-800">{formatDate(sub.next_service_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Rate</p>
                    <p className="font-medium text-slate-800">{formatCents(sub.price_cents)} / visit</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Since</p>
                    <p className="font-medium text-slate-800">{formatDate(sub.created_at)}</p>
                  </div>
                </div>

                {sub.status === 'active' && (
                  <div className="mt-4 flex gap-2">
                    <button type="button" className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50">
                      Pause
                    </button>
                    <button type="button" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-red-600">
                      Cancel
                    </button>
                  </div>
                )}

                {sub.status === 'paused' && (
                  <div className="mt-4">
                    <button type="button" className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50">
                      Resume
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-start gap-3">
          <IconAlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" stroke={1.5} />
          <div className="text-sm text-slate-500">
            <p className="font-medium text-slate-700 mb-1">About recurring services</p>
            <p>
              Recurring plans are set up directly with your pro during booking. You'll be charged
              per visit according to your agreed rate. Cancel or pause any time with at least 24 hours
              notice before the next scheduled visit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
