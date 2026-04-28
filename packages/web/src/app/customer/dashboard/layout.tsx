'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { isCustomerProfileComplete } from '@/lib/customer-profile';
import { DashboardSidebar, type DashboardNavSection } from '@/components/dashboard/dashboard-sidebar';
import {
  IconClipboardText,
  IconBriefcase,
  IconMessageCircle,
  IconSettings,
  IconSearch,
} from '@tabler/icons-react';

const NAV_SECTIONS: DashboardNavSection[] = [
  {
    items: [
      {
        href: '/customer/dashboard/requests',
        label: 'Requests',
        icon: IconClipboardText,
        exact: true,
      },
      { href: '/customer/dashboard/post-job', label: 'Post a Job', icon: IconBriefcase },
      { href: '/customer/dashboard/inbox', label: 'Inbox', icon: IconMessageCircle },
      { href: '/customer/dashboard/settings', label: 'Settings', icon: IconSettings },
    ],
  },
  {
    items: [{ href: '/search', label: 'Find a Pro', icon: IconSearch }],
  },
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

  return (
    <div className="flex h-screen bg-slate-50">
      <DashboardSidebar
        sections={NAV_SECTIONS}
        pathname={pathname || '/customer/dashboard/requests'}
        account={{
          name: displayName,
          email: user?.email,
          initials,
          detail: user?.email,
        }}
        onSignOut={() => void logout('/customer/login?reason=logged_out')}
        notificationHref="/customer/dashboard/settings"
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
