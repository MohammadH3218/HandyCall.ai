'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/portal/page-header';
import { apiClient } from '@/lib/api-client';

type Payment = {
  payment_id: string;
  contact_id?: string;
  customer_name?: string;
  service_name?: string;
  amount_cents: number;
  currency: string;
  payment_type: string;
  payment_status: string;
  created_at: number;
};

function formatMoney(cents: number, currency = 'usd') {
  const amount = Number(cents || 0) / 100;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatDate(ts?: number) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const start = dateFrom ? new Date(`${dateFrom}T00:00:00Z`).getTime() : undefined;
      const end = dateTo ? new Date(`${dateTo}T23:59:59Z`).getTime() : undefined;
      const [paymentsRes, statsRes] = await Promise.all([
        apiClient.getCustomerPayments({
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          type: typeFilter !== 'ALL' ? typeFilter : undefined,
          start,
          end,
          limit: 200,
        }),
        apiClient.getCustomerPaymentStats({ start, end }),
      ]);
      setPayments((paymentsRes?.payments || []) as Payment[]);
      setStats(statsRes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [statusFilter, typeFilter]);

  const filtered = useMemo(() => {
    const start = dateFrom ? new Date(`${dateFrom}T00:00:00Z`).getTime() : null;
    const end = dateTo ? new Date(`${dateTo}T23:59:59Z`).getTime() : null;
    return payments.filter((payment) => {
      if (start !== null && payment.created_at < start) return false;
      if (end !== null && payment.created_at > end) return false;
      return true;
    });
  }, [payments, dateFrom, dateTo]);

  const exportCsv = () => {
    const header = ['Date', 'Customer', 'Service', 'Amount', 'Type', 'Status'];
    const rows = filtered.map((payment) => [
      formatDate(payment.created_at),
      payment.customer_name || '',
      payment.service_name || '',
      formatMoney(payment.amount_cents, payment.currency),
      payment.payment_type || '',
      payment.payment_status || '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payments-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payments"
        title="Customer payments"
        subtitle="Track revenue, statuses, and payment activity from your booking flow."
        actions={
          <Button variant="outline" onClick={exportCsv}>
            Export CSV
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total revenue" value={formatMoney(Number(stats?.total_revenue_cents || 0), 'usd')} />
        <StatCard label="This month" value={formatMoney(Number(stats?.this_month_revenue_cents || 0), 'usd')} />
        <StatCard label="Successful" value={String(stats?.successful_payments || 0)} />
        <StatCard label="Avg ticket" value={formatMoney(Number(stats?.average_ticket_cents || 0), 'usd')} />
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value="ALL">All statuses</option>
            <option value="SUCCEEDED">Succeeded</option>
            <option value="PROCESSING">Processing</option>
            <option value="REQUIRES_PAYMENT_METHOD">Requires payment method</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELED">Canceled</option>
            <option value="REFUNDED">Refunded</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value="ALL">All types</option>
            <option value="BOOKING">Booking</option>
            <option value="MANUAL">Manual</option>
            <option value="DEPOSIT">Deposit</option>
          </select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Button onClick={() => void load()} disabled={loading}>
            {loading ? 'Loading...' : 'Apply filters'}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>Loading payments…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>No payments found.</td>
                </tr>
              ) : (
                filtered.map((payment) => (
                  <tr key={payment.payment_id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{formatDate(payment.created_at)}</td>
                    <td className="px-4 py-3">
                      {payment.contact_id ? (
                        <Link href={`/dashboard/customers?contact=${payment.contact_id}`} className="font-medium text-emerald-700 hover:text-emerald-600">
                          {payment.customer_name || 'Customer'}
                        </Link>
                      ) : (
                        payment.customer_name || 'Customer'
                      )}
                    </td>
                    <td className="px-4 py-3">{payment.service_name || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatMoney(payment.amount_cents, payment.currency)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {payment.payment_type || 'BOOKING'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        {payment.payment_status || 'UNKNOWN'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

