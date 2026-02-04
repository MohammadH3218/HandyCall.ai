'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { Logo } from '@/components/ui/logo';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { Button } from '@/components/ui/button';
import { BarChart3, Calendar, CreditCard, Home, Menu, MessageSquare, Phone, Settings, Users, X } from 'lucide-react';
import { UserRole } from '@handycall/shared';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();
  const { isAuthenticated, isLoading, checkAuth, userRole, company } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [knowledgeCount, setKnowledgeCount] = useState<number | null>(null);
  const [companyNumber, setCompanyNumber] = useState<string | null>(null);
  const [companyNumberLoaded, setCompanyNumberLoaded] = useState(false);

  const knowledgeComplete = knowledgeCount !== null ? knowledgeCount > 0 : false;
  const setupStatus = useMemo(() => {
    if (!company) {
      return {
        billing: false,
        companyProfile: false,
        serviceArea: false,
        calendar: false,
        knowledge: false,
        phone: false,
      };
    }
    const billing = Boolean(
      company.subscription_plan ||
      company.stripe_subscription_id ||
      (company.subscription_status &&
        (company.subscription_status === 'ACTIVE' || company.subscription_status === 'TRIALING')) ||
      (company.trial_ends_at && company.trial_ends_at > Date.now())
    );
    const companyProfile = company.company_profile_completed === true;
    const serviceArea = company.service_area_completed === true;
    const calendar = company.calendar_setup_completed === true;
    const knowledge = knowledgeComplete;
    const phone = Boolean(companyNumber);
    return { billing, companyProfile, serviceArea, calendar, knowledge, phone };
  }, [company, knowledgeComplete, companyNumber]);

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
    if (!setupDataReady) return;
    if (status === 'authenticated' && userRole !== UserRole.ADMIN && needsSetup) {
      router.replace('/onboarding');
    }
  }, [needsSetup, router, setupDataReady, status, userRole]);

  useEffect(() => {
    const populate = async () => {
      if (status === 'authenticated') {
        try {
          // Give session a moment to stabilize before checking auth
          await new Promise(resolve => setTimeout(resolve, 300));

          await checkAuth();

          // Wait a bit more for state to update
          await new Promise(resolve => setTimeout(resolve, 200));

          // After checkAuth, verify we actually have valid credentials
          const state = useAuthStore.getState();

          // Only check auth if we're not still loading
          if (state.isLoading) {
            return; // Still loading, wait for next cycle
          }

          // For admin users, check for tokens. For customers, check for company or tokens
          // But be lenient - if session exists, give it time
          const hasValidAuth = state.isAuthenticated && (
            state.accessToken ||
            state.idToken ||
            (state.userRole === UserRole.ADMIN) ||
            state.company
          );

          // Only sign out if we're definitely unauthenticated and not loading
          if (!hasValidAuth && !state.isLoading) {
            // Check session one more time before signing out
            const sessionCheck = await fetch('/api/auth/session', { cache: 'no-store' }).catch(() => null);
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
            const sessionCheck = await fetch('/api/auth/session', { cache: 'no-store' }).catch(() => null);
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

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-transparent overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50
          h-screen w-72 bg-white/85 backdrop-blur-xl border-r border-border/60 flex flex-col
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
            className="h-8 w-8 p-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 flex flex-col items-start justify-center border-b border-border/60 bg-white/70">
          <Logo variant="words" width={150} height={36} />
          {company?.company_name && (
            <p className="mt-1 text-sm font-semibold text-foreground/80 leading-tight">
              {company.company_name}
            </p>
          )}
        </div>

        <nav className="flex-1 px-4 py-5 space-y-5 overflow-y-auto">
          <div className="space-y-1">
            <NavLink
              href="/dashboard"
              icon={<Home className="h-5 w-5" />}
              active={pathname === '/dashboard'}
              onClick={() => setSidebarOpen(false)}
            >
              Dashboard
            </NavLink>
            <NavLink
              href="/dashboard/calls"
              icon={<Phone className="h-5 w-5" />}
              active={pathname?.startsWith('/dashboard/calls')}
              onClick={() => setSidebarOpen(false)}
            >
              Calls
            </NavLink>
            <NavLink
              href="/dashboard/customers"
              icon={<Users className="h-5 w-5" />}
              active={pathname?.startsWith('/dashboard/customers')}
              onClick={() => setSidebarOpen(false)}
            >
              Customers
            </NavLink>
            <NavLink
              href="/dashboard/appointments"
              icon={<Calendar className="h-5 w-5" />}
              active={pathname?.startsWith('/dashboard/appointments')}
              onClick={() => setSidebarOpen(false)}
            >
              Appointments
            </NavLink>
          </div>

          <div className="pt-2 border-t border-border space-y-1">
            <p className="px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company</p>
            <NavLink
              href="/dashboard/knowledge"
              icon={<MessageSquare className="h-5 w-5" />}
              active={pathname?.startsWith('/dashboard/knowledge')}
              onClick={() => setSidebarOpen(false)}
            >
              Knowledge Base
            </NavLink>
            <NavLink
              href="/dashboard/settings"
              icon={<Settings className="h-5 w-5" />}
              active={pathname?.startsWith('/dashboard/settings')}
              onClick={() => setSidebarOpen(false)}
            >
              Settings
            </NavLink>
          </div>

          <div className="pt-2 border-t border-border space-y-1">
            <p className="px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account</p>
            <NavLink
              href="/dashboard/usage"
              icon={<BarChart3 className="h-5 w-5" />}
              active={pathname?.startsWith('/dashboard/usage')}
              onClick={() => setSidebarOpen(false)}
            >
              Usage
            </NavLink>
            <NavLink
              href="/dashboard/billing"
              icon={<CreditCard className="h-5 w-5" />}
              active={pathname?.startsWith('/dashboard/billing')}
              onClick={() => setSidebarOpen(false)}
            >
              Billing
            </NavLink>
          </div>
        </nav>

        <div className="mt-auto p-4 border-t border-border/60 bg-white/70">
          <ProfileDropdown />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile menu button */}
        <div className="lg:hidden p-4 border-b border-border/60 bg-white/80 backdrop-blur">
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-10">
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
  onClick
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
      className={`group flex items-center px-4 py-3 text-sm rounded-xl transition-all duration-200 ${
        active
          ? 'bg-emerald-50 text-emerald-900 shadow-sm border border-emerald-100'
          : 'text-foreground/80 hover:bg-secondary/70 hover:text-foreground'
      }`}
    >
      <span
        className={`mr-3 transition-colors duration-200 ${
          active ? 'text-emerald-600' : 'text-muted-foreground group-hover:text-emerald-600'
        }`}
      >
        {icon}
      </span>
      <span className="font-medium">{children}</span>
    </Link>
  );
}
