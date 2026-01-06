'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { SubscriptionPlan, SubscriptionStatus } from '@handycall/shared';

const PLAN_DETAILS = {
  [SubscriptionPlan.STARTER]: {
    name: 'Starter',
    price: '$9.99',
    limits: {
      minutes: 50,
      sms: 100,
      contacts: 200,
    },
  },
  [SubscriptionPlan.PRO]: {
    name: 'Pro',
    price: '$19.99',
    limits: {
      minutes: 150,
      sms: 300,
      contacts: 500,
    },
  },
  [SubscriptionPlan.MAX]: {
    name: 'Max',
    price: '$39.99',
    limits: {
      minutes: 500,
      sms: 1000,
      contacts: -1, // unlimited
    },
  },
};

export default function BillingPage() {
  const router = useRouter();
  const { company } = useAuthStore();
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const [subData, usageData] = await Promise.all([
        apiClient.getMySubscription(),
        apiClient.getUsageMetrics(),
      ]);
      setSubscription(subData);
      setUsage(usageData);
    } catch (error: any) {
      console.error('Failed to load billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status?: SubscriptionStatus) => {
    const colors = {
      [SubscriptionStatus.TRIALING]: 'bg-blue-100 text-blue-800',
      [SubscriptionStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [SubscriptionStatus.PAST_DUE]: 'bg-yellow-100 text-yellow-800',
      [SubscriptionStatus.CANCELED]: 'bg-red-100 text-red-800',
      [SubscriptionStatus.INCOMPLETE]: 'bg-gray-100 text-gray-800',
    };

    if (!status) return null;

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')}
      </span>
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // unlimited
    return Math.min(Math.round((used / limit) * 100), 100);
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

  const currentPlan = company?.subscription_plan || subscription?.plan;
  const planDetails = currentPlan ? PLAN_DETAILS[currentPlan] : null;
  const status = company?.subscription_status || subscription?.status;

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="mt-2 text-gray-600">Manage your subscription, usage, and billing information</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Your active subscription details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {planDetails ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{planDetails.name} Plan</p>
                    <p className="text-gray-600">{planDetails.price}/week</p>
                  </div>
                  {getStatusBadge(status)}
                </div>

                {subscription?.current_period_start && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600">Current period</p>
                    <p className="text-sm font-medium">
                      {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                    </p>
                  </div>
                )}

                {subscription?.cancel_at_period_end && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      Your subscription will cancel at the end of the current billing period.
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button onClick={() => router.push('/dashboard/billing/plans')} className="flex-1">
                    Change Plan
                  </Button>
                  <Button onClick={() => router.push('/dashboard/billing/payment-method')} variant="outline">
                    Payment Method
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No active subscription</p>
                <Button onClick={() => router.push('/dashboard/billing/plans')}>
                  Choose a Plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>Your billing payment details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {company?.payment_method_last4 ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-xs font-semibold text-gray-600">
                      {company.payment_method_brand?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">•••• •••• •••• {company.payment_method_last4}</p>
                    <p className="text-sm text-gray-600">
                      {company.payment_method_brand || 'Card'} ending in {company.payment_method_last4}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => router.push('/dashboard/billing/payment-method')}
                  variant="outline"
                  className="w-full"
                >
                  Update Payment Method
                </Button>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No payment method on file</p>
                <Button onClick={() => router.push('/dashboard/billing/payment-method')}>
                  Add Payment Method
                </Button>
              </div>
            )}
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
                    {usage.call_minutes || 0} / {planDetails.limits.minutes === -1 ? '∞' : planDetails.limits.minutes}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      calculateUsagePercentage(usage.call_minutes || 0, planDetails.limits.minutes) >= 90
                        ? 'bg-red-500'
                        : calculateUsagePercentage(usage.call_minutes || 0, planDetails.limits.minutes) >= 75
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${calculateUsagePercentage(usage.call_minutes || 0, planDetails.limits.minutes)}%` }}
                  ></div>
                </div>
              </div>

              {/* SMS */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">SMS Messages</span>
                  <span className="text-sm text-gray-600">
                    {usage.sms_count || 0} / {planDetails.limits.sms === -1 ? '∞' : planDetails.limits.sms}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      calculateUsagePercentage(usage.sms_count || 0, planDetails.limits.sms) >= 90
                        ? 'bg-red-500'
                        : calculateUsagePercentage(usage.sms_count || 0, planDetails.limits.sms) >= 75
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${calculateUsagePercentage(usage.sms_count || 0, planDetails.limits.sms)}%` }}
                  ></div>
                </div>
              </div>

              {/* Contacts */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Active Contacts</span>
                  <span className="text-sm text-gray-600">
                    {usage.active_contacts || 0} / {planDetails.limits.contacts === -1 ? '∞' : planDetails.limits.contacts}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      calculateUsagePercentage(usage.active_contacts || 0, planDetails.limits.contacts) >= 90
                        ? 'bg-red-500'
                        : calculateUsagePercentage(usage.active_contacts || 0, planDetails.limits.contacts) >= 75
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${calculateUsagePercentage(usage.active_contacts || 0, planDetails.limits.contacts)}%` }}
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
    </div>
  );
}
