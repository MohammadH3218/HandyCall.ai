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
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, BarChart3, Calendar, CheckSquare, CreditCard, Home, Menu, MessageSquare, Phone, Settings, Users, X } from 'lucide-react';
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

  const hasWorkingHours = useMemo(() => {
    if (!company?.business_hours || typeof company.business_hours !== 'object') return false;
    return Object.values(company.business_hours).some((day: any) => {
      if (!day || day.closed) return false;
      const segments = Array.isArray((day as any).segments) ? (day as any).segments : [];
      if (segments.length) return segments.some((s: any) => s?.open && s?.close);
      return Boolean((day as any).open && (day as any).close);
    });
  }, [company]);

  const knowledgeComplete = knowledgeCount !== null ? knowledgeCount > 0 : false;
  const setupStatus = useMemo(() => {
    if (!company) {
      return {
        billing: false,
        calendar: false,
        schedule: false,
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
    const scheduleReady = Boolean(company.timezone) && hasWorkingHours;
    const schedule = Boolean((company as any).schedule_setup_completed) || scheduleReady;
    const calendar = company.calendar_setup_completed === true;
    const knowledge = knowledgeComplete;
    const phone = Boolean(companyNumber);
    return { billing, calendar, schedule, knowledge, phone };
  }, [company, hasWorkingHours, knowledgeComplete, companyNumber]);

  const needsSetup = useMemo(() => {
    if (!company) return false;
    return (
      !setupStatus.billing ||
      !setupStatus.calendar ||
      !setupStatus.schedule ||
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
  const showSetupModal =
    setupDataReady && needsSetup && pathname !== '/dashboard/setup' && userRole !== UserRole.ADMIN;

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
    <div className="flex h-screen bg-background overflow-hidden">
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
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-card border-r border-border flex flex-col
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

        <div className="p-6 flex flex-col items-center justify-center border-b border-border">
          <Logo variant="words" width={160} height={40} />
          {company?.company_name && (
            <p className="mt-2 text-sm font-medium text-foreground text-center">{company.company_name}</p>
          )}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
          <div className="space-y-1">
            <NavLink href="/dashboard" icon={<Home className="h-5 w-5" />} onClick={() => setSidebarOpen(false)}>
              Dashboard
            </NavLink>
            <NavLink href="/dashboard/setup" icon={<CheckSquare className="h-5 w-5" />} onClick={() => setSidebarOpen(false)}>
              Setup
            </NavLink>
            <NavLink href="/dashboard/calls" icon={<Phone className="h-5 w-5" />} onClick={() => setSidebarOpen(false)}>
              Calls
            </NavLink>
            <NavLink href="/dashboard/customers" icon={<Users className="h-5 w-5" />} onClick={() => setSidebarOpen(false)}>
              Customers
            </NavLink>
            <NavLink href="/dashboard/appointments" icon={<Calendar className="h-5 w-5" />} onClick={() => setSidebarOpen(false)}>
              Appointments
            </NavLink>
            <NavLink href="/dashboard/knowledge" icon={<MessageSquare className="h-5 w-5" />} onClick={() => setSidebarOpen(false)}>
              Knowledge Base
            </NavLink>
          </div>

          <div className="pt-2 border-t border-border space-y-1">
            <p className="px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account</p>
            <NavLink href="/dashboard/usage" icon={<BarChart3 className="h-5 w-5" />} onClick={() => setSidebarOpen(false)}>
              Usage
            </NavLink>
            <NavLink href="/dashboard/billing" icon={<CreditCard className="h-5 w-5" />} onClick={() => setSidebarOpen(false)}>
              Billing
            </NavLink>
            <NavLink href="/dashboard/settings" icon={<Settings className="h-5 w-5" />} onClick={() => setSidebarOpen(false)}>
              Settings
            </NavLink>
          </div>
        </nav>

        <div className="p-4 border-t border-border">
          <ProfileDropdown />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile menu button */}
        <div className="lg:hidden p-4 border-b border-border">
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
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {setupDataReady && needsSetup && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-amber-900">Finish your setup</div>
                <div className="text-sm text-amber-800 mt-1">
                  Complete billing, calendar, and working hours so the AI can schedule accurately.
                </div>
              </div>
              <Button asChild>
                <Link href="/dashboard/setup">Continue setup</Link>
              </Button>
            </div>
          )}
          {children}
        </main>
      </div>

      <Dialog open={showSetupModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete setup to continue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div>
                Finish the setup steps so the AI can schedule correctly. This prompt will stay until setup is complete.
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <span>Billing & plan</span>
                <Badge className={setupStatus.billing ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}>
                  {setupStatus.billing ? 'Done' : 'Required'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Calendar connection</span>
                <Badge className={setupStatus.calendar ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}>
                  {setupStatus.calendar ? 'Done' : 'Required'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Working hours & timezone</span>
                <Badge className={setupStatus.schedule ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}>
                  {setupStatus.schedule ? 'Done' : 'Required'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Knowledge base</span>
                <Badge className={setupStatus.knowledge ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}>
                  {setupStatus.knowledge ? 'Done' : 'Required'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Company phone number</span>
                <Badge className={setupStatus.phone ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}>
                  {setupStatus.phone ? 'Linked' : 'Missing'}
                </Badge>
              </div>
            </div>
            <div className="flex justify-end">
              <Button asChild>
                <Link href="/dashboard/setup">Continue setup</Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
  onClick
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center px-4 py-3 text-foreground rounded-lg hover:bg-secondary transition-all duration-200 hover:translate-x-1 group"
    >
      <span className="mr-3 transition-colors duration-200 group-hover:text-primary">{icon}</span>
      <span className="font-medium">{children}</span>
    </Link>
  );
}
