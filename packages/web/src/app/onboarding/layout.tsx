'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { OnboardingProvider, useOnboarding } from '@/components/onboarding/onboarding-context';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useMarketingLanguage } from '@/components/providers/marketing-language-provider';
import { ONBOARDING_STEPS } from '@/constants/onboarding';
import { Logo } from '@/components/ui/logo';
import { IconCircleCheck, IconCircle } from '@tabler/icons-react';
import { UserRole } from '@handycall/shared';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

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
  const { isArabic } = useMarketingLanguage();
  const { logout } = useAuthStore();
  const { toast } = useToast();
  const [signingOut, setSigningOut] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const t = (english: string, arabic: string) => (isArabic ? arabic : english);

  const isSetupPage = pathname?.startsWith('/onboarding/setup') ?? false;
  const isMarketplaceProfilePage =
    pathname?.startsWith('/onboarding/marketplace-profile') ?? false;
  const isBillingPage = pathname?.startsWith('/onboarding/billing') ?? false;
  const isLegacyStepPage =
    (pathname?.startsWith('/onboarding/') ?? false) &&
    pathname !== '/onboarding' &&
    !isSetupPage &&
    !isMarketplaceProfilePage &&
    !isBillingPage;

  const stepMap = useMemo(
    () => ({
      profile: status.profile,
      company: status.companyProfile,
      'marketplace-profile': status.marketplaceProfile,
      billing: status.billing,
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

    if (isLegacyStepPage) {
      router.replace('/onboarding/setup');
      return;
    }

    // Don't redirect away from the setup or billing pages — they manage their own completion flow
    if (isSetupPage || isMarketplaceProfilePage || isBillingPage) return;

    if (allComplete) {
      router.replace('/dashboard');
      return;
    }

    const fallbackIndex = firstIncompleteIndex === -1 ? 0 : firstIncompleteIndex;
    if (currentIndex === -1 || currentIndex > fallbackIndex) {
      router.replace('/onboarding/setup');
    }
  }, [
    allComplete,
    currentIndex,
    firstIncompleteIndex,
    isAuthenticated,
    isLegacyStepPage,
    isMarketplaceProfilePage,
    isSetupPage,
    loading,
    router,
    userRole,
  ]);

  // Never replace children with a spinner on the setup or billing pages — that would unmount and lose state.
  if (loading && !isSetupPage && !isBillingPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            {t('Preparing your setup...', 'جارٍ تجهيز الإعداد...')}
          </p>
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

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    setDeleteError(null);

    try {
      await apiClient.deleteMyAccount();
      toast({
        title: t('Account deleted', 'تم حذف الحساب'),
        description: t('Your account and related data have been removed.', 'تمت إزالة حسابك والبيانات المرتبطة به.'),
      });

      try {
        localStorage.removeItem('access_token');
        localStorage.removeItem('id_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('email');
        localStorage.removeItem('user_role');
        localStorage.removeItem('handycall-admin-company');
      } catch {
        // no-op
      }

      await signOut({ callbackUrl: '/login' });
    } catch (error: any) {
      const message =
        error?.message ||
        t(
          'Unable to delete this account. If billing or Stripe is connected, contact hello@handycall.org.',
          'تعذر حذف هذا الحساب. إذا كان هناك اشتراك أو Stripe مرتبط، تواصل مع hello@handycall.org.'
        );
      setDeleteError(message);
      toast({
        title: t('Delete account failed', 'فشل حذف الحساب'),
        description: message,
        variant: 'destructive',
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  // Full-screen layout for setup and billing pages
  if (isSetupPage || isBillingPage) {
    return (
      <div className="flex h-screen flex-col bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
        <header className="flex-none border-b border-border/80 bg-background/88 backdrop-blur-sm">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-3">
              <Logo width={130} height={32} />
            </Link>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteDialogOpen(true);
                }}
                disabled={deletingAccount || signingOut}
                className="text-sm text-rose-600 transition hover:text-rose-700 disabled:opacity-60"
              >
                {t('Delete account', 'حذف الحساب')}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="text-sm text-slate-500 transition hover:text-slate-700 disabled:opacity-60 dark:text-slate-400 dark:hover:text-slate-200"
              >
                {signingOut ? t('Signing out...', 'جارٍ تسجيل الخروج...') : t('Sign out', 'تسجيل الخروج')}
              </button>
            </div>
          </div>
        </header>
        <main className="flex flex-1 flex-col min-h-0">{children}</main>
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('Are you sure you want to delete your account?', 'هل أنت متأكد أنك تريد حذف حسابك؟')}</DialogTitle>
              <DialogDescription>
                {t(
                  'This will permanently remove your account and related company data, including contacts, appointments, messages, and other saved setup data.',
                  'سيؤدي هذا إلى حذف حسابك وبيانات الشركة المرتبطة به نهائيًا، بما في ذلك المكالمات وجهات الاتصال والمواعيد وعناصر قاعدة المعرفة وبيانات الإعداد المحفوظة الأخرى.'
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
              {t(
                'Any active subscription will be cancelled immediately. This action is permanent and cannot be undone.',
                'سيتم إلغاء أي اشتراك نشط فورًا. هذا الإجراء نهائي ولا يمكن التراجع عنه.'
              )}
            </div>
            {deleteError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                {deleteError}
              </div>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => {
                  if (deletingAccount) return;
                  setDeleteDialogOpen(false);
                  setDeleteError(null);
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-accent dark:text-slate-200"
              >
                {t('Cancel', 'إلغاء')}
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingAccount ? t('Deleting...', 'جارٍ الحذف...') : t('Delete account', 'حذف الحساب')}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      <header className="border-b border-border/80 bg-background/88 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Logo width={150} height={36} />
          </Link>
          <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            {t('Guided setup', 'إعداد موجّه')}
          </span>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 pt-10 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-border/80 bg-card/82 p-5 shadow-sm backdrop-blur-sm">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('Progress', 'التقدم')}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {isArabic
                  ? `${completedCount} / ${ONBOARDING_STEPS.length} مكتمل`
                  : `${completedCount} / ${ONBOARDING_STEPS.length} complete`}
              </p>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
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
                  href={isLocked ? '#' : '/onboarding/setup'}
                  className={`group block rounded-lg border px-4 py-3 transition ${
                    isActive
                      ? 'border-emerald-100 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40'
                      : 'border-border/80 hover:bg-accent/60'
                  } ${isLocked ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isComplete ? (
                        <IconCircleCheck className="h-5 w-5 text-emerald-600" stroke={1.5} />
                      ) : (
                        <IconCircle
                          className="h-5 w-5 text-slate-300 dark:text-slate-600"
                          stroke={1.5}
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {isArabic ? step.labelAr : step.label}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {isArabic ? step.descriptionAr : step.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-6 rounded-lg border border-border bg-card/70 p-4 text-sm text-slate-700 dark:text-slate-300">
            {t(
              'Need help? Email support@handycall.org or book a quick onboarding call.',
              'هل تحتاج مساعدة؟ راسل support@handycall.org أو احجز مكالمة إعداد سريعة.'
            )}
          </div>
        </aside>

        <main className="rounded-2xl border border-border/80 bg-card/82 p-6 shadow-sm backdrop-blur-sm">
          <div className="animate-fade-up">{children}</div>
          <div className="mt-8 flex justify-between">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-200"
            >
              {signingOut ? t('Signing out...', 'جارٍ تسجيل الخروج...') : t('Sign out', 'تسجيل الخروج')}
            </button>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {t('Secure setup - Your data is encrypted in transit', 'إعداد آمن - بياناتك مشفرة أثناء النقل')}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
