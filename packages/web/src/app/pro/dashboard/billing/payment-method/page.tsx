'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { IconArrowLeft, IconCreditCard, IconShieldCheck } from '@tabler/icons-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

function PaymentMethodForm() {
  const stripe = useStripe();
  const elements = useElements();
  const { checkAuth } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    try {
      setSaving(true);
      setError(null);
      const { error: stripeError, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      });

      if (stripeError) throw new Error(stripeError.message);
      if (!setupIntent?.payment_method) throw new Error('No payment method returned from Stripe');

      await apiClient.updatePaymentMethod(setupIntent.payment_method as string);
      await checkAuth().catch(() => undefined);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to save payment method.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-slate-200 p-4">
        <PaymentElement />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Payment method saved.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={!stripe || saving || success}
          className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save payment method'}
        </button>
        <Link
          href="/pro/dashboard/billing"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Back to Billing
        </Link>
      </div>
    </form>
  );
}

export default function ProPaymentMethodPage() {
  const { company } = useAuthStore();
  const [publishableKey, setPublishableKey] = useState<string | null>(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null
  );
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    if (publishableKey && !publishableKey.includes('local_dev_placeholder') && !publishableKey.endsWith('_xxx')) {
      return;
    }
    apiClient
      .getBillingConfig()
      .then((config) => {
        if (config?.publishable_key) setPublishableKey(config.publishable_key);
      })
      .catch(() => undefined);
  }, [publishableKey]);

  useEffect(() => {
    if (!publishableKey || publishableKey.includes('local_dev_placeholder') || publishableKey.endsWith('_xxx')) {
      return;
    }

    let mounted = true;
    setSetupError(null);
    apiClient
      .createSetupIntent()
      .then((result) => {
        if (mounted) setClientSecret(result.client_secret);
      })
      .catch((err: any) => {
        if (mounted) setSetupError(err?.message || 'Unable to initialize payment form.');
      });

    return () => {
      mounted = false;
    };
  }, [publishableKey]);

  const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <Link
            href="/pro/dashboard/billing"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <IconArrowLeft className="h-4 w-4" stroke={1.8} />
            Billing
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Payment method</h1>
          <p className="mt-1 text-sm text-slate-500">
            {company?.payment_method_last4
              ? `Current card ending in ${company.payment_method_last4}.`
              : 'Add a card for monthly billing and auto-pay.'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <IconCreditCard className="h-5 w-5" stroke={1.7} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Secure card setup</h2>
              <p className="text-xs text-slate-500">Processed by Stripe. HandyCall never stores full card details.</p>
            </div>
          </div>

          {!stripePromise ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Stripe publishable key is not configured.
            </div>
          ) : setupError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {setupError}
            </div>
          ) : !clientSecret ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Initializing secure payment form...
            </div>
          ) : (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentMethodForm />
            </Elements>
          )}

          <div className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            <IconShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" stroke={1.7} />
            <p>Auto-pay becomes available on the Billing page after a default card is saved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
