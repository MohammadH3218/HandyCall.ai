'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  IconCalendar,
  IconClock,
  IconCheck,
  IconX,
  IconMapPin,
  IconStar,
  IconMessageCircle,
  IconSearch,
} from '@tabler/icons-react';

// ── Types & mock data ─────────────────────────────────────────────────────────

type BookingStatus = 'upcoming' | 'in_progress' | 'completed' | 'cancelled';

interface Booking {
  id: string;
  service: string;
  pro: string;
  proAvatar: string;
  proColor: string;
  date: string;
  time: string;
  address: string;
  status: BookingStatus;
  price: string;
  notes?: string;
  rating?: number;
}

const BOOKINGS: Booking[] = [
  {
    id: '1',
    service: 'AC Repair',
    pro: 'Khalid Al-Rashidi',
    proAvatar: 'K',
    proColor: 'bg-blue-600',
    date: 'Mar 24, 2026',
    time: '2:00 PM',
    address: 'Al Olaya District, Riyadh',
    status: 'upcoming',
    price: 'SAR 150',
    notes: 'Samsung split unit 2.5 ton — not cooling, possibly low refrigerant.',
  },
  {
    id: '2',
    service: 'House Deep Cleaning',
    pro: 'Sara Al-Mutairi',
    proAvatar: 'S',
    proColor: 'bg-purple-600',
    date: 'Mar 27, 2026',
    time: '9:00 AM',
    address: 'Al Rawdah, Jeddah',
    status: 'upcoming',
    price: 'SAR 200',
    notes: '4 bedroom villa, pre-Eid cleaning.',
  },
  {
    id: '3',
    service: 'Electrical Repair',
    pro: 'Ahmed Al-Zahrani',
    proAvatar: 'A',
    proColor: 'bg-amber-600',
    date: 'Mar 19, 2026',
    time: '4:00 PM',
    address: 'Al Hamra, Jeddah',
    status: 'completed',
    price: 'SAR 120',
    rating: 5,
  },
  {
    id: '4',
    service: 'Plumbing — Leak Fix',
    pro: 'Omar Al-Hassan',
    proAvatar: 'O',
    proColor: 'bg-emerald-600',
    date: 'Mar 22, 2026',
    time: '11:00 AM',
    address: 'Al Malaz, Riyadh',
    status: 'completed',
    price: 'SAR 80',
    rating: 4,
  },
  {
    id: '5',
    service: 'Pest Control',
    pro: 'Faisal Al-Otaibi',
    proAvatar: 'F',
    proColor: 'bg-red-600',
    date: 'Mar 10, 2026',
    time: '10:00 AM',
    address: 'Al Rawabi, Riyadh',
    status: 'cancelled',
    price: 'SAR 250',
    notes: 'Cancelled — pro unavailable.',
  },
];

const STATUS_CONFIG: Record<BookingStatus, { label: string; pill: string; icon: React.ReactNode }> = {
  upcoming: {
    label: 'Upcoming',
    pill: 'bg-blue-50 text-blue-700 border border-blue-100',
    icon: <IconClock className="h-3.5 w-3.5" stroke={2} />,
  },
  in_progress: {
    label: 'In Progress',
    pill: 'bg-amber-50 text-amber-700 border border-amber-100',
    icon: <IconClock className="h-3.5 w-3.5" stroke={2} />,
  },
  completed: {
    label: 'Completed',
    pill: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    icon: <IconCheck className="h-3.5 w-3.5" stroke={2} />,
  },
  cancelled: {
    label: 'Cancelled',
    pill: 'bg-red-50 text-red-600 border border-red-100',
    icon: <IconX className="h-3.5 w-3.5" stroke={2} />,
  },
};

