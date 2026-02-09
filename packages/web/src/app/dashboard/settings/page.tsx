'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CALL_HANDLING_OPTIONS } from '@/constants/call-handling';
import { CallHandlingMode } from '@handycall/shared';
import { CallForwardingGuide } from '@/components/telephony/call-forwarding-guide';

export default function SettingsPage() {
  const { company } = useAuthStore();
  const [formData, setFormData] = useState({
    company_name: '',
    phone_number: '',
    timezone: '',
    transfer_enabled: false,
    transfer_number: '',
    call_handling_mode: CallHandlingMode.ALWAYS,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [myNumber, setMyNumber] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');

    try {
      await apiClient.updateMyCompany(formData);
      setMessage('Settings saved successfully!');
    } catch (error: any) {
      setMessage('Error: ' + (error.message || 'Failed to save settings'));
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="p-8 max-w-4xl animate-fade-up">
      <div className="mb-8">
        <h1 className="text-3xl font-display text-slate-900">Settings</h1>
        <p className="mt-2 text-slate-600">Manage your business information and preferences.</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>Update your company details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {message && (
                <div
                  className={`rounded-md p-3 text-sm ${message.includes('Error')
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-green-50 text-green-700'
                    }`}
                >
                  {message}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="company_name">Business Name</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Business Contact Phone (optional)</Label>
                <Input
                  id="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                <Label>Call handling</Label>
                <div className="grid gap-3 md:grid-cols-3">
                  {CALL_HANDLING_OPTIONS.map((option) => {
                    const selected = formData.call_handling_mode === option.value;
                    return (
                      <label
                        key={option.value}
                        className={`cursor-pointer rounded-xl border p-3 text-left text-sm transition ${
                          selected ? 'border-emerald-400 bg-emerald-50/70' : 'border-slate-200 bg-white/80'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="radio"
                            name="callHandlingMode"
                            className="mt-1 h-4 w-4 accent-emerald-600"
                            checked={selected}
                            onChange={() =>
                              setFormData({
                                ...formData,
                                call_handling_mode: option.value,
                              })
                            }
                            disabled={isSaving}
                          />
                          <div>
                            <div className="font-semibold text-slate-900">{option.label}</div>
                            <div className="text-xs text-slate-600">{option.description}</div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-600">
                  Use your carrier forwarding settings to match this choice.
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                <div className="flex items-center gap-3">
                  <input
                    id="transfer_enabled"
                    type="checkbox"
                    className="h-4 w-4 accent-emerald-600"
                    checked={formData.transfer_enabled}
                    onChange={(e) => setFormData({ ...formData, transfer_enabled: e.target.checked })}
                    disabled={isSaving}
                  />
                  <Label htmlFor="transfer_enabled">Enable call transfer to a human</Label>
                </div>

                {formData.transfer_enabled && (
                  <div className="space-y-2">
                    <Label htmlFor="transfer_number">Forwarding number</Label>
                    <div className="flex flex-col gap-2">
                      <Input
                        id="transfer_number"
                        value={formData.transfer_number}
                        onChange={(e) => setFormData({ ...formData, transfer_number: e.target.value })}
                        placeholder="+15551234567"
                        disabled={isSaving}
                      />
                      {formData.phone_number && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              transfer_number: formData.phone_number,
                            })
                          }
                          disabled={isSaving}
                        >
                          Use my business number
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
            <CardDescription>Your subscription information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Status:</span>
                <span className="text-sm text-slate-600">{statusLabel}</span>
              </div>
              {company?.trial_ends_at && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Trial Ends:</span>
                  <span className="text-sm text-slate-600">
                    {new Date(company.trial_ends_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company phone number</CardTitle>
            <CardDescription>This is the phone number customers call to reach your AI receptionist.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-900">Inbound number</div>
                <div className="text-sm text-slate-600">{myNumber ?? 'Not assigned yet'}</div>
              </div>
            </div>

            {!myNumber && (
              <div className="mt-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3">
                Phone numbers are assigned by the HandyCall team. If you need a number, contact support and we'll set it
                up for you.
              </div>
            )}
          </CardContent>
        </Card>

        <CallForwardingGuide forwardToNumber={myNumber} callHandlingMode={formData.call_handling_mode} />

      </div>
    </div>
  );
}
