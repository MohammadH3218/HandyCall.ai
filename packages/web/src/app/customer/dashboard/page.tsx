'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import {
  IconClipboardText,
  IconCalendar,
  IconMessageCircle,
  IconCreditCard,
  IconSearch,
  IconArrowRight,
  IconChevronRight,
} from '@tabler/icons-react';

const QUICK_LINKS = [
  {
    href: '/customer/dashboard/requests',
    label: 'Requests',
    description: 'Review and edit your active job requests',
    icon: IconClipboardText,
  },
  {
    href: '/customer/dashboard/bookings',
    label: 'Bookings',
    description: 'View and manage your appointments',
    icon: IconCalendar,
  },
  {
    href: '/customer/dashboard/inbox',
    label: 'Inbox',
    description: 'Messages from your service pros',
    icon: IconMessageCircle,
  },
  {
    href: '/customer/dashboard/payments',
    label: 'Payments',
    description: 'Transaction history and receipts',
    icon: IconCreditCard,
  },
];

export default function CustomerDashboardHome() {
  const { user } = useAuthStore();
  const firstName = user?.first_name ?? null;

  return (
    <div className="max-w-2xl space-y-8">
      {/* Greeting */}
      <div className="border-b border-slate-100 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Manage your home service bookings and messages.
        </p>
      </div>

      {/* Find a pro — primary CTA */}
      <Link
        href="/search"
        className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-emerald-300 hover:shadow"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <IconSearch className="h-4.5 w-4.5" stroke={2} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Find a Pro</p>
            <p className="text-xs text-slate-400">Browse verified pros in your area</p>
          </div>
        </div>
        <IconArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-emerald-500" stroke={2} />
      </Link>

      {/* Quick links */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Dashboard
        </p>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {QUICK_LINKS.map((item, i) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50 ${
                  i < QUICK_LINKS.length - 1 ? 'border-b border-slate-100' : ''
                }`}
              >
                <Icon className="h-4.5 w-4.5 flex-shrink-0 text-slate-400" stroke={1.8} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.description}</p>
                </div>
                <IconChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300 transition group-hover:text-slate-500" stroke={2} />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent bookings — empty state */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Recent Activity
        </p>
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm">
          <IconCalendar className="mx-auto h-8 w-8 text-slate-200" stroke={1.5} />
          <p className="mt-3 text-sm font-medium text-slate-500">No bookings yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Your upcoming and past appointments will appear here.
          </p>
          <Link
            href="/search"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
          >
            <IconSearch className="h-3.5 w-3.5" stroke={2} />
            Find a Pro
          </Link>
        </div>
      </div>
    </div>
  );
}
