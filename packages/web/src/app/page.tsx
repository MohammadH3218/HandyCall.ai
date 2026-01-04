'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { UserRole } from '@handycall/shared';

export default function Home() {
  const router = useRouter();
  const { status, data } = useSession();

  useEffect(() => {
    if (status === 'loading') return;

    const role =
      (data as any)?.user?.role as UserRole | undefined ||
      (data as any)?.userRole as UserRole | undefined;

    if (status === 'authenticated') {
      if (role === UserRole.ADMIN) {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    } else {
      router.replace('/login');
    }
  }, [status, data, router]);

  return null;
}
