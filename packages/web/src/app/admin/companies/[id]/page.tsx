'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Users, Phone, BarChart3, MessageSquare } from 'lucide-react';
import { UserRole, Company as CompanyType } from '@handycall/shared';
import { AdminNav } from '@/components/admin/admin-nav';
import { PLAN_CATALOG, getPlanPriceDisplay } from '@/constants/plans';

interface CompanyStats {
  total_calls: number;
  total_users: number;
  ai_handled_calls: number;
  ai_handled_percentage: number;
  total_contacts: number;
  total_appointments: number;
}

interface User {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  created_at: number;
  last_login_at?: number;
}

interface BillingInfo {
  subscription_plan?: string;
  subscription_status?: string;
  current_period_start?: number;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  payment_method?: {
    last4?: string;
    brand?: string;
  } | null;
  payment_method_last4?: string;
  payment_method_brand?: string;
}

interface Invoice {
  id: string;
  number?: string;
  amount_paid?: number;
  amount_due?: number;
  status: string;
  currency: string;
  created: number;
  period_start?: number;
  period_end?: number;
  hosted_invoice_url?: string;
  invoice_pdf?: string;
}

export default function CompanyDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { userRole, isAuthenticated, isLoading } = useAuthStore();
  const { toast } = useToast();

  const [company, setCompany] = useState<CompanyType | null>(null);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Service toggles state
  const [callsEnabled, setCallsEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [toggleLoading, setToggleLoading] = useState<'calls' | 'sms' | null>(null);

  const companyId = params.id as string;

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || userRole !== UserRole.ADMIN)) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && userRole === UserRole.ADMIN) {
      loadCompanyDetails();
    }
  }, [isAuthenticated, userRole, isLoading, router, companyId]);

  const loadCompanyDetails = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [companyRes, statsRes, usersRes] = await Promise.all([
        fetch(`/api/proxy/companies/${companyId}`, { credentials: 'include' }),
        fetch(`/api/proxy/companies/${companyId}/stats`, { credentials: 'include' }),
        fetch(`/api/proxy/companies/${companyId}/users`, { credentials: 'include' }),
      ]);

      const billingRes = await fetch(`/api/proxy/billing/admin/company/${companyId}`, { credentials: 'include' }).catch(() => null);
      const invoicesRes = await fetch(`/api/proxy/billing/admin/company/${companyId}/invoices`, { credentials: 'include' }).catch(() => null);

      let companyResponse = companyRes;
      let statsResponse = statsRes;
      let usersResponse = usersRes;

      if ([companyRes, statsRes, usersRes].some((r) => r && r.status === 401)) {
        const token = localStorage.getItem('access_token');
        if (!token) {
          throw new Error('Unauthorized. Please re-login as admin.');
        }
        [companyResponse, statsResponse, usersResponse] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
      }

      if (!companyResponse.ok || !statsResponse.ok || !usersResponse.ok) {
        throw new Error('Failed to load company details');
      }

      const [companyData, statsData, usersData] = await Promise.all([
        companyResponse.json(),
        statsResponse.json(),
        usersResponse.json(),
      ]);

      const billingData = billingRes && billingRes.ok ? await billingRes.json() : null;
      const invoicesData = invoicesRes && invoicesRes.ok ? await invoicesRes.json() : [];

      setCompany(companyData);
      setStats(statsData);
      setUsers(usersData);
      setBilling(billingData);
      setInvoices(Array.isArray(invoicesData) ? invoicesData : invoicesData?.data || []);

      // Initialize service toggle states
      setCallsEnabled(companyData.calls_enabled ?? true);
      setSmsEnabled(companyData.sms_enabled ?? true);
    } catch (error) {
      console.error('Failed to load company details:', error);
      setLoadError((error as any)?.message || 'Failed to load company details');
      toast({
        title: 'Error',
        description: 'Failed to load company details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const toggleService = async (service: 'calls' | 'sms', enabled: boolean) => {
    if (!company) return;
    setToggleLoading(service);
    try {
      const res = await fetch(`/api/proxy/companies/${company.company_id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [service === 'calls' ? 'calls_enabled' : 'sms_enabled']: enabled,
        }),
      });

      if (!res.ok) throw new Error('Failed to update service settings');

      if (service === 'calls') {
        setCallsEnabled(enabled);
      } else {
        setSmsEnabled(enabled);
      }

      toast({
        title: enabled ? `${service === 'calls' ? 'Calls' : 'SMS'} enabled` : `${service === 'calls' ? 'Calls' : 'SMS'} disabled`,
        description: enabled
          ? `Company can now receive ${service === 'calls' ? 'incoming calls' : 'incoming SMS messages'}`
          : `${service === 'calls' ? 'Call' : 'SMS'} handling is paused`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update service settings',
        variant: 'destructive',
      });
      if (service === 'calls') {
        setCallsEnabled(!enabled);
      } else {
        setSmsEnabled(!enabled);
      }
    } finally {
      setToggleLoading(null);
    }
  };

  const cancelSubscription = async (immediate = true) => {
    if (!company) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/proxy/billing/admin/company/${company.company_id}/subscription?immediate=${immediate}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to cancel subscription');
      }
      toast({
        title: 'Subscription canceled',
        description: immediate ? 'Subscription canceled immediately' : 'Will cancel at period end'
      });
      await loadCompanyDetails();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to cancel subscription', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const reactivateSubscription = async () => {
    if (!company) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/proxy/billing/admin/company/${company.company_id}/subscription/reactivate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to reactivate subscription');
      toast({ title: 'Subscription reactivated' });
      await loadCompanyDetails();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to reactivate subscription', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const changePlan = async (plan: string) => {
    if (!company) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/proxy/billing/admin/company/${company.company_id}/subscription`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error('Failed to update plan');
      toast({ title: 'Plan updated', description: 'Changes applied successfully' });
      await loadCompanyDetails();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update plan', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const updateCompanyStatus = async (status: string) => {
    if (!company) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/proxy/companies/${company.company_id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast({ title: 'Status updated', description: `Company set to ${status}` });
      await loadCompanyDetails();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update status', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const createSubscription = async (plan: string) => {
    if (!company) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/proxy/billing/admin/company/${company.company_id}/subscription`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create subscription');
      }
      toast({ title: 'Subscription created', description: `${plan} plan activated` });
      await loadCompanyDetails();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to create subscription', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  function ServiceToggle({
    label,
    icon,
    enabled,
    loading,
    onToggle,
  }: {
    label: string;
    icon: React.ReactNode;
    enabled: boolean;
    loading: boolean;
    onToggle: (enabled: boolean) => void;
  }) {
    return (
      <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-3">
          <div className={`transition-colors ${enabled ? 'text-green-600' : 'text-gray-400'}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className={`text-xs font-semibold transition-colors ${enabled ? 'text-green-600' : 'text-gray-500'}`}>
              {enabled ? 'Active' : 'Paused'}
            </p>
          </div>
        </div>
        <button
          onClick={() => onToggle(!enabled)}
          disabled={loading}
          className={`
            relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ease-in-out
            ${enabled ? 'bg-green-500 shadow-lg shadow-green-200' : 'bg-gray-300 shadow-md'}
            ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-xl'}
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          `}
          aria-label={`Toggle ${label}`}
        >
          <span
            className={`
              inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-all duration-300 ease-in-out
              ${enabled ? 'translate-x-6' : 'translate-x-1'}
              ${loading ? 'animate-pulse' : ''}
            `}
          >
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
              </div>
            )}
          </span>
        </button>
      </div>
    );
  }

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (loadError || !company || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">{loadError || 'Unable to load company'}</p>
          <Button onClick={loadCompanyDetails}>Retry</Button>
          <Button variant="outline" onClick={() => router.push('/admin/companies')}>
            Back to companies
          </Button>
        </div>
      </div>
    );
  }

  const planName = billing?.subscription_plan
    ? PLAN_CATALOG[billing.subscription_plan as keyof typeof PLAN_CATALOG]?.name || billing.subscription_plan
    : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin/companies')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="border-l border-border pl-2 sm:pl-4 min-w-0 flex-1">
                <h1 className="text-base sm:text-xl font-semibold text-foreground truncate">
                  {company.company_name}
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Company Details</p>
              </div>
            </div>
            <ProfileDropdown />
          </div>
          <div className="py-3 border-t border-border">
            <AdminNav />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_calls}</div>
              <p className="text-xs text-muted-foreground">
                {stats.ai_handled_percentage.toFixed(1)}% AI handled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_users}</div>
              <p className="text-xs text-muted-foreground">Active members</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contacts</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_contacts}</div>
              <p className="text-xs text-muted-foreground">Total contacts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Appointments</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_appointments}</div>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Company Controls */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Company Controls</CardTitle>
              <CardDescription>Manage company status, services, and subscription</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Control */}
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-sm font-medium text-muted-foreground min-w-[120px]">Company Status</span>
                <select
                  className="border rounded-md px-3 py-2 text-sm bg-background"
                  value={company.status}
                  onChange={(e) => updateCompanyStatus(e.target.value)}
                  disabled={actionLoading}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <Badge variant={company.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {company.status}
                </Badge>
              </div>

              {/* Service Toggles */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Service Controls</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ServiceToggle
                    label="Call Handling"
                    icon={<Phone className="h-5 w-5" />}
                    enabled={callsEnabled}
                    loading={toggleLoading === 'calls'}
                    onToggle={(enabled) => toggleService('calls', enabled)}
                  />
                  <ServiceToggle
                    label="SMS Handling"
                    icon={<MessageSquare className="h-5 w-5" />}
                    enabled={smsEnabled}
                    loading={toggleLoading === 'sms'}
                    onToggle={(enabled) => toggleService('sms', enabled)}
                  />
                </div>
              </div>

              {/* Subscription Management */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Subscription Management</h4>
                {billing?.subscription_plan ? (
                  <div className="flex flex-wrap gap-2 items-center">
                    <select
                      className="border rounded-md px-3 py-2 text-sm bg-background"
                      value={billing.subscription_plan}
                      onChange={(e) => changePlan(e.target.value)}
                      disabled={actionLoading}
                    >
                      {Object.entries(PLAN_CATALOG).map(([key, details]) => (
                        <option key={key} value={key}>
                          {details.name} - {getPlanPriceDisplay(key as any).current}/week
                        </option>
                      ))}
                    </select>
                    {billing?.cancel_at_period_end ? (
                      <Button size="sm" onClick={reactivateSubscription} disabled={actionLoading}>
                        Reactivate
                      </Button>
                    ) : (
                      <Button size="sm" variant="destructive" onClick={() => cancelSubscription(true)} disabled={actionLoading}>
                        Cancel
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => createSubscription('STARTER')} disabled={actionLoading}>
                      Give Starter Plan
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => createSubscription('PRO')} disabled={actionLoading}>
                      Give Pro Plan
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => createSubscription('MAX')} disabled={actionLoading}>
                      Give Max Plan
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Subscription Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Current plan and billing details</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="text-lg font-semibold">
                  {planName || 'No subscription'}
                </p>
                {billing?.subscription_status && (
                  <Badge className="mt-1" variant={billing.subscription_status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {billing.subscription_status}
                  </Badge>
                )}
                {billing?.cancel_at_period_end && (
                  <p className="text-xs text-amber-600 mt-1">Cancels at period end</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Billing Period</p>
                <p className="text-sm">
                  {billing?.current_period_start
                    ? `${formatDate(billing.current_period_start)} - ${formatDate(
                        billing.current_period_end || billing.current_period_start
                      )}`
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                {billing?.payment_method_last4 || billing?.payment_method?.last4 ? (
                  <p className="text-sm">
                    {(billing.payment_method_brand || billing.payment_method?.brand || 'Card').toUpperCase()}{' '}
                    •••• {billing.payment_method_last4 || billing.payment_method?.last4}
                  </p>
                ) : (
                  <p className="text-sm">No card on file</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle>Company Info</CardTitle>
              <CardDescription>Basic details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service Type</span>
                <span className="font-medium">{company.service_type.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium truncate ml-2">{company.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{company.phone_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Timezone</span>
                <span className="font-medium">{company.timezone}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{formatDate(company.created_at)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Users */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>{users.length} {users.length === 1 ? 'user' : 'users'}</CardDescription>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No users found</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {users.map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-2">
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                        <Badge className={`text-xs ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoices */}
          {invoices.length > 0 && (
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Recent Invoices</CardTitle>
                <CardDescription>Billing history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="py-2 pr-4 font-medium">Invoice</th>
                        <th className="py-2 pr-4 font-medium">Amount</th>
                        <th className="py-2 pr-4 font-medium">Status</th>
                        <th className="py-2 pr-4 font-medium">Date</th>
                        <th className="py-2 pr-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => {
                        const amount = inv.amount_paid ?? inv.amount_due ?? 0;
                        const currency = inv.currency || 'usd';
                        return (
                          <tr key={inv.id} className="border-b last:border-0">
                            <td className="py-3 pr-4 font-medium">
                              {inv.number || `#${inv.id.slice(-8)}`}
                            </td>
                            <td className="py-3 pr-4">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: currency.toUpperCase(),
                              }).format(amount / 100)}
                            </td>
                            <td className="py-3 pr-4">
                              <Badge variant="outline" className="text-xs">{inv.status}</Badge>
                            </td>
                            <td className="py-3 pr-4">{formatDate(inv.created * 1000 || inv.created)}</td>
                            <td className="py-3 pr-4">
                              <div className="flex gap-2">
                                {inv.hosted_invoice_url && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(inv.hosted_invoice_url!, '_blank')}
                                  >
                                    View
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
