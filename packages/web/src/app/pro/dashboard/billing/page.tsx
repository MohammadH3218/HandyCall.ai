'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

declare global {
  interface Window {
    Moyasar?: {
      init: (config: Record<string, any>) => void;
    };
  }
}

const MOYASAR_FORM_JS = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.js';
const MOYASAR_FORM_CSS = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.css';
const MOYASAR_FORM_ID = 'moyasar-pro-billing-form';

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
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [moyasarReady, setMoyasarReady] = useState(false);
  const [formPreparing, setFormPreparing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const verifiedPaymentRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [overviewResult, methodsResult, invoicesResult, configResult] = await Promise.allSettled([
        apiClient.getMySubscription(),
        apiClient.getPaymentMethods(),
        apiClient.getBillingInvoices(),
        apiClient.getBillingConfig(),
      ]);

      if (overviewResult.status === 'fulfilled') setOverview(overviewResult.value);
      if (methodsResult.status === 'fulfilled') {
        const raw = methodsResult.value;
        setPaymentMethods(Array.isArray(raw) ? raw : raw?.payment_methods || raw?.methods || []);
      }
      if (invoicesResult.status === 'fulfilled') {
        setInvoices(Array.isArray(invoicesResult.value) ? invoicesResult.value : []);
      }
      if (configResult.status === 'fulfilled') {
        setPublishableKey(configResult.value?.publishable_key || null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load billing details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('id') || params.get('payment_id');
    if (!paymentId || verifiedPaymentRef.current === paymentId) return;
    verifiedPaymentRef.current = paymentId;

    apiClient
      .verifyBillingPayment(paymentId)
      .then(() => {
        setNotice('Payment received. Your billing balance is being updated.');
        void load();
        window.history.replaceState({}, '', window.location.pathname);
      })
      .catch((err: any) => {
        setError(err?.message || 'Unable to verify Moyasar payment.');
      });
  }, [load]);

  useEffect(() => {
    if (document.querySelector(`link[href="${MOYASAR_FORM_CSS}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = MOYASAR_FORM_CSS;
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    if (window.Moyasar) {
      setMoyasarReady(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${MOYASAR_FORM_JS}"]`);
    if (existing) {
      existing.addEventListener('load', () => setMoyasarReady(true), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = MOYASAR_FORM_JS;
    script.async = true;
    script.onload = () => setMoyasarReady(true);
    script.onerror = () => setError('Unable to load the secure Moyasar payment form.');
    document.body.appendChild(script);
  }, []);

  const defaultPaymentMethod = useMemo(
    () => paymentMethods.find((method) => method.is_default) || paymentMethods[0],
    [paymentMethods]
  );
  const recentInvoices = invoices.slice(0, 4);
  const cardBrand = defaultPaymentMethod?.card?.brand || 'Card';
  const cardLast4 = defaultPaymentMethod?.card?.last4;
  const balanceHalalas = Number(overview?.balance_halalas || 0);

  const renderMoyasarForm = useCallback(
    (invoice: Invoice) => {
      const mount = document.getElementById(MOYASAR_FORM_ID);
      if (!mount || !window.Moyasar || !publishableKey) return;

      mount.innerHTML = '';
      window.Moyasar.init({
        element: `#${MOYASAR_FORM_ID}`,
        amount: invoice.amount_due || invoice.total || balanceHalalas,
        currency: invoice.currency || 'SAR',
        description: 'HandyCall monthly lead-fee balance',
        publishable_api_key: publishableKey,
        callback_url: `${window.location.origin}/pro/dashboard/billing`,
        methods: ['creditcard'],
        fixed_width: false,
        metadata: {
          pro_billing_invoice_id: invoice.invoice_id,
          purpose: 'pro_lead_fees',
        },
        invoice_id: (invoice as any).moyasar_invoice_id,
        credit_card: {
          save_card: true,
        },
      });
    },
    [balanceHalalas, publishableKey],
  );

  useEffect(() => {
    if (!activeInvoice || !moyasarReady || !publishableKey) return;
    renderMoyasarForm(activeInvoice);
  }, [activeInvoice, moyasarReady, publishableKey, renderMoyasarForm]);

  async function prepareInlinePayment() {
    try {
      setActionLoading(true);
      setFormPreparing(true);
      setError(null);
      setNotice(null);
      const result = await apiClient.createCurrentBillingInvoice();
      const invoice = result?.invoice || result;
      setActiveInvoice(invoice);
      setNotice(result?.reused ? 'Secure payment form is ready.' : 'Moyasar invoice prepared.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Unable to prepare Moyasar payment.');
    } finally {
      setActionLoading(false);
      setFormPreparing(false);
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
                Pay this balance securely without leaving HandyCall.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void prepareInlinePayment()}
                disabled={actionLoading || balanceHalalas < 100}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading ? 'Preparing...' : activeInvoice ? 'Refresh payment form' : 'Pay now'}
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

            <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Secure card payment</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Card details are sent directly to Moyasar. HandyCall only receives the payment
                    result and masked card metadata.
                  </p>
                </div>
                <IconShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" stroke={1.7} />
              </div>

              {!publishableKey ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Moyasar publishable key is not configured.
                </div>
              ) : !activeInvoice ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-slate-900">Ready when you are</p>
                  <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                    Start payment to create this month&apos;s invoice and show the secure card form here.
                  </p>
                </div>
              ) : formPreparing || !moyasarReady ? (
                <div className="h-48 animate-pulse rounded-lg bg-slate-100" />
              ) : (
                <div
                  id={MOYASAR_FORM_ID}
                  className="moyasar-embedded-form min-h-[280px]"
                />
              )}
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

      <style jsx global>{`
        .moyasar-embedded-form .mysr-form {
          width: 100% !important;
          max-width: none !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: 0 !important;
          background: transparent !important;
        }

        .moyasar-embedded-form .mysr-form input,
        .moyasar-embedded-form .mysr-form button {
          border-radius: 8px !important;
          font-family: inherit !important;
        }

        .moyasar-embedded-form .mysr-form button[type='submit'],
        .moyasar-embedded-form .mysr-form .mysr-submit {
          background: #059669 !important;
          border-color: #059669 !important;
          box-shadow: none !important;
          min-height: 44px !important;
          font-weight: 700 !important;
        }

        .moyasar-embedded-form .mysr-form button[type='submit']:hover,
        .moyasar-embedded-form .mysr-form .mysr-submit:hover {
          background: #047857 !important;
          border-color: #047857 !important;
        }

        .moyasar-embedded-form .mysr-form .mysr-form-footer,
        .moyasar-embedded-form .mysr-form .mysr-powered-by {
          color: #94a3b8 !important;
        }
      `}</style>
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
