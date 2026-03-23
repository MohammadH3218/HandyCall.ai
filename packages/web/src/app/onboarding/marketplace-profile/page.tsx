'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/ui/logo';
import { MarketplaceProfileEditor } from '@/components/marketplace/marketplace-profile-editor';

export default function MarketplaceProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnToSetup = searchParams?.get('returnTo') === 'setup';
  const selectedTier = (searchParams?.get('tier') || '').toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
          <Logo width={130} height={32} />
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400">Marketplace Profile Setup</span>
            <button
              onClick={() => router.replace('/dashboard')}
              className="text-xs text-slate-400 underline hover:text-slate-600"
            >
              Skip for now
            </button>
          </div>
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
