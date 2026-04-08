'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  IconAlertCircle,
  IconCalendar,
  IconClock,
  IconMapPin,
  IconMessageCircle,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { apiClient } from '@/lib/api-client';

type BookingTab = 'all' | 'upcoming' | 'completed' | 'cancelled';
type CancellationInfo = {
  can_cancel: boolean;
  policy_mode: 'ANYTIME' | 'BEFORE_HOURS' | 'NO_CANCELLATIONS';
  policy_hours?: number;
  cutoff_at?: number;
  message: string;
};

type CustomerBooking = {
  appointment_id: string;
  company_id: string;
  company_name?: string;
  service_type?: string;
  scheduled_start: number;
  scheduled_end?: number;
  status: string;
  address?: { street?: string; city?: string; state?: string; zip?: string };
  notes?: string;
  cancellation?: CancellationInfo;
};

function formatDateTime(timestamp: number) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return 'Unknown time';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatTimeRange(start?: number, end?: number) {
  if (!start) return '';
  const startDate = new Date(start);
  if (!Number.isFinite(startDate.getTime())) return '';
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (!end) return formatter.format(startDate);
  const endDate = new Date(end);
  if (!Number.isFinite(endDate.getTime())) return formatter.format(startDate);
  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}

function formatAddress(address?: CustomerBooking['address']) {
  return [address?.street, address?.city, address?.state, address?.zip].filter(Boolean).join(', ');
}

function getBookingTab(booking: CustomerBooking): Exclude<BookingTab, 'all'> {
  const status = String(booking.status || '').toUpperCase();
  if (status === 'CANCELLED') return 'cancelled';
  if (status === 'COMPLETED' || status === 'NO_SHOW') return 'completed';
  return 'upcoming';
}

function getStatusPill(booking: CustomerBooking) {
  const tab = getBookingTab(booking);
  if (tab === 'cancelled') {
    return 'bg-red-50 text-red-600 border border-red-100';
  }
  if (tab === 'completed') {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
  }
  return 'bg-blue-50 text-blue-700 border border-blue-100';
}

export default function CustomerBookingsPage() {
  const [tab, setTab] = useState<BookingTab>('all');
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getCustomerAppointments();
      setBookings(Array.isArray(response?.appointments) ? response.appointments : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBookings();
  }, []);

  const visibleBookings = useMemo(() => {
    if (tab === 'all') return bookings;
    return bookings.filter((booking) => getBookingTab(booking) === tab);
  }, [bookings, tab]);

  const handleCancel = async (booking: CustomerBooking) => {
    if (!booking.cancellation?.can_cancel) return;
    const confirmed = window.confirm('Cancel this appointment?');
    if (!confirmed) return;

    try {
      setCancellingId(booking.appointment_id);
      setError(null);
      setNotice(null);
      await apiClient.cancelCustomerAppointment(booking.appointment_id);
      setNotice('Appointment cancelled.');
      await loadBookings();
    } catch (err: any) {
      setError(err?.message || 'Unable to cancel appointment.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
          <p className="mt-1 text-sm text-slate-500">View upcoming visits and manage cancellations based on each pro&apos;s policy.</p>
        </div>
        <Link
          href="/search"
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          <IconSearch className="h-4 w-4" stroke={2} />
          Book a Pro
        </Link>
      </div>

      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {[
          { key: 'all', label: 'All' },
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'completed', label: 'Completed' },
          { key: 'cancelled', label: 'Cancelled' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key as BookingTab)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              tab === item.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading bookings...</div>
      ) : null}

      {!loading && visibleBookings.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
          <IconCalendar className="mx-auto mb-3 h-10 w-10 text-slate-200" stroke={1.5} />
          <p className="text-sm font-medium text-slate-500">No bookings here yet.</p>
          <Link
            href="/search"
            className="mt-4 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Find a Pro
          </Link>
        </div>
      ) : null}

      <div className="space-y-3">
        {visibleBookings.map((booking) => {
          const canCancel = Boolean(booking.cancellation?.can_cancel);
          const address = formatAddress(booking.address);

          return (
            <div key={`${booking.company_id}:${booking.appointment_id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-bold text-slate-900">{booking.service_type || 'Appointment'}</p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusPill(booking)}`}>
                      {getBookingTab(booking) === 'cancelled'
                        ? 'Cancelled'
                        : getBookingTab(booking) === 'completed'
                          ? 'Completed'
                          : 'Upcoming'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{booking.company_name || 'HandyCall Pro'}</p>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <IconCalendar className="h-3.5 w-3.5 text-slate-400" stroke={1.8} />
                      {formatDateTime(booking.scheduled_start)}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <IconClock className="h-3.5 w-3.5 text-slate-400" stroke={1.8} />
                      {formatTimeRange(booking.scheduled_start, booking.scheduled_end)}
                    </span>
                    {address ? (
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <IconMapPin className="h-3.5 w-3.5 text-slate-400" stroke={1.8} />
                        {address}
                      </span>
                    ) : null}
                  </div>

                  {booking.cancellation ? (
                    <div className={`mt-4 rounded-xl px-3 py-2 text-xs ${
                      canCancel
                        ? 'border border-emerald-100 bg-emerald-50 text-emerald-700'
                        : 'border border-amber-100 bg-amber-50 text-amber-700'
                    }`}>
                      <div className="flex items-start gap-2">
                        <IconAlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" stroke={1.8} />
                        <div>
                          <p className="font-semibold">
                            {canCancel ? 'Cancellation available' : 'Cancellation unavailable'}
                          </p>
                          <p className="mt-0.5">{booking.cancellation.message}</p>
                          {booking.cancellation.cutoff_at ? (
                            <p className="mt-0.5 text-[11px] opacity-80">
                              Cutoff: {formatDateTime(booking.cancellation.cutoff_at)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {booking.notes ? (
                    <p className="mt-3 text-xs italic text-slate-400">{booking.notes}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 md:w-[220px] md:justify-end">
                  {getBookingTab(booking) === 'upcoming' ? (
                    <>
                      <Link
                        href="/customer/dashboard/inbox"
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
                      >
                        <IconMessageCircle className="h-3.5 w-3.5" stroke={2} />
                        Message Pro
                      </Link>
                      <button
                        onClick={() => void handleCancel(booking)}
                        disabled={!canCancel || cancellingId === booking.appointment_id}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                          canCancel
                            ? 'border border-red-100 text-red-500 hover:bg-red-50'
                            : 'cursor-not-allowed border border-slate-200 text-slate-300'
                        }`}
                      >
                        {cancellingId === booking.appointment_id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    </>
                  ) : null}

                  {getBookingTab(booking) === 'cancelled' ? (
                    <Link
                      href="/search"
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      <IconSearch className="h-3.5 w-3.5" stroke={2} />
                      Find a Pro
                    </Link>
                  ) : null}

                  {getBookingTab(booking) === 'completed' ? (
                    <Link
                      href="/search"
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
                    >
                      Book Again
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
