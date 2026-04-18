'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { StatCard } from '@/components/admin/stat-card';
import { IconLoader2 } from '@tabler/icons-react';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.adminGetStats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex h-64 items-center justify-center"><IconLoader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>;

  const completionRate = stats?.total_bookings > 0
    ? ((stats.completed_bookings / stats.total_bookings) * 100).toFixed(1)
    : '0';

  return (
    <div className="px-8 py-10">
      <h1 className="text-[26px] font-bold text-slate-900">Analytics</h1>
      <p className="mt-1 text-[14px] text-slate-400">Platform metrics snapshot.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Pros" value={stats?.total_pros ?? 0} />
        <StatCard label="Active Pros" value={stats?.active_pros ?? 0} accent />
        <StatCard label="Pending Review" value={stats?.pending_pros ?? 0} />
        <StatCard label="Total Customers" value={stats?.total_customers ?? 0} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Bookings" value={stats?.total_bookings ?? 0} />
        <StatCard label="Completed" value={stats?.completed_bookings ?? 0} accent />
        <StatCard label="Completion Rate" value={`${completionRate}%`} />
        <StatCard label="Platform Revenue" value={`SAR ${(stats?.platform_revenue_sar ?? 0).toFixed(2)}`} accent />
      </div>

      <div className="mt-8 rounded-2xl border border-border/80 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-[15px] font-semibold text-slate-900">Booking Status Breakdown</h2>
        <p className="text-[13px] text-slate-400">
          Full time-series analytics and charts are coming soon. Current data reflects all-time platform totals.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: 'Total Pros', value: stats?.total_pros ?? 0, color: 'bg-slate-200' },
            { label: 'Active Pros', value: stats?.active_pros ?? 0, color: 'bg-emerald-200' },
            { label: 'Pending Review', value: stats?.pending_pros ?? 0, color: 'bg-amber-200' },
            { label: 'Total Customers', value: stats?.total_customers ?? 0, color: 'bg-sky-200' },
            { label: 'Total Bookings', value: stats?.total_bookings ?? 0, color: 'bg-slate-200' },
            { label: 'Completed', value: stats?.completed_bookings ?? 0, color: 'bg-emerald-200' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-3">
              <div className={`h-3 w-3 rounded-full ${item.color}`} />
              <div>
                <p className="text-[11px] text-slate-400">{item.label}</p>
                <p className="text-[16px] font-bold text-slate-900">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
