'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { StatCard } from '@/components/admin/stat-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { IconLoader2, IconCheck, IconX } from '@tabler/icons-react';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [pendingPros, setPendingPros] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject';
    proId: string;
    name: string;
  } | null>(null);

  const load = async () => {
    try {
      const [s, pending, bookings] = await Promise.all([
        apiClient.adminGetStats(),
        apiClient.adminListPros({ status: 'PENDING_REVIEW', limit: 5 }),
        apiClient.adminListBookings({ limit: 10 }),
      ]);
      setStats(s);
      setPendingPros(pending ?? []);
      setRecentBookings(bookings ?? []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <IconLoader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="px-8 py-10">
      <h1 className="text-[26px] font-bold text-slate-900">Overview</h1>
      <p className="mt-1 text-[14px] text-slate-400">Platform health at a glance.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Pros" value={stats?.total_pros ?? 0} />
        <StatCard label="Active Pros" value={stats?.active_pros ?? 0} accent />
        <StatCard label="Total Customers" value={stats?.total_customers ?? 0} />
        <StatCard label="Total Bookings" value={stats?.total_bookings ?? 0} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Completed" value={stats?.completed_bookings ?? 0} />
        <StatCard label="Platform Revenue" value={`SAR ${(stats?.platform_revenue_sar ?? 0).toFixed(2)}`} accent />
        <StatCard label="Pending Approvals" value={stats?.pending_pros ?? 0} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Pending approvals */}
        <div className="rounded-2xl border border-border/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <h2 className="text-[15px] font-semibold text-slate-900">Pending Approvals</h2>
            <Link href="/admin/pros?status=PENDING_REVIEW" className="text-[13px] text-emerald-600 hover:underline">View all</Link>
          </div>
          {pendingPros.length === 0 ? (
            <p className="px-5 py-6 text-[14px] text-slate-400">No pending approvals.</p>
          ) : (
            <ul>
              {pendingPros.map((pro: any) => (
                <li key={pro.pro_id} className="flex items-center justify-between gap-3 border-b border-border/40 px-5 py-3 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-slate-900">{pro.first_name} {pro.last_name}</p>
                    <p className="truncate text-[12px] text-slate-400">{pro.email}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button"
                      onClick={() => setConfirmAction({ type: 'approve', proId: pro.pro_id, name: `${pro.first_name} ${pro.last_name}` })}
                      className="flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 transition hover:bg-emerald-100">
                      <IconCheck className="h-3.5 w-3.5" stroke={2.5} /> Approve
                    </button>
                    <button type="button"
                      onClick={() => setConfirmAction({ type: 'reject', proId: pro.pro_id, name: `${pro.first_name} ${pro.last_name}` })}
                      className="flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-[12px] font-semibold text-rose-700 transition hover:bg-rose-100">
                      <IconX className="h-3.5 w-3.5" stroke={2.5} /> Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent bookings */}
        <div className="rounded-2xl border border-border/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <h2 className="text-[15px] font-semibold text-slate-900">Recent Bookings</h2>
            <Link href="/admin/bookings" className="text-[13px] text-emerald-600 hover:underline">View all</Link>
          </div>
          {recentBookings.length === 0 ? (
            <p className="px-5 py-6 text-[14px] text-slate-400">No bookings yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border/40 text-left text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-2">ID</th>
                    <th className="px-5 py-2">Status</th>
                    <th className="px-5 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b: any) => (
                    <tr key={b.booking_id} className="border-b border-border/40 hover:bg-slate-50">
                      <td className="px-5 py-2.5">
                        <Link href={`/admin/bookings/${b.booking_id}`} className="font-mono text-[12px] text-emerald-600 hover:underline">{b.booking_id?.slice(0, 8)}…</Link>
                      </td>
                      <td className="px-5 py-2.5"><StatusBadge status={b.status} /></td>
                      <td className="px-5 py-2.5 text-slate-700">
                        {b.service_price_sar != null ? `SAR ${(b.service_price_sar / 100).toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={async () => {
          if (!confirmAction) return;
          if (confirmAction.type === 'approve') await apiClient.adminApprovePro(confirmAction.proId);
          else await apiClient.adminRejectPro(confirmAction.proId);
          setConfirmAction(null);
          load();
        }}
        title={confirmAction?.type === 'approve' ? 'Approve pro?' : 'Reject pro?'}
        description={`${confirmAction?.type === 'approve' ? 'Approve' : 'Reject'} ${confirmAction?.name ?? ''}?`}
        confirmLabel={confirmAction?.type === 'approve' ? 'Approve' : 'Reject'}
        destructive={confirmAction?.type === 'reject'}
      />
    </div>
  );
}
