'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { DashboardSidebar, type DashboardNavSection } from '@/components/dashboard/dashboard-sidebar';
import {
  IconLayoutDashboard,
  IconListCheck,
  IconMessage,
  IconUser,
  IconSettings,
  IconBriefcase,
  IconReceipt,
  IconCreditCard,
} from '@tabler/icons-react';

const NAV_SECTIONS: DashboardNavSection[] = [
  {
    items: [{ href: '/pro/dashboard', label: 'Overview', icon: IconLayoutDashboard, exact: true }],
  },
  {
    label: 'Work',
    items: [
      { href: '/pro/dashboard/jobs-board', label: 'Jobs Board', icon: IconBriefcase },
      { href: '/pro/dashboard/requests', label: 'Direct Requests', icon: IconListCheck },
      { href: '/pro/dashboard/messages', label: 'Inbox', icon: IconMessage },
    ],
  },
  {
    label: 'Billing',
    items: [
      { href: '/pro/dashboard/billing/leads', label: 'Lead fees', icon: IconReceipt },
      { href: '/pro/dashboard/billing', label: 'Billing', icon: IconCreditCard, exact: true },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/pro/dashboard/marketplace', label: 'My profile', icon: IconUser },
      { href: '/pro/dashboard/settings', label: 'Settings', icon: IconSettings },
    ],
  },
];

export default function ProDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();
  const { isAuthenticated, isLoading, checkAuth, logout, user } = useAuthStore();
  const [proStatus, setProStatus] = useState<string | null>(null);
  const [proProfile, setProProfile] = useState<any | null>(null);
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
        setProProfile(pro);
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

  const displayName =
    [proProfile?.first_name || user?.first_name, proProfile?.last_name || user?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    proProfile?.business_name ||
    user?.email ||
    'Pro account';
  const email = proProfile?.email || user?.email || null;
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || email?.[0]?.toUpperCase() || 'P';

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar
        sections={NAV_SECTIONS}
        pathname={pathname || '/pro/dashboard'}
        account={{
          name: displayName,
          email,
          initials,
          detail: email || 'Active pro',
        }}
        onSignOut={() => void logout('/pro/login?reason=logged_out')}
        notificationHref="/pro/dashboard/settings"
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
