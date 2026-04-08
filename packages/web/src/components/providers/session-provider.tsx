'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SessionProvider as NextAuthSessionProvider, useSession } from 'next-auth/react';
import { useAuthStore } from '@/stores/auth-store';

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  // Subscribe only to lastAuthCheckAt, NOT isAuthenticated.
  // Including isAuthenticated in deps caused a feedback loop: checkAuth sets
  // isAuthenticated → effect re-runs → condition re-evaluates → calls checkAuth again.
  const lastAuthCheckAt = useAuthStore((state) => state._lastAuthCheckAt);
  const { status } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const isProtectedPath =
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/onboarding') ||
      pathname.startsWith('/customer/dashboard');

    if (status === 'loading') {
      if (!isProtectedPath) {
        useAuthStore.setState({ isLoading: false, _checkAuthInProgress: false });
      }
      return;
    }

    if (status === 'authenticated') {
      // Only call checkAuth when we have no recent check recorded.
      // The 30-second guard inside checkAuth prevents duplicate calls even if this
      // effect fires multiple times. lastAuthCheckAt is reset to null on logout,
      // so the next login always triggers a fresh check.
      if (!lastAuthCheckAt) {
        checkAuth();
      }
    } else {
      // unauthenticated — clear all auth state so header immediately shows logged-out UI
      useAuthStore.setState({
        isLoading: false,
        _checkAuthInProgress: false,
        isAuthenticated: false,
        user: null,
        accessToken: null,
        idToken: null,
        refreshToken: null,
        email: null,
        userRole: null,
      });
    }
  }, [checkAuth, pathname, status, lastAuthCheckAt]);

  return <>{children}</>;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      <AuthInitializer>{children}</AuthInitializer>
    </NextAuthSessionProvider>
  );
}

