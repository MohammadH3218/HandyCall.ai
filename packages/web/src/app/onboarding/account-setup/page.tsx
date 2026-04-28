'use client';

import { Logo } from '@/components/ui/logo';
import { ProAccountSetupForm } from '@/components/onboarding/pro-account-setup-form';

export default function AccountSetupPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Logo width={130} height={32} />
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Account setup
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        <ProAccountSetupForm />
      </main>
    </div>
  );
}
