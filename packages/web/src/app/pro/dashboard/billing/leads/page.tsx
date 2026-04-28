'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconCoin, IconReceipt, IconTrendingUp, IconWallet } from '@tabler/icons-react';
import { apiClient } from '@/lib/api-client';

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
  quote_id: string;
  amount_halalas: number;
  amount_sar: number;
  transaction_type: 'CHARGE' | 'REFUND';
  description: string;
  created_at: number;
};

function extractCategory(description: string): string {
  const match = description.match(/Lead fee [-\u2014] (.+?)(?: job in|$)/);
  if (!match?.[1]) return 'Other';
  const category = match[1].trim();
  return CATEGORY_LABELS[category] ?? category;
}

function formatDate(ts?: number) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-SA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ProLeadFeesPage() {
  const [transactions, setTransactions] = useState<LeadFeeTransaction[]>([]);
  const [totalSar, setTotalSar] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getProLeadFees();
        setTransactions(Array.isArray(data?.transactions) ? data.transactions : []);
        setTotalSar(Number(data?.total_charged_sar || 0));
      } catch (err: any) {
        setError(err?.message || 'Failed to load lead fee data.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const charges = useMemo(
    () => transactions.filter((transaction) => transaction.transaction_type === 'CHARGE'),
    [transactions]
  );

  const thisMonthSar = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return charges
      .filter((transaction) => transaction.created_at >= monthStart)
      .reduce((sum, transaction) => sum + Number(transaction.amount_sar || 0), 0);
  }, [charges]);

  const categoryBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const transaction of charges) {
      const category = extractCategory(transaction.description || '');
      totals[category] = (totals[category] || 0) + Number(transaction.amount_sar || 0);
    }
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [charges]);

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lead fees</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track charges from jobs you claim on the board.
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard
              icon={<IconWallet className="h-4 w-4" stroke={1.5} />}
              label="Total lead fees"
              value={`SAR ${totalSar.toFixed(2)}`}
              detail={`${charges.length} claimed job${charges.length === 1 ? '' : 's'}`}
            />
            <SummaryCard
              icon={<IconTrendingUp className="h-4 w-4" stroke={1.5} />}
              label="This month"
              value={`SAR ${thisMonthSar.toFixed(2)}`}
              detail={new Date().toLocaleString('en-SA', { month: 'long', year: 'numeric' })}
            />
            <SummaryCard
              icon={<IconCoin className="h-4 w-4" stroke={1.5} />}
              label="Top category"
              value={categoryBreakdown[0]?.[0] || 'None yet'}
              detail={
                categoryBreakdown[0]
                  ? `SAR ${categoryBreakdown[0][1].toFixed(2)}`
                  : 'No claimed jobs'
              }
            />
          </div>
        )}

        {!loading && categoryBreakdown.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Spend by category</h2>
            <div className="mt-4 space-y-3">
              {categoryBreakdown.map(([category, amount]) => {
                const width = totalSar > 0 ? Math.max(4, (amount / totalSar) * 100) : 0;
                return (
                  <div key={category}>
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-slate-600">{category}</span>
                      <span className="font-medium text-slate-800">SAR {amount.toFixed(2)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Transaction history</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
              {transactions.length} total
            </span>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center">
              <IconReceipt className="mx-auto mb-3 h-10 w-10 text-slate-200" stroke={1.5} />
              <p className="text-sm font-medium text-slate-500">No lead fees yet.</p>
              <p className="mt-1 text-xs text-slate-400">
                Claimed jobs from the jobs board will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.map((transaction) => {
                const isCharge = transaction.transaction_type === 'CHARGE';
                return (
                  <div
                    key={transaction.transaction_id}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          isCharge ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        <IconCoin className="h-4 w-4" stroke={1.6} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {transaction.description}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {formatDate(transaction.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-sm font-semibold ${
                          isCharge ? 'text-red-600' : 'text-emerald-600'
                        }`}
                      >
                        {isCharge ? '-' : '+'}SAR {Number(transaction.amount_sar || 0).toFixed(2)}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-300">
                        {isCharge ? 'Lead fee' : 'Refund'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  detail,
  icon,
  label,
  value,
}: {
  detail: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </div>
      <p className="mt-3 truncate text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  );
}
