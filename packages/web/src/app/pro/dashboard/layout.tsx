'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Logo } from '@/components/ui/logo';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import {
  IconLayoutDashboard,
  IconListCheck,
  IconMessage,
  IconUser,
  IconSettings,
  IconLogout,
} from '@tabler/icons-react';

const NAV = [
  { href: '/pro/dashboard', label: 'Overview', icon: IconLayoutDashboard, exact: true },
  { href: '/pro/dashboard/requests', label: 'Requests', icon: IconListCheck },
  { href: '/pro/dashboard/messages', label: 'Messages', icon: IconMessage },
  { href: '/pro/dashboard/marketplace', label: 'My profile', icon: IconUser },
  { href: '/pro/dashboard/settings', label: 'Settings', icon: IconSettings },
];

export default function ProDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();
  const { isAuthenticated, isLoading, checkAuth, logout } = useAuthStore();
  const [proStatus, setProStatus] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const settleAuth = async () => {
      if (status === 'loading') {
        if (mounted) setAuthReady(false);
        return;
      }

      if (status === 'unauthenticated') {
        await signOut({ redirect: false }).catch(() => undefined);
        if (mounted) {
          setAuthReady(false);
          router.replace('/pro/login?reason=session_expired');
        }
        return;
      }

      try {
        // Fresh reloads can briefly render before the NextAuth session has
        // fully repopulated client-side state. Give it a beat, then retry once
        // or twice before treating it like a real logout.
        await new Promise((resolve) => setTimeout(resolve, 300));
        await checkAuth();
        await new Promise((resolve) => setTimeout(resolve, 200));

        let state = useAuthStore.getState();
        if (state.isAuthenticated) {
          if (mounted) setAuthReady(true);
          return;
        }

        for (let attempt = 0; attempt < 3; attempt += 1) {
          const sessionCheck = await fetch('/api/auth/session', { cache: 'no-store' }).catch(() => null);
          const sessionData = sessionCheck?.ok ? await sessionCheck.json() : null;
          const hasTokens = Boolean(sessionData?.accessToken || sessionData?.idToken);
          const isProPool = !sessionData?.poolType || sessionData?.poolType === 'users';

          if (hasTokens && isProPool) {
            await new Promise((resolve) => setTimeout(resolve, 150));
            await checkAuth();
            state = useAuthStore.getState();

            if (state.isAuthenticated) {
              if (mounted) setAuthReady(true);
              return;
            }
          }

          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        await signOut({ redirect: false }).catch(() => undefined);
        if (mounted) {
          setAuthReady(false);
          router.replace('/pro/login?reason=session_expired');
        }
      } catch {
        const sessionCheck = await fetch('/api/auth/session', { cache: 'no-store' }).catch(() => null);
        const sessionData = sessionCheck?.ok ? await sessionCheck.json() : null;
        const hasTokens = Boolean(sessionData?.accessToken || sessionData?.idToken);
        const isProPool = !sessionData?.poolType || sessionData?.poolType === 'users';

        if (hasTokens && isProPool) {
          if (mounted) setAuthReady(true);
          return;
        }

        await signOut({ redirect: false }).catch(() => undefined);
        if (mounted) {
          setAuthReady(false);
          router.replace('/pro/login?reason=session_expired');
        }
      }
    };

    void settleAuth();

    return () => {
      mounted = false;
    };
  }, [checkAuth, router, status]);

  useEffect(() => {
    if (status !== 'authenticated' || !authReady || !isAuthenticated) {
      return;
    }

    setStatusLoading(true);

    // Check pro approval status — only ACTIVE pros can access the dashboard
    apiClient.getMyPro()
      .then((pro: any) => {
        const nextStatus: string = pro?.status ?? 'UNKNOWN';
        setProStatus(nextStatus);
        if (nextStatus !== 'ACTIVE') {
          router.replace('/pro/review-status');
        }
      })
      .catch((err: any) => {
        const msg = (err?.message || '').toLowerCase();
        const isAuthError =
          msg.includes('unauthorized') ||
          msg.includes('invalid') ||
          msg.includes('expired') ||
          err?.status === 401;
        if (isAuthError) {
          router.replace('/pro/login?reason=session_expired');
        } else {
          // Network error — let them through to avoid blocking on transient failures
          setProStatus('ACTIVE');
        }
      })
      .finally(() => {
        setStatusLoading(false);
      });
  }, [authReady, isAuthenticated, router, status]);

  if (status === 'loading' || isLoading || !authReady || statusLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (status === 'unauthenticated' || !isAuthenticated) {
    return null;
  }

  // If status check finished but not ACTIVE, don't render the dashboard shell
  // (the useEffect above will have already navigated to /pro/review-status)
  if (proStatus && proStatus !== 'ACTIVE') {
    return null;
  }

  const isActive = (item: (typeof NAV)[number]) =>
    item.exact ? pathname === item.href : pathname?.startsWith(item.href);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-border/80 bg-white">
        <div className="flex h-16 items-center border-b border-border/60 px-5">
          <Link href="/">
            <Logo width={120} height={30} />
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {NAV.map((item) => {
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
        </nav>

        <div className="border-t border-border/60 p-3">
          <button
            type="button"
            onClick={() => logout('/pro/login?reason=logged_out')}
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
