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
import { CallHandlingMode, CompanyCallFlowQuestion, ServiceType } from '@handycall/shared';
import { CallForwardingGuide } from '@/components/telephony/call-forwarding-guide';
import { PageHeader } from '@/components/portal/page-header';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { usePlanFeatures } from '@/hooks/use-plan-features';
import { IconCopy, IconPhone, IconRefresh, IconSettings, IconShield, IconLink, IconBuilding, IconPhoneCall, IconBrain, IconCreditCard, IconWebhook, IconBell, IconUser, IconMapPin, IconMessageDots } from '@tabler/icons-react';
import { ServiceAreaTab } from '@/app/dashboard/knowledge/service-area-tab';
import { KnowledgeTab } from '@/app/dashboard/knowledge/knowledge-tab';
import { CallFlowEditor } from '@/components/company/call-flow-editor';
import { createDefaultCallFlowQuestions } from '@/constants/company-templates';

export default function SettingsPage() {
  const { toast } = useToast();
  const { company } = useAuthStore();
  const { hasFeature } = usePlanFeatures();
  const crmEnabled = hasFeature('crm_integrations');
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
  const [activeTab, setActiveTab] = useState<'business' | 'call' | 'call_flow' | 'payments' | 'integrations' | 'notifications' | 'account' | 'service_area' | 'knowledge'>('business');
  const [callFlowQuestions, setCallFlowQuestions] = useState<CompanyCallFlowQuestion[]>([]);
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
  const [connectStatus, setConnectStatus] = useState<any>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsSaving, setPaymentsSaving] = useState(false);
  const [paymentsEditMode, setPaymentsEditMode] = useState(false);
  const [bookingPaymentMode, setBookingPaymentMode] = useState<'HANDYCALL_MANAGED' | 'SELF_MANAGED'>('SELF_MANAGED');
  const [bookingPaymentEnabled, setBookingPaymentEnabled] = useState(false);
  const [bookingServices, setBookingServices] = useState<Array<{
    service_id: string;
    name: string;
    amount_cents: number;
    currency: string;
    active: boolean;
    collect_payment: boolean;
    billing_type: 'ONE_TIME' | 'SUBSCRIPTION';
    billing_interval: 'day' | 'week' | 'month' | 'year';
    billing_interval_count: number;
    trial_period_days: number;
  }>>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsSaving, setNotificationsSaving] = useState(false);
  const [notificationEvents, setNotificationEvents] = useState<Array<{ event_key: string; label: string; category: string; description: string }>>([]);
  const [notificationPrefs, setNotificationPrefs] = useState<Record<string, { in_app: boolean; push: boolean }>>({});
  const [integrationsEditMode, setIntegrationsEditMode] = useState(false);

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
    const rawPaymentMode = String((company as any).booking_payment_mode || '').toUpperCase();
    setBookingPaymentMode(
      rawPaymentMode === 'HANDYCALL_MANAGED' ||
        (!rawPaymentMode && ((company as any).booking_payment_enabled || (company as any).stripe_connect_account_id))
        ? 'HANDYCALL_MANAGED'
        : 'SELF_MANAGED',
    );
    setBookingPaymentEnabled(Boolean((company as any).booking_payment_enabled));
    setBookingServices(
      Array.isArray((company as any).booking_services)
        ? ((company as any).booking_services as any[]).map((service: any) => ({
            service_id: String(service.service_id || crypto.randomUUID()),
            name: String(service.name || ''),
            amount_cents: Number(service.amount_cents || 0),
            currency: String(service.currency || 'usd'),
            active: service.active !== false,
            collect_payment: service.collect_payment !== false,
            billing_type: service.billing_type === 'SUBSCRIPTION' ? 'SUBSCRIPTION' : 'ONE_TIME',
            billing_interval: ['day', 'week', 'month', 'year'].includes(String(service.billing_interval || '').toLowerCase())
              ? (String(service.billing_interval).toLowerCase() as 'day' | 'week' | 'month' | 'year')
              : 'month',
            billing_interval_count: Math.max(1, Number(service.billing_interval_count || 1)),
            trial_period_days: Math.max(0, Number(service.trial_period_days || 0)),
          }))
        : [],
    );
    setCallFlowQuestions(
      Array.isArray((company as any).call_flow_questions) && (company as any).call_flow_questions.length > 0
        ? ((company as any).call_flow_questions as CompanyCallFlowQuestion[])
        : createDefaultCallFlowQuestions(((company as any).service_type || ServiceType.HANDYMAN) as ServiceType),
    );
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

  useEffect(() => {
    if (activeTab !== 'payments') return;
    let isMounted = true;
    setPaymentsLoading(true);
    apiClient
      .getConnectStatus()
      .then((status) => {
        if (!isMounted) return;
        setConnectStatus(status || { connected: false });
      })
      .catch(() => {
        if (!isMounted) return;
        setConnectStatus({ connected: false });
      })
      .finally(() => {
        if (isMounted) setPaymentsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'notifications') return;
    let isMounted = true;
    setNotificationsLoading(true);
    Promise.all([apiClient.getNotificationEvents(), apiClient.getNotificationPreferences()])
      .then(([events, prefs]) => {
        if (!isMounted) return;
        const eventList = Array.isArray(events?.events) ? events.events : [];
        setNotificationEvents(eventList);
        setNotificationPrefs((prefs?.preferences || {}) as Record<string, { in_app: boolean; push: boolean }>);
      })
      .catch((error: any) => {
        if (!isMounted) return;
        toast({
          title: 'Failed to load notifications',
          description: error?.message || 'Could not load notification preferences.',
          variant: 'destructive',
        });
      })
      .finally(() => {
        if (isMounted) setNotificationsLoading(false);
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

  const handleSaveCallFlow = async () => {
    try {
      setIsSavingCall(true);
      await apiClient.updateMyCompany({
        call_flow_questions: callFlowQuestions.map((question, index) => ({
          ...question,
          field_key: String(question.field_key || '').trim(),
          label: String(question.label || '').trim(),
          prompt: String(question.prompt || '').trim(),
          required: question.required !== false,
          enabled: question.enabled !== false,
          order: index,
        })).filter((question) => question.field_key && question.label && question.prompt),
      });
      toast({
        title: 'Call flow updated',
        description: 'Your AI intake questions and order were saved.',
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error?.message || 'Failed to save AI call flow settings.',
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
      setIntegrationsEditMode(false);
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

  const handleConnectSetup = async () => {
    try {
      const result = await apiClient.setupConnectAccount();
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      toast({
        title: 'Connect setup unavailable',
        description: 'Unable to generate a Stripe onboarding link right now.',
        variant: 'destructive',
      });
    } catch (error: any) {
      toast({
        title: 'Connect setup failed',
        description: error?.message || 'Unable to start Stripe Connect onboarding.',
        variant: 'destructive',
      });
    }
  };

  const handleSavePayments = async () => {
    try {
      setPaymentsSaving(true);
      await apiClient.updateMyCompany({
        booking_payment_mode: bookingPaymentMode,
        booking_payment_mode_confirmed: true,
        booking_payment_enabled: bookingPaymentMode === 'HANDYCALL_MANAGED',
      });
      setBookingPaymentEnabled(bookingPaymentMode === 'HANDYCALL_MANAGED');
      toast({
        title: 'Payment settings saved',
        description: 'Your customer payment setup has been updated.',
      });
      setPaymentsEditMode(false);
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error?.message || 'Could not save payment settings.',
        variant: 'destructive',
      });
    } finally {
      setPaymentsSaving(false);
    }
  };

  const toggleNotificationChannel = (eventKey: string, channel: 'in_app' | 'push') => {
    setNotificationPrefs((prev) => ({
      ...prev,
      [eventKey]: {
        in_app: prev[eventKey]?.in_app ?? true,
        push: prev[eventKey]?.push ?? false,
        [channel]: !(prev[eventKey]?.[channel] ?? false),
      },
    }));
  };

  const handleSaveNotifications = async () => {
    try {
      setNotificationsSaving(true);
      await apiClient.updateNotificationPreferences(notificationPrefs);
      toast({
        title: 'Notifications updated',
        description: 'Your notification preferences were saved.',
      });
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error?.message || 'Could not save notification preferences.',
        variant: 'destructive',
      });
    } finally {
      setNotificationsSaving(false);
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
        eyebrow="Company settings"
        title="Company settings"
        subtitle="Manage your company profile, AI call flow, payments, routing, and integrations from one place."
      />

      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
        {[
          { key: 'business', label: 'Company profile', Icon: IconBuilding },
          { key: 'call', label: 'Call handling', Icon: IconPhoneCall },
          { key: 'call_flow', label: 'AI call flow', Icon: IconBrain },
          { key: 'payments', label: 'Payments', Icon: IconCreditCard },
          { key: 'integrations', label: 'CRM integrations', Icon: IconWebhook },
          { key: 'notifications', label: 'Notifications', Icon: IconBell },
          { key: 'account', label: 'Account', Icon: IconUser },
          { key: 'service_area', label: 'Service Area', Icon: IconMapPin },
          { key: 'knowledge', label: 'Knowledge Base', Icon: IconMessageDots },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-accent/70'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <tab.Icon className="h-3.5 w-3.5" stroke={1.5} />
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {activeTab === 'business' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 pl-3 border-l-2 border-emerald-500 dark:text-slate-100">Business information</h2>
                <p className="text-xs text-slate-500">Review your core company details.</p>
              </div>
              <button
                onClick={() => setEditOpen(true)}
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent/70 transition-colors"
              >
                Edit details
              </button>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/50 p-4 hover:border-border/80 transition">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Business name</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{formData.company_name || 'Not set'}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/50 p-4 hover:border-border/80 transition">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Company type</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{String((company as any)?.service_type || 'Not set').replace(/_/g, ' ')}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/50 p-4 hover:border-border/80 transition">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Business contact phone</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{formData.phone_number || 'Not set'}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/50 p-4 hover:border-border/80 transition">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Timezone</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{formData.timezone || 'Not set'}</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 hover:border-border/80 transition dark:border-emerald-900 dark:bg-emerald-950/30">
                <div className="flex items-center gap-2">
                  <IconPhone className="h-3.5 w-3.5 text-emerald-600" stroke={1.5} />
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Inbound number</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-foreground">{inboundSummary}</p>
                {!myNumber && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    HandyCall assigns this number. Contact support if you need a specific area code.
                  </p>
                )}
              </div>
            </div>
            <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="grid gap-3 md:grid-cols-3">
                <button type="button" onClick={() => setActiveTab('call_flow')} className="rounded-xl border border-border bg-muted/50 p-4 text-left hover:border-emerald-200 hover:bg-emerald-50/60 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/40">
                  <p className="text-sm font-semibold text-foreground">AI call flow</p>
                  <p className="mt-1 text-xs text-muted-foreground">Edit the exact intake questions and their order.</p>
                </button>
                <a href="/dashboard/knowledge" className="rounded-xl border border-border bg-muted/50 p-4 text-left hover:border-emerald-200 hover:bg-emerald-50/60 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/40">
                  <p className="text-sm font-semibold text-foreground">Knowledge base</p>
                  <p className="mt-1 text-xs text-muted-foreground">Manage business-specific answers, FAQs, and service details.</p>
                </a>
                <button type="button" onClick={() => setActiveTab('payments')} className="rounded-xl border border-border bg-muted/50 p-4 text-left hover:border-emerald-200 hover:bg-emerald-50/60 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/40">
                  <p className="text-sm font-semibold text-foreground">Payments and subscriptions</p>
                  <p className="mt-1 text-xs text-muted-foreground">Manage Stripe Connect, booking payments, and billing setup.</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'call' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 pl-3 border-l-2 border-emerald-500 dark:text-slate-100">Call handling</h2>
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
                          ? 'border-emerald-400 bg-emerald-50/70 shadow-sm dark:bg-emerald-950/30 dark:border-emerald-700'
                          : 'border-border bg-card hover:border-emerald-200 dark:hover:border-emerald-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-1 h-3 w-3 rounded-full border ${
                            selected ? 'border-emerald-600 bg-emerald-600' : 'border-border bg-background'
                          }`}
                        />
                        <div>
                          <div className="font-semibold text-foreground">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
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

          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 pl-3 border-l-2 border-emerald-500 dark:text-slate-100">Human transfer</h2>
              <p className="text-xs text-slate-500">Let callers reach a person when needed.</p>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <IconSettings className="h-4 w-4" stroke={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Enable call transfer</p>
                    <p className="text-xs text-muted-foreground">Route urgent calls to a human team member.</p>
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
                    formData.transfer_enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
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
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
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

      {activeTab === 'call_flow' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 pl-3 border-l-2 border-emerald-500 dark:text-slate-100">AI intake flow</h2>
              <p className="text-xs text-slate-500">
                Control which questions HandyCall asks before it ever asks for a date and time.
              </p>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-border bg-muted/50 p-4">
                <p className="text-sm font-semibold text-foreground">How this works</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  These are the exact intake questions the AI will use for this company. Reorder them, edit the wording, disable ones you do not need, or add custom questions. Scheduling stays automatic and always comes last.
                </p>
              </div>
              <CallFlowEditor questions={callFlowQuestions} onChange={setCallFlowQuestions} />
              <div className="flex justify-end">
                <Button onClick={handleSaveCallFlow} disabled={isSavingCall}>
                  {isSavingCall ? 'Saving…' : 'Save call flow'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 pl-3 border-l-2 border-emerald-500 dark:text-slate-100">How you want to handle customer payments</h2>
              <p className="text-xs text-slate-500">
                Keep this page focused on the big decision. Pricing, payment links, and automation live in their own dedicated tools.
              </p>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-border bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Payment mode</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {bookingPaymentMode === 'HANDYCALL_MANAGED'
                      ? 'Managed by HandyCall'
                      : 'Handled by your team'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {bookingPaymentMode === 'HANDYCALL_MANAGED'
                      ? 'Customers can pay through HandyCall checkout links.'
                      : 'HandyCall books the job, and you collect payment yourself.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Stripe Connect</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {paymentsLoading
                      ? 'Checking...'
                      : connectStatus?.connected
                        ? connectStatus?.charges_enabled && connectStatus?.payouts_enabled
                          ? 'Connected and ready'
                          : 'Connected, setup incomplete'
                        : 'Not connected'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {connectStatus?.connected
                      ? connectStatus?.charges_enabled && connectStatus?.payouts_enabled
                        ? 'Payments and payouts are ready in Stripe.'
                        : 'Finish the remaining Stripe setup to enable charges and payouts.'
                      : 'Only needed if you want HandyCall to handle customer payments.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Service pricing</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {bookingServices.length > 0
                      ? `${bookingServices.length} service${bookingServices.length === 1 ? '' : 's'} configured`
                      : 'No services configured yet'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Add one-time services or subscriptions from the dedicated Payments area.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                Booking payment configuration has been removed from Settings to keep this page simple. Use the dedicated Payments area for products, pricing, and payment links.
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold text-foreground">Products and pricing</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Manage service names, prices, subscriptions, and checkout links in one place.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href="/dashboard/payments/products"
                      className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Open products
                    </a>
                    <a
                      href="/dashboard/payments"
                      className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
                    >
                      Open payments
                    </a>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold text-foreground">Automation moved</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Follow-ups and review requests now live under Automation so they are not mixed into payment settings.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href="/dashboard/follow-ups"
                      className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Open follow-ups
                    </a>
                    <a
                      href="/dashboard/sms-automation"
                      className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
                    >
                      Open automation
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {bookingPaymentMode === 'HANDYCALL_MANAGED' ? (
                  <Button type="button" variant="outline" onClick={handleConnectSetup}>
                    {connectStatus?.connected ? 'Open Stripe Connect' : 'Set up Stripe Connect'}
                  </Button>
                ) : null}
                <Button type="button" onClick={() => setPaymentsEditMode(true)}>
                  Edit payment mode
                </Button>
              </div>
            </div>
          </div>

          <Dialog open={paymentsEditMode} onOpenChange={setPaymentsEditMode}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Edit payment setup</DialogTitle>
                <DialogDescription>
                  Choose whether HandyCall should collect customer payments for you or whether your team will handle billing outside the platform.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setBookingPaymentMode('HANDYCALL_MANAGED')}
                    className={`rounded-xl border p-4 text-left transition ${
                      bookingPaymentMode === 'HANDYCALL_MANAGED'
                        ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-700 dark:bg-emerald-950/30'
                        : 'border-border bg-card hover:border-emerald-200 dark:hover:border-emerald-700'
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">Managed by HandyCall</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Customers pay through HandyCall booking links, and payouts go through Stripe Connect.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingPaymentMode('SELF_MANAGED')}
                    className={`rounded-xl border p-4 text-left transition ${
                      bookingPaymentMode === 'SELF_MANAGED'
                        ? 'border-border bg-muted/70'
                        : 'border-border bg-card hover:border-border/80'
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">I handle payments myself</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      HandyCall will book the job and capture customer details, but you will invoice or collect payment separately.
                    </p>
                  </button>
                </div>

                <div className="rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                  Detailed service pricing and payment links are managed in <span className="font-semibold text-foreground">Payments &gt; Products</span>, not here.
                </div>

                {bookingPaymentMode === 'HANDYCALL_MANAGED' ? (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                    <p className="text-sm font-semibold text-foreground">Stripe Connect</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {connectStatus?.connected
                        ? connectStatus?.charges_enabled && connectStatus?.payouts_enabled
                          ? 'Stripe is connected and ready.'
                          : 'Stripe is connected, but setup still needs to be completed.'
                        : 'Stripe Connect is not set up yet.'}
                    </p>
                    <Button type="button" variant="outline" className="mt-3" onClick={handleConnectSetup}>
                      {connectStatus?.connected ? 'Open Stripe Connect' : 'Set up Stripe Connect'}
                    </Button>
                  </div>
                ) : null}
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button type="button" variant="outline" onClick={() => setPaymentsEditMode(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSavePayments} disabled={paymentsSaving}>
                  {paymentsSaving ? 'Saving…' : 'Save payment setup'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 pl-3 border-l-2 border-emerald-500 dark:text-slate-100">Notification preferences</h2>
              <p className="text-xs text-slate-500">Choose which events should trigger in-app and push notifications.</p>
            </div>
            <div className="space-y-4 p-5">
              {notificationsLoading ? (
                <p className="text-sm text-slate-500">Loading notification settings…</p>
              ) : (
                <div className="space-y-2">
                  {notificationEvents.map((event) => (
                    <div key={event.event_key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{event.label}</p>
                        <p className="text-xs text-slate-500">{event.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleNotificationChannel(event.event_key, 'in_app')}
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            notificationPrefs[event.event_key]?.in_app
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          In-app
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleNotificationChannel(event.event_key, 'push')}
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            notificationPrefs[event.event_key]?.push
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          Push
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications} disabled={notificationsSaving || notificationsLoading}>
                  {notificationsSaving ? 'Saving…' : 'Save notification settings'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'account' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 pl-3 border-l-2 border-emerald-500 dark:text-slate-100">Account status</h2>
              <p className="text-xs text-slate-500">Your subscription information.</p>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/50 p-4 hover:border-border/80 transition">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
                    <IconShield className="h-3.5 w-3.5 text-emerald-600" stroke={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Account status</p>
                    <p className="text-xs text-slate-500">Current subscription state</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground">{statusLabel}</span>
              </div>
              {company?.trial_ends_at && (
                <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                  <span className="text-sm font-medium text-foreground">Trial ends</span>
                  <span className="text-sm text-muted-foreground">
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
          {!crmEnabled ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5">
              <p className="text-sm font-semibold text-amber-900">CRM integrations are available on the Max plan</p>
              <p className="mt-1 text-sm text-amber-800">
                Upgrade to Max to unlock webhook-based CRM sync and delivery logs.
              </p>
              <Button className="mt-4" onClick={() => (window.location.href = '/dashboard/billing/plans')}>
                Upgrade to Max
              </Button>
            </div>
          ) : (
            <>
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 pl-3 border-l-2 border-emerald-500 dark:text-slate-100">Connect your CRM</h2>
              <p className="text-xs text-slate-500">Send HandyCall events to Zapier, Make, n8n, or any CRM that accepts webhooks.</p>
            </div>
            <div className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-border bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Step 1</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">Create a webhook</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    In Zapier, choose Webhooks → Catch Hook. In Make or n8n, choose Custom Webhook.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Step 2</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">Paste the URL</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Drop your webhook URL below and choose which events to send.
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Step 3</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">Test & map fields</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Use "Test webhook" to send a payload, then map fields to your CRM.
                  </p>
                </div>
              </div>
              {!integrationsEditMode ? (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-border bg-muted/50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Connection</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {webhookDraft.webhook_url ? 'Webhook configured' : 'Not configured'}
                      </p>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {webhookDraft.webhook_url || 'Paste a Zapier, Make, or n8n webhook URL to start syncing.'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-muted/50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Delivery</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {webhookDraft.is_enabled ? 'Enabled' : 'Paused'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {webhookDraft.enabled_events.length} event{webhookDraft.enabled_events.length === 1 ? '' : 's'} selected
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-muted/50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Last delivery</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {formatTimestamp(webhookConfig?.last_delivery_at)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {webhookConfig?.last_status_code ? `Status ${webhookConfig.last_status_code}` : 'No deliveries yet'}
                      </p>
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
                    <Button type="button" onClick={() => setIntegrationsEditMode(true)}>
                      Edit CRM setup
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Webhook URL</p>
                        <p className="text-xs text-muted-foreground">We'll POST JSON payloads to this URL.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWebhookDraft((prev) => ({ ...prev, is_enabled: !prev.is_enabled }))}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${webhookDraft.is_enabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                      >
                        {webhookDraft.is_enabled ? 'Enabled' : 'Paused'}
                      </button>
                    </div>
                    <div className="mt-4">
                      <Input
                        value={webhookDraft.webhook_url}
                        onChange={(e) => setWebhookDraft((prev) => ({ ...prev, webhook_url: e.target.value }))}
                        placeholder="https://hooks.zapier.com/..."
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2">
                      <IconLink className="h-4 w-4 text-emerald-600" stroke={1.5} />
                      <p className="text-sm font-semibold text-foreground">Events to send</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Choose what HandyCall should send into your CRM.</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {webhookEvents.map((event) => {
                        const active = webhookDraft.enabled_events.includes(event);
                        return (
                          <button
                            key={event}
                            type="button"
                            onClick={() => toggleWebhookEvent(event)}
                            className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                              active
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                                : 'border-border bg-muted/50 text-foreground hover:border-border/80'
                            }`}
                          >
                            {event}
                          </button>
                        );
                      })}
                      {!webhookEvents.length && (
                        <div className="text-xs text-slate-500">No events available yet.</div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">Signing secret</p>
                <p className="mt-1 text-xs text-muted-foreground">
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
                      <IconCopy className="mr-2 h-4 w-4" stroke={1.5} /> Copy
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRotateSecret}
                      disabled={!webhookConfig?.signing_secret || webhookRotating}
                    >
                      <IconRefresh className="mr-2 h-4 w-4" stroke={1.5} />
                      {webhookRotating ? 'Rotating...' : 'Rotate'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">Delivery status</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-muted/50 p-3 hover:border-border/80 transition">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Last delivery</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatTimestamp(webhookConfig?.last_delivery_at)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Event: {webhookConfig?.last_event || 'None'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/50 p-3 hover:border-border/80 transition">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Last status</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {webhookConfig?.last_status_code || '—'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
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
                {integrationsEditMode ? (
                  <>
                    <Button type="button" variant="outline" onClick={() => setIntegrationsEditMode(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveWebhook}
                      disabled={webhookSaving || webhookLoading || !webhookDraft.webhook_url}
                    >
                      {webhookSaving ? 'Saving...' : 'Save changes'}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 pl-3 border-l-2 border-emerald-500 dark:text-slate-100">Zapier, Make, n8n guidance</h2>
              <p className="text-xs text-slate-500">Fastest setup for non-technical users.</p>
            </div>
            <div className="space-y-3 p-5 text-sm text-muted-foreground">
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

            </>
          )}
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

      {activeTab === 'service_area' && (
        <ServiceAreaTab />
      )}

      {activeTab === 'knowledge' && (
        <KnowledgeTab />
      )}
    </div>
  );
}
