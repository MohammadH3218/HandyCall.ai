'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import {
  IconHome,
  IconCalendar,
  IconMessage,
  IconRefresh,
  IconCreditCard,
  IconSettings,
  IconX,
  IconMenu2,
} from '@tabler/icons-react';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/portal', label: 'Home', icon: <IconHome stroke={1.5} className="h-5 w-5" />, exact: true },
    { href: '/portal/bookings', label: 'My Bookings', icon: <IconCalendar stroke={1.5} className="h-5 w-5" /> },
    { href: '/portal/messages', label: 'Messages', icon: <IconMessage stroke={1.5} className="h-5 w-5" /> },
    { href: '/portal/subscriptions', label: 'Subscriptions', icon: <IconRefresh stroke={1.5} className="h-5 w-5" /> },
    { href: '/portal/payments', label: 'Payment History', icon: <IconCreditCard stroke={1.5} className="h-5 w-5" /> },
    { href: '/portal/settings', label: 'Settings', icon: <IconSettings stroke={1.5} className="h-5 w-5" /> },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {open && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50
          h-screen w-64 bg-white border-r border-slate-200 flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="lg:hidden absolute top-4 right-4">
          <button
            onClick={() => setOpen(false)}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <IconX stroke={1.5} className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 border-b border-slate-200">
          <Logo variant="words" width={140} height={32} />
          <p className="mt-1 text-xs text-slate-500 font-medium">Customer Portal</p>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const active = link.exact ? pathname === link.href : pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`group flex items-center px-4 py-3 text-sm rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className={`mr-3 ${active ? 'text-emerald-600' : 'text-slate-500 group-hover:text-slate-700'}`}>
                  {link.icon}
                </span>
                <span className="font-medium">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <Link
            href="/find-pros"
            className="block text-center text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Find Service Pros
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <button
              className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors lg:hidden"
              onClick={() => setOpen(true)}
            >
              <IconMenu2 stroke={1.5} className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <Link href="/login" className="text-sm text-slate-500 hover:text-slate-900">
                Sign in
              </Link>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