const TABS: { key: 'all' | BookingStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

// ── Review modal ──────────────────────────────────────────────────────────────

function ReviewModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <IconCheck className="h-7 w-7" stroke={2} />
          </div>
          <p className="text-lg font-bold text-slate-900">Review submitted!</p>
          <p className="mt-2 text-sm text-slate-500">Thanks for your feedback.</p>
          <button
            onClick={onClose}
            className="mt-6 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Rate {booking.pro}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <IconX className="h-5 w-5" stroke={1.5} />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">How was your {booking.service} experience?</p>

        {/* Stars */}
        <div className="mb-5 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              className="transition hover:scale-110"
            >
              <IconStar
                className={`h-8 w-8 ${
                  star <= (hovered || rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                }`}
                stroke={star <= (hovered || rating) ? 0 : 1.5}
              />
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tell others about your experience (optional)"
          rows={3}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition resize-none"
        />

        <button
          onClick={() => rating > 0 && setSubmitted(true)}
          disabled={rating === 0}
          className="mt-4 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40"
        >
          Submit Review
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CustomerBookingsPage() {
  const [tab, setTab] = useState<'all' | BookingStatus>('all');
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);

  const visible = tab === 'all' ? BOOKINGS : BOOKINGS.filter((b) => b.status === tab);

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
          <p className="mt-1 text-sm text-slate-500">Manage all your service appointments.</p>
        </div>
        <Link
          href="/search"
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          <IconSearch className="h-4 w-4" stroke={2} />
          Book a Pro
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              tab === t.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Booking cards */}
      <div className="space-y-3">
        {visible.length === 0 && (
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
        )}

        {visible.map((booking) => {
          const status = STATUS_CONFIG[booking.status];
          return (
            <div
              key={booking.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <span
                  className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full ${booking.proColor} text-sm font-bold text-white`}
                >
                  {booking.proAvatar}
                </span>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{booking.service}</p>
                      <p className="text-xs text-slate-500">{booking.pro}</p>
                    </div>
                    <span
                      className={`flex flex-shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.pill}`}
                    >
                      {status.icon}
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <IconCalendar className="h-3.5 w-3.5 text-slate-400" stroke={1.8} />
                      {booking.date}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <IconClock className="h-3.5 w-3.5 text-slate-400" stroke={1.8} />
                      {booking.time}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <IconMapPin className="h-3.5 w-3.5 text-slate-400" stroke={1.8} />
                      {booking.address}
                    </span>
                  </div>

                  {booking.notes && (
                    <p className="mt-2 text-xs italic text-slate-400">{booking.notes}</p>
                  )}

                  {/* Rating display for completed */}
                  {booking.status === 'completed' && booking.rating && (
                    <div className="mt-2 flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <IconStar
                          key={i}
                          className={`h-3.5 w-3.5 ${i < booking.rating! ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                          stroke={0}
                        />
                      ))}
                      <span className="ml-1 text-xs text-slate-400">Your rating</span>
                    </div>
                  )}
                </div>

                {/* Price */}
                <p className="flex-shrink-0 text-sm font-bold text-slate-800">{booking.price}</p>
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                {booking.status === 'upcoming' && (
                  <>
                    <Link
                      href="/customer/dashboard/inbox"
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
                    >
                      <IconMessageCircle className="h-3.5 w-3.5" stroke={2} />
                      Message Pro
                    </Link>
                    <button className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50">
                      Cancel
                    </button>
                  </>
                )}
                {booking.status === 'completed' && !booking.rating && (
                  <button
                    onClick={() => setReviewBooking(booking)}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                  >
                    <IconStar className="h-3.5 w-3.5" stroke={2} />
                    Leave a Review
                  </button>
                )}
                {booking.status === 'completed' && (
                  <Link
                    href="/search"
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
                  >
                    Book Again
                  </Link>
                )}
                {booking.status === 'cancelled' && (
                  <Link
                    href="/search"
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <IconSearch className="h-3.5 w-3.5" stroke={2} />
                    Find a Pro
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Review modal */}
      {reviewBooking && (
        <ReviewModal booking={reviewBooking} onClose={() => setReviewBooking(null)} />
      )}
    </div>
  );
}
