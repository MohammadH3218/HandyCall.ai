'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { SubscriptionPlan } from '@handycall/shared';
import { PLAN_CATALOG, getPlanPriceDisplay } from '@/constants/plans';
import { normalizeUsageResponse, resolvePlan, resolvePlanLimits } from '@/lib/billing-utils';
import { AlertTriangle, BarChart3, Clock3, MessageSquare, Users } from 'lucide-react';

type UsageMetrics = {
  period_start?: number;
  period_end?: number;
  call_minutes?: number;
  sms_count?: number;
  active_contacts?: number;
};

export default function UsagePage() {
  const router = useRouter();
  const { company } = useAuthStore();
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan | undefined>(
    company?.subscription_plan as SubscriptionPlan | undefined
  );
  const [planLimits, setPlanLimits] = useState<{ minutes: number; sms: number; contacts: number }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsage();
    const id = window.setInterval(loadUsage, 30000);
    const onVisibility = () => {
      if (!document.hidden) loadUsage();
    };
    window.addEventListener('focus', loadUsage);
    document.addEventListener('visibilitychange', onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', loadUsage);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const loadUsage = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [usageData, subscription] = await Promise.all([
        apiClient.getUsageMetrics(),
        apiClient.getMySubscription().catch((err) => {
          console.warn('Failed to load subscription for usage view', err);
          return null;
        }),
      ]);

      const normalizedPlan =
        resolvePlan(company?.subscription_plan as SubscriptionPlan | undefined) ||
        resolvePlan(subscription?.subscription_plan as SubscriptionPlan | undefined);

      setUsage(normalizeUsageResponse(usageData, subscription));
      const limits = normalizedPlan
        ? resolvePlanLimits(normalizedPlan, usageData?.plan_limits) ||
          PLAN_CATALOG[normalizedPlan].limits
        : undefined;
      setPlanLimits(limits);
      setSubscriptionPlan(normalizedPlan);
    } catch (err: any) {
      console.error('Failed to load usage', err);
      setError(err.message || 'Unable to load usage right now.');
    } finally {
      setIsLoading(false);
    }
  };

  const planDetails = subscriptionPlan ? PLAN_CATALOG[subscriptionPlan] : undefined;
  const priceDisplay = subscriptionPlan ? getPlanPriceDisplay(subscriptionPlan) : undefined;

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    // Backend already sends timestamps in milliseconds
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateUsagePercentage = (used: number, limit?: number) => {
    if (!limit || limit === -1) return 0;
    return Math.min(Math.round((used / limit) * 100), 100);
  };

  const alerts = useMemo(() => {
    if (!planLimits || !usage) return [];
    const warningPoints = [
      {
        label: 'Call minutes',
        percent: calculateUsagePercentage(usage.call_minutes || 0, planLimits.minutes),
      },
      {
        label: 'SMS',
        percent: calculateUsagePercentage(usage.sms_count || 0, planLimits.sms),
      },
      {
        label: 'Contacts',
        percent: calculateUsagePercentage(usage.active_contacts || 0, planLimits.contacts),
      },
    ];
    return warningPoints.filter((item) => item.percent >= 75 && item.percent < 100 && item.percent !== 0);
  }, [planDetails, usage]);

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl space-y-6">
        <div className="h-10 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-32 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Usage unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadUsage}>Try again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl space-y-8 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-display text-slate-900">Usage</h1>
          <p className="text-slate-600">
            Monitor your call, SMS, and contact usage for the current billing period.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/billing/invoices')}>
            Invoices
          </Button>
          <Button onClick={() => router.push('/dashboard/billing')}>Billing</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Current period</CardTitle>
            <CardDescription>
              {usage
                ? `${formatDate(usage.period_start)} - ${formatDate(usage.period_end)}`
                : 'No usage recorded for this period.'}
            </CardDescription>
          </div>
          {planDetails ? (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="text-lg font-semibold">{planDetails.name}</p>
              <p className="text-sm text-muted-foreground">
                <span className="mr-2 line-through">{priceDisplay?.original}</span>
                <span className="font-semibold text-foreground">{priceDisplay?.current}</span>
                <span className="ml-1 text-muted-foreground">{priceDisplay?.cadence}</span>
              </p>
            </div>
          ) : (
            <Button onClick={() => router.push('/dashboard/billing/plans')}>Choose a plan</Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <UsageMeter
              label="Call minutes"
              used={usage?.call_minutes || 0}
              limit={planLimits?.minutes}
              icon={<Clock3 className="h-5 w-5 text-blue-600" />}
              calculateUsagePercentage={calculateUsagePercentage}
              formatUsed={(value) => value.toFixed(2)}
              overageSuffix=" min over limit"
            />
            <UsageMeter
              label="SMS messages"
              used={usage?.sms_count || 0}
              limit={planLimits?.sms}
              icon={<MessageSquare className="h-5 w-5 text-green-600" />}
              calculateUsagePercentage={calculateUsagePercentage}
            />
            <UsageMeter
              label="Active contacts"
              used={usage?.active_contacts || 0}
              limit={planLimits?.contacts}
              icon={<Users className="h-5 w-5 text-purple-600" />}
              calculateUsagePercentage={calculateUsagePercentage}
            />
          </div>
        </CardContent>
      </Card>

      {alerts.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardHeader className="flex flex-row items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-700" />
            <div>
              <CardTitle className="text-lg">Heads up</CardTitle>
              <CardDescription>You are approaching plan limits.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.label} className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-800">{alert.label}</p>
                <span className="text-sm text-gray-700">{alert.percent}% used</span>
              </div>
            ))}
            <div className="pt-2">
              <Button variant="outline" onClick={() => router.push('/dashboard/billing/plans')}>
                Review plans
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Keep your account on track</CardTitle>
            <CardDescription>
              Manage your subscription and payment details to avoid interruptions.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard/billing/payment-method')}>
              Payment method
            </Button>
            <Button onClick={() => router.push('/dashboard/billing')}>Open billing</Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <InfoBlock title="Usage trends" description="Track weekly usage and react before you hit limits." />
          <InfoBlock title="Plan controls" description="Upgrade or downgrade without leaving your dashboard." />
          <InfoBlock title="Invoice history" description="Access and download every invoice in one place." />
        </CardContent>
      </Card>
    </div>
  );
}

