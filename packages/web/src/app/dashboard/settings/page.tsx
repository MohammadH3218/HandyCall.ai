'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/portal/page-header';
import { Textarea } from '@/components/ui/textarea';
import {
  Bell,
  Building2,
  Copy,
  CreditCard,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Webhook,
} from 'lucide-react';

const sections = [
  { id: 'organization', label: 'Organization', icon: <Building2 className="h-4 w-4" /> },
  { id: 'numbers', label: 'Numbers', icon: <Phone className="h-4 w-4" /> },
  { id: 'ai', label: 'AI behavior', icon: <Sparkles className="h-4 w-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  { id: 'integrations', label: 'Integrations', icon: <Webhook className="h-4 w-4" /> },
  { id: 'billing', label: 'Billing', icon: <CreditCard className="h-4 w-4" /> },
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { company } = useAuthStore();

  const [myNumber, setMyNumber] = useState<string | null>(null);
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [isSavingRouting, setIsSavingRouting] = useState(false);

  const [orgDraft, setOrgDraft] = useState({
    company_name: '',
    timezone: '',
    phone_number: '',
  });

  const [routingDraft, setRoutingDraft] = useState({
    call_handling_mode: 'ALWAYS',
    transfer_enabled: false,
    transfer_number: '',
  });

  const [aiDraft, setAiDraft] = useState({
    clarifyingQuestions: true,
    confirmAddress: true,
    afterHoursMode: true,
    testPrompt: '',
  });

  const [notificationDraft, setNotificationDraft] = useState({
    bookingAlerts: true,
    missedCallDigest: true,
    spamAlerts: false,
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

  useEffect(() => {
    if (!company) return;

    setOrgDraft({
      company_name: company.company_name || '',
      timezone: company.timezone || '',
      phone_number: company.phone_number || '',
    });

    setRoutingDraft({
      call_handling_mode: company.call_handling_mode || 'ALWAYS',
      transfer_enabled: Boolean(company.transfer_enabled),
      transfer_number: company.transfer_number || '',
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
    void loadWebhook();
  }, []);

  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab === 'integrations') {
      const section = document.getElementById('integrations');
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [searchParams]);

  const loadWebhook = async () => {
    try {
      setWebhookLoading(true);
      const [events, config] = await Promise.all([apiClient.getWebhookEvents(), apiClient.getWebhookConfig()]);
      const eventList = events?.events || events || [];
      const cfg = config?.config ?? config ?? null;
      setWebhookEvents(eventList);
      setWebhookConfig(cfg);
      setWebhookDraft({
        webhook_url: cfg?.webhook_url || '',
        enabled_events: cfg?.enabled_events?.length ? cfg.enabled_events : eventList,
        is_enabled: cfg?.is_enabled ?? true,
      });
    } catch {
      // silent fallback to empty draft
    } finally {
      setWebhookLoading(false);
    }
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSaveOrg = async () => {
    try {
      setIsSavingOrg(true);
      await apiClient.updateMyCompany(orgDraft);
      toast({ title: 'Organization updated', description: 'Business profile changes were saved.' });
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message || 'Could not save organization settings.', variant: 'destructive' });
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleSaveRouting = async () => {
    try {
      setIsSavingRouting(true);
      await apiClient.updateMyCompany({
        call_handling_mode: routingDraft.call_handling_mode,
        transfer_enabled: routingDraft.transfer_enabled,
        transfer_number: routingDraft.transfer_enabled ? routingDraft.transfer_number : '',
      });
      toast({ title: 'Routing updated', description: 'Call handling preferences were saved.' });
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message || 'Could not save routing settings.', variant: 'destructive' });
    } finally {
      setIsSavingRouting(false);
    }
  };

  const handleSaveWebhook = async () => {
    try {
      setWebhookSaving(true);
      const result = await apiClient.updateWebhookConfig({
        webhook_url: webhookDraft.webhook_url,
        enabled_events: webhookDraft.enabled_events,
        is_enabled: webhookDraft.is_enabled,
      });
      setWebhookConfig(result?.config ?? result);
      toast({ title: 'Webhook saved', description: 'Integration settings are up to date.' });
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message || 'Could not save webhook.', variant: 'destructive' });
    } finally {
      setWebhookSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    try {
      setWebhookTesting(true);
      const result = await apiClient.testWebhook();
      const payload = result?.result ?? result;
      toast({
        title: payload?.ok ? 'Webhook delivered' : 'Webhook failed',
        description: payload?.ok
          ? `Status ${payload?.status ?? 'ok'}  -  ${payload?.response_time_ms ?? 0}ms`
          : payload?.error || 'Delivery failed.',
        variant: payload?.ok ? 'default' : 'destructive',
      });
    } catch (err: any) {
      toast({ title: 'Test failed', description: err.message || 'Unable to test webhook.', variant: 'destructive' });
    } finally {
      setWebhookTesting(false);
    }
  };

  const handleRotateSecret = async () => {
    try {
      setWebhookRotating(true);
      const result = await apiClient.rotateWebhookSecret();
      setWebhookConfig(result?.config ?? result);
      toast({ title: 'Secret rotated', description: 'Use the new secret in your automation tool.' });
    } catch (err: any) {
      toast({ title: 'Rotation failed', description: err.message || 'Unable to rotate secret.', variant: 'destructive' });
    } finally {
      setWebhookRotating(false);
    }
  };

  const statusLabel = useMemo(() => {
    if (company?.cancel_at_period_end) return 'Cancelled';
    if (!company?.status) return 'Unknown';
    return company.status.charAt(0) + company.status.slice(1).toLowerCase();
  }, [company?.cancel_at_period_end, company?.status]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Settings"
        title="Workspace configuration"
        subtitle="Manage organization details, routing policies, integrations, and billing controls."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[220px_1fr]">
        <aside className="xl:sticky xl:top-24 xl:h-fit">
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollTo(section.id)}
                    className="flex w-full items-center gap-2 rounded-md border border-transparent px-3 py-2 text-left text-sm text-muted-foreground transition-colors duration-standard ease-standard hover:border-border hover:bg-[#13161b] hover:text-foreground"
                  >
                    {section.icon}
                    {section.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-4">
          <section id="organization" className="scroll-mt-24">
            <Card>
              <CardContent className="space-y-4 p-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Organization</h2>
                  <p className="text-sm text-muted-foreground">Business identity and timezone defaults.</p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <Label htmlFor="company_name">Company name</Label>
                    <Input
                      id="company_name"
                      value={orgDraft.company_name}
                      onChange={(event) => setOrgDraft((prev) => ({ ...prev, company_name: event.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      value={orgDraft.timezone}
                      onChange={(event) => setOrgDraft((prev) => ({ ...prev, timezone: event.target.value }))}
                      placeholder="America/New_York"
                    />
                  </div>
                  <div>
                    <Label htmlFor="business_phone">Business phone</Label>
                    <Input
                      id="business_phone"
                      value={orgDraft.phone_number}
                      onChange={(event) => setOrgDraft((prev) => ({ ...prev, phone_number: event.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>HandyCall inbound number</Label>
                    <Input value={myNumber || 'Not assigned yet'} readOnly />
                  </div>
                </div>

                <Button onClick={() => void handleSaveOrg()} disabled={isSavingOrg}>
                  {isSavingOrg ? 'Saving...' : 'Save organization'}
                </Button>
              </CardContent>
            </Card>
          </section>

          <section id="numbers" className="scroll-mt-24">
            <Card>
              <CardContent className="space-y-4 p-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Numbers & routing</h2>
                  <p className="text-sm text-muted-foreground">Choose how calls are routed and when to transfer to a human.</p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { key: 'ALWAYS', label: 'Always answer' },
                    { key: 'AFTER_HOURS', label: 'After-hours only' },
                    { key: 'NEVER', label: 'Disabled' },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setRoutingDraft((prev) => ({ ...prev, call_handling_mode: option.key }))}
                      className={`rounded-md border px-3 py-3 text-left text-sm ${
                        routingDraft.call_handling_mode === option.key
                          ? 'border-primary/45 bg-primary/12 text-[#cbe8ff]'
                          : 'border-border bg-[#0f1115] text-muted-foreground hover:border-[#313538]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="rounded-md border border-border bg-[#0f1115] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Enable human transfer</p>
                      <p className="text-xs text-muted-foreground">Escalate complex calls to a live number.</p>
                    </div>
                    <button
                      type="button"
                      aria-pressed={routingDraft.transfer_enabled}
                      onClick={() =>
                        setRoutingDraft((prev) => ({ ...prev, transfer_enabled: !prev.transfer_enabled }))
                      }
                      className={`relative h-7 w-12 rounded-full ${routingDraft.transfer_enabled ? 'bg-primary' : 'bg-[#313538]'}`}
                    >
                      <span
                        className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                          routingDraft.transfer_enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {routingDraft.transfer_enabled ? (
                    <div className="mt-3">
                      <Label htmlFor="transfer_number">Transfer number</Label>
                      <Input
                        id="transfer_number"
                        value={routingDraft.transfer_number}
                        onChange={(event) => setRoutingDraft((prev) => ({ ...prev, transfer_number: event.target.value }))}
                        placeholder="+1 555 555 5555"
                      />
                    </div>
                  ) : null}
                </div>

                <Button onClick={() => void handleSaveRouting()} disabled={isSavingRouting}>
                  {isSavingRouting ? 'Saving...' : 'Save routing'}
                </Button>
              </CardContent>
            </Card>
          </section>

          <section id="ai" className="scroll-mt-24">
            <Card>
              <CardContent className="space-y-4 p-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground">AI behavior</h2>
                  <p className="text-sm text-muted-foreground">Direct, operational settings for call quality controls.</p>
                </div>

                <div className="space-y-2">
                  {[
                    { key: 'clarifyingQuestions', label: 'Ask clarifying questions' },
                    { key: 'confirmAddress', label: 'Confirm address before booking' },
                    { key: 'afterHoursMode', label: 'After-hours mode enabled' },
                  ].map((setting) => (
                    <label key={setting.key} className="flex items-center justify-between rounded-md border border-border bg-[#0f1115] px-3 py-2 text-sm text-muted-foreground">
                      <span>{setting.label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(aiDraft[setting.key as keyof typeof aiDraft])}
                        onChange={(event) =>
                          setAiDraft((prev) => ({
                            ...prev,
                            [setting.key]: event.target.checked,
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>

                <div>
                  <Label htmlFor="test_prompt">Test panel</Label>
                  <Textarea
                    id="test_prompt"
                    rows={4}
                    value={aiDraft.testPrompt}
                    onChange={(event) => setAiDraft((prev) => ({ ...prev, testPrompt: event.target.value }))}
                    placeholder="Simulate a caller prompt to validate behavior before deploying changes."
                  />
                </div>

                <Button variant="secondary">Run simulation</Button>
              </CardContent>
            </Card>
          </section>

          <section id="notifications" className="scroll-mt-24">
            <Card>
              <CardContent className="space-y-4 p-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Notifications</h2>
                  <p className="text-sm text-muted-foreground">Decide which alerts your team receives.</p>
                </div>

                {[
                  { key: 'bookingAlerts', label: 'Booking confirmations' },
                  { key: 'missedCallDigest', label: 'Missed call digest' },
                  { key: 'spamAlerts', label: 'Spam detection alerts' },
                ].map((setting) => (
                  <label key={setting.key} className="flex items-center justify-between rounded-md border border-border bg-[#0f1115] px-3 py-2 text-sm text-muted-foreground">
                    <span>{setting.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(notificationDraft[setting.key as keyof typeof notificationDraft])}
                      onChange={(event) =>
                        setNotificationDraft((prev) => ({
                          ...prev,
                          [setting.key]: event.target.checked,
                        }))
                      }
                    />
                  </label>
                ))}

                <Button variant="secondary">Save notifications</Button>
              </CardContent>
            </Card>
          </section>

          <section id="integrations" className="scroll-mt-24">
            <Card>
              <CardContent className="space-y-4 p-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Integrations</h2>
                  <p className="text-sm text-muted-foreground">Send events to Zapier, Make, n8n, or your CRM endpoint.</p>
                </div>

                <div className="rounded-md border border-border bg-[#0f1115] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Webhook endpoint</p>
                      <p className="text-xs text-muted-foreground">Signed JSON payloads for calls, messages, and appointments.</p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Enabled
                      <input
                        type="checkbox"
                        checked={webhookDraft.is_enabled}
                        onChange={(event) =>
                          setWebhookDraft((prev) => ({ ...prev, is_enabled: event.target.checked }))
                        }
                      />
                    </label>
                  </div>
                  <div className="mt-3">
                    <Input
                      value={webhookDraft.webhook_url}
                      onChange={(event) =>
                        setWebhookDraft((prev) => ({ ...prev, webhook_url: event.target.value }))
                      }
                      placeholder="https://hooks.zapier.com/..."
                    />
                  </div>
                </div>

                <div className="rounded-md border border-border bg-[#0f1115] p-3">
                  <p className="text-sm font-medium text-foreground">Event subscriptions</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {(webhookEvents || []).map((event) => (
                      <label key={event} className="flex items-center gap-2 rounded-md border border-border bg-[#13161b] px-2 py-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={webhookDraft.enabled_events.includes(event)}
                          onChange={(target) => {
                            const enabled = target.currentTarget.checked;
                            setWebhookDraft((prev) => ({
                              ...prev,
                              enabled_events: enabled
                                ? [...prev.enabled_events, event]
                                : prev.enabled_events.filter((item) => item !== event),
                            }));
                          }}
                        />
                        {event}
                      </label>
                    ))}
                    {!webhookEvents.length && !webhookLoading ? (
                      <p className="text-xs text-text-faint">No event metadata available yet.</p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-md border border-border bg-[#0f1115] p-3">
                  <p className="text-sm font-medium text-foreground">Signing secret</p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <Input
                      readOnly
                      value={
                        webhookConfig?.signing_secret
                          ? showSecret
                            ? webhookConfig.signing_secret
                            : '*'.repeat(24)
                          : 'Save webhook config to generate secret'
                      }
                    />
                    <Button
                      variant="secondary"
                      onClick={() => setShowSecret((prev) => !prev)}
                      disabled={!webhookConfig?.signing_secret}
                    >
                      {showSecret ? 'Hide' : 'Reveal'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => navigator.clipboard.writeText(webhookConfig?.signing_secret || '')}
                      disabled={!webhookConfig?.signing_secret}
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                    <Button variant="secondary" onClick={() => void handleRotateSecret()} disabled={webhookRotating}>
                      <RefreshCw className="h-4 w-4" />
                      {webhookRotating ? 'Rotating...' : 'Rotate'}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => void handleTestWebhook()} disabled={webhookTesting || !webhookDraft.webhook_url}>
                    {webhookTesting ? 'Testing...' : 'Test webhook'}
                  </Button>
                  <Button onClick={() => void handleSaveWebhook()} disabled={webhookSaving || !webhookDraft.webhook_url}>
                    {webhookSaving ? 'Saving...' : 'Save integration'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          <section id="billing" className="scroll-mt-24">
            <Card>
              <CardContent className="space-y-4 p-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Billing</h2>
                  <p className="text-sm text-muted-foreground">Current subscription status and account posture.</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-border bg-[#0f1115] p-3">
                    <p className="text-xs uppercase tracking-[0.06em] text-text-faint">Subscription</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{company?.subscription_plan || 'No active plan'}</p>
                    <Badge variant="secondary" className="mt-2">{statusLabel}</Badge>
                  </div>
                  <div className="rounded-md border border-border bg-[#0f1115] p-3">
                    <p className="text-xs uppercase tracking-[0.06em] text-text-faint">Security</p>
                    <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <ShieldCheck className="h-4 w-4 text-success" />
                      Payment + webhook security active
                    </p>
                  </div>
                </div>

                <Button asChild variant="secondary">
                  <a href="/dashboard/billing">Open billing center</a>
                </Button>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

