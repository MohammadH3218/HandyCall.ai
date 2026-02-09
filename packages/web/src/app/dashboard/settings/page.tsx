'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CALL_HANDLING_OPTIONS } from '@/constants/call-handling';
import { CallHandlingMode } from '@handycall/shared';
import { CallForwardingGuide } from '@/components/telephony/call-forwarding-guide';
import { PageHeader } from '@/components/portal/page-header';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Phone, Settings2, ShieldCheck } from 'lucide-react';

export default function SettingsPage() {
  const { toast } = useToast();
  const { company } = useAuthStore();
  const [formData, setFormData] = useState({
    company_name: '',
    phone_number: '',
    timezone: '',
    transfer_enabled: false,
    transfer_number: '',
    call_handling_mode: CallHandlingMode.ALWAYS,
  });
  const [isSavingBusiness, setIsSavingBusiness] = useState(false);
  const [isSavingCall, setIsSavingCall] = useState(false);
  const [myNumber, setMyNumber] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'business' | 'call' | 'account'>('business');
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState({
    company_name: '',
    phone_number: '',
    timezone: '',
  });

  const statusLabel = company?.cancel_at_period_end
    ? 'Cancelled'
    : company?.status
      ? company.status.charAt(0) + company.status.slice(1).toLowerCase()
      : 'Inactive';

  useEffect(() => {
    if (!company) return;
    setFormData({
      company_name: company.company_name,
      phone_number: company.phone_number ?? '',
      timezone: company.timezone,
      transfer_enabled: company.transfer_enabled ?? false,
      transfer_number: company.transfer_number ?? '',
      call_handling_mode: (company.call_handling_mode as CallHandlingMode) || CallHandlingMode.ALWAYS,
    });
    setEditDraft({
      company_name: company.company_name,
      phone_number: company.phone_number ?? '',
      timezone: company.timezone,
    });
  }, [company]);

  useEffect(() => {
    apiClient
      .getMyTelephonyNumber()
      .then((res: any) => {
        const phone =
          res?.phoneNumber ??
          res?.phone_number ??
          res?.data?.phoneNumber ??
          res?.data?.phone_number ??
          null;
        setMyNumber(phone || null);
      })
      .catch(() => setMyNumber(null));
  }, []);

  const inboundSummary = useMemo(
    () => myNumber ?? 'Not assigned yet',
    [myNumber]
  );

  const handleSaveBusiness = async () => {
    setIsSavingBusiness(true);
    try {
      await apiClient.updateMyCompany({
        company_name: editDraft.company_name,
        phone_number: editDraft.phone_number || '',
        timezone: editDraft.timezone,
      });
      setFormData((prev) => ({
        ...prev,
        company_name: editDraft.company_name,
        phone_number: editDraft.phone_number || '',
        timezone: editDraft.timezone,
      }));
      setEditOpen(false);
      toast({
        title: 'Business info updated',
        description: 'Your company details were saved successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error?.message || 'Failed to save business info.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingBusiness(false);
    }
  };

  const handleSaveCallHandling = async () => {
    setIsSavingCall(true);
    try {
      await apiClient.updateMyCompany({
        call_handling_mode: formData.call_handling_mode,
        transfer_enabled: formData.transfer_enabled,
        transfer_number: formData.transfer_enabled ? formData.transfer_number : '',
      });
      toast({
        title: 'Call handling updated',
        description: 'Your call routing preferences were saved.',
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error?.message || 'Failed to save call handling settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingCall(false);
    }
  };


  return (
    <div className="space-y-6 animate-fade-up max-w-4xl mx-auto">
      <PageHeader
        eyebrow="Settings"
        title="Business settings"
        subtitle="Manage your business information and preferences."
      />

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {[
          { key: 'business', label: 'Business info' },
          { key: 'call', label: 'Call handling' },
          { key: 'account', label: 'Account' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'business' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Business information</CardTitle>
                <CardDescription>Review your core company details.</CardDescription>
              </div>
              <Button onClick={() => setEditOpen(true)} variant="outline">
                Edit details
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Business name</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formData.company_name || 'Not set'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Business contact phone</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formData.phone_number || 'Not set'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Timezone</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formData.timezone || 'Not set'}</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Phone className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-wide">Inbound number</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{inboundSummary}</p>
                {!myNumber && (
                  <p className="mt-2 text-xs text-slate-600">
                    HandyCall assigns this number. Contact support if you need a specific area code.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'call' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Call handling</CardTitle>
              <CardDescription>Choose how HandyCall answers and routes calls.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {CALL_HANDLING_OPTIONS.map((option) => {
                  const selected = formData.call_handling_mode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          call_handling_mode: option.value,
                        }))
                      }
                      className={`rounded-2xl border p-4 text-left text-sm transition ${
                        selected
                          ? 'border-emerald-400 bg-emerald-50/70 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-emerald-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-1 h-3 w-3 rounded-full border ${
                            selected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                          }`}
                        />
                        <div>
                          <div className="font-semibold text-slate-900">{option.label}</div>
                          <div className="text-xs text-slate-600">{option.description}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-600">
                Use your carrier forwarding settings to match this choice.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Human transfer</CardTitle>
              <CardDescription>Let callers reach a person when needed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                    <Settings2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Enable call transfer</p>
                    <p className="text-xs text-slate-600">Route urgent calls to a human team member.</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-pressed={formData.transfer_enabled}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      transfer_enabled: !prev.transfer_enabled,
                    }))
                  }
                  className={`relative h-7 w-12 rounded-full transition ${
                    formData.transfer_enabled ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                      formData.transfer_enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {formData.transfer_enabled && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                  <Label htmlFor="transfer_number">Forwarding number</Label>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="transfer_number"
                      value={formData.transfer_number}
                      onChange={(e) => setFormData({ ...formData, transfer_number: e.target.value })}
                      placeholder="+15551234567"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          transfer_number: formData.phone_number,
                        })
                      }
                      disabled={!formData.phone_number}
                    >
                      Use business number
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSaveCallHandling} disabled={isSavingCall}>
                  {isSavingCall ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <CallForwardingGuide forwardToNumber={myNumber} callHandlingMode={formData.call_handling_mode} />
        </div>
      )}

      {activeTab === 'account' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account status</CardTitle>
              <CardDescription>Your subscription information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Account status</p>
                    <p className="text-xs text-slate-600">Current subscription state</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-900">{statusLabel}</span>
              </div>
              {company?.trial_ends_at && (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                  <span className="text-sm font-medium text-slate-700">Trial ends</span>
                  <span className="text-sm text-slate-600">
                    {new Date(company.trial_ends_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit business information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Business name</Label>
              <Input
                id="company_name"
                value={editDraft.company_name}
                onChange={(e) => setEditDraft((prev) => ({ ...prev, company_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_number">Business contact phone (optional)</Label>
              <Input
                id="phone_number"
                value={editDraft.phone_number}
                onChange={(e) => setEditDraft((prev) => ({ ...prev, phone_number: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={editDraft.timezone}
                onChange={(e) => setEditDraft((prev) => ({ ...prev, timezone: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveBusiness} disabled={isSavingBusiness}>
                {isSavingBusiness ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
