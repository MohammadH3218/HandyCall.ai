'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CALL_HANDLING_OPTIONS } from '@/constants/call-handling';
import { DEFAULT_TIMEZONE, TIMEZONE_OPTIONS, hasTimezoneOption } from '@/constants/timezones';
import { CallHandlingMode } from '@handycall/shared';
import { CallForwardingGuide } from '@/components/telephony/call-forwarding-guide';
import { PageHeader } from '@/components/portal/page-header';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Copy, Phone, RefreshCw, Settings2, ShieldCheck, Webhook } from 'lucide-react';

export default function SettingsPage() {
  const { toast } = useToast();
  const { company } = useAuthStore();
  const [formData, setFormData] = useState({
    company_name: '',
    phone_number: '',
    timezone: DEFAULT_TIMEZONE,
    transfer_enabled: false,
    transfer_number: '',
    call_handling_mode: CallHandlingMode.ALWAYS,
  });
  const [isSavingBusiness, setIsSavingBusiness] = useState(false);
  const [isSavingCall, setIsSavingCall] = useState(false);
  const [myNumber, setMyNumber] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'business' | 'call' | 'integrations' | 'account'>('business');
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState({
    company_name: '',
    phone_number: '',
    timezone: DEFAULT_TIMEZONE,
  });
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [webhookRotating, setWebhookRotating] = useState(false);
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);
  const [webhookConfig, setWebhookConfig] = useState<any | null>(null);
  const [webhookDraft, setWebhookDraft] = useState({
    webhook_url: '',
    enabled_events: [] as string[],
    is_enabled: true,
  });
  const [showSecret, setShowSecret] = useState(false);

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
      timezone: company.timezone || DEFAULT_TIMEZONE,
      transfer_enabled: company.transfer_enabled ?? false,
      transfer_number: company.transfer_number ?? '',
      call_handling_mode: (company.call_handling_mode as CallHandlingMode) || CallHandlingMode.ALWAYS,
    });
    setEditDraft({
      company_name: company.company_name,
      phone_number: company.phone_number ?? '',
      timezone: company.timezone || DEFAULT_TIMEZONE,
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

  useEffect(() => {
    if (activeTab !== 'integrations') return;
    let isMounted = true;
    setWebhookLoading(true);
    Promise.all([apiClient.getWebhookEvents(), apiClient.getWebhookConfig()])
      .then(([events, config]) => {
        if (!isMounted) return;
        const eventList = events?.events || events || [];
        setWebhookEvents(eventList);
        const cfg = config?.config ?? config ?? null;
        setWebhookConfig(cfg);
        setWebhookDraft({
          webhook_url: cfg?.webhook_url || '',
          enabled_events: cfg?.enabled_events?.length ? cfg.enabled_events : eventList,
          is_enabled: cfg?.is_enabled ?? true,
        });
      })
      .catch((error: any) => {
        if (!isMounted) return;
        toast({
          title: 'Failed to load webhooks',
          description: error?.message || 'Could not load webhook configuration.',
          variant: 'destructive',
        });
      })
      .finally(() => {
        if (isMounted) setWebhookLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab, toast]);

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

  const handleSaveWebhook = async () => {
    setWebhookSaving(true);
    try {
      const result = await apiClient.updateWebhookConfig({
        webhook_url: webhookDraft.webhook_url,
        enabled_events: webhookDraft.enabled_events,
        is_enabled: webhookDraft.is_enabled,
      });
      const cfg = result?.config ?? result;
      setWebhookConfig(cfg);
      setWebhookDraft({
        webhook_url: cfg?.webhook_url || '',
        enabled_events: cfg?.enabled_events?.length ? cfg.enabled_events : webhookEvents,
        is_enabled: cfg?.is_enabled ?? true,
      });
      toast({
        title: 'Webhook saved',
        description: 'Your CRM webhook settings are up to date.',
      });
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error?.message || 'Could not save webhook settings.',
        variant: 'destructive',
      });
    } finally {
      setWebhookSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    setWebhookTesting(true);
    try {
      const result = await apiClient.testWebhook();
      const payload = result?.result ?? result;
      toast({
        title: payload?.ok ? 'Webhook delivered' : 'Webhook failed',
        description: payload?.ok
          ? `Status ${payload?.status ?? 'OK'} · ${payload?.response_time_ms ?? 0}ms`
          : payload?.error || 'Delivery failed.',
        variant: payload?.ok ? 'default' : 'destructive',
      });
    } catch (error: any) {
      toast({
        title: 'Test failed',
        description: error?.message || 'Could not send test webhook.',
        variant: 'destructive',
      });
    } finally {
      setWebhookTesting(false);
    }
  };

  const handleRotateSecret = async () => {
    setWebhookRotating(true);
    try {
      const result = await apiClient.rotateWebhookSecret();
      const cfg = result?.config ?? result;
      setWebhookConfig(cfg);
      toast({
        title: 'Secret rotated',
        description: 'Share the new secret with your CRM workflow.',
      });
    } catch (error: any) {
      toast({
        title: 'Rotation failed',
        description: error?.message || 'Could not rotate secret.',
        variant: 'destructive',
      });
    } finally {
      setWebhookRotating(false);
    }
  };

  const toggleWebhookEvent = (event: string) => {
    setWebhookDraft((prev) => {
      const hasEvent = prev.enabled_events.includes(event);
      const next = hasEvent
        ? prev.enabled_events.filter((item) => item !== event)
        : [...prev.enabled_events, event];
      return { ...prev, enabled_events: next };
    });
  };

  const formatTimestamp = (value?: number) => {
    if (!value) return 'Never';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Never';
    return date.toLocaleString();
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
          { key: 'integrations', label: 'CRM integrations' },
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
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Business information</h2>
                <p className="text-xs text-slate-500">Review your core company details.</p>
              </div>
              <button
                onClick={() => setEditOpen(true)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
              >
                Edit details
              </button>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Business name</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formData.company_name || 'Not set'}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Business contact phone</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formData.phone_number || 'Not set'}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Timezone</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formData.timezone || 'Not set'}</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-emerald-600" />
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Inbound number</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{inboundSummary}</p>
                {!myNumber && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    HandyCall assigns this number. Contact support if you need a specific area code.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'call' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Call handling</h2>
              <p className="text-xs text-slate-500">Choose how HandyCall answers and routes calls.</p>
            </div>
            <div className="space-y-4 p-5">
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
              <p className="text-xs text-slate-500">
                Use your carrier forwarding settings to match this choice.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Human transfer</h2>
              <p className="text-xs text-slate-500">Let callers reach a person when needed.</p>
            </div>
            <div className="space-y-4 p-5">
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
                  {isSavingCall ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </div>
          </div>

          <CallForwardingGuide forwardToNumber={myNumber} callHandlingMode={formData.call_handling_mode} />
        </div>
      )}

      {activeTab === 'account' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Account status</h2>
              <p className="text-xs text-slate-500">Your subscription information.</p>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Account status</p>
                    <p className="text-xs text-slate-500">Current subscription state</p>
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
            </div>
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Connect your CRM</h2>
              <p className="text-xs text-slate-500">Send HandyCall events to Zapier, Make, n8n, or any CRM that accepts webhooks.</p>
            </div>
            <div className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Step 1</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Create a webhook</p>
                  <p className="mt-2 text-xs text-slate-600">
                    In Zapier, choose Webhooks → Catch Hook. In Make or n8n, choose Custom Webhook.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Step 2</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Paste the URL</p>
                  <p className="mt-2 text-xs text-slate-600">
                    Drop your webhook URL below and choose which events to send.
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-emerald-700">Step 3</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Test & map fields</p>
                  <p className="mt-2 text-xs text-slate-600">
                    Use “Test webhook” to send a payload, then map fields to your CRM.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Webhook URL</p>
                    <p className="text-xs text-slate-600">We’ll POST JSON payloads to this URL.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-pressed={webhookDraft.is_enabled}
                      onClick={() =>
                        setWebhookDraft((prev) => ({ ...prev, is_enabled: !prev.is_enabled }))
                      }
                      className={`relative h-7 w-12 rounded-full transition ${
                        webhookDraft.is_enabled ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                          webhookDraft.is_enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="text-xs text-slate-600">
                      {webhookDraft.is_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <Input
                    value={webhookDraft.webhook_url}
                    onChange={(e) =>
                      setWebhookDraft((prev) => ({ ...prev, webhook_url: e.target.value }))
                    }
                    placeholder="https://hooks.zapier.com/..."
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <Webhook className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm font-semibold text-slate-900">Events to send</p>
                </div>
                <p className="mt-1 text-xs text-slate-600">Select which CRM events you want delivered.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {webhookEvents.map((event) => (
                    <label
                      key={event}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-700"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={webhookDraft.enabled_events.includes(event)}
                        onChange={() => toggleWebhookEvent(event)}
                      />
                      <span>{event}</span>
                    </label>
                  ))}
                  {!webhookEvents.length && (
                    <div className="text-xs text-slate-500">No events available yet.</div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Signing secret</p>
                <p className="mt-1 text-xs text-slate-600">
                  Use this secret to verify payload signatures. Keep it private.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    readOnly
                    value={
                      webhookConfig?.signing_secret
                        ? showSecret
                          ? webhookConfig.signing_secret
                          : '*'.repeat(24)
                        : 'Save your webhook to generate a secret'
                    }
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowSecret((prev) => !prev)}
                      disabled={!webhookConfig?.signing_secret}
                    >
                      {showSecret ? 'Hide' : 'Reveal'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        navigator.clipboard.writeText(webhookConfig?.signing_secret || '')
                      }
                      disabled={!webhookConfig?.signing_secret}
                    >
                      <Copy className="mr-2 h-4 w-4" /> Copy
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRotateSecret}
                      disabled={!webhookConfig?.signing_secret || webhookRotating}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {webhookRotating ? 'Rotating...' : 'Rotate'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Delivery status</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Last delivery</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatTimestamp(webhookConfig?.last_delivery_at)}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Event: {webhookConfig?.last_event || 'None'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Last status</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {webhookConfig?.last_status_code || '—'}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {webhookConfig?.last_error ? webhookConfig.last_error : 'Delivered successfully'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestWebhook}
                  disabled={!webhookDraft.webhook_url || webhookTesting || webhookLoading}
                >
                  {webhookTesting ? 'Testing...' : 'Test webhook'}
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveWebhook}
                  disabled={webhookSaving || webhookLoading || !webhookDraft.webhook_url}
                >
                  {webhookSaving ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Zapier, Make, n8n guidance</h2>
              <p className="text-xs text-slate-500">Fastest setup for non-technical users.</p>
            </div>
            <div className="space-y-3 p-5 text-sm text-slate-600">
              <p>
                Recommended: Zapier Webhooks → Catch Hook. Paste your URL above and click Test webhook, then map fields
                into your CRM action (HubSpot, Pipedrive, Zoho, Google Sheets, Airtable, etc).
              </p>
              <p>
                Power users can use Make or n8n with the same webhook URL. HandyCall sends JSON with a top-level event
                name plus object payloads for contacts, appointments, and calls.
              </p>
            </div>
          </div>
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
              <Select value={editDraft.timezone} onValueChange={(value) => setEditDraft((prev) => ({ ...prev, timezone: value }))}>
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {!hasTimezoneOption(editDraft.timezone) && editDraft.timezone ? (
                    <SelectItem value={editDraft.timezone}>{editDraft.timezone}</SelectItem>
                  ) : null}
                  {TIMEZONE_OPTIONS.map((timezone) => (
                    <SelectItem key={timezone.value} value={timezone.value}>
                      {timezone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
