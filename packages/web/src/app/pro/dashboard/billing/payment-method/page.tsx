'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  IconArrowLeft,
  IconCreditCard,
  IconExternalLink,
  IconShieldCheck,
  IconTrash,
} from '@tabler/icons-react';
import { apiClient } from '@/lib/api-client';

type PaymentMethod = {
  method_id: string;
  id?: string;
  is_default?: boolean;
  card?: {
    brand?: string;
    last4?: string;
  };
  created_at?: number;
};

function formatDate(ts?: number) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-SA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ProPaymentMethodPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const raw = await apiClient.getPaymentMethods();
      setMethods(Array.isArray(raw) ? raw : raw?.payment_methods || raw?.methods || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load payment methods.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  async function setDefault(methodId: string) {
    try {
      setActionLoading(true);
      setError(null);
      await apiClient.setDefaultPaymentMethod(methodId);
      setNotice('Default payment method updated.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Unable to update default payment method.');
    } finally {
      setActionLoading(false);
    }
  }

  async function remove(methodId: string) {
    try {
      setActionLoading(true);
      setError(null);
      await apiClient.deletePaymentMethod(methodId);
      setNotice('Payment method removed.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Unable to remove payment method.');
    } finally {
      setActionLoading(false);
    }
  }

  async function createInvoice() {
    try {
      setActionLoading(true);
      setError(null);
      const result = await apiClient.createCurrentBillingInvoice();
      const invoice = result?.invoice || result;
      if (invoice?.hosted_invoice_url) {
        window.open(invoice.hosted_invoice_url, '_blank', 'noopener,noreferrer');
      }
      setNotice('Moyasar invoice opened. A tokenized card can be saved after payment.');
    } catch (err: any) {
      setError(err?.message || 'Unable to create Moyasar invoice.');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <Link
            href="/pro/dashboard/billing"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <IconArrowLeft className="h-4 w-4" stroke={1.8} />
            Billing
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Payment methods</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage Moyasar tokenized cards used for monthly lead-fee billing.
          </p>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        ) : null}

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <IconCreditCard className="h-5 w-5" stroke={1.7} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Saved Moyasar cards</h2>
              <p className="text-xs text-slate-500">Full card details are never stored by HandyCall.</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : methods.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">No saved card yet</p>
              <p className="mt-1 leading-6">
                Pay your current balance through Moyasar. When Moyasar returns a reusable card token,
                it will appear here for future monthly payments.
              </p>
              <button
                type="button"
                onClick={() => void createInvoice()}
                disabled={actionLoading}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconExternalLink className="h-4 w-4" stroke={1.8} />
                Open Moyasar invoice
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {methods.map((method) => {
                const methodId = method.method_id || method.id || '';
                return (
                  <div key={methodId} className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {method.card?.brand || 'Card'} ending {method.card?.last4 || '----'}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {method.is_default ? 'Default method' : 'Saved method'}
                        {method.created_at ? ` · added ${formatDate(method.created_at)}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {!method.is_default ? (
                        <button
                          type="button"
                          onClick={() => void setDefault(methodId)}
                          disabled={actionLoading}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          Make default
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void remove(methodId)}
                        disabled={actionLoading}
                        className="rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        aria-label="Remove payment method"
                      >
                        <IconTrash className="h-4 w-4" stroke={1.8} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5 flex items-start gap-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
            <IconShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" stroke={1.7} />
            <p>
              Moyasar handles card collection on its hosted checkout page. HandyCall stores masked
              card metadata and the returned token only.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
