'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { OnboardingProvider, useOnboarding } from '@/components/onboarding/onboarding-context';
import { ONBOARDING_STEPS } from '@/constants/onboarding';
import { Logo } from '@/components/ui/logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle } from 'lucide-react';
import { UserRole } from '@handycall/shared';
import { useAuthStore } from '@/stores/auth-store';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingProvider>
      <OnboardingShell>{children}</OnboardingShell>
    </OnboardingProvider>
  );
}

function OnboardingShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, isAuthenticated, userRole, status } = useOnboarding();
  const { logout } = useAuthStore();
  const [signingOut, setSigningOut] = useState(false);

  const stepMap = useMemo(
    () => ({
      billing: status.billing,
      company: status.companyProfile,
      'service-area': status.serviceArea,
      knowledge: status.knowledge,
      calendar: status.calendar,
      phone: status.phone,
    }),
    [status]
  );

  const currentStepId = (pathname?.split('/')[2] || 'billing') as keyof typeof stepMap;
  const currentIndex = ONBOARDING_STEPS.findIndex((step) => step.id === currentStepId);
  const firstIncompleteIndex = ONBOARDING_STEPS.findIndex((step) => !stepMap[step.id]);
  const completedCount = ONBOARDING_STEPS.filter((step) => stepMap[step.id]).length;
  const allComplete = completedCount === ONBOARDING_STEPS.length;

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (userRole === UserRole.ADMIN) {
      router.replace('/admin');
      return;
    }

    if (allComplete) {
      router.replace('/dashboard');
      return;
    }

    const fallbackIndex = firstIncompleteIndex === -1 ? 0 : firstIncompleteIndex;
    if (currentIndex === -1 || currentIndex > fallbackIndex) {
      router.replace(`/onboarding/${ONBOARDING_STEPS[fallbackIndex].id}`);
    }
  }, [allComplete, currentIndex, firstIncompleteIndex, isAuthenticated, loading, router, userRole]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white via-emerald-50/40 to-white">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Preparing your setup...</p>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/40 to-white text-foreground">
      <header className="border-b border-emerald-100/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Logo width={150} height={36} />
          </Link>
          <Badge className="bg-emerald-100 text-emerald-700">Guided setup</Badge>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 pt-10 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-3xl border border-emerald-100/60 bg-white/70 p-5 shadow-sm shadow-emerald-100">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-wide text-emerald-600">Progress</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-lg font-semibold text-slate-900">
                {completedCount} / {ONBOARDING_STEPS.length} complete
              </p>
            </div>
            <div className="mt-3 h-2 rounded-full bg-emerald-100">
              <div
                className="h-2 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${(completedCount / ONBOARDING_STEPS.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-4">
            {ONBOARDING_STEPS.map((step, index) => {
              const isComplete = stepMap[step.id];
              const isLocked = firstIncompleteIndex !== -1 && index > firstIncompleteIndex;
              const isActive = step.id === currentStepId;

              return (
                <Link
                  key={step.id}
                  href={isLocked ? '#' : `/onboarding/${step.id}`}
                  className={`group block rounded-2xl border px-4 py-3 transition ${
                    isActive
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-transparent hover:border-emerald-100 hover:bg-white/70'
                  } ${isLocked ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isComplete ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-emerald-300" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{step.label}</p>
                      <p className="text-xs text-slate-600">{step.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900">
            Need help? Email support@handycall.org or book a quick onboarding call.
          </div>
        </aside>

        <main className="rounded-3xl border border-emerald-100/60 bg-white/80 p-6 shadow-lg shadow-emerald-100">
          <div className="animate-fade-up">{children}</div>
          <div className="mt-8 flex justify-between">
            <Button variant="ghost" onClick={handleSignOut} disabled={signingOut}>
              {signingOut ? 'Signing out...' : 'Sign out'}
            </Button>
            <div className="text-sm text-slate-500">
              Secure setup - Your data is encrypted in transit
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

