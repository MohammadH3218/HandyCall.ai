'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { SubscriptionPlan, SubscriptionStatus } from '@handycall/shared';
import { PLAN_CATALOG, getPlanPriceDisplay } from '@/constants/plans';
import { normalizeUsageResponse, resolvePlan, resolvePlanLimits } from '@/lib/billing-utils';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/portal/page-header';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Clock3, CreditCard, FileText, MessageSquare, ShieldCheck, Sparkles, Users } from 'lucide-react';

type PaymentMethod = {
  id: string;
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
  is_default?: boolean;
};

export default function BillingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { company } = useAuthStore();
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [planLimits, setPlanLimits] = useState<{ minutes: number; sms: number; contacts: number }>();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState<string | null>(null);
  const [paymentActionId, setPaymentActionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethod | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [connectStatus, setConnectStatus] = useState<any>(null);
  const [customerPaymentStats, setCustomerPaymentStats] = useState<any>(null);
  const [recentCustomerPayments, setRecentCustomerPayments] = useState<any[]>([]);

  useEffect(() => { loadBillingData(); }, []);

  const currentPlan = resolvePlan(
    (company?.subscription_plan as SubscriptionPlan | undefined) ||
      (subscription?.subscription_plan as SubscriptionPlan | undefined)
  );
  const planDetails = currentPlan ? PLAN_CATALOG[currentPlan] : null;
  const priceDisplay = currentPlan ? getPlanPriceDisplay(currentPlan) : null;
  const status = company?.subscription_status || subscription?.subscription_status;
  const isCanceling = Boolean(company?.cancel_at_period_end || subscription?.cancel_at_period_end);

  const fallbackPaymentMethod =
    company?.payment_method_last4
      ? { last4: company.payment_method_last4, brand: company.payment_method_brand }
      : (subscription as any)?.payment_method
      ? { last4: (subscription as any).payment_method.last4, brand: (subscription as any).payment_method.brand }
      : null;

  const displayPaymentMethods = useMemo(() => {
    if (paymentMethods.length) return paymentMethods;
    if (fallbackPaymentMethod) return [{ id: 'fallback', ...fallbackPaymentMethod, is_default: true } as PaymentMethod];
    return [];
  }, [paymentMethods, fallbackPaymentMethod]);

  const canEditPaymentMethods = paymentMethods.length > 0;
  const canRemovePaymentMethods = paymentMethods.length > 1;

  const planHighlights = useMemo(
    () => [
      { label: 'Call minutes', value: planLimits?.minutes === -1 ? 'Unlimited' : typeof planLimits?.minutes === 'number' ? `${planLimits.minutes}/mo` : '-' },
      { label: 'SMS messages', value: planLimits?.sms === -1 ? 'Unlimited' : typeof planLimits?.sms === 'number' ? `${planLimits.sms}/mo` : '-' },
      { label: 'Active contacts', value: planLimits?.contacts === -1 ? 'Unlimited' : typeof planLimits?.contacts === 'number' ? `${planLimits.contacts}/mo` : '-' },
    ],
    [planLimits]
  );

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const withTimeout = <T,>(promise: Promise<T>, ms = 12000) =>
        Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms))]);

      const [subData, usageData, paymentData, connectData, paymentStats, recentPayments] = await Promise.all([
        withTimeout(apiClient.getMySubscription()),
        withTimeout(apiClient.getUsageMetrics()),
        withTimeout(apiClient.getPaymentMethods().catch(() => ({ payment_methods: [], default_payment_method_id: null }))),
        withTimeout(apiClient.getConnectStatus().catch(() => ({ connected: false }))),
        withTimeout(apiClient.getCustomerPaymentStats().catch(() => null)),
        withTimeout(apiClient.getCustomerPayments({ limit: 6 }).catch(() => ({ payments: [] }))),
      ]);
      const plan =
        resolvePlan(company?.subscription_plan as SubscriptionPlan | undefined) ||
        resolvePlan(subData?.subscription_plan as SubscriptionPlan | undefined);

      setSubscription(subData);
      setUsage(normalizeUsageResponse(usageData, subData));
      const limits = resolvePlanLimits(plan, usageData?.plan_limits) || (plan ? PLAN_CATALOG[plan]?.limits : undefined);
      setPlanLimits(limits);
      const sanitizedPaymentMethods = Array.isArray(paymentData?.payment_methods)
        ? paymentData.payment_methods.filter((m: PaymentMethod | null | undefined): m is PaymentMethod => Boolean(m?.id))
        : [];
      setPaymentMethods(sanitizedPaymentMethods);
      setDefaultPaymentMethodId(paymentData?.default_payment_method_id || null);
      setConnectStatus(connectData || { connected: false });
      setCustomerPaymentStats(paymentStats || null);
      setRecentCustomerPayments((recentPayments?.payments || []) as any[]);
    } catch (error: any) {
      console.error('Failed to load billing data:', error);
      toast({ title: 'Unable to load billing', description: error.message || 'Please try again in a moment.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCancelling(true);
      await apiClient.cancelSubscription();
      await loadBillingData();
      setShowCancelDialog(false);
    } catch (error: any) {
      toast({ title: 'Cancel failed', description: error.message || 'Failed to cancel subscription', variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  const handleMakeDefault = async (paymentMethodId: string) => {
    try {
      setPaymentActionId(paymentMethodId);
      await apiClient.setDefaultPaymentMethod(paymentMethodId);
      await loadBillingData();
      toast({ title: 'Default updated', description: 'New payment method set as default.' });
    } catch (error: any) {
      toast({ title: 'Update failed', description: error?.message || 'Failed to update payment method.', variant: 'destructive' });
    } finally {
      setPaymentActionId(null);
    }
  };

  const handleDeleteClick = (paymentMethod: PaymentMethod) => {
    setDeleteTarget(paymentMethod);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setPaymentActionId(deleteTarget.id);
      await apiClient.deletePaymentMethod(deleteTarget.id);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await loadBillingData();
      toast({ title: 'Payment method removed', description: 'The card has been removed from your account.' });
    } catch (error: any) {
      toast({ title: 'Remove failed', description: error?.message || 'Failed to remove payment method.', variant: 'destructive' });
    } finally {
      setPaymentActionId(null);
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

  const getStatusPill = (status?: SubscriptionStatus) => {
    const map: Record<string, string> = {
      [SubscriptionStatus.TRIALING]: 'bg-blue-50 text-blue-700 border-blue-200',
      [SubscriptionStatus.ACTIVE]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      [SubscriptionStatus.PAST_DUE]: 'bg-amber-50 text-amber-800 border-amber-200',
      [SubscriptionStatus.CANCELED]: 'bg-slate-50 text-slate-600 border-slate-200',
      [SubscriptionStatus.UNPAID]: 'bg-red-50 text-red-700 border-red-200',
      [SubscriptionStatus.INCOMPLETE]: 'bg-slate-50 text-slate-600 border-slate-200',
    };
    if (!status) return null;
    const cls = map[status] || 'bg-slate-50 text-slate-600 border-slate-200';
    const label = status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ');
    return <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatMoney = (cents?: number, currency = 'usd') => {
    const amount = Number(cents || 0) / 100;
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  };

  const calculateUsagePercentage = (used: number, limit: number) => {
    if (!limit || limit === -1) return 0;
    return Math.min(Math.round((used / limit) * 100), 100);
  };

  const getDaysRemaining = () => {
    if (!subscription?.current_period_end) return null;
    const endDate = new Date(subscription.current_period_end);
    const diffTime = endDate.getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    if (diffDays > 1) return `${diffDays} days`;
    if (diffHours > 1) return `${diffHours} hours`;
    return 'less than 1 hour';
  };

  const limitReached = Boolean(
    usage &&
    planLimits &&
    ((typeof planLimits.minutes === 'number' && usage.call_minutes >= planLimits.minutes) ||
      (typeof planLimits.sms === 'number' && usage.sms_count >= planLimits.sms) ||
      (typeof planLimits.contacts === 'number' && usage.active_contacts >= planLimits.contacts))
  );

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Billing"
        title="Billing and subscription"
        subtitle="Manage your subscription, usage, and billing information."
      />

      {limitReached && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-800">Usage limit reached</p>
          <p className="mt-1 text-sm text-red-700">
            AI call/SMS handling may be paused until your next reset on {formatDate(subscription?.current_period_end)}.
          </p>
          <Button size="sm" className="mt-3" onClick={() => router.push('/dashboard/billing/plans')}>
            Upgrade plan
          </Button>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {/* Current Plan */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-100/50 blur-3xl" />
          <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Current plan</h2>
              <p className="text-xs text-slate-500">Your active subscription and monthly limits.</p>
            </div>
          </div>

          <div className="px-5 py-5 space-y-4">
            {planDetails ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Plan</p>
                    <p className="text-xl font-bold text-slate-900">{planDetails.name}</p>
                    <div className="mt-1 flex flex-wrap items-baseline gap-2">
                      {priceDisplay?.original && <span className="text-sm text-slate-400 line-through">{priceDisplay.original}</span>}
                      <span className="text-2xl font-bold text-slate-900">{priceDisplay?.current}</span>
                      {priceDisplay?.cadence && <span className="text-sm text-slate-500">{priceDisplay.cadence}</span>}
                    </div>
                  </div>
                  {getStatusPill(isCanceling ? SubscriptionStatus.CANCELED : status)}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {planHighlights.map((item) => (
                    <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{item.label}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>

                {subscription?.current_period_start && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-xs text-slate-500">
                    Period: {formatDate(subscription.current_period_start)} – {formatDate(subscription.current_period_end)}
                  </div>
                )}

                {isCanceling && subscription?.current_period_end && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    Plan ends in {getDaysRemaining()} on {formatDate(subscription.current_period_end)}.
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {status === SubscriptionStatus.CANCELED || subscription?.cancel_at_period_end ? (
                    <Button onClick={() => router.push('/dashboard/billing/plans')}>Reactivate plan</Button>
                  ) : (
                    <>
                      <Button onClick={() => router.push('/dashboard/billing/plans')}>Manage plan</Button>
                      <button
                        onClick={() => setShowCancelDialog(true)}
                        className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Cancel plan
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <p className="text-sm text-slate-500 mb-4">No active subscription</p>
                <Button onClick={() => router.push('/dashboard/billing/plans')}>Choose a plan</Button>
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="pointer-events-none absolute -left-16 top-8 h-32 w-32 rounded-full bg-emerald-100/40 blur-3xl" />
          <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50">
                <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Payment methods</h2>
                <p className="text-xs text-slate-500">Manage how your subscription is billed.</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard/billing/payment-method')}
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              Add card
            </button>
          </div>

          <div className="px-5 py-5 space-y-3">
            {displayPaymentMethods.length > 0 ? (
              <>
                {displayPaymentMethods.map((method) => {
                  const isDefault = method.is_default || method.id === defaultPaymentMethodId;
                  return (
                    <div
                      key={method.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-11 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50">
                          <CreditCard className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">{(method.brand || 'Card').toUpperCase()}</p>
                            {isDefault && (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            •••• {method.last4 || '----'}
                            {method.exp_month && method.exp_year ? `  ·  exp ${method.exp_month}/${method.exp_year}` : ''}
                          </p>
                        </div>
                      </div>
                      {canEditPaymentMethods && (
                        <div className="flex items-center gap-2">
                          {!isDefault && (
                            <button
                              onClick={() => handleMakeDefault(method.id)}
                              disabled={paymentActionId === method.id}
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                            >
                              Make default
                            </button>
                          )}
                          {canRemovePaymentMethods && (
                            <button
                              onClick={() => handleDeleteClick(method)}
                              disabled={paymentActionId === method.id}
                              className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {!canRemovePaymentMethods && canEditPaymentMethods && (
                  <p className="text-xs text-slate-400">You must keep at least one payment method on file.</p>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <p className="text-sm text-slate-500 mb-4">No payment method on file</p>
                <Button onClick={() => router.push('/dashboard/billing/payment-method')}>Add payment method</Button>
              </div>
            )}

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                <div>
                  <p className="text-xs font-semibold text-emerald-900">Secure billing</p>
                  <p className="text-xs text-emerald-700/80 mt-0.5">
                    Card details are encrypted and stored by Stripe. HandyCall never stores full card numbers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage meters */}
      {usage && planDetails && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Current period usage</h2>
            <p className="text-xs text-slate-500">
              {usage.period_start ? formatDate(usage.period_start) : 'N/A'} – {usage.period_end ? formatDate(usage.period_end) : 'N/A'}
            </p>
          </div>
          <div className="grid divide-y divide-slate-50 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              { label: 'Call minutes', used: usage?.call_minutes || 0, limit: planLimits?.minutes, icon: <Clock3 className="h-4 w-4 text-blue-600" />, iconBg: 'border-blue-100 bg-blue-50', barColor: 'bg-blue-500' },
              { label: 'SMS messages', used: usage?.sms_count || 0, limit: planLimits?.sms, icon: <MessageSquare className="h-4 w-4 text-emerald-600" />, iconBg: 'border-emerald-100 bg-emerald-50', barColor: 'bg-emerald-500' },
              { label: 'Active contacts', used: usage?.active_contacts || 0, limit: planLimits?.contacts, icon: <Users className="h-4 w-4 text-violet-600" />, iconBg: 'border-violet-100 bg-violet-50', barColor: 'bg-violet-500' },
            ].map((m) => {
              const pct = calculateUsagePercentage(m.used, m.limit || 0);
              const bar = pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : m.barColor;
              const limitLabel = m.limit === undefined ? 'No plan' : m.limit === -1 ? 'Unlimited' : m.limit.toLocaleString();
              return (
                <div key={m.label} className="px-5 py-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${m.iconBg}`}>{m.icon}</div>
                      <div>
                        <p className="text-xs font-semibold text-slate-700">{m.label}</p>
                        <p className="text-[11px] text-slate-400">Limit: {limitLabel}</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-slate-900">{m.used.toLocaleString()}</p>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Customer payments</h2>
            <p className="text-xs text-slate-500">Collect payments from booking links with Stripe Connect.</p>
          </div>
          <div className="flex items-center gap-2">
            {connectStatus?.connected ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                Connected
              </span>
            ) : (
              <Button size="sm" onClick={handleConnectSetup}>Set up Connect</Button>
            )}
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/payments')}>
              View all payments
            </Button>
          </div>
        </div>
        <div className="space-y-4 px-5 py-5">
          {connectStatus?.connected ? (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Revenue</p>
                  <p className="mt-1 text-base font-bold text-slate-900">
                    {formatMoney(customerPaymentStats?.total_revenue_cents || 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">This month</p>
                  <p className="mt-1 text-base font-bold text-slate-900">
                    {formatMoney(customerPaymentStats?.this_month_revenue_cents || 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Successful</p>
                  <p className="mt-1 text-base font-bold text-slate-900">{customerPaymentStats?.successful_payments || 0}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Avg ticket</p>
                  <p className="mt-1 text-base font-bold text-slate-900">
                    {formatMoney(customerPaymentStats?.average_ticket_cents || 0)}
                  </p>
                </div>
              </div>

              {recentCustomerPayments.length > 0 ? (
                <div className="space-y-2">
                  {recentCustomerPayments.slice(0, 5).map((payment) => (
                    <div key={payment.payment_id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{payment.customer_name || payment.service_name || 'Payment'}</p>
                        <p className="text-xs text-slate-500">{formatDate(payment.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">{formatMoney(payment.amount_cents, payment.currency)}</p>
                        <p className="text-xs text-slate-500">{payment.payment_status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No customer payments yet.</p>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4">
              <p className="text-sm text-slate-700">
                Connect Stripe to start collecting customer payments from booking links.
              </p>
            </div>
          )}

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
            <p className="text-xs font-semibold text-emerald-900">Security</p>
            <p className="mt-1 text-xs text-emerald-700">We never store your bank information.</p>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: <Sparkles className="h-4 w-4 text-emerald-600" />, title: 'View all plans', desc: 'Compare plans and upgrade your subscription.', path: '/dashboard/billing/plans' },
          { icon: <FileText className="h-4 w-4 text-emerald-600" />, title: 'Invoice history', desc: 'View and download past invoices.', path: '/dashboard/billing/invoices' },
          { icon: <CreditCard className="h-4 w-4 text-emerald-600" />, title: 'Payment settings', desc: 'Update your payment information.', path: '/dashboard/billing/payment-method' },
        ].map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => router.push(item.path)}
            className="group flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-all hover:border-emerald-100 hover:shadow-md"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50">
              {item.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">{item.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Delete payment method dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove payment method</DialogTitle>
            <DialogDescription>
              This card will be removed from your account. You must keep at least one active payment method.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={paymentActionId === deleteTarget?.id}>Keep card</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={paymentActionId === deleteTarget?.id}>
              {paymentActionId === deleteTarget?.id ? 'Removing…' : 'Remove card'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel subscription dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel subscription?</DialogTitle>
            <DialogDescription>
              Your plan will remain active until the end of the current billing period ({formatDate(subscription?.current_period_end)}), and you'll retain full access until then.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)} disabled={cancelling}>Keep subscription</Button>
            <Button variant="destructive" onClick={handleCancelSubscription} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Yes, cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
