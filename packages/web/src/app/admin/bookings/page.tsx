'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { StatusBadge } from '@/components/admin/status-badge';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { IconLoader2 } from '@tabler/icons-react';

const TABS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING_CONFIRMATION' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

function BookingsListInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams?.get('status') ?? '';
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ bookingId: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiClient.adminListBookings(statusFilter ? { status: statusFilter } : undefined);
      setBookings(data ?? []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  return (
    <div className="px-8 py-10">
      <h1 className="text-[26px] font-bold text-slate-900">Bookings</h1>

      <div className="mt-5 flex flex-wrap gap-1 border-b border-border/60">
        {TABS.map((t) => (
          <button key={t.value} type="button"
            onClick={() => router.push(`/admin/bookings${t.value ? `?status=${t.value}` : ''}`)}
            className={`px-4 py-2 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
              statusFilter === t.value ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center"><IconLoader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border/80 bg-white shadow-sm">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Service</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">No bookings found.</td></tr>
              ) : bookings.map((b: any) => (
                <tr key={b.booking_id} className="border-b border-border/40 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={`/admin/bookings/${b.booking_id}`} className="font-mono text-[12px] text-emerald-600 hover:underline">{b.booking_id?.slice(0, 8)}…</Link>
                  </td>
                  <td className="px-5 py-3 text-slate-700">{b.service_title ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-500">{b.scheduled_at ? new Date(b.scheduled_at).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-3 text-slate-700">{b.service_price_sar != null ? `SAR ${(b.service_price_sar / 100).toFixed(2)}` : '—'}</td>
                  <td className="px-5 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1.5">
                      <Link href={`/admin/bookings/${b.booking_id}`} className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200">View</Link>
                      {!['COMPLETED', 'CANCELLED'].includes(b.status) && (
                        <button type="button" onClick={() => setConfirm({ bookingId: b.booking_id })} className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100">Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          await apiClient.adminCancelBooking(confirm.bookingId, 'Cancelled by admin');
          setConfirm(null);
          load();
        }}
        title="Cancel booking?"
        description="This booking will be cancelled and the customer notified."
        confirmLabel="Cancel booking"
        destructive
      />
    </div>
  );
}

export default function BookingsPage() {
  return <Suspense fallback={<div className="flex h-64 items-center justify-center"><IconLoader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>}><BookingsListInner /></Suspense>;
}
