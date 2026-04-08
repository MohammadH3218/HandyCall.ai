'use client';

import { useState } from 'react';
import {
  IconCreditCard,
  IconX,
  IconCheck,
  IconClock,
  IconReceipt,
} from '@tabler/icons-react';

type Transaction = {
  id: string;
  service: string;
  pro: string;
  proInitial: string;
  date: string;
  amount: string;
  status: 'paid' | 'pending' | 'refunded';
  method: string;
  notes?: string;
};

const STATUS_CONFIG = {
  paid: { label: 'Paid', pill: 'bg-emerald-50 text-emerald-700', icon: <IconCheck className="h-3 w-3" stroke={2.5} /> },
  pending: { label: 'Pending', pill: 'bg-amber-50 text-amber-700', icon: <IconClock className="h-3 w-3" stroke={2} /> },
  refunded: { label: 'Refunded', pill: 'bg-slate-100 text-slate-500', icon: <IconX className="h-3 w-3" stroke={2} /> },
};

function TransactionDetailModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-bold text-slate-900">Transaction Details</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <IconX className="h-5 w-5" stroke={1.5} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Status badge */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</span>
            <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CONFIG[tx.status].pill}`}>
              {STATUS_CONFIG[tx.status].icon}
              {STATUS_CONFIG[tx.status].label}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Service</span>
              <span className="font-semibold text-slate-800">{tx.service}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Pro</span>
              <span className="font-semibold text-slate-800">{tx.pro}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Date</span>
              <span className="font-semibold text-slate-800">{tx.date}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Payment method</span>
              <span className="font-semibold text-slate-800">{tx.method}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-200 pt-3">
              <span className="font-semibold text-slate-700">Total</span>
              <span className="text-lg font-bold text-emerald-600">{tx.amount}</span>
            </div>
          </div>

          {tx.notes && (
            <p className="text-xs text-slate-400 italic">{tx.notes}</p>
          )}

          <p className="text-xs text-slate-400 text-center">Invoice #{tx.id}</p>
        </div>
      </div>
    </div>
  );
}

export default function CustomerPaymentsPage() {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // No real transactions yet — empty state
  const transactions: Transaction[] = [];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <p className="mt-1 text-sm text-slate-500">Your transaction history.</p>
      </div>

      {/* Transaction history */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-800">Transaction History</h2>
        </div>

        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <IconReceipt className="h-7 w-7" stroke={1.5} />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-600">No transactions yet</p>
            <p className="mt-1 text-xs text-slate-400">Your payment history will appear here after your first booking.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {transactions.map((tx) => {
              const status = STATUS_CONFIG[tx.status];
              return (
                <li key={tx.id}>
                  <button
                    onClick={() => setSelectedTx(tx)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                      {tx.proInitial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{tx.service}</p>
                      <p className="truncate text-xs text-slate-400">{tx.pro} · {tx.date} · {tx.method}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-bold text-slate-800">{tx.amount}</span>
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.pill}`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                    <IconCreditCard className="ml-1 h-4 w-4 flex-shrink-0 text-slate-300" stroke={1.5} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selectedTx && (
        <TransactionDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
      )}
    </div>
  );
}
