'use client';

import Link from 'next/link';
import { Calendar, CreditCard, Search, Settings } from 'lucide-react';

const quickLinks = [
  {
    href: '/portal/bookings',
    icon: Calendar,
    title: 'My Bookings',
    description: 'View and manage your upcoming appointments',
    color: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    href: '/portal/payments',
    icon: CreditCard,
    title: 'Payment History',
    description: 'View past charges and receipts',
    color: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    href: '/find-pros',
    icon: Search,
    title: 'Find a Pro',
    description: 'Search local service professionals',
    color: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  {
    href: '/portal/settings',
    icon: Settings,
    title: 'Account Settings',
    description: 'Update your profile and preferences',
    color: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
];

export default function PortalPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-muted-foreground">Manage your bookings, payments, and account settings.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${link.color}`}>
                <Icon className={`h-5 w-5 ${link.iconColor}`} />
              </div>
              <div>
                <p className="font-semibold text-slate-900 group-hover:text-emerald-700">{link.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{link.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
