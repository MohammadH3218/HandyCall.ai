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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { usePlanFeatures } from '@/hooks/use-plan-features';
import { IconCopy, IconPhone, IconRefresh, IconSettings, IconShield, IconLink, IconBuilding, IconPhoneCall, IconBrain, IconCreditCard, IconWebhook, IconBell, IconUser } from '@tabler/icons-react';
import { CallFlowEditor } from '@/components/company/call-flow-editor';
import { createDefaultCallFlowQuestions } from '@/constants/company-templates';

export default function SettingsPage() {
  const { toast } = useToast();
  const { company } = useAuthStore();
  const { hasFeature } = usePlanFeatures();
  const crmEnabled = hasFeature('crm_integrations');
  const canUseFollowUps = hasFeature('follow_up_sequences');
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
  const [activeTab, setActiveTab] = useState<'business' | 'call' | 'call_flow' | 'payments' | 'integrations' | 'notifications' | 'account'>('business');
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
  const [automationSaving, setAutomationSaving] = useState(false);
  const [automationEditMode, setAutomationEditMode] = useState(false);
  const [integrationsEditMode, setIntegrationsEditMode] = useState(false);
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpInitialDelayMinutes, setFollowUpInitialDelayMinutes] = useState('0');
  const [followUpSecondDelayMinutes, setFollowUpSecondDelayMinutes] = useState('1440');
  const [followUpFinalDelayMinutes, setFollowUpFinalDelayMinutes] = useState('4320');
  const [followUpInitialTemplate, setFollowUpInitialTemplate] = useState('');
  const [followUpSecondTemplate, setFollowUpSecondTemplate] = useState('');
  const [followUpFinalTemplate, setFollowUpFinalTemplate] = useState('');
  const [reviewRequestEnabled, setReviewRequestEnabled] = useState(false);
  const [reviewRequestDelayMinutes, setReviewRequestDelayMinutes] = useState('120');
  const [reviewPlatformUrl, setReviewPlatformUrl] = useState('');
  const [reviewRequestTemplate, setReviewRequestTemplate] = useState('');

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
    setFollowUpEnabled(Boolean((company as any).follow_up_sequences_enabled));
    setFollowUpInitialDelayMinutes(String((company as any).follow_up_initial_delay_minutes ?? 0));
    setFollowUpSecondDelayMinutes(String((company as any).follow_up_second_delay_minutes ?? 1440));
    setFollowUpFinalDelayMinutes(String((company as any).follow_up_final_delay_minutes ?? 4320));
    setFollowUpInitialTemplate((company as any).follow_up_initial_template || '');
    setFollowUpSecondTemplate((company as any).follow_up_second_template || '');
    setFollowUpFinalTemplate((company as any).follow_up_final_template || '');
    setReviewRequestEnabled(Boolean((company as any).review_request_enabled));
    setReviewRequestDelayMinutes(String((company as any).review_request_delay_minutes ?? 120));
    setReviewPlatformUrl((company as any).review_platform_url || '');
    setReviewRequestTemplate((company as any).review_request_template || '');
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

  const handleAddBookingService = () => {
    setBookingServices((prev) => [
      ...prev,
      {
        service_id: crypto.randomUUID(),
        name: '',
        amount_cents: 0,
        currency: 'usd',
        active: true,
        collect_payment: true,
        billing_type: 'ONE_TIME',
        billing_interval: 'month',
        billing_interval_count: 1,
        trial_period_days: 0,
      },
    ]);
  };

  const handleUpdateBookingService = (
    serviceId: string,
    field:
      | 'name'
      | 'amount_cents'
      | 'currency'
      | 'active'
      | 'collect_payment'
      | 'billing_type'
      | 'billing_interval'
      | 'billing_interval_count'
      | 'trial_period_days',
    value: string | number | boolean,
  ) => {
    setBookingServices((prev) =>
      prev.map((service) => (service.service_id === serviceId ? { ...service, [field]: value } : service)),
    );
  };

  const handleRemoveBookingService = (serviceId: string) => {
    setBookingServices((prev) => prev.filter((service) => service.service_id !== serviceId));
  };

  const handleSavePayments = async () => {
    try {
      setPaymentsSaving(true);
      await apiClient.updateMyCompany({
        booking_payment_mode: bookingPaymentMode,
        booking_payment_mode_confirmed: true,
        booking_payment_enabled:
          bookingPaymentMode === 'HANDYCALL_MANAGED' ? bookingPaymentEnabled : false,
        booking_services: bookingServices.map((service) => ({
          service_id: service.service_id,
          name: service.name.trim(),
          amount_cents: Math.max(0, Math.round(Number(service.amount_cents || 0))),
          currency: (service.currency || 'usd').toLowerCase(),
          active: service.active,
          collect_payment: service.collect_payment,
          billing_type: service.billing_type,
          billing_interval: service.billing_interval,
          billing_interval_count: Math.max(1, Math.round(Number(service.billing_interval_count || 1))),
          trial_period_days: Math.max(0, Math.round(Number(service.trial_period_days || 0))),
        })),
      });
      toast({
        title: 'Payment settings saved',
        description: 'Your booking payment configuration has been updated.',
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

  const handleSaveAutomations = async () => {
    try {
      setAutomationSaving(true);
      await apiClient.updateMyCompany({
        follow_up_sequences_enabled: canUseFollowUps ? followUpEnabled : false,
        follow_up_initial_delay_minutes: canUseFollowUps ? Math.max(0, Number(followUpInitialDelayMinutes || 0)) : 0,
        follow_up_second_delay_minutes: canUseFollowUps ? Math.max(0, Number(followUpSecondDelayMinutes || 1440)) : 1440,
        follow_up_final_delay_minutes: canUseFollowUps ? Math.max(0, Number(followUpFinalDelayMinutes || 4320)) : 4320,
        follow_up_initial_template: canUseFollowUps ? followUpInitialTemplate.trim() || '' : '',
        follow_up_second_template: canUseFollowUps ? followUpSecondTemplate.trim() || '' : '',
        follow_up_final_template: canUseFollowUps ? followUpFinalTemplate.trim() || '' : '',
        review_request_enabled: reviewRequestEnabled,
        review_request_delay_minutes: Math.max(0, Number(reviewRequestDelayMinutes || 120)),
        review_platform_url: reviewPlatformUrl.trim() || '',
        review_request_template: reviewRequestTemplate.trim() || '',
      });
      toast({
        title: 'Automation settings saved',
        description: 'Follow-ups and review request rules are updated.',
      });
      setAutomationEditMode(false);
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error?.message || 'Could not save automation settings.',
        variant: 'destructive',
      });
    } finally {
      setAutomationSaving(false);
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

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {[
          { key: 'business', label: 'Company profile', Icon: IconBuilding },
          { key: 'call', label: 'Call handling', Icon: IconPhoneCall },
          { key: 'call_flow', label: 'AI call flow', Icon: IconBrain },
          { key: 'payments', label: 'Payments', Icon: IconCreditCard },
          { key: 'integrations', label: 'CRM integrations', Icon: IconWebhook },
          { key: 'notifications', label: 'Notifications', Icon: IconBell },
          { key: 'account', label: 'Account', Icon: IconUser },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
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
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 pl-3 border-l-2 border-emerald-500 dark:text-slate-100">Business information</h2>
                <p className="text-xs text-slate-500">Review your core company details.</p>
              </div>
              <button
                onClick={() => setEditOpen(true)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Edit details
              </button>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 hover:border-slate-200 dark:hover:border-slate-700 transition dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Business name</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{formData.company_name || 'Not set'}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 hover:border-slate-200 dark:hover:border-slate-700 transition dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Company type</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{String((company as any)?.service_type || 'Not set').replace(/_/g, ' ')}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 hover:border-slate-200 dark:hover:border-slate-700 transition dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Business contact phone</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{formData.phone_number || 'Not set'}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 hover:border-slate-200 dark:hover:border-slate-700 transition dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Timezone</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{formData.timezone || 'Not set'}</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 hover:border-slate-200 dark:hover:border-slate-700 transition dark:border-emerald-900 dark:bg-emerald-950/30">
                <div className="flex items-center gap-2">
                  <IconPhone className="h-3.5 w-3.5 text-emerald-600" stroke={1.5} />
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Inbound number</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{inboundSummary}</p>
                {!myNumber && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    HandyCall assigns this number. Contact support if you need a specific area code.
                  </p>
                )}
              </div>
            </div>
            <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="grid gap-3 md:grid-cols-3">
                <button type="button" onClick={() => setActiveTab('call_flow')} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-left hover:border-emerald-200 hover:bg-emerald-50/60 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/40">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">AI call flow</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Edit the exact intake questions and their order.</p>
                </button>
                <a href="/dashboard/knowledge" className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-left hover:border-emerald-200 hover:bg-emerald-50/60 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/40">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Knowledge base</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Manage business-specific answers, FAQs, and service details.</p>
                </a>
                <button type="button" onClick={() => setActiveTab('payments')} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-left hover:border-emerald-200 hover:bg-emerald-50/60 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/40">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Payments and subscriptions</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Manage Stripe Connect, booking payments, and billing setup.</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'call' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
                          : 'border-slate-200 bg-white hover:border-emerald-200 dark:border-slate-700 dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-1 h-3 w-3 rounded-full border ${
                            selected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                          }`}
                        />
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{option.label}</div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">{option.description}</div>
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

          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 pl-3 border-l-2 border-emerald-500 dark:text-slate-100">Human transfer</h2>
              <p className="text-xs text-slate-500">Let callers reach a person when needed.</p>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <IconSettings className="h-4 w-4" stroke={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Enable call transfer</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Route urgent calls to a human team member.</p>
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
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 pl-3 border-l-2 border-emerald-500 dark:text-slate-100">AI intake flow</h2>
              <p className="text-xs text-slate-500">
                Control which questions HandyCall asks before it ever asks for a date and time.
              </p>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">How this works</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
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
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 pl-3 border-l-2 border-emerald-500 dark:text-slate-100">How you want to handle customer payments</h2>
              <p className="text-xs text-slate-500">
                Pick a payment mode. You can change this later.
              </p>
            </div>
            <div className="space-y-4 p-5">
              {!paymentsEditMode ? (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Payment mode</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {bookingPaymentMode === 'HANDYCALL_MANAGED' ? 'Managed in HandyCall' : 'Handled outside HandyCall'}
                      </p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        {bookingPaymentMode === 'HANDYCALL_MANAGED'
                          ? 'Customers can pay through HandyCall booking links.'
                          : 'You collect payment outside HandyCall.'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Stripe Connect</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {connectStatus?.connected ? 'Connected' : 'Not connected'}
                      </p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        {connectStatus?.connected
                          ? connectStatus?.charges_enabled && connectStatus?.payouts_enabled
                            ? 'Ready to collect and pay out.'
                            : 'Connected, but setup still needs to be finished in Stripe.'
                          : 'Connect Stripe only if you want HandyCall-managed payments.'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Booking payments</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {bookingPaymentEnabled && bookingPaymentMode === 'HANDYCALL_MANAGED' ? 'Enabled' : 'Disabled'}
                      </p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        {bookingServices.length > 0
                          ? `${bookingServices.length} service${bookingServices.length === 1 ? '' : 's'} configured`
                          : 'No paid services configured yet.'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                    Choose whether HandyCall collects customer payments for you or if your team handles billing manually.
                  </div>

                  {bookingServices.length > 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Configured services</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {bookingServices.map((service) => (
                          <div key={service.service_id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{service.name || 'Untitled service'}</p>
                              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${service.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                {service.active ? 'Active' : 'Paused'}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                              {service.billing_type === 'SUBSCRIPTION'
                                ? `Subscription · ${(service.amount_cents / 100).toFixed(2)} ${service.currency.toUpperCase()} every ${service.billing_interval_count} ${service.billing_interval}${service.billing_interval_count > 1 ? 's' : ''}`
                                : `One-time · ${(service.amount_cents / 100).toFixed(2)} ${service.currency.toUpperCase()}`}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {service.collect_payment ? 'Collect payment in booking flow' : 'Booking only, no payment collected'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex justify-end gap-2">
                    {bookingPaymentMode === 'HANDYCALL_MANAGED' ? (
                      <Button type="button" variant="outline" onClick={handleConnectSetup}>
                        {connectStatus?.connected ? 'Open Stripe Connect' : 'Set up Stripe Connect'}
                      </Button>
                    ) : null}
                    <Button type="button" onClick={() => setPaymentsEditMode(true)}>
                      Edit payment setup
                    </Button>
                  </div>
                </>
              ) : (
                <>
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setBookingPaymentMode('HANDYCALL_MANAGED')}
                  className={`rounded-xl border p-4 text-left transition ${
                    bookingPaymentMode === 'HANDYCALL_MANAGED'
                      ? 'border-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-700'
                      : 'border-slate-200 bg-white hover:border-emerald-200 dark:border-slate-700 dark:bg-slate-900'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Managed in HandyCall (Recommended)</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Connect Stripe once. When AI sends booking links, customers can pay there and everything is tracked in one place.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setBookingPaymentMode('SELF_MANAGED')}
                  className={`rounded-xl border p-4 text-left transition ${
                    bookingPaymentMode === 'SELF_MANAGED'
                      ? 'border-slate-400 bg-slate-50 dark:border-slate-500 dark:bg-slate-800'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">I handle payments myself</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    HandyCall books jobs and collects lead details, but payment happens outside HandyCall.
                  </p>
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                You can keep booking links and disable in-link payment anytime if your team prefers manual invoicing.
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stripe Connect</p>
              {(() => {
                const connectAccountExists = Boolean(connectStatus?.connected && connectStatus?.account_id);
                const connectCanCharge = Boolean(connectStatus?.charges_enabled);
                const connectCanPayout = Boolean(connectStatus?.payouts_enabled);
                const connectFullyReady = connectAccountExists && connectCanCharge && connectCanPayout;
                const connectSetupIncomplete = connectAccountExists && !connectFullyReady;
                return (
                  <>
              {paymentsLoading ? (
                  <p className="mt-2 text-sm text-slate-500">Loading payment status…</p>
              ) : connectFullyReady ? (
                  <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-800">
                    Connected{connectStatus?.account_id ? ` · ${connectStatus.account_id}` : ''}.
                  </div>
              ) : connectSetupIncomplete ? (
                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-800">
                    Setup incomplete{connectStatus?.account_id ? ` · ${connectStatus.account_id}` : ''}.
                    {!connectCanCharge ? ' Enable charges in Stripe Connect.' : ''}
                    {!connectCanPayout ? ' Add bank/payout details to enable payouts.' : ''}
                  </div>
              ) : (
                  <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
                    Stripe Connect is not set up yet.
                  </div>
              )}
              <div className="flex gap-2">
                <Button onClick={handleConnectSetup} disabled={bookingPaymentMode !== 'HANDYCALL_MANAGED'}>
                  {connectFullyReady ? 'Open Stripe Connect' : connectSetupIncomplete ? 'Complete Stripe setup' : 'Set up Stripe Connect'}
                </Button>
              </div>
                  </>
                );
              })()}
              {bookingPaymentMode !== 'HANDYCALL_MANAGED' ? (
                <p className="mt-2 text-xs text-slate-500">
                  Enable "Managed in HandyCall" to connect Stripe and collect payments from booking links.
                </p>
              ) : null}
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">Security</p>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">We don't store bank info. Payout details are handled directly by Stripe.</p>
              </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 pl-3 border-l-2 border-emerald-500 dark:text-slate-100">Booking payment configuration</h2>
              <p className="text-xs text-slate-500">
                Define service types and whether each is a one-time charge or recurring subscription.
              </p>
            </div>
            <div className="space-y-4 p-5">
              {!paymentsEditMode ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                  {bookingPaymentEnabled && bookingPaymentMode === 'HANDYCALL_MANAGED'
                    ? 'Customers will see a payment step on public booking links for eligible services.'
                    : 'Public booking links currently collect appointment details only.'}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Enable booking payments</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Show a payment step on public booking links.</p>
                    </div>
                    <button
                      type="button"
                      aria-pressed={bookingPaymentEnabled}
                      onClick={() => setBookingPaymentEnabled((prev) => !prev)}
                      disabled={bookingPaymentMode !== 'HANDYCALL_MANAGED'}
                      className={`relative h-7 w-12 rounded-full transition ${
                        bookingPaymentEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    >
                      <span
                        className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                          bookingPaymentEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {bookingServices.map((service) => (
                      <div key={service.service_id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                        <div className="grid gap-3 md:grid-cols-4">
                          <div className="space-y-2 md:col-span-2">
                            <Label>Service name</Label>
                            <Input
                              value={service.name}
                              onChange={(e) => handleUpdateBookingService(service.service_id, 'name', e.target.value)}
                              placeholder="Service name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Price in cents</Label>
                            <Input
                              type="number"
                              min={0}
                              value={service.amount_cents}
                              onChange={(e) => handleUpdateBookingService(service.service_id, 'amount_cents', Number(e.target.value))}
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Currency</Label>
                            <Input
                              value={service.currency}
                              onChange={(e) => handleUpdateBookingService(service.service_id, 'currency', e.target.value)}
                              placeholder="usd"
                            />
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Billing type</Label>
                            <Select
                              value={service.billing_type}
                              onValueChange={(value) => handleUpdateBookingService(service.service_id, 'billing_type', value as 'ONE_TIME' | 'SUBSCRIPTION')}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Billing type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ONE_TIME">One-time</SelectItem>
                                <SelectItem value="SUBSCRIPTION">Subscription</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Repeat interval</Label>
                            <Select
                              value={service.billing_interval}
                              onValueChange={(value) =>
                                handleUpdateBookingService(service.service_id, 'billing_interval', value as 'day' | 'week' | 'month' | 'year')
                              }
                              disabled={service.billing_type !== 'SUBSCRIPTION'}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Interval" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="day">Daily</SelectItem>
                                <SelectItem value="week">Weekly</SelectItem>
                                <SelectItem value="month">Monthly</SelectItem>
                                <SelectItem value="year">Yearly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Every how many intervals</Label>
                            <Input
                              type="number"
                              min={1}
                              value={service.billing_interval_count}
                              onChange={(e) => handleUpdateBookingService(service.service_id, 'billing_interval_count', Number(e.target.value))}
                              placeholder="1"
                              disabled={service.billing_type !== 'SUBSCRIPTION'}
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateBookingService(service.service_id, 'active', !service.active)}
                              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${service.active ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                            >
                              {service.active ? 'Active' : 'Inactive'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateBookingService(service.service_id, 'collect_payment', !service.collect_payment)}
                              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${service.collect_payment ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-700'}`}
                            >
                              {service.collect_payment ? 'Collect payment' : 'Booking only'}
                            </button>
                          </div>
                          <Button type="button" variant="outline" onClick={() => handleRemoveBookingService(service.service_id)}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex flex-wrap justify-between gap-2">
                {paymentsEditMode ? (
                  <>
                    <Button type="button" variant="outline" onClick={handleAddBookingService}>
                      Add service
                    </Button>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setPaymentsEditMode(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSavePayments} disabled={paymentsSaving}>
                        {paymentsSaving ? 'Saving…' : 'Save payment settings'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button type="button" onClick={() => setPaymentsEditMode(true)}>
                    Edit booking payments
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 pl-3 border-l-2 border-emerald-500 dark:text-slate-100">Follow-ups and review requests</h2>
              <p className="text-xs text-slate-500">Automate post-call and post-appointment outreach.</p>
            </div>
            <div className="space-y-4 p-5">
              {!canUseFollowUps ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Follow-up sequences are available on Pro and Max plans.
                </div>
              ) : null}

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Enable follow-up SMS sequence</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Send immediate, 24-hour, and 3-day follow-ups after calls.</p>
                </div>
                <button
                  type="button"
                  aria-pressed={followUpEnabled}
                  onClick={() => canUseFollowUps && setFollowUpEnabled((prev) => !prev)}
                  disabled={!canUseFollowUps}
                  className={`relative h-7 w-12 rounded-full transition ${
                    canUseFollowUps && followUpEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                  } ${!canUseFollowUps ? 'opacity-60' : ''}`}
                >
                  <span
                    className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                      canUseFollowUps && followUpEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {canUseFollowUps && followUpEnabled ? (
                <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="follow_up_initial_delay">Initial delay (minutes)</Label>
                      <Input
                        id="follow_up_initial_delay"
                        type="number"
                        min={0}
                        value={followUpInitialDelayMinutes}
                        onChange={(e) => setFollowUpInitialDelayMinutes(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="follow_up_second_delay">Second delay (minutes)</Label>
                      <Input
                        id="follow_up_second_delay"
                        type="number"
                        min={0}
                        value={followUpSecondDelayMinutes}
                        onChange={(e) => setFollowUpSecondDelayMinutes(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="follow_up_final_delay">Final delay (minutes)</Label>
                      <Input
                        id="follow_up_final_delay"
                        type="number"
                        min={0}
                        value={followUpFinalDelayMinutes}
                        onChange={(e) => setFollowUpFinalDelayMinutes(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="follow_up_initial_template">Initial follow-up message (optional)</Label>
                    <textarea
                      id="follow_up_initial_template"
                      value={followUpInitialTemplate}
                      onChange={(e) => setFollowUpInitialTemplate(e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-200 transition focus:ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      placeholder="Thanks for calling {{company_name}}! Here's your booking link: {{booking_link}}"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="follow_up_second_template">Second follow-up message (optional)</Label>
                    <textarea
                      id="follow_up_second_template"
                      value={followUpSecondTemplate}
                      onChange={(e) => setFollowUpSecondTemplate(e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-200 transition focus:ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      placeholder="Haven't booked yet? We'd love to help. {{booking_link}}"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="follow_up_final_template">Final follow-up message (optional)</Label>
                    <textarea
                      id="follow_up_final_template"
                      value={followUpFinalTemplate}
                      onChange={(e) => setFollowUpFinalTemplate(e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-200 transition focus:ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      placeholder="Final follow-up from {{company_name}}. Reply here if you'd like us to reserve a time for you."
                    />
                  </div>

                  <p className="text-xs text-slate-500">
                    Template variables supported: <code>{'{{company_name}}'}</code>, <code>{'{{booking_link}}'}</code>, <code>{'{{contact_name}}'}</code>.
                  </p>
                </div>
              ) : null}

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Enable review request SMS</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Send a review request automatically after completed appointments.</p>
                </div>
                <button
                  type="button"
                  aria-pressed={reviewRequestEnabled}
                  onClick={() => setReviewRequestEnabled((prev) => !prev)}
                  className={`relative h-7 w-12 rounded-full transition ${
                    reviewRequestEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                      reviewRequestEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {reviewRequestEnabled ? (
                <div className="grid gap-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="review_delay_minutes">Send delay (minutes)</Label>
                      <Input
                        id="review_delay_minutes"
                        type="number"
                        min={0}
                        value={reviewRequestDelayMinutes}
                        onChange={(e) => setReviewRequestDelayMinutes(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="review_platform_url">Review URL</Label>
                      <Input
                        id="review_platform_url"
                        value={reviewPlatformUrl}
                        onChange={(e) => setReviewPlatformUrl(e.target.value)}
                        placeholder="https://g.page/your-business/review"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="review_request_template">Review request message (optional)</Label>
                    <textarea
                      id="review_request_template"
                      value={reviewRequestTemplate}
                      onChange={(e) => setReviewRequestTemplate(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-200 transition focus:ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      placeholder="Thanks for choosing [Company]! We'd love your feedback: [review_link]"
                    />
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end">
                <Button onClick={handleSaveAutomations} disabled={automationSaving}>
                  {automationSaving ? 'Saving…' : 'Save automation settings'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
                    <div key={event.event_key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{event.label}</p>
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
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 pl-3 border-l-2 border-emerald-500 dark:text-slate-100">Account status</h2>
              <p className="text-xs text-slate-500">Your subscription information.</p>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4 hover:border-slate-200 dark:hover:border-slate-700 transition dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
                    <IconShield className="h-3.5 w-3.5 text-emerald-600" stroke={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Account status</p>
                    <p className="text-xs text-slate-500">Current subscription state</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{statusLabel}</span>
              </div>
              {company?.trial_ends_at && (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Trial ends</span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
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
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 pl-3 border-l-2 border-emerald-500 dark:text-slate-100">Connect your CRM</h2>
              <p className="text-xs text-slate-500">Send HandyCall events to Zapier, Make, n8n, or any CRM that accepts webhooks.</p>
            </div>
            <div className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Step 1</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Create a webhook</p>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    In Zapier, choose Webhooks → Catch Hook. In Make or n8n, choose Custom Webhook.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Step 2</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Paste the URL</p>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    Drop your webhook URL below and choose which events to send.
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Step 3</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Test & map fields</p>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    Use "Test webhook" to send a payload, then map fields to your CRM.
                  </p>
                </div>
              </div>
              {!integrationsEditMode ? (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Connection</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {webhookDraft.webhook_url ? 'Webhook configured' : 'Not configured'}
                      </p>
                      <p className="mt-1 break-all text-xs text-slate-600 dark:text-slate-400">
                        {webhookDraft.webhook_url || 'Paste a Zapier, Make, or n8n webhook URL to start syncing.'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Delivery</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {webhookDraft.is_enabled ? 'Enabled' : 'Paused'}
                      </p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        {webhookDraft.enabled_events.length} event{webhookDraft.enabled_events.length === 1 ? '' : 's'} selected
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Last delivery</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatTimestamp(webhookConfig?.last_delivery_at)}
                      </p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
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
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Webhook URL</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">We'll POST JSON payloads to this URL.</p>
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

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center gap-2">
                      <IconLink className="h-4 w-4 text-emerald-600" stroke={1.5} />
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Events to send</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Choose what HandyCall should send into your CRM.</p>
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
                                : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300'
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

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Signing secret</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
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

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Delivery status</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 hover:border-slate-200 dark:hover:border-slate-700 transition dark:border-slate-700 dark:bg-slate-800/50">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Last delivery</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {formatTimestamp(webhookConfig?.last_delivery_at)}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Event: {webhookConfig?.last_event || 'None'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 hover:border-slate-200 dark:hover:border-slate-700 transition dark:border-slate-700 dark:bg-slate-800/50">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Last status</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {webhookConfig?.last_status_code || '—'}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
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

          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 pl-3 border-l-2 border-emerald-500 dark:text-slate-100">Zapier, Make, n8n guidance</h2>
              <p className="text-xs text-slate-500">Fastest setup for non-technical users.</p>
            </div>
            <div className="space-y-3 p-5 text-sm text-slate-600 dark:text-slate-400">
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
    </div>
  );
}
