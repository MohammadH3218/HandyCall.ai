'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { AppShell, AppSidebar, AppTopBar } from '@/components/app-shell/app-shell';
import { BarChart3, Calendar, CreditCard, Home, MessageCircle, Phone, PlugZap, Settings, Users } from 'lucide-react';
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

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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

  if (status === 'loading' || isLoading || status === 'unauthenticated') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const navGroups = [
    {
      items: [
        {
          href: '/dashboard',
          label: 'Overview',
          icon: <Home className="h-4 w-4" />,
          active: pathname === '/dashboard',
        },
        {
          href: '/dashboard/calls',
          label: 'Calls',
          icon: <Phone className="h-4 w-4" />,
          active: pathname?.startsWith('/dashboard/calls'),
        },
        {
          href: '/dashboard/messages',
          label: 'Messages',
          icon: <MessageCircle className="h-4 w-4" />,
          active: pathname?.startsWith('/dashboard/messages'),
        },
        {
          href: '/dashboard/appointments',
          label: 'Appointments',
          icon: <Calendar className="h-4 w-4" />,
          active: pathname?.startsWith('/dashboard/appointments'),
        },
        {
          href: '/dashboard/contacts',
          label: 'Contacts',
          icon: <Users className="h-4 w-4" />,
          active: pathname?.startsWith('/dashboard/contacts') || pathname?.startsWith('/dashboard/customers'),
        },
      ],
    },
    {
      label: 'Workspace',
      items: [
        {
          href: '/dashboard/settings',
          label: 'Settings',
          icon: <Settings className="h-4 w-4" />,
          active: pathname?.startsWith('/dashboard/settings'),
        },
        {
          href: '/dashboard/settings?tab=integrations',
          label: 'Integrations',
          icon: <PlugZap className="h-4 w-4" />,
          active: pathname?.startsWith('/dashboard/settings'),
        },
      ],
    },
    {
      label: 'Revenue',
      items: [
        {
          href: '/dashboard/billing',
          label: 'Billing',
          icon: <CreditCard className="h-4 w-4" />,
          active: pathname?.startsWith('/dashboard/billing'),
        },
        {
          href: '/dashboard/usage',
          label: 'Usage',
          icon: <BarChart3 className="h-4 w-4" />,
          active: pathname?.startsWith('/dashboard/usage'),
        },
      ],
    },
  ];

  const routingEnabled = !['DISABLED', 'OFF'].includes(String(company?.call_handling_mode || '').toUpperCase());

  return (
    <AppShell
      sidebar={
        <AppSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          companyName={company?.company_name}
          groups={navGroups}
        />
      }
      topbar={
        <AppTopBar
          onMenuClick={() => setSidebarOpen(true)}
          statusLabel={routingEnabled ? 'Routing on' : 'Routing off'}
          statusTone={routingEnabled ? 'on' : 'off'}
          rightSlot={<ProfileDropdown />}
        />
      }
    >
      <div className="animate-fade-up">{children}</div>
    </AppShell>
  );
}

