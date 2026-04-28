'use client';

import Link from 'next/link';
import {
  IconAdjustments,
  IconChartBar,
  IconCreditCard,
  IconCalendarEvent,
  IconHome2,
  IconMessageCircleStar,
  IconShieldCheck,
  IconUsers,
  IconUserCheck,
  IconLogout,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', label: 'Overview', icon: IconHome2 },
  { href: '/admin/pros', label: 'Pros', icon: IconUserCheck },
  { href: '/admin/customers', label: 'Customers', icon: IconUsers },
  { href: '/admin/bookings', label: 'Bookings', icon: IconCalendarEvent },
  { href: '/admin/reviews', label: 'Reviews', icon: IconMessageCircleStar },
  { href: '/admin/payments', label: 'Payments', icon: IconCreditCard },
  { href: '/admin/analytics', label: 'Analytics', icon: IconChartBar },
  { href: '/admin/config', label: 'Config', icon: IconAdjustments },
];

type AdminSidebarProps = {
  pathname?: string | null;
  onNavigate?: () => void;
  onLogout: () => void;
  email?: string | null;
};

export function AdminSidebar({ pathname, onNavigate, onLogout, email }: AdminSidebarProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/80 px-5 py-4">
        <div className="flex items-center gap-3">
          <Logo variant="icon" width={34} height={34} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Platform
            </p>
            <p className="text-base font-semibold text-slate-900">Admin Console</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-600 p-2 text-white">
              <IconShieldCheck className="h-4 w-4" stroke={1.7} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Access
              </p>
              <p className="truncate text-sm font-medium text-emerald-900">
                {email || 'Platform administrator'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/admin' && pathname?.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <Icon className="h-4 w-4" stroke={1.6} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/80 p-4">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onLogout}
        >
          <IconLogout className="h-4 w-4" stroke={1.6} />
          Sign out
        </Button>
      </div>
    </div>
  );
}
