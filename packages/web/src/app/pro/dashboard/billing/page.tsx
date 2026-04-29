'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  IconCalendarDollar,
  IconCreditCard,
  IconExternalLink,
  IconFileInvoice,
  IconReceipt,
  IconShieldCheck,
} from '@tabler/icons-react';
import { apiClient } from '@/lib/api-client';

type Invoice = {
  id?: string;
  invoice_id?: string;
  number?: string;
  status?: string;
  amount_due?: number;
  amount_paid?: number;
  total?: number;
  currency?: string;
  hosted_invoice_url?: string | null;
  created_at?: number;
};

function formatSar(amount?: number) {
  const value = Number(amount || 0) / 100;
  return `SAR ${value.toFixed(2)}`;
}

function formatDate(ts?: number) {
  if (!ts) return 'Not scheduled';
  return new Date(ts).toLocaleDateString('en-SA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ProBillingManagementPage() {
  const [overview, setOverview] = useState<any | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [overviewResult, methodsResult, invoicesResult] = await Promise.allSettled([
        apiClient.getMySubscription(),
        apiClient.getPaymentMethods(),
        apiClient.getBillingInvoices(),
      ]);

      if (overviewResult.status === 'fulfilled') setOverview(overviewResult.value);
      if (methodsResult.status === 'fulfilled') {
        const raw = methodsResult.value;
        setPaymentMethods(Array.isArray(raw) ? raw : raw?.payment_methods || raw?.methods || []);
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

  useEffect(() => {
    void load();
  }, []);

  const defaultPaymentMethod = useMemo(
    () => paymentMethods.find((method) => method.is_default) || paymentMethods[0],
    [paymentMethods]
  );
  const recentInvoices = invoices.slice(0, 4);
  const cardBrand = defaultPaymentMethod?.card?.brand || 'Card';
  const cardLast4 = defaultPaymentMethod?.card?.last4;
  const balanceHalalas = Number(overview?.balance_halalas || 0);

  async function createInvoice() {
    try {
      setActionLoading(true);
      setError(null);
      setNotice(null);
      const result = await apiClient.createCurrentBillingInvoice();
      const invoice = result?.invoice || result;
      if (invoice?.hosted_invoice_url) {
        window.open(invoice.hosted_invoice_url, '_blank', 'noopener,noreferrer');
      }
      setNotice(result?.reused ? 'Existing open Moyasar invoice opened.' : 'Moyasar invoice created.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Unable to create Moyasar invoice.');
    } finally {
      setActionLoading(false);
    }
  }

  async function paySavedCard() {
    try {
      setActionLoading(true);
      setError(null);
      setNotice(null);
      await apiClient.payCurrentBillingBalance();
      setNotice('Saved-card payment submitted through Moyasar.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Unable to charge saved card.');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track monthly lead fees, pay your Moyasar invoice, and manage saved payment methods.
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-36 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <BillingCard
              icon={<IconCalendarDollar className="h-4 w-4" stroke={1.6} />}
              label="Balance due"
              title={formatSar(balanceHalalas)}
              detail={`${overview?.unpaid_lead_count || 0} unpaid lead fee${overview?.unpaid_lead_count === 1 ? '' : 's'}`}
            />
            <BillingCard
              icon={<IconCreditCard className="h-4 w-4" stroke={1.6} />}
              label="Default method"
              title={cardLast4 ? `${cardBrand} ${cardLast4}` : 'No saved card'}
              detail={cardLast4 ? 'Available for Moyasar token billing' : 'Saved after a paid invoice returns a token'}
            />
            <BillingCard
              icon={<IconFileInvoice className="h-4 w-4" stroke={1.6} />}
              label="Period ends"
              title={formatDate(overview?.current_period_end)}
              detail={overview?.subscription_status === 'CURRENT' ? 'Account is current' : 'Monthly balance is due'}
            />
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Monthly lead-fee balance</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Lead fees are added when you claim open jobs or accept direct marketplace
                  requests from customers in Riyadh.
                </p>
              </div>
              <IconShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" stroke={1.7} />
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Current amount due
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{formatSar(balanceHalalas)}</p>
              <p className="mt-1 text-sm text-slate-500">
                Pay this balance with a secure Moyasar invoice link.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void createInvoice()}
                disabled={actionLoading || balanceHalalas < 100}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconExternalLink className="h-4 w-4" stroke={1.8} />
                {actionLoading ? 'Preparing...' : 'Pay with Moyasar'}
              </button>
              <button
                type="button"
                onClick={() => void paySavedCard()}
                disabled={actionLoading || !cardLast4 || balanceHalalas < 100}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Charge saved card
              </button>
              <Link
                href="/pro/dashboard/billing/leads"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                View lead fees
              </Link>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Payment method</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  HandyCall stores only Moyasar token details and masked card metadata.
                </p>
              </div>
              <IconCreditCard className="h-5 w-5 shrink-0 text-emerald-600" stroke={1.7} />
            </div>

            <div className="mt-5 rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                {cardLast4 ? `${cardBrand} ending ${cardLast4}` : 'No saved card yet'}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {cardLast4
                  ? 'This token can be used for future monthly lead-fee balance payments.'
                  : 'After a successful Moyasar payment with tokenization enabled, the card token will appear here.'}
              </p>
            </div>

            <Link
              href="/pro/dashboard/billing/payment-method"
              className="mt-5 inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Manage methods
            </Link>
          </section>
        </div>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
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
              <p className="mt-1 text-xs text-slate-400">Monthly Moyasar invoices will appear here.</p>
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
                      {formatDate(invoice.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatSar(invoice.amount_paid || invoice.amount_due || invoice.total)}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        {invoice.status || 'Invoice'}
                      </p>
                    </div>
                    {invoice.hosted_invoice_url ? (
                      <a
                        href={invoice.hosted_invoice_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                        aria-label="Open invoice"
                      >
                        <IconExternalLink className="h-4 w-4" stroke={1.8} />
                      </a>
                    ) : null}
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
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </div>
      <p className="mt-3 truncate text-xl font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  );
}
