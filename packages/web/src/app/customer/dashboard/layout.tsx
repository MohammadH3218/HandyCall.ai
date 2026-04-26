'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { isCustomerProfileComplete } from '@/lib/customer-profile';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Logo } from '@/components/ui/logo';
import {
  IconClipboardText,
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
  { href: '/customer/dashboard/requests', label: 'Requests', icon: IconClipboardText },
  { href: '/customer/dashboard/bookings', label: 'Bookings', icon: IconCalendar },
  { href: '/customer/dashboard/inbox', label: 'Inbox', icon: IconMessageCircle },
  { href: '/customer/dashboard/payments', label: 'Payments', icon: IconCreditCard },
  { href: '/customer/dashboard/settings', label: 'Settings', icon: IconSettings },
];

export default function CustomerDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { isAuthenticated, isLoading, checkAuth, user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    const populate = async () => {
      if (status !== 'authenticated') return;

      try {
        // Fresh sign-ins can land here before the NextAuth session cookie is
        // readable on the first dashboard pass.
        await new Promise((resolve) => setTimeout(resolve, 300));
        await checkAuth();
        await new Promise((resolve) => setTimeout(resolve, 200));

        const state = useAuthStore.getState();
        if (state.isLoading || state.isAuthenticated) {
          return;
        }

        for (let attempt = 0; attempt < 3; attempt += 1) {
          const sessionCheck = await fetch('/api/auth/session', { cache: 'no-store' }).catch(() => null);
          const sessionData = sessionCheck?.ok ? await sessionCheck.json() : null;
          const hasTokens = Boolean(sessionData?.accessToken || sessionData?.idToken);
          const isCustomerPool = sessionData?.poolType === 'customer';

          if (hasTokens && isCustomerPool) {
            await new Promise((resolve) => setTimeout(resolve, 150));
            await checkAuth();
            return;
          }

          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        await signOut({ redirect: false }).catch(() => undefined);
        router.replace('/customer/login');
      } catch {
        const sessionCheck = await fetch('/api/auth/session', { cache: 'no-store' }).catch(() => null);
        const sessionData = sessionCheck?.ok ? await sessionCheck.json() : null;
        const hasTokens = Boolean(sessionData?.accessToken || sessionData?.idToken);
        const isCustomerPool = sessionData?.poolType === 'customer';

        if (!hasTokens || !isCustomerPool) {
          await signOut({ redirect: false }).catch(() => undefined);
          router.replace('/customer/login');
        }
      }
    };

    void populate();
  }, [checkAuth, router, status]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/customer/login');
    }
  }, [router, status]);

  useEffect(() => {
    if (status !== 'authenticated' || !isAuthenticated) return;
    let mounted = true;

    const ensureProfileComplete = async () => {
      try {
        const result = await apiClient.getCustomerProfile();
        if (!mounted) return;
        const isComplete = Boolean(result?.is_complete) || isCustomerProfileComplete(result?.profile);
        if (!isComplete) {
          router.replace(`/customer/onboarding?callbackUrl=${encodeURIComponent(pathname)}`);
          return;
        }
      } catch (error) {
        if (!mounted) return;
        const message = error instanceof Error ? error.message.toLowerCase() : '';
        const isAuthFailure =
          message.includes('unauthorized') ||
          message.includes('invalid') ||
          message.includes('expired') ||
          message.includes('account not found');

        if (isAuthFailure) {
          router.replace('/customer/login');
          return;
        }
      } finally {
        if (mounted) setProfileChecked(true);
      }
    };

    void ensureProfileComplete();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, pathname, router, status]);

  if (status === 'loading' || isLoading || !profileChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (status === 'unauthenticated') return null;
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
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-slate-100 bg-white transition-transform duration-200 md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center">
            <Logo width={110} height={28} />
          </Link>
          <button
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <IconX className="h-5 w-5" stroke={1.5} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? 'bg-slate-100 font-medium text-slate-900'
                        : 'font-normal text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 flex-shrink-0 ${active ? 'text-slate-700' : 'text-slate-400'}`}
                      stroke={active ? 2 : 1.5}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <Link
              href="/search"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-normal text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            >
              <IconSearch className="h-4 w-4 text-slate-400" stroke={1.5} />
              Find a Pro
            </Link>
          </div>
        </nav>

      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-slate-100 bg-white px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <IconMenu2 className="h-5 w-5" stroke={1.5} />
            </button>
            <span className="text-sm font-medium text-slate-600">
              {NAV_ITEMS.find((n) => isActive(n))?.label ?? 'Dashboard'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
              <IconBell className="h-4.5 w-4.5" stroke={1.5} />
            </button>

            {/* Profile */}
            <div className="relative ml-1">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-white">
                  {initials}
                </span>
                <span className="hidden max-w-[100px] truncate text-sm font-medium text-slate-700 sm:block">
                  {displayName}
                </span>
                <IconChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                  stroke={2}
                />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-xs font-semibold text-slate-800">{displayName}</p>
                    <p className="truncate text-xs text-slate-400">{user?.email}</p>
                  </div>
                  <Link
                    href="/customer/dashboard/settings"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                    onClick={() => setProfileOpen(false)}
                  >
                    <IconSettings className="h-4 w-4 text-slate-400" stroke={1.5} />
                    Settings
                  </Link>
                  <button
                    onClick={() => { setProfileOpen(false); logout('/customer/login'); }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-slate-50"
                  >
                    <IconLogout className="h-4 w-4" stroke={1.5} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5 md:p-8">
          {children}
        </main>
      </div>

      {/* Phone collection modal */}
    </div>
  );
}
