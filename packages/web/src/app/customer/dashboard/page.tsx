'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import {
  IconCalendar,
  IconMessageCircle,
  IconCreditCard,
  IconSearch,
  IconStar,
  IconArrowRight,
  IconClock,
  IconCheck,
  IconX,
} from '@tabler/icons-react';

// ── Mock data ─────────────────────────────────────────────────────────────────

const RECENT_BOOKINGS = [
  {
    id: '1',
    service: 'AC Repair',
    pro: 'Khalid Al-Rashidi',
    date: 'Today, 2:00 PM',
    status: 'upcoming',
    price: 'SAR 150',
    avatar: 'K',
    color: 'bg-blue-600',
  },
  {
    id: '2',
    service: 'House Cleaning',
    pro: 'Sara Al-Mutairi',
    date: 'Yesterday, 10:00 AM',
    status: 'completed',
    price: 'SAR 200',
    avatar: 'S',
    color: 'bg-purple-600',
  },
  {
    id: '3',
    service: 'Electrical',
    pro: 'Ahmed Al-Zahrani',
    date: 'Mar 18, 4:00 PM',
    status: 'completed',
    price: 'SAR 120',
    avatar: 'A',
    color: 'bg-amber-600',
  },
];

const SUGGESTED_PROS = [
  {
    id: '1',
    name: 'Khalid Al-Rashidi',
    service: 'AC & HVAC',
    serviceAr: 'تكييف',
    city: 'Riyadh',
    rating: 4.9,
    reviews: 142,
    from: 'SAR 150',
    avatar: 'K',
    color: 'bg-blue-600',
    badge: 'Top Pro',
  },
  {
    id: '2',
    name: 'Sara Al-Mutairi',
    service: 'Cleaning',
    serviceAr: 'تنظيف',
    city: 'Riyadh',
    rating: 4.9,
    reviews: 203,
    from: 'SAR 200',
    avatar: 'S',
    color: 'bg-purple-600',
    badge: 'Verified',
  },
  {
    id: '3',
    name: 'Omar Al-Hassan',
    service: 'Plumbing',
    serviceAr: 'سباكة',
    city: 'Riyadh',
    rating: 4.7,
    reviews: 88,
    from: 'SAR 100',
    avatar: 'O',
    color: 'bg-emerald-600',
    badge: null,
  },
];

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  upcoming: {
    label: 'Upcoming',
    color: 'bg-blue-50 text-blue-700',
    icon: <IconClock className="h-3.5 w-3.5" stroke={2} />,
  },
  completed: {
    label: 'Completed',
    color: 'bg-emerald-50 text-emerald-700',
    icon: <IconCheck className="h-3.5 w-3.5" stroke={2} />,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-50 text-red-600',
    icon: <IconX className="h-3.5 w-3.5" stroke={2} />,
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function CustomerDashboardHome() {
  const { user } = useAuthStore();
  const firstName = user?.first_name ?? 'there';

  return (
    <div className="max-w-5xl space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Hey, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here's what's happening with your home services.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link
          href="/search"
          className="group flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-emerald-300 hover:shadow"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-100">
            <IconSearch className="h-5 w-5" stroke={1.8} />
          </div>
          <span className="text-sm font-medium text-slate-700">Find a Pro</span>
        </Link>
        <Link
          href="/customer/dashboard/bookings"
          className="group flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-emerald-300 hover:shadow"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition group-hover:bg-blue-100">
            <IconCalendar className="h-5 w-5" stroke={1.8} />
          </div>
          <span className="text-sm font-medium text-slate-700">Bookings</span>
        </Link>
        <Link
          href="/customer/dashboard/inbox"
          className="group flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-emerald-300 hover:shadow"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-purple-50 text-purple-600 transition group-hover:bg-purple-100">
            <IconMessageCircle className="h-5 w-5" stroke={1.8} />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
              2
            </span>
          </div>
          <span className="text-sm font-medium text-slate-700">Inbox</span>
        </Link>
        <Link
          href="/customer/dashboard/payments"
          className="group flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-emerald-300 hover:shadow"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600 transition group-hover:bg-amber-100">
            <IconCreditCard className="h-5 w-5" stroke={1.8} />
          </div>
          <span className="text-sm font-medium text-slate-700">Payments</span>
        </Link>
      </div>

      {/* Recent bookings + suggested pros */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent bookings */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-800">Recent Bookings</h2>
              <Link
                href="/customer/dashboard/bookings"
                className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                View all <IconArrowRight className="h-3.5 w-3.5" stroke={2} />
              </Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {RECENT_BOOKINGS.map((booking) => {
                const status = STATUS_MAP[booking.status];
                return (
                  <li key={booking.id}>
                    <Link
                      href={`/customer/dashboard/bookings`}
                      className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50"
                    >
                      <span
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${booking.color} text-sm font-bold text-white`}
                      >
                        {booking.avatar}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {booking.service}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {booking.pro} · {booking.date}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-semibold text-slate-800">{booking.price}</span>
                        <span
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}
                        >
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Suggested pros */}
        <div>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-800">Pros You've Used</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {SUGGESTED_PROS.map((pro) => (
                <li key={pro.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${pro.color} text-sm font-bold text-white`}
                    >
                      {pro.avatar}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{pro.name}</p>
                      <p className="text-xs text-slate-400">{pro.service} · {pro.city}</p>
                      <div className="mt-1 flex items-center gap-1">
                        <IconStar className="h-3 w-3 fill-amber-400 text-amber-400" stroke={0} />
                        <span className="text-xs font-medium text-slate-700">{pro.rating}</span>
                        <span className="text-xs text-slate-400">({pro.reviews})</span>
                      </div>
                    </div>
                    {pro.badge && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        {pro.badge}
                      </span>
                    )}
                  </div>
                  <Link
                    href="/search"
                    className="mt-3 block w-full rounded-lg border border-slate-200 py-2 text-center text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
                  >
                    Book again
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Unread messages banner */}
      <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <IconMessageCircle className="h-5 w-5" stroke={1.8} />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">2 unread messages</p>
            <p className="text-xs text-emerald-600">Khalid replied about your AC appointment.</p>
          </div>
        </div>
        <Link
          href="/customer/dashboard/inbox"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
        >
          View
        </Link>
      </div>
    </div>
  );
}
