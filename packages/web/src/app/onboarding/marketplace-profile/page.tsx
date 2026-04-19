'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/ui/logo';
import { MarketplaceProfileEditor } from '@/components/marketplace/marketplace-profile-editor';
import { apiClient } from '@/lib/api-client';
import { IconLoader2 } from '@tabler/icons-react';

export default function MarketplaceProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnToSetup = searchParams?.get('returnTo') === 'setup';
  const selectedTier = (searchParams?.get('tier') || '').toUpperCase();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    apiClient.getMyPro()
      .then((pro: any) => {
        const status = pro?.status;
        // Already submitted — send to the right place
        if (status === 'PENDING_REVIEW' || status === 'ACTIVE' || status === 'SUSPENDED' || status === 'REJECTED') {
          router.replace('/pro/review-status');
          return;
        }
        setChecking(false);
      })
      .catch(() => {
        // Can't fetch — allow through so they can complete the form
        setChecking(false);
      });
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <IconLoader2 className="h-7 w-7 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
          <Logo width={130} height={32} />
          <span className="text-xs font-semibold text-slate-400">Marketplace Profile Setup</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <MarketplaceProfileEditor
          mode="onboarding"
          returnToSetup={returnToSetup}
          selectedTier={selectedTier}
        />
      </main>
    </div>
  );
}
