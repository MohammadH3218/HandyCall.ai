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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Phone, Search } from 'lucide-react';

type Company = {
  company_id: string;
  company_name: string;
  service_type: string;
  status: string;
  email: string;
  timezone: string;
  created_at: number;
  subscription_plan?: string;
  subscription_status?: string;
  cancel_at_period_end?: boolean;
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

