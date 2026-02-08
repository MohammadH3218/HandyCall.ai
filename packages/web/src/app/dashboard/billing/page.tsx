'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { SubscriptionPlan, SubscriptionStatus } from '@handycall/shared';
import { PLAN_CATALOG, getPlanPriceDisplay } from '@/constants/plans';
import { normalizeUsageResponse, resolvePlan, resolvePlanLimits } from '@/lib/billing-utils';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CreditCard, ShieldCheck, Sparkles } from 'lucide-react';

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

  useEffect(() => {
    loadBillingData();
  }, []);

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
      ? {
          last4: (subscription as any).payment_method.last4,
          brand: (subscription as any).payment_method.brand,
        }
      : null;

  const displayPaymentMethods = useMemo(() => {
    if (paymentMethods.length) return paymentMethods;
    if (fallbackPaymentMethod) {
      return [{ id: 'fallback', ...fallbackPaymentMethod, is_default: true } as PaymentMethod];
    }
    return [];
  }, [paymentMethods, fallbackPaymentMethod]);

  const canEditPaymentMethods = paymentMethods.length > 0;
  const canRemovePaymentMethods = paymentMethods.length > 1;

  const planHighlights = useMemo(
    () => [
      {
        label: 'Call minutes',
        value:
          planLimits?.minutes === -1
            ? 'Unlimited'
            : typeof planLimits?.minutes === 'number'
            ? `${planLimits.minutes}/week`
            : '-',
      },
      {
        label: 'SMS messages',
        value:
          planLimits?.sms === -1
            ? 'Unlimited'
            : typeof planLimits?.sms === 'number'
            ? `${planLimits.sms}/week`
            : '-',
      },
      {
        label: 'Active contacts',
        value:
          planLimits?.contacts === -1
            ? 'Unlimited'
            : typeof planLimits?.contacts === 'number'
            ? `${planLimits.contacts}/week`
            : '-',
      },
    ],
    [planLimits]
  );

  const loadBillingData = async () => {
    try {
      setLoading(true);

      const withTimeout = <T,>(promise: Promise<T>, ms = 12000) =>
        Promise.race([
          promise,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), ms)
          ),
        ]);

      const [subData, usageData, paymentData] = await Promise.all([
        withTimeout(apiClient.getMySubscription()),
        withTimeout(apiClient.getUsageMetrics()),
        withTimeout(
          apiClient
            .getPaymentMethods()
            .catch(() => ({ payment_methods: [], default_payment_method_id: null }))
        ),
      ]);
      const plan =
        resolvePlan(company?.subscription_plan as SubscriptionPlan | undefined) ||
        resolvePlan(subData?.subscription_plan as SubscriptionPlan | undefined);

      setSubscription(subData);
      setUsage(normalizeUsageResponse(usageData, subData));
      const limits =
        resolvePlanLimits(plan, usageData?.plan_limits) ||
        (plan ? PLAN_CATALOG[plan]?.limits : undefined);
      setPlanLimits(limits);
      const sanitizedPaymentMethods = Array.isArray(paymentData?.payment_methods)
        ? paymentData.payment_methods.filter(
            (method: PaymentMethod | null | undefined): method is PaymentMethod => Boolean(method?.id)
          )
        : [];
      setPaymentMethods(sanitizedPaymentMethods);
      setDefaultPaymentMethodId(paymentData?.default_payment_method_id || null);
    } catch (error: any) {
      console.error('Failed to load billing data:', error);
      toast({
        title: 'Unable to load billing',
        description: error.message || 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCancelling(true);
      await apiClient.cancelSubscription();
      await loadBillingData(); // Reload billing data
      setShowCancelDialog(false);
    } catch (error: any) {
      console.error('Failed to cancel subscription:', error);
      toast({
        title: 'Cancel failed',
        description: error.message || 'Failed to cancel subscription',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleMakeDefault = async (paymentMethodId: string) => {
    try {
      setPaymentActionId(paymentMethodId);
      await apiClient.setDefaultPaymentMethod(paymentMethodId);
      await loadBillingData();
      toast({
        title: 'Default updated',
        description: 'New payment method set as default.',
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error?.message || 'Failed to update payment method.',
        variant: 'destructive',
      });
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
      toast({
        title: 'Payment method removed',
        description: 'The card has been removed from your account.',
      });
    } catch (error: any) {
      toast({
        title: 'Remove failed',
        description: error?.message || 'Failed to remove payment method.',
        variant: 'destructive',
      });
    } finally {
      setPaymentActionId(null);
    }
  };

  const getStatusBadge = (status?: SubscriptionStatus) => {
    const colors: Record<SubscriptionStatus, string> = {
      [SubscriptionStatus.TRIALING]: 'bg-blue-100 text-blue-800',
      [SubscriptionStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [SubscriptionStatus.PAST_DUE]: 'bg-yellow-100 text-yellow-800',
      [SubscriptionStatus.CANCELED]: 'bg-red-100 text-red-800',
      [SubscriptionStatus.UNPAID]: 'bg-orange-100 text-orange-800',
      [SubscriptionStatus.INCOMPLETE]: 'bg-gray-100 text-gray-800',
    };

    if (!status) return null;

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status]}`}>
        {status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')}
      </span>
    );
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '-';
    // Backend already sends timestamps in milliseconds
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateUsagePercentage = (used: number, limit: number) => {
    if (!limit || limit === -1) return 0; // unlimited or no limit
    return Math.min(Math.round((used / limit) * 100), 100);
  };

  const getDaysRemaining = () => {
    if (!subscription?.current_period_end) return null;
    const endDate = new Date(subscription.current_period_end);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

    if (diffDays > 1) return `${diffDays} days`;
    if (diffHours > 1) return `${diffHours} hours`;
    return 'less than 1 hour';
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl animate-fade-up">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-slate-900">Billing & Subscription</h1>
          <p className="mt-2 text-slate-600">Manage your subscription, usage, and billing information.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Current Plan */}
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-100/70 blur-3xl" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              Current plan
            </CardTitle>
            <CardDescription>Your active subscription and weekly limits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {planDetails ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-slate-500">Plan</p>
                    <p className="text-2xl font-semibold text-slate-900">{planDetails.name}</p>
                    <div className="mt-2 flex flex-wrap items-baseline gap-2">
                      <span className="text-sm text-slate-400 line-through">{priceDisplay?.original}</span>
                      <span className="text-3xl font-semibold text-slate-900">{priceDisplay?.current}</span>
                      <span className="text-sm text-slate-500">{priceDisplay?.cadence}</span>
                    </div>
                  </div>
                  {getStatusBadge(isCanceling ? SubscriptionStatus.CANCELED : status)}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {planHighlights.map((item) => (
                    <div key={item.label} className="rounded-lg border border-emerald-100/70 bg-white/80 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                      <p className="text-sm font-semibold text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>

                {subscription?.current_period_start && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-600">
                    Current period: {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                  </div>
                )}

                {isCanceling && subscription?.current_period_end && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
                    Subscription will end in {getDaysRemaining()} (on {formatDate(subscription.current_period_end)}).
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {status === SubscriptionStatus.CANCELED || subscription?.cancel_at_period_end ? (
                    <Button onClick={() => router.push('/dashboard/billing/plans')}>
                      Reactivate plan
                    </Button>
                  ) : (
                    <>
                      <Button onClick={() => router.push('/dashboard/billing/plans')}>
                        Manage plan
                      </Button>
                      <Button onClick={() => setShowCancelDialog(true)} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                        Cancel plan
                      </Button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">No active subscription</p>
                <Button onClick={() => router.push('/dashboard/billing/plans')}>
                  Choose a plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-20 top-10 h-32 w-32 rounded-full bg-emerald-100/60 blur-3xl" />
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                Payment methods
              </CardTitle>
              <CardDescription>Manage how your subscription is billed.</CardDescription>
            </div>
            <Button size="sm" onClick={() => router.push('/dashboard/billing/payment-method')}>
              Add new card
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {displayPaymentMethods.length ? (
              <div className="space-y-3">
                {displayPaymentMethods.map((method) => {
                  const isDefault = method.is_default || method.id === defaultPaymentMethodId;
                  return (
                    <div
                      key={method.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-100/70 bg-white/85 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-12 rounded-md bg-emerald-50 flex items-center justify-center text-emerald-700">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              {(method.brand || 'Card').toUpperCase()}
                            </p>
                            {isDefault && (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600">
                            **** **** **** {method.last4 || '----'}
                            {method.exp_month && method.exp_year ? `  -  exp ${method.exp_month}/${method.exp_year}` : ''}
                          </p>
                        </div>
                      </div>
                      {canEditPaymentMethods && (
                        <div className="flex flex-wrap items-center gap-2">
                          {!isDefault && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMakeDefault(method.id)}
                              disabled={paymentActionId === method.id}
                            >
                              Make default
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteClick(method)}
                            disabled={!canRemovePaymentMethods || paymentActionId === method.id}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {!canRemovePaymentMethods && canEditPaymentMethods && (
                  <p className="text-xs text-slate-500">
                    You must keep at least one payment method on file.
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">No payment method on file</p>
                <Button onClick={() => router.push('/dashboard/billing/payment-method')}>
                  Add payment method
                </Button>
              </div>
            )}

            <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-700 mt-0.5" />
                <div>
                  <p className="font-semibold">Secure billing</p>
                  <p className="text-emerald-800/80">
                    Card details are encrypted and stored by Stripe. HandyCall never stores full card numbers.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Metrics */}
      {usage && planDetails && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Current Week Usage</CardTitle>
            <CardDescription>
              Your usage for the current billing period ({usage.period_start ? formatDate(usage.period_start) : 'N/A'} - {usage.period_end ? formatDate(usage.period_end) : 'N/A'})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {/* Call Minutes */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Call Minutes</span>
                  <span className="text-sm text-gray-600">
                    {usage.call_minutes || 0} / {planLimits?.minutes === -1 ? 'Unlimited' : planLimits?.minutes ?? 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      calculateUsagePercentage(usage.call_minutes || 0, planLimits?.minutes || 0) >= 90
                        ? 'bg-red-500'
                        : calculateUsagePercentage(usage.call_minutes || 0, planLimits?.minutes || 0) >= 75
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${calculateUsagePercentage(usage.call_minutes || 0, planLimits?.minutes || 0)}%` }}
                  ></div>
                </div>
              </div>

              {/* SMS */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">SMS Messages</span>
                  <span className="text-sm text-gray-600">
                    {usage.sms_count || 0} / {planLimits?.sms === -1 ? 'Unlimited' : planLimits?.sms ?? 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      calculateUsagePercentage(usage.sms_count || 0, planLimits?.sms || 0) >= 90
                        ? 'bg-red-500'
                        : calculateUsagePercentage(usage.sms_count || 0, planLimits?.sms || 0) >= 75
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${calculateUsagePercentage(usage.sms_count || 0, planLimits?.sms || 0)}%` }}
                  ></div>
                </div>
              </div>

              {/* Contacts */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Active Contacts</span>
                  <span className="text-sm text-gray-600">
                    {usage.active_contacts || 0} / {planLimits?.contacts === -1 ? 'Unlimited' : planLimits?.contacts ?? 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      calculateUsagePercentage(usage.active_contacts || 0, planLimits?.contacts || 0) >= 90
                        ? 'bg-red-500'
                        : calculateUsagePercentage(usage.active_contacts || 0, planLimits?.contacts || 0) >= 75
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${calculateUsagePercentage(usage.active_contacts || 0, planLimits?.contacts || 0)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/billing/plans')}>
          <CardHeader>
            <CardTitle className="text-lg">View All Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Compare plans and upgrade your subscription</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/billing/invoices')}>
          <CardHeader>
            <CardTitle className="text-lg">Invoice History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">View and download past invoices</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/billing/payment-method')}>
          <CardHeader>
            <CardTitle className="text-lg">Payment Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Update your payment information</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove payment method</DialogTitle>
            <DialogDescription>
              This card will be removed from your account. You must keep at least one active payment method.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={paymentActionId === deleteTarget?.id}>
              Keep card
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={paymentActionId === deleteTarget?.id}
            >
              {paymentActionId === deleteTarget?.id ? 'Removing...' : 'Remove card'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription? Your plan will remain active until the end of the current billing period ({formatDate(subscription?.current_period_end)}), and you'll retain full access until then.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)} disabled={cancelling}>
              Keep Subscription
            </Button>
            <Button variant="destructive" onClick={handleCancelSubscription} disabled={cancelling}>
              {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
