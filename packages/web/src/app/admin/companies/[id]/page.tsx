'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { UserRole } from '@handycall/shared';
import { useAuthStore } from '@/stores/auth-store';
import { Logo } from '@/components/ui/logo';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { AdminNav } from '@/components/admin/admin-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Phone, Save, Search } from 'lucide-react';

type Company = {
  company_id: string;
  company_name: string;
  service_type: string;
  status: string;
  email: string;
  phone_number?: string;
  timezone: string;
  created_at: number;
  subscription_plan?: string;
  subscription_status?: string;
  cancel_at_period_end?: boolean;
  subscription_tier?: string;
  calls_enabled?: boolean;
  sms_enabled?: boolean;
};

type AvailableNumber = {
  phoneNumber: string;
  locality?: string;
  region?: string;
};

type CompanyNumber = {
  phoneNumber: string;
  provider?: string;
  label?: string;
} | null;

const SERVICE_TYPES: Array<{ value: string; label: string }> = [
  { value: 'HANDYMAN', label: 'Handyman' },
  { value: 'PEST_CONTROL', label: 'Pest Control' },
  { value: 'ELECTRICIAN', label: 'Electrician' },
  { value: 'PLUMBING', label: 'Plumbing' },
  { value: 'HVAC', label: 'HVAC' },
  { value: 'LANDSCAPING', label: 'Landscaping' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'OTHER', label: 'Other' },
];

const COMPANY_STATUSES: Array<{ value: string; label: string }> = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

