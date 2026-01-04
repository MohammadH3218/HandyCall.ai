'use client';

import { useEffect } from 'react';
import { SessionProvider as NextAuthSessionProvider, useSession } from 'next-auth/react';
import { useAuthStore } from '@/stores/auth-store';

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const { status } = useSession();

  useEffect(() => {
    checkAuth();
  }, [checkAuth, status]);

  return <>{children}</>;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <AuthInitializer>{children}</AuthInitializer>
    </NextAuthSessionProvider>
  );
}

