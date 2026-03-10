'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { computeOnboardingStatus } from '@/lib/setup-status';
import { Logo } from '@/components/ui/logo';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Button } from '@/components/ui/button';
import { usePlanFeatures } from '@/hooks/use-plan-features';
import {
  IconHome,
  IconPhone,
  IconMessageCircle,
  IconUsers,
  IconCalendar,
  IconMessageDots,
  IconFileText,
  IconSettings,
  IconChartBar,
  IconCreditCard,
  IconBolt,
  IconCurrencyDollar,
  IconChartBarPopular,
  IconSend,
  IconPhoneOutgoing,
  IconMenu2,
  IconX,
} from '@tabler/icons-react';
import { UserRole } from '@handycall/shared';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();
  const { isAuthenticated, isLoading, checkAuth, userRole, company, companyHydrated } =
    useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [knowledgeCount, setKnowledgeCount] = useState<number | null>(null);
  const [companyNumber, setCompanyNumber] = useState<string | null>(null);
  const [companyNumberLoaded, setCompanyNumberLoaded] = useState(false);
  const { hasFeature } = usePlanFeatures();
  const canUseAutomation = hasFeature('follow_up_sequences');

  const setupStatus = useMemo(() => {
    return computeOnboardingStatus({
      company,
      userFirstName: null,
      userLastName: null,
      userEmail: null,
      knowledgeCount,
      companyNumber,
    });
  }, [company, knowledgeCount, companyNumber]);

  const needsSetup = useMemo(() => {
    if (!company) return false;
    return (
      !setupStatus.billing ||
      !setupStatus.companyProfile ||
      !setupStatus.serviceArea ||
      !setupStatus.calendar ||
      !setupStatus.knowledge ||
      !setupStatus.phone
    );
  }, [company, setupStatus]);

  useEffect(() => {
    if (!company || userRole === UserRole.ADMIN) return;
    const loadKnowledge = async () => {
      try {
        const data = await apiClient.getKnowledgeItems(undefined, undefined, 1);
        const items = Array.isArray(data) ? data : data?.items || [];
        setKnowledgeCount(items.length);
      } catch (err) {
        setKnowledgeCount(0);
      }
    };
    void loadKnowledge();
  }, [company, userRole, pathname]);

  useEffect(() => {
    if (!company || userRole === UserRole.ADMIN) return;
    const loadNumber = async () => {
      try {
        const res: any = await apiClient.getMyTelephonyNumber();
        const phone =
          res?.phoneNumber ??
          res?.phone_number ??
          res?.data?.phoneNumber ??
          res?.data?.phone_number ??
          null;
        setCompanyNumber(phone || null);
      } catch {
        setCompanyNumber(null);
      } finally {
        setCompanyNumberLoaded(true);
      }
    };
    void loadNumber();
  }, [company, userRole]);

  const setupDataReady = knowledgeCount !== null && companyNumberLoaded;

  useEffect(() => {
    if (status !== 'authenticated' || userRole === UserRole.ADMIN) return;
    // No company at all after hydration → send straight to onboarding
    if (companyHydrated && !company) {
      router.replace('/onboarding');
      return;
    }
    // Company present but setup incomplete
    if (setupDataReady && needsSetup) {
      router.replace('/onboarding');
    }
  }, [needsSetup, router, setupDataReady, status, userRole, company, companyHydrated]);

  useEffect(() => {
    const populate = async () => {
      if (status === 'authenticated') {
        try {
          // Give session a moment to stabilize before checking auth
          await new Promise((resolve) => setTimeout(resolve, 300));

          await checkAuth();

          // Wait a bit more for state to update
          await new Promise((resolve) => setTimeout(resolve, 200));

          // After checkAuth, verify we actually have valid credentials
          const state = useAuthStore.getState();

          // Only check auth if we're not still loading
          if (state.isLoading) {
            return; // Still loading, wait for next cycle
          }

          // For admin users, check for tokens. For customers, check for company or tokens
          // But be lenient - if session exists, give it time
          const hasValidAuth =
            state.isAuthenticated &&
            (state.accessToken ||
              state.idToken ||
              state.userRole === UserRole.ADMIN ||
              state.company);

          // Only sign out if we're definitely unauthenticated and not loading
          if (!hasValidAuth && !state.isLoading) {
            // Check session one more time before signing out
            const sessionCheck = await fetch('/api/auth/session', { cache: 'no-store' }).catch(
              () => null
            );
            const sessionData = sessionCheck?.ok ? await sessionCheck.json() : null;

            if (!sessionData || (!sessionData.accessToken && !sessionData.idToken)) {
              // No valid credentials, sign out
              console.log('[DashboardLayout] No valid credentials after checkAuth, signing out');
              await signOut({ redirect: false });
              router.push('/login');
            }
          }
        } catch (err) {
          console.error('checkAuth failed, checking session before signing out', err);

          // Don't immediately sign out on error - check session first
          try {
            const sessionCheck = await fetch('/api/auth/session', { cache: 'no-store' }).catch(
              () => null
            );
            const sessionData = sessionCheck?.ok ? await sessionCheck.json() : null;

            if (!sessionData || (!sessionData.accessToken && !sessionData.idToken)) {
              // Sign out without redirect to avoid loops, then navigate manually
              await signOut({ redirect: false });
              router.push('/login');
            }
          } catch (checkErr) {
            // If we can't check session, sign out
            await signOut({ redirect: false });
            router.push('/login');
          }
        }
      }
    };
    populate();
  }, [status, checkAuth, router]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && userRole === UserRole.ADMIN) {
      // Redirect admins to admin dashboard
      router.push('/admin');
    }
  }, [status, userRole, router]);

  if (status === 'loading' || isLoading || status === 'unauthenticated') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background dark:bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_22%),linear-gradient(180deg,rgba(12,18,30,0.98),rgba(7,10,18,1))]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/58 backdrop-blur-sm transition-opacity duration-200 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50
          h-screen w-64 border-r border-border/80 bg-card/80 backdrop-blur-xl flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Mobile close button */}
        <div className="lg:hidden absolute top-4 right-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 hover:bg-accent/80 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <IconX stroke={1.5} className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-col items-start justify-center border-b border-border/80 px-5 py-5">
          <Logo variant="words" width={150} height={36} />
          {company?.company_name && (
            <p className="mt-1 text-sm font-semibold leading-tight text-foreground">
              {company.company_name}
            </p>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          <div className="space-y-0.5">
            <NavLink
              href="/dashboard"
              icon={<IconHome stroke={1.5} className="h-5 w-5" />}
              active={pathname === '/dashboard'}
              onClick={() => setSidebarOpen(false)}
            >
              Dashboard
            </NavLink>
            <NavLink
              href="/dashboard/calls"
              icon={<IconPhone stroke={1.5} className="h-5 w-5" />}
              active={pathname?.startsWith('/dashboard/calls')}
              onClick={() => setSidebarOpen(false)}
            >
              Calls
            </NavLink>
            <NavLink
              href="/dashboard/messages"
              icon={<IconMessageCircle stroke={1.5} className="h-5 w-5" />}
              active={pathname?.startsWith('/dashboard/messages')}
              onClick={() => setSidebarOpen(false)}
            >
              Messages
            </NavLink>
            <NavLink
              href="/dashboard/customers"
              icon={<IconUsers stroke={1.5} className="h-5 w-5" />}
              active={pathname?.startsWith('/dashboard/customers')}
              onClick={() => setSidebarOpen(false)}
            >
              Customers
            </NavLink>
            <NavLink
              href="/dashboard/lead-inbox"
              icon={<IconUsers stroke={1.5} className="h-5 w-5" />}
              active={pathname?.startsWith('/dashboard/lead-inbox')}
              onClick={() => setSidebarOpen(false)}
            >
              Lead Inbox
            </NavLink>
            <NavLink
              href="/dashboard/appointments"
              icon={<IconCalendar stroke={1.5} className="h-5 w-5" />}
              active={pathname?.startsWith('/dashboard/appointments')}
              onClick={() => setSidebarOpen(false)}
            >
              Appointments
            </NavLink>
          </div>

          <div className="space-y-0.5 border-t border-border/80 pt-3">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Company
            </p>
            <NavLink
              href="/dashboard/knowledge"
              icon={<IconMessageDots stroke={1.5} className="h-5 w-5" />}
              active={pathname?.startsWith('/dashboard/knowledge')}
              onClick={() => setSidebarOpen(false)}
            >
              Knowledge Base
            </NavLink>
            <NavLink
              href="/dashboard/invoices"
              icon={<IconFileText stroke={1.5} className="h-5 w-5" />}
              active={pathname?.startsWith('/dashboard/invoices')}
              onClick={() => setSidebarOpen(false)}
            >
              Invoices
            </NavLink>
            <NavLink
              href="/dashboard/settings"
              icon={<IconSettings stroke={1.5} className="h-5 w-5" />}
              active={pathname?.startsWith('/dashboard/settings')}
              onClick={() => setSidebarOpen(false)}
            >
              Settings
            </NavLink>
          </div>

          <div className="space-y-0.5 border-t border-border/80 pt-3">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Account
            </p>
            <NavLink
              href="/dashboard/usage"
              icon={<IconChartBar stroke={1.5} className="h-5 w-5" />}
              active={pathname?.startsWith('/dashboard/usage')}
              onClick={() => setSidebarOpen(false)}
            >
              Usage
            </NavLink>
            <NavLink
              href="/dashboard/billing"
              icon={<IconCreditCard stroke={1.5} className="h-5 w-5" />}
              active={
                pathname?.startsWith('/dashboard/billing') &&
                !pathname?.startsWith('/dashboard/billing/addons')
              }
              onClick={() => setSidebarOpen(false)}
            >
              Billing
            </NavLink>
            <NavLink
              href="/dashboard/billing/addons"
              icon={<IconBolt stroke={1.5} className="h-5 w-5" />}
              active={pathname?.startsWith('/dashboard/billing/addons')}
              onClick={() => setSidebarOpen(false)}
            >
              Add-on Packs
            </NavLink>
            <NavLink
              href="/dashboard/payments"
              icon={<IconCurrencyDollar stroke={1.5} className="h-5 w-5" />}
              active={pathname?.startsWith('/dashboard/payments')}
              onClick={() => setSidebarOpen(false)}
            >
              Payments
            </NavLink>
          </div>

          {canUseAutomation && (
            <div className="space-y-0.5 border-t border-border/80 pt-3">
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Automation
              </p>
              <NavLink
                href="/dashboard/analytics"
                icon={<IconChartBarPopular stroke={1.5} className="h-5 w-5" />}
                active={pathname?.startsWith('/dashboard/analytics')}
                onClick={() => setSidebarOpen(false)}
              >
                Analytics
              </NavLink>
              <NavLink
                href="/dashboard/sms-automation"
                icon={<IconMessageDots stroke={1.5} className="h-5 w-5" />}
                active={pathname?.startsWith('/dashboard/sms-automation')}
                onClick={() => setSidebarOpen(false)}
              >
                SMS Automation
              </NavLink>
              <NavLink
                href="/dashboard/follow-ups"
                icon={<IconSend stroke={1.5} className="h-5 w-5" />}
                active={pathname?.startsWith('/dashboard/follow-ups')}
                onClick={() => setSidebarOpen(false)}
              >
                Follow-ups
              </NavLink>
              <NavLink
                href="/dashboard/outbound-calls"
                icon={<IconPhoneOutgoing stroke={1.5} className="h-5 w-5" />}
                active={pathname?.startsWith('/dashboard/outbound-calls')}
                onClick={() => setSidebarOpen(false)}
              >
                Outbound Calls
              </NavLink>
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="border-b border-border/80 bg-card/70 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 text-muted-foreground hover:bg-accent/80 hover:text-foreground lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <IconMenu2 stroke={1.5} className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <ProfileDropdown />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.05),transparent_20%)] p-4 dark:bg-transparent sm:p-6 lg:p-10">
          <div className="animate-fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
  active,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group flex items-center px-3 py-2 text-sm rounded-lg transition-colors duration-150 ${
        active
          ? 'border border-emerald-400/25 bg-emerald-50/90 text-emerald-700 shadow-sm dark:bg-emerald-950/45 dark:text-emerald-300'
          : 'border border-transparent text-muted-foreground hover:border-border/70 hover:bg-accent/70 hover:text-foreground'
      }`}
    >
      <span
        className={`mr-3 transition-colors duration-150 ${
          active
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-muted-foreground group-hover:text-foreground/70'
        }`}
      >
        {icon}
      </span>
      <span className="font-medium">{children}</span>
    </Link>
  );
}
