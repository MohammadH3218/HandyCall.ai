'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/portal/empty-state';
import { PageHeader } from '@/components/portal/page-header';
import { apiClient } from '@/lib/api-client';
import { IconArrowUpRight, IconCoin, IconReceipt, IconTrendingUp } from '@tabler/icons-react';

const CATEGORY_LABELS: Record<string, string> = {
  AC_HVAC: 'AC & HVAC',
  PLUMBING: 'Plumbing',
  ELECTRICAL: 'Electrical',
  PAINTING: 'Painting',
  CLEANING: 'Cleaning',
  PEST_CONTROL: 'Pest Control',
  CARPENTRY: 'Carpentry',
  MOVING: 'Moving',
  APPLIANCE_REPAIR: 'Appliance Repair',
  SATELLITE_DISH: 'Satellite & Dish',
  LANDSCAPING: 'Landscaping',
  GENERAL_HANDYMAN: 'General Handyman',
  OTHER: 'Other',
};

type LeadFeeTransaction = {
  transaction_id: string;
  pro_id: string;
  quote_id: string;
  amount_halalas: number;
  amount_sar: number;
  transaction_type: 'CHARGE' | 'REFUND';
  description: string;
  created_at: number;
};

function extractCategory(description: string): string {
  const match = description.match(/Lead fee [-\u2014] (.+?)(?: job in|$)/);
  if (match?.[1]) {
    const category = match[1].trim();
    return CATEGORY_LABELS[category] ?? category;
  }
  return '-';
}

export default function BillingPage() {
  const [transactions, setTransactions] = useState<LeadFeeTransaction[]>([]);
  const [totalSar, setTotalSar] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiClient.getProLeadFees();
        setTransactions(data?.transactions ?? []);
        setTotalSar(data?.total_charged_sar ?? 0);
      } catch (err: any) {
        setError(err?.message || 'Failed to load billing data.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const thisMonthSar = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return transactions
      .filter((t) => t.transaction_type === 'CHARGE' && t.created_at >= start)
      .reduce((sum, t) => sum + t.amount_sar, 0);
  }, [transactions]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of transactions) {
      if (t.transaction_type !== 'CHARGE') continue;
      const cat = extractCategory(t.description);
      map[cat] = (map[cat] ?? 0) + t.amount_sar;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Lead Fee Billing"
        subtitle="Every time you claim a job from the jobs board, a lead fee is charged. Track your spend here."
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Summary cards */}
      {!loading && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <IconCoin className="h-4 w-4" stroke={1.5} />
              Total spend
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">SAR {totalSar.toFixed(2)}</p>
            <p className="mt-1 text-xs text-slate-400">
              All time · {transactions.filter((t) => t.transaction_type === 'CHARGE').length} jobs
              claimed
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <IconTrendingUp className="h-4 w-4" stroke={1.5} />
              This month
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">SAR {thisMonthSar.toFixed(2)}</p>
            <p className="mt-1 text-xs text-slate-400">
              {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <IconArrowUpRight className="h-4 w-4" stroke={1.5} />
              Top category
            </div>
            <p className="mt-3 text-xl font-bold text-slate-900">
              {categoryBreakdown[0]?.[0] ?? '—'}
            </p>
            {categoryBreakdown[0] ? (
              <p className="mt-1 text-xs text-slate-400">
                SAR {categoryBreakdown[0][1].toFixed(2)} in lead fees
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">No jobs claimed yet</p>
            )}
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {!loading && categoryBreakdown.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-slate-800">Spend by category</h3>
          <div className="mt-4 space-y-3">
            {categoryBreakdown.map(([cat, amount]) => {
              const pct = totalSar > 0 ? (amount / totalSar) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{cat}</span>
                    <span className="font-medium text-slate-800">SAR {amount.toFixed(2)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-800">Transaction history</h3>
          <Badge variant="outline" className="border-slate-200 text-slate-500">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<IconReceipt className="h-6 w-6 text-muted-foreground" />}
              title="No transactions yet"
              description="Lead fees appear here each time you claim a job from the jobs board."
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((txn) => (
              <div key={txn.transaction_id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      txn.transaction_type === 'CHARGE'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    <IconCoin className="h-4 w-4" stroke={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{txn.description}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(txn.created_at).toLocaleDateString('en-SA', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-semibold ${
                      txn.transaction_type === 'CHARGE' ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    {txn.transaction_type === 'CHARGE' ? '−' : '+'}SAR {txn.amount_sar.toFixed(2)}
                  </p>
                  <Badge
                    variant="outline"
                    className={`mt-0.5 text-xs ${
                      txn.transaction_type === 'CHARGE'
                        ? 'border-red-100 bg-red-50 text-red-700'
                        : 'border-emerald-100 bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {txn.transaction_type === 'CHARGE' ? 'Lead fee' : 'Refund'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