async function fetchJsonWithFallback(url: string, init?: RequestInit) {
  let res = await fetch(url, { ...(init || {}), credentials: 'include' });

  if (res.status === 401) {
    const token = localStorage.getItem('access_token');
    if (token) {
      res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url.replace('/api/proxy', '')}`, {
        ...(init || {}),
        headers: {
          ...(init?.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }

  return res.json();
}

export default function AdminCompanyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = useMemo(() => String((params as any)?.id || ''), [params]);
  const { userRole, isAuthenticated, isLoading } = useAuthStore();
  const { toast } = useToast();

  const [company, setCompany] = useState<Company | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [editData, setEditData] = useState<Partial<Company>>({});

  const [assignedNumber, setAssignedNumber] = useState<CompanyNumber>(null);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [numbersLoading, setNumbersLoading] = useState(false);
  const [numbersError, setNumbersError] = useState<string | null>(null);
  const [areaCode, setAreaCode] = useState('832');
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([]);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || userRole !== UserRole.ADMIN)) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && userRole === UserRole.ADMIN && companyId) {
      void loadCompany();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userRole, isLoading, companyId]);

  const loadCompany = async () => {
    setIsPageLoading(true);
    try {
      const data = await fetchJsonWithFallback(`/api/proxy/companies/${companyId}`);
      setCompany(data);
      setEditData({
        company_name: data.company_name,
        service_type: data.service_type,
        email: data.email,
        phone_number: data.phone_number ?? '',
        timezone: data.timezone,
        status: data.status,
        subscription_tier: (data as any).subscription_tier ?? '',
        calls_enabled: Boolean((data as any).calls_enabled),
        sms_enabled: Boolean((data as any).sms_enabled),
      });

      const numberRes = await fetchJsonWithFallback(`/api/proxy/admin/telephony/companies/${companyId}/number`);
      setAssignedNumber(numberRes?.data ?? null);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message || 'Failed to load company',
        variant: 'destructive',
      });
    } finally {
      setIsPageLoading(false);
    }
  };

  const saveCompanyDetails = async () => {
    try {
      setIsSavingCompany(true);
      const payload: any = {
        company_name: editData.company_name,
        service_type: editData.service_type,
        email: editData.email,
        phone_number: (editData.phone_number || '').trim() || undefined,
        timezone: editData.timezone,
        status: editData.status,
        subscription_tier: (editData.subscription_tier || '').trim() || undefined,
        calls_enabled: Boolean(editData.calls_enabled),
        sms_enabled: Boolean(editData.sms_enabled),
      };

      const updated = await fetchJsonWithFallback(`/api/proxy/companies/${companyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setCompany(updated);
      toast({ title: 'Saved', description: 'Company updated successfully.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to update company', variant: 'destructive' });
    } finally {
      setIsSavingCompany(false);
    }
  };

  const loadAvailableNumbers = async () => {
    try {
      setNumbersLoading(true);
      setNumbersError(null);
      const qs = new URLSearchParams();
      qs.set('country', 'US');
      qs.set('maxResults', '10');
      if (areaCode.trim()) qs.set('areaCode', areaCode.trim());

      const res = await fetchJsonWithFallback(`/api/proxy/admin/telephony/available-numbers?${qs.toString()}`);
      const list = Array.isArray(res?.data) ? res.data : [];
      setAvailableNumbers(list);
    } catch (err: any) {
      setNumbersError(err?.message || 'Failed to load available numbers');
      setAvailableNumbers([]);
    } finally {
      setNumbersLoading(false);
    }
  };

  const claimNumber = async (phoneNumber: string) => {
    try {
      setNumbersLoading(true);
      setNumbersError(null);

      const res = await fetchJsonWithFallback(`/api/proxy/admin/telephony/companies/${companyId}/claim-number`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });

      const claimed = res?.data?.phoneNumber ?? res?.data?.phone_number ?? phoneNumber;
      setAssignedNumber({ phoneNumber: claimed, provider: 'TWILIO' });
      setClaimDialogOpen(false);
      toast({ title: 'Success', description: `Claimed ${claimed} and routed to voice bridge.` });
    } catch (err: any) {
      setNumbersError(err?.message || 'Failed to claim number');
    } finally {
      setNumbersLoading(false);
    }
  };

  if (isLoading || isPageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card shadow-sm border-b border-border sticky top-0 z-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="hidden sm:block cursor-pointer" onClick={() => router.push('/admin')}>
                  <Logo variant="words" width={160} height={40} />
                </div>
                <div className="sm:hidden cursor-pointer" onClick={() => router.push('/admin')}>
                  <Logo variant="icon" width={40} height={40} />
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
          <Button variant="outline" onClick={() => router.push('/admin/companies')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Companies
          </Button>
          <div className="mt-6 text-sm text-muted-foreground">Company not found.</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <div className="hidden sm:block cursor-pointer" onClick={() => router.push('/admin')}>
                <Logo variant="words" width={160} height={40} />
              </div>
              <div className="sm:hidden cursor-pointer" onClick={() => router.push('/admin')}>
                <Logo variant="icon" width={40} height={40} />
              </div>
              <div className="border-l border-border pl-2 sm:pl-4 min-w-0 flex-1">
                <h1 className="text-base sm:text-xl font-semibold text-foreground truncate">{company.company_name}</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Company details</p>
              </div>
            </div>
            <ProfileDropdown />
          </div>
          <div className="py-3 border-t border-border">
            <AdminNav />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" onClick={() => router.push('/admin/companies')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Badge variant="outline">{company.status}</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Company details</CardTitle>
            <CardDescription>Update core company fields and service settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company name</Label>
                <Input
                  id="company_name"
                  value={editData.company_name ?? ''}
                  onChange={(e) => setEditData((p) => ({ ...p, company_name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Service type</Label>
                <Select
                  value={String(editData.service_type ?? '')}
                  onValueChange={(value) => setEditData((p) => ({ ...p, service_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Company email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editData.email ?? ''}
                  onChange={(e) => setEditData((p) => ({ ...p, email: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Business contact phone (E.164)</Label>
                <Input
                  id="phone_number"
                  value={String(editData.phone_number ?? '')}
                  onChange={(e) => setEditData((p) => ({ ...p, phone_number: e.target.value }))}
                  placeholder="+12345678900"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={String(editData.timezone ?? '')}
                  onChange={(e) => setEditData((p) => ({ ...p, timezone: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={String(editData.status ?? '')}
                  onValueChange={(value) => setEditData((p) => ({ ...p, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subscription_tier">Subscription tier (internal)</Label>
                <Input
                  id="subscription_tier"
                  value={String(editData.subscription_tier ?? '')}
                  onChange={(e) => setEditData((p) => ({ ...p, subscription_tier: e.target.value }))}
                  placeholder="MAX"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(editData.calls_enabled)}
                  onChange={(e) => setEditData((p) => ({ ...p, calls_enabled: e.target.checked }))}
                />
                Calls enabled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(editData.sms_enabled)}
                  onChange={(e) => setEditData((p) => ({ ...p, sms_enabled: e.target.checked }))}
                />
                SMS enabled
              </label>
            </div>

            <div className="flex justify-end">
              <Button onClick={saveCompanyDetails} disabled={isSavingCompany}>
                <Save className="h-4 w-4 mr-2" />
                {isSavingCompany ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Telephony</CardTitle>
            <CardDescription>Assign a Twilio phone number to route inbound calls to the AI receptionist.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-gray-900">Assigned phone number</div>
                <div className="text-sm text-gray-600">{assignedNumber?.phoneNumber ?? 'Not assigned'}</div>
              </div>
              <Button
                onClick={() => {
                  setClaimDialogOpen(true);
                  void loadAvailableNumbers();
                }}
              >
                <Phone className="h-4 w-4 mr-2" />
                Claim phone number
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Claiming a number purchases it in Twilio (monthly fee) and automatically routes Voice to the voice bridge.
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Claim a Twilio phone number</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="areaCode">Area code (optional)</Label>
                <Input
                  id="areaCode"
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value)}
                  placeholder="e.g., 832"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={loadAvailableNumbers} disabled={numbersLoading}>
                  <Search className="h-4 w-4 mr-2" />
                  {numbersLoading ? 'Loading...' : 'Search'}
                </Button>
              </div>
            </div>

            {numbersError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">{numbersError}</div>
            )}

            <div className="border rounded-md divide-y">
              {numbersLoading ? (
                <div className="p-4 text-sm text-gray-600">Loading available numbers...</div>
              ) : availableNumbers.length ? (
                availableNumbers.map((n) => (
                  <div key={n.phoneNumber} className="p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{n.phoneNumber}</div>
                      <div className="text-xs text-gray-500">
                        {[n.locality, n.region].filter(Boolean).join(', ') || 'US local'}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => claimNumber(n.phoneNumber)} disabled={numbersLoading}>
                      Claim
                    </Button>
                  </div>
                ))
              ) : (
                <div className="p-4 text-sm text-gray-600">No numbers found. Try a different area code.</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
