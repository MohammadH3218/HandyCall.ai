'use client';

import Link from 'next/link';
import {
  IconCalendar,
  IconCreditCard,
  IconSearch,
  IconSettings,
  IconChevronRight,
} from '@tabler/icons-react';

const quickLinks = [
  {
    href: '/portal/bookings',
    icon: IconCalendar,
    title: 'My Bookings',
    description: 'View and manage your upcoming appointments',
  },
  {
    href: '/portal/payments',
    icon: IconCreditCard,
    title: 'Payment History',
    description: 'View past charges and receipts',
  },
  {
    href: '/find-pros',
    icon: IconSearch,
    title: 'Find a Pro',
    description: 'Search local service professionals',
  },
  {
    href: '/portal/settings',
    icon: IconSettings,
    title: 'Account Settings',
    description: 'Update your profile and preferences',
  },
];

export default function PortalPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-slate-500">Manage your bookings, payments, and account settings.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 group-hover:border-emerald-100 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                <Icon stroke={1.5} className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 group-hover:text-emerald-700">{link.title}</p>
                <p className="mt-0.5 text-sm text-slate-500">{link.description}</p>
              </div>
              <IconChevronRight stroke={1.5} className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 shrink-0 transition-colors" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
