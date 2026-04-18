'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { StatusBadge } from '@/components/admin/status-badge';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { IconLoader2, IconArrowLeft } from '@tabler/icons-react';

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);

  const load = async () => {
    try { setBooking(await apiClient.adminGetBooking(id)); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="flex h-64 items-center justify-center"><IconLoader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>;
  if (!booking) return <div className="px-8 py-10 text-slate-500">Booking not found.</div>;

  const sarAmount = (halalas?: number) => halalas != null ? `SAR ${(halalas / 100).toFixed(2)}` : '—';
  const vat = booking.vat_sar != null ? sarAmount(booking.vat_sar) : booking.service_price_sar != null ? sarAmount(Math.round(booking.service_price_sar * 0.15)) : '—';
  const platformFee = booking.platform_fee_sar != null ? sarAmount(booking.platform_fee_sar) : booking.service_price_sar != null ? sarAmount(Math.round(booking.service_price_sar * 0.15)) : '—';

  return (
    <div className="px-8 py-10">
      <button type="button" onClick={() => router.back()} className="mb-5 flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700">
        <IconArrowLeft className="h-4 w-4" stroke={1.8} /> Back
      </button>

      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900">Booking #{booking.booking_id?.slice(0, 8)}</h1>
          <p className="mt-1 text-[13px] text-slate-400">{booking.created_at ? new Date(booking.created_at).toLocaleString() : ''}</p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/80 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-[15px] font-semibold text-slate-900">Details</h2>
          <div className="space-y-2 text-[13px]">
            {[
              ['Service', booking.service_title],
              ['Category', booking.category],
              ['District', booking.district],
              ['Scheduled', booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString() : undefined],
              ['Pro ID', booking.pro_id],
              ['Customer ID', booking.customer_id],
            ].map(([label, value]) => value ? (
              <div key={String(label)} className="flex justify-between gap-4">
                <span className="text-slate-400">{label}</span>
                <span className="text-right text-slate-700">{String(value)}</span>
              </div>
            ) : null)}
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-[15px] font-semibold text-slate-900">Financials</h2>
          <div className="space-y-2 text-[13px]">
            {[
              ['Service Price', sarAmount(booking.service_price_sar)],
              ['VAT (15%)', vat],
              ['Platform Fee (15%)', platformFee],
              ['Payment Status', booking.payment_status],
              ['Payment Method', booking.payment_method],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between gap-4">
                <span className="text-slate-400">{label}</span>
                <span className="text-right font-medium text-slate-700">{String(value ?? '—')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!['COMPLETED', 'CANCELLED'].includes(booking.status) && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <h3 className="text-[14px] font-semibold text-rose-800">Danger Zone</h3>
          <p className="mt-1 text-[13px] text-rose-600">Cancelling a booking cannot be undone.</p>
          <button type="button" onClick={() => setShowCancel(true)} className="mt-3 rounded-xl bg-rose-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-rose-700">
            Cancel Booking
          </button>
        </div>
      )}

      <ConfirmDialog
        open={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={async () => {
          await apiClient.adminCancelBooking(id, 'Cancelled by admin');
          setShowCancel(false);
          load();
        }}
        title="Cancel booking?"
        description="This booking will be cancelled. This cannot be undone."
        confirmLabel="Cancel booking"
        destructive
      />
    </div>
  );
}
