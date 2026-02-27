'use client';

import { useEffect, useState } from 'react';
import { IconCreditCard, IconDownload } from '@tabler/icons-react';

export default function PortalPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: integrate with customer payment API when portal auth is implemented
    setLoading(false);
    setPayments([]);
  }, []);

  const formatCents = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Payment History</h1>
        <p className="mt-1 text-slate-500">View your past charges and download receipts.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div className="h-5 w-40 rounded bg-slate-200" />
                <div className="h-5 w-16 rounded bg-slate-100" />
              </div>
              <div className="mt-2 h-4 w-32 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <IconCreditCard className="mx-auto h-10 w-10 text-slate-300" stroke={1.5} />
          <p className="mt-4 font-medium text-slate-900">No payments yet</p>
          <p className="mt-1 text-sm text-slate-500">Your payment history will appear here after you book a service.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 text-left font-medium text-slate-500">Date</th>
                <th className="px-5 py-3 text-left font-medium text-slate-500">Description</th>
                <th className="px-5 py-3 text-right font-medium text-slate-500">Amount</th>
                <th className="px-5 py-3 text-right font-medium text-slate-500">Status</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 text-slate-500">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-900">{p.description || 'Service payment'}</td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-900">
                    {formatCents(p.amount_cents)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      p.status === 'paid' ? 'border border-emerald-100 bg-emerald-50 text-emerald-700' : 'border border-amber-100 bg-amber-50 text-amber-700'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-2 py-4">
                    {p.receipt_url && (
                      <a href={p.receipt_url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-emerald-600">
                        <IconDownload className="h-4 w-4" stroke={1.5} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
