'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  IconCalendarDollar,
  IconCreditCard,
  IconFileInvoice,
  IconReceipt,
  IconShieldCheck,
} from '@tabler/icons-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type Invoice = {
  id?: string;
  invoice_id?: string;
  number?: string;
  status?: string;
  amount_due?: number;
  amount_paid?: number;
  total?: number;
  currency?: string;
  hosted_invoice_url?: string;
  created?: number;
  created_at?: number;
};

function formatSar(amount?: number) {
  if (!amount) return 'SAR 0.00';
  const value = amount > 1000 ? amount / 100 : amount;
  return `SAR ${value.toFixed(2)}`;
}

function formatDate(ts?: number) {
  if (!ts) return 'Not scheduled';
  return new Date(ts < 10_000_000_000 ? ts * 1000 : ts).toLocaleDateString('en-SA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ProBillingManagementPage() {
  const { company } = useAuthStore();
  const [subscription, setSubscription] = useState<any | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [subResult, methodsResult, invoicesResult] = await Promise.allSettled([
          apiClient.getMySubscription(),
          apiClient.getPaymentMethods(),
          apiClient.getBillingInvoices(),
        ]);

        if (subResult.status === 'fulfilled') setSubscription(subResult.value);
        if (methodsResult.status === 'fulfilled') {
          const raw = methodsResult.value;
          const methods = Array.isArray(raw) ? raw : raw?.payment_methods || raw?.methods || [];
          setPaymentMethods(methods);
        }
        if (invoicesResult.status === 'fulfilled') {
          setInvoices(Array.isArray(invoicesResult.value) ? invoicesResult.value : []);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load billing details.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const defaultPaymentMethod = useMemo(
    () => paymentMethods.find((method) => method.is_default) || paymentMethods[0],
    [paymentMethods]
  );

  useEffect(() => {
    const hasSavedCard = Boolean(defaultPaymentMethod || company?.payment_method_last4);
    const canceling = Boolean(subscription?.cancel_at_period_end || company?.cancel_at_period_end);
    setAutoPayEnabled(hasSavedCard && !canceling);
  }, [company, defaultPaymentMethod, subscription]);

  const plan =
    subscription?.subscription_plan ||
    company?.subscription_plan ||
    company?.subscription_tier ||
    'No active plan';
  const status = subscription?.subscription_status || company?.subscription_status || 'Not active';
  const nextBillingDate =
    subscription?.current_period_end ||
    subscription?.trial_ends_at ||
    company?.current_period_end ||
    company?.trial_ends_at;
  const cardBrand = defaultPaymentMethod?.card?.brand || company?.payment_method_brand || 'Card';
  const cardLast4 = defaultPaymentMethod?.card?.last4 || company?.payment_method_last4;
  const recentInvoices = invoices.slice(0, 4);

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your HandyCall subscription, payment method, invoices, and monthly auto-pay.
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <BillingCard
              icon={<IconCalendarDollar className="h-4 w-4" stroke={1.6} />}
              label="Monthly plan"
              title={String(plan).replaceAll('_', ' ')}
              detail={`Status: ${String(status).replaceAll('_', ' ').toLowerCase()}`}
            />
            <BillingCard
              icon={<IconCreditCard className="h-4 w-4" stroke={1.6} />}
              label="Payment method"
              title={cardLast4 ? `${cardBrand} ending ${cardLast4}` : 'No card saved'}
              detail={cardLast4 ? 'Used for subscription and monthly charges' : 'Add a card to enable auto-pay'}
            />
            <BillingCard
              icon={<IconFileInvoice className="h-4 w-4" stroke={1.6} />}
              label="Next bill"
              title={formatDate(nextBillingDate)}
              detail={autoPayEnabled ? 'Auto-pay is ready' : 'Auto-pay needs a saved card'}
            />
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Payment method</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Save a default card so monthly plan invoices and lead-fee balances can be handled
                  automatically.
                </p>
              </div>
              <IconShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" stroke={1.7} />
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Default card
              </p>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {cardLast4 ? `${cardBrand} ending ${cardLast4}` : 'No payment method on file'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {cardLast4
                  ? 'This card will be charged when auto-pay is on.'
                  : 'Add a payment method before turning on auto-pay.'}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/pro/dashboard/billing/payment-method"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                {cardLast4 ? 'Update payment method' : 'Add payment method'}
              </Link>
              <Link
                href="/pro/dashboard/billing/leads"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                View lead fees
              </Link>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Auto-pay</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Monthly subscription invoices are paid automatically when a default card is saved.
                </p>
              </div>
              <button
                type="button"
                disabled
                className={`relative h-7 w-12 rounded-full transition ${
                  autoPayEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                } disabled:cursor-not-allowed disabled:opacity-50`}
                aria-pressed={autoPayEnabled}
                aria-label="Toggle auto-pay"
              >
                <span
                  className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                    autoPayEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                {autoPayEnabled ? 'Auto-pay is on' : 'Auto-pay is off'}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {cardLast4
                  ? 'Your saved card will be used for monthly billing.'
                  : 'Add a default payment method to enable monthly auto-pay.'}
              </p>
            </div>
          </section>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Recent invoices</h2>
            <Link
              href="/pro/dashboard/billing/invoices"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              View all
            </Link>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="py-14 text-center">
              <IconReceipt className="mx-auto mb-3 h-10 w-10 text-slate-200" stroke={1.5} />
              <p className="text-sm font-medium text-slate-500">No invoices yet.</p>
              <p className="mt-1 text-xs text-slate-400">Monthly invoices will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentInvoices.map((invoice) => (
                <div
                  key={invoice.id || invoice.invoice_id || invoice.number}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {invoice.number || invoice.id || 'Invoice'}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatDate(invoice.created || invoice.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatSar(invoice.amount_paid || invoice.amount_due || invoice.total)}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      {invoice.status || 'Invoice'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function BillingCard({
  detail,
  icon,
  label,
  title,
}: {
  detail: string;
  icon: React.ReactNode;
  label: string;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </div>
      <p className="mt-3 truncate text-xl font-bold capitalize text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  );
}
