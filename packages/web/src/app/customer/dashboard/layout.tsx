'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Logo } from '@/components/ui/logo';
import {
  IconHome,
  IconMessageCircle,
  IconCalendar,
  IconCreditCard,
  IconSettings,
  IconSearch,
  IconMenu2,
  IconX,
  IconBell,
  IconChevronDown,
  IconLogout,
} from '@tabler/icons-react';

const NAV_ITEMS = [
  { href: '/customer/dashboard', label: 'Home', icon: IconHome, exact: true },
  { href: '/customer/dashboard/bookings', label: 'Bookings', icon: IconCalendar },
  { href: '/customer/dashboard/inbox', label: 'Inbox', icon: IconMessageCircle, badge: 2 },
  { href: '/customer/dashboard/payments', label: 'Payments', icon: IconCreditCard },
  { href: '/customer/dashboard/settings', label: 'Settings', icon: IconSettings },
];

export default function CustomerDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, checkAuth, user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?next=/customer/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const initials =
    user?.first_name && user?.last_name
      ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
      : user?.first_name
        ? user.first_name[0].toUpperCase()
        : user?.email?.[0]?.toUpperCase() ?? '?';

  const displayName = user?.first_name
    ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
    : user?.email ?? 'Account';

  function isActive(item: (typeof NAV_ITEMS)[0]) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <Link href="/" className="flex items-center">
            <Logo width={120} height={30} />
          </Link>
          <button
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <IconX className="h-5 w-5" stroke={1.5} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 flex-shrink-0 ${active ? 'text-emerald-600' : 'text-slate-400'}`}
                      stroke={active ? 2 : 1.5}
                    />
                    {item.label}
                    {item.badge ? (
                      <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1 text-xs font-semibold text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Quick search link */}
          <div className="mt-6 border-t border-slate-100 pt-4">
            <Link
              href="/search"
              className="flex items-center gap-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
            >
              <IconSearch className="h-4 w-4" stroke={2} />
              Find a new pro
            </Link>
          </div>
        </nav>

        {/* Bottom user */}
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{displayName}</p>
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
            </div>
            <button
              onClick={() => logout()}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-red-500"
              title="Log out"
            >
              <IconLogout className="h-4 w-4" stroke={1.5} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <IconMenu2 className="h-5 w-5" stroke={1.5} />
            </button>
            {/* Breadcrumb title */}
            <span className="text-sm font-semibold text-slate-700">
              {NAV_ITEMS.find((n) => isActive(n))?.label ?? 'Dashboard'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {/* Notification bell */}
            <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100">
              <IconBell className="h-5 w-5" stroke={1.5} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500" />
            </button>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-sm font-medium text-slate-700 transition hover:border-emerald-300"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  {initials}
                </span>
                <IconChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                  stroke={2}
                />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-xs font-semibold text-slate-800">{displayName}</p>
                    <p className="truncate text-xs text-slate-400">{user?.email}</p>
                  </div>
                  <Link
                    href="/customer/dashboard/settings"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setProfileOpen(false)}
                  >
                    <IconSettings className="h-4 w-4 text-slate-400" stroke={1.5} />
                    Settings
                  </Link>
                  <button
                    onClick={() => { setProfileOpen(false); logout(); }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <IconLogout className="h-4 w-4" stroke={1.5} />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
