'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { isCustomerProfileComplete } from '@/lib/customer-profile';
import { Logo } from '@/components/ui/logo';
import {
  IconClipboardText,
  IconBriefcase,
  IconMessageCircle,
  IconSettings,
  IconSearch,
  IconLogout,
} from '@tabler/icons-react';
import { NotificationBell } from '@/components/ui/notification-bell';

const NAV_ITEMS = [
  { href: '/customer/dashboard/requests', label: 'Requests', icon: IconClipboardText, exact: true },
  { href: '/customer/dashboard/post-job', label: 'Post a Job', icon: IconBriefcase },
  { href: '/customer/dashboard/inbox', label: 'Inbox', icon: IconMessageCircle },
  { href: '/customer/dashboard/settings', label: 'Settings', icon: IconSettings },
];

export default function CustomerDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { isAuthenticated, isLoading, checkAuth, user, logout } = useAuthStore();
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    const populate = async () => {
      if (status !== 'authenticated') return;

      try {
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
      } catch (err: any) {
        if (!mounted) return;
        const msg = (err?.message || '').toLowerCase();
        const isAuthError =
          msg.includes('unauthorized') ||
          msg.includes('invalid') ||
          msg.includes('expired') ||
          msg.includes('account not found');
        if (isAuthError) {
          router.replace('/customer/login?reason=session_expired');
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
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
    if (item.exact) return pathname === item.href || pathname === '/customer/dashboard';
    return pathname.startsWith(item.href);
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-border/80 bg-white">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-border/60 px-5">
          <Link href="/">
            <Logo width={120} height={30} />
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors ${
                      active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon
                      className={`h-4.5 w-4.5 ${active ? 'text-emerald-600' : 'text-slate-400'}`}
                      stroke={active ? 2 : 1.5}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Find a Pro */}
          <div className="mt-6 border-t border-border/40 pt-4">
            <Link
              href="/search"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <IconSearch className="h-4.5 w-4.5 text-slate-400" stroke={1.5} />
              Find a Pro
            </Link>
          </div>
        </nav>

        {/* User + Notifications + Sign out */}
        <div className="border-t border-border/60 p-3 space-y-1">
          <div className="flex items-center px-3 py-1">
            <NotificationBell />
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-white">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-slate-800">{displayName}</p>
              <p className="truncate text-[11px] text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => logout('/customer/login?reason=logged_out')}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
          >
            <IconLogout className="h-4.5 w-4.5" stroke={1.5} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