function UsageMeter({
  label,
  used,
  limit,
  icon,
  calculateUsagePercentage,
  formatUsed,
  overageSuffix = ' over limit',
}: {
  label: string;
  used: number;
  limit?: number;
  icon: React.ReactNode;
  calculateUsagePercentage: (used: number, limit?: number) => number;
  formatUsed?: (value: number) => string;
  overageSuffix?: string;
}) {
  const percent = calculateUsagePercentage(used, limit);
  const color =
    percent >= 90 ? 'bg-red-500' : percent >= 75 ? 'bg-yellow-500' : 'bg-green-500';

  // Show "0 / 0" when no limit is set (no plan), "Unlimited" when limit is -1 (unlimited plan)
  const limitLabel = limit === undefined ? 'Set a plan' : limit === -1 ? 'Unlimited' : limit;
  const usageDisplay = formatUsed ? formatUsed(used) : `${used}`;
  const overage = typeof limit === 'number' && limit > 0 && used > limit ? used - limit : 0;
  const overageDisplay = formatUsed ? formatUsed(overage) : `${overage}`;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">{icon}</div>
          <div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">Limit: {limitLabel}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-foreground">{usageDisplay}</p>
          {overage > 0 ? (
            <p className="text-xs text-red-600">
              {overageDisplay}
              {overageSuffix}
            </p>
          ) : percent > 0 && limit !== -1 && limit !== undefined ? (
            <p className="text-xs text-muted-foreground">{percent}% used</p>
          ) : null}
        </div>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}

function InfoBlock({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
