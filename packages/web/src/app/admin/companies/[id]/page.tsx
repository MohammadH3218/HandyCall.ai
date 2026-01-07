'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Logo } from '@/components/ui/logo';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Users, Phone, BarChart3 } from 'lucide-react';
import { UserRole } from '@handycall/shared';
import { AdminNav } from '@/components/admin/admin-nav';
import { PLAN_CATALOG, getPlanPriceDisplay } from '@/constants/plans';

interface Company {
  company_id: string;
  company_name: string;
  service_type: string;
  status: string;
  phone_number: string;
  email: string;
  timezone: string;
  created_at: number;
  subscription_tier?: string;
}

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

  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingActionLoading, setBillingActionLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [usageDelta, setUsageDelta] = useState({ minutes: 0, sms: 0, contacts: 0 });

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
      const [companyRes, statsRes, usersRes, billingRes, invoicesRes] = await Promise.all([
        fetch(`/api/proxy/companies/${companyId}`, { credentials: 'include' }),
        fetch(`/api/proxy/companies/${companyId}/stats`, { credentials: 'include' }),
        fetch(`/api/proxy/companies/${companyId}/users`, { credentials: 'include' }),
        fetch(`/api/proxy/billing/admin/company/${companyId}`, { credentials: 'include' }).catch(() => null),
        fetch(`/api/proxy/billing/admin/company/${companyId}/invoices`, { credentials: 'include' }).catch(() => null),
      ]);

      let companyResponse = companyRes;
      let statsResponse = statsRes;
      let usersResponse = usersRes;
      let billingResponse = billingRes;
      let invoicesResponse = invoicesRes;

      if ([companyRes, statsRes, usersRes, billingRes, invoicesRes].some((r) => r && r.status === 401)) {
        const token = localStorage.getItem('access_token');
        if (!token) {
          throw new Error('Unauthorized. Please re-login as admin.');
        }
        [companyResponse, statsResponse, usersResponse, billingResponse, invoicesResponse] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          billingRes
            ? fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/admin/company/${companyId}`, {
                headers: { Authorization: `Bearer ${token}` },
              }).catch(() => null)
            : null,
          invoicesRes
            ? fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/admin/company/${companyId}/invoices`, {
                headers: { Authorization: `Bearer ${token}` },
              }).catch(() => null)
            : null,
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
      const billingData = billingResponse && billingResponse.ok ? await billingResponse.json() : null;
      const invoicesData = invoicesResponse && invoicesResponse.ok ? await invoicesResponse.json() : null;

      setCompany(companyData);
      setStats(statsData);
      setUsers(usersData);
      setBilling(billingData);
      setInvoices(Array.isArray(invoicesData) ? invoicesData : invoicesData?.data || []);
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

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const cancelSubscription = async (immediate = true) => {
    if (!company) return;
    setBillingActionLoading(true);
    try {
      const res = await fetch(`/api/proxy/billing/admin/company/${company.company_id}/subscription?immediate=${immediate}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to cancel subscription');
      toast({ title: 'Subscription canceled', description: immediate ? 'Canceled immediately' : 'Will cancel at period end' });
      await loadCompanyDetails();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to cancel subscription', variant: 'destructive' });
    } finally {
      setBillingActionLoading(false);
    }
  };

  const reactivateSubscription = async () => {
    if (!company) return;
    setBillingActionLoading(true);
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
      setBillingActionLoading(false);
    }
  };

  const changePlan = async (plan: string) => {
    if (!company) return;
    setBillingActionLoading(true);
    try {
      const res = await fetch(`/api/proxy/billing/admin/company/${company.company_id}/subscription`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error('Failed to update plan');
      toast({ title: 'Plan updated', description: 'Changes take effect immediately' });
      await loadCompanyDetails();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update plan', variant: 'destructive' });
    } finally {
      setBillingActionLoading(false);
    }
  };

  const updateCompanyStatus = async (status: string) => {
    if (!company) return;
    setStatusUpdating(true);
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
      setStatusUpdating(false);
    }
  };

  const resetUsage = async () => {
    if (!company) return;
    setBillingActionLoading(true);
    try {
      const res = await fetch(`/api/proxy/billing/admin/company/${company.company_id}/usage/reset`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to reset usage');
      toast({ title: 'Usage reset', description: 'Today’s usage set to zero' });
      await loadCompanyDetails();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to reset usage', variant: 'destructive' });
    } finally {
      setBillingActionLoading(false);
    }
  };

  const applyCredits = async () => {
    if (!company) return;
    setBillingActionLoading(true);
    try {
      const res = await fetch(`/api/proxy/billing/admin/company/${company.company_id}/usage/adjust`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minutes: -Math.abs(usageDelta.minutes || 0),
          sms: -Math.abs(usageDelta.sms || 0),
          contacts: -Math.abs(usageDelta.contacts || 0),
        }),
      });
      if (!res.ok) throw new Error('Failed to apply credits');
      toast({ title: 'Credits applied', description: 'Usage reduced for this period' });
      await loadCompanyDetails();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to apply credits', variant: 'destructive' });
    } finally {
      setBillingActionLoading(false);
    }
  };

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
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_users}</div>
              <p className="text-xs text-muted-foreground">Active staff members</p>
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
              <p className="text-xs text-muted-foreground">Scheduled appointments</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Admin Controls</CardTitle>
              <CardDescription>Manage company status and usage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-sm font-medium text-muted-foreground">Company status</span>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  defaultValue={company.status}
                  onChange={(e) => updateCompanyStatus(e.target.value)}
                  disabled={statusUpdating}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="TRIAL">Trial</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateCompanyStatus('SUSPENDED')}
                  disabled={statusUpdating}
                >
                  Disable company
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="destructive" onClick={() => cancelSubscription(true)} disabled={billingActionLoading}>
                  Cancel immediately
                </Button>
                <Button size="sm" variant="outline" onClick={() => cancelSubscription(false)} disabled={billingActionLoading}>
                  Cancel at period end
                </Button>
                <Button size="sm" variant="outline" onClick={reactivateSubscription} disabled={billingActionLoading}>
                  Reactivate
                </Button>
                <Button size="sm" variant="outline" onClick={resetUsage} disabled={billingActionLoading}>
                  Reset usage
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-4 items-end">
                <div>
                  <label className="text-xs text-muted-foreground">Credit minutes</label>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={usageDelta.minutes}
                    onChange={(e) => setUsageDelta({ ...usageDelta, minutes: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Credit SMS</label>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={usageDelta.sms}
                    onChange={(e) => setUsageDelta({ ...usageDelta, sms: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Credit contacts</label>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={usageDelta.contacts}
                    onChange={(e) => setUsageDelta({ ...usageDelta, contacts: Number(e.target.value) })}
                  />
                </div>
                <Button size="sm" onClick={applyCredits} disabled={billingActionLoading}>
                  Apply credits
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Subscription</CardTitle>
                <CardDescription>Plan, status, and billing period</CardDescription>
              </div>
              {billing?.subscription_plan && (
                <div className="flex flex-wrap gap-2 items-center">
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    defaultValue={billing.subscription_plan}
                    onChange={(e) => changePlan(e.target.value)}
                    disabled={billingActionLoading}
                  >
                    {Object.entries(PLAN_CATALOG).map(([key, details]) => (
                      <option key={key} value={key}>
                        {details.name} ({getPlanPriceDisplay(key as any).current}/week)
                      </option>
                    ))}
                  </select>
                  {billing?.cancel_at_period_end ? (
                    <Button size="sm" variant="outline" onClick={reactivateSubscription} disabled={billingActionLoading}>
                      Reactivate
                    </Button>
                  ) : (
                    <Button size="sm" variant="destructive" onClick={() => cancelSubscription(true)} disabled={billingActionLoading}>
                      Cancel now
                    </Button>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="text-base font-semibold">
                  {billing?.subscription_plan
                    ? PLAN_CATALOG[billing.subscription_plan as keyof typeof PLAN_CATALOG]?.name || billing.subscription_plan
                    : 'No subscription'}
                </p>
                {billing?.subscription_status && (
                  <Badge className="mt-1" variant="outline">
                    {billing.subscription_status}
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Period</p>
                <p className="text-base">
                  {billing?.current_period_start
                    ? `${formatDate(billing.current_period_start)} - ${formatDate(
                        billing.current_period_end || billing.current_period_start
                      )}`
                    : 'N/A'}
                </p>
                {billing?.cancel_at_period_end && (
                  <p className="text-xs text-amber-700">Cancels at period end</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                {billing?.payment_method_last4 || billing?.payment_method?.last4 ? (
                  <p className="text-base">
                    {(billing.payment_method_brand ||
                      billing.payment_method?.brand ||
                      'Card'
                    ).toUpperCase()}{' '}
                    •••• {billing.payment_method_last4 || billing.payment_method?.last4}
                  </p>
                ) : (
                  <p className="text-base">No card on file</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Basic company details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Status:</span>
                  <Badge>{company.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Service Type:</span>
                  <span className="text-sm">{company.service_type.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Email:</span>
                  <span className="text-sm">{company.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Phone:</span>
                  <span className="text-sm">{company.phone_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Timezone:</span>
                  <span className="text-sm">{company.timezone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Created:</span>
                  <span className="text-sm">{formatDate(company.created_at)}</span>
                </div>
                {company.subscription_tier && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Subscription:</span>
                    <Badge variant="outline">{company.subscription_tier}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>{users.length} users</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
                ) : (
                  users.map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                        {user.is_active ? (
                          <Badge className="text-xs bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge className="text-xs bg-gray-100 text-gray-800">Inactive</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Invoice History</CardTitle>
              <CardDescription>Past invoices for this company</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No invoices found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-2 pr-4">Invoice</th>
                        <th className="py-2 pr-4">Amount</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Created</th>
                        <th className="py-2 pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => {
                        const amount =
                          inv.amount_paid ?? inv.amount_due ?? 0;
                        const currency = inv.currency || 'usd';
                        return (
                          <tr key={inv.id} className="border-t">
                            <td className="py-2 pr-4 font-medium">
                              {inv.number || inv.id.slice(-8)}
                            </td>
                            <td className="py-2 pr-4">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: currency.toUpperCase(),
                              }).format(amount / 100)}
                            </td>
                            <td className="py-2 pr-4">
                              <Badge variant="outline">{inv.status}</Badge>
                            </td>
                            <td className="py-2 pr-4">{formatDate(inv.created * 1000 || inv.created)}</td>
                            <td className="py-2 pr-4">
                              <div className="flex gap-2">
                                {inv.hosted_invoice_url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(inv.hosted_invoice_url!, '_blank')}
                                  >
                                    View
                                  </Button>
                                )}
                                {inv.invoice_pdf && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(inv.invoice_pdf!, '_blank')}
                                  >
                                    PDF
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
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
