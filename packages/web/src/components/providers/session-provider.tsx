'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SessionProvider as NextAuthSessionProvider, useSession } from 'next-auth/react';
import { useAuthStore } from '@/stores/auth-store';

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const { status } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const shouldCheck =
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/onboarding');

    if (shouldCheck && status === 'authenticated') {
      checkAuth();
    } else {
      useAuthStore.setState({ isLoading: false, _checkAuthInProgress: false });
    }
  }, [checkAuth, pathname, status]);

  return <>{children}</>;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <AuthInitializer>{children}</AuthInitializer>
    </NextAuthSessionProvider>
  );
}

