'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconArrowLeft, IconExternalLink, IconFileInvoice } from '@tabler/icons-react';
import { apiClient } from '@/lib/api-client';

type Invoice = {
  id?: string;
  invoice_id?: string;
  number?: string;
  status?: string;
  amount_due?: number;
  amount_paid?: number;
  total?: number;
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
  if (!ts) return '';
  return new Date(ts < 10_000_000_000 ? ts * 1000 : ts).toLocaleDateString('en-SA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ProBillingInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .getBillingInvoices()
      .then((data) => setInvoices(Array.isArray(data) ? data : []))
      .catch((err: any) => setError(err?.message || 'Failed to load invoices.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <Link
            href="/pro/dashboard/billing"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <IconArrowLeft className="h-4 w-4" stroke={1.8} />
            Billing
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="mt-1 text-sm text-slate-500">Review monthly HandyCall billing history.</p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-16 text-center">
              <IconFileInvoice className="mx-auto mb-3 h-10 w-10 text-slate-200" stroke={1.5} />
              <p className="text-sm font-medium text-slate-500">No invoices yet.</p>
              <p className="mt-1 text-xs text-slate-400">Invoices will appear after billing runs.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {invoices.map((invoice) => (
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
                  <div className="flex items-center gap-4 text-right">
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
        </div>
      </div>
    </div>
  );
}
