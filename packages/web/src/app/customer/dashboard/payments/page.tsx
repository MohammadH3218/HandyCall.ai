'use client';

import { useState } from 'react';
import {
  IconCreditCard,
  IconPlus,
  IconCheck,
  IconClock,
  IconX,
  IconDownload,
  IconShield,
} from '@tabler/icons-react';

// ── Mock data ─────────────────────────────────────────────────────────────────

const TRANSACTIONS = [
  {
    id: 'INV-001',
    service: 'AC Repair',
    pro: 'Khalid Al-Rashidi',
    date: 'Mar 19, 2026',
    amount: 'SAR 150',
    status: 'paid',
    method: 'Mada',
  },
  {
    id: 'INV-002',
    service: 'Electrical Repair',
    pro: 'Ahmed Al-Zahrani',
    date: 'Mar 18, 2026',
    amount: 'SAR 120',
    status: 'paid',
    method: 'Apple Pay',
  },
  {
    id: 'INV-003',
    service: 'Plumbing — Leak Fix',
    pro: 'Omar Al-Hassan',
    date: 'Mar 15, 2026',
    amount: 'SAR 80',
    status: 'paid',
    method: 'Cash',
  },
  {
    id: 'INV-004',
    service: 'House Deep Cleaning',
    pro: 'Sara Al-Mutairi',
    date: 'Mar 27, 2026',
    amount: 'SAR 200',
    status: 'pending',
    method: 'STC Pay',
  },
  {
    id: 'INV-005',
    service: 'Pest Control',
    pro: 'Faisal Al-Otaibi',
    date: 'Mar 10, 2026',
    amount: 'SAR 250',
    status: 'refunded',
    method: 'Mada',
  },
];

const STATUS_CONFIG = {
  paid: { label: 'Paid', pill: 'bg-emerald-50 text-emerald-700', icon: <IconCheck className="h-3 w-3" stroke={2.5} /> },
  pending: { label: 'Pending', pill: 'bg-amber-50 text-amber-700', icon: <IconClock className="h-3 w-3" stroke={2} /> },
  refunded: { label: 'Refunded', pill: 'bg-slate-100 text-slate-500', icon: <IconX className="h-3 w-3" stroke={2} /> },
};

const SAVED_METHODS = [
  { id: '1', type: 'mada', label: 'Mada', last4: '4821', bank: 'Al Rajhi Bank', default: true },
  { id: '2', type: 'apple', label: 'Apple Pay', last4: null, bank: null, default: false },
];

const METHOD_ICONS: Record<string, string> = {
  mada: '🏦',
  apple: '🍎',
  stc: '📱',
  cash: '💵',
  card: '💳',
};

// ── Add payment modal ─────────────────────────────────────────────────────────

function AddPaymentModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<'mada' | 'card' | 'stc'>('mada');
  const [saved, setSaved] = useState(false);

  if (saved) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <IconCheck className="h-7 w-7" stroke={2} />
          </div>
          <p className="text-lg font-bold text-slate-900">Payment method added!</p>
          <button
            onClick={onClose}
            className="mt-6 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-bold text-slate-900">Add Payment Method</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <IconX className="h-5 w-5" stroke={1.5} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Type picker */}
          <div className="grid grid-cols-3 gap-2">
            {(['mada', 'card', 'stc'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`rounded-xl border py-3 text-center text-sm font-medium transition ${
                  type === t
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-600 hover:border-emerald-200'
                }`}
              >
                {t === 'mada' ? '🏦 Mada' : t === 'card' ? '💳 Card' : '📱 STC Pay'}
              </button>
            ))}
          </div>

          {type === 'mada' && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">IBAN</label>
                <input
                  type="text"
                  placeholder="SA00 0000 0000 0000 0000 0000"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Account holder name</label>
                <input
                  type="text"
                  placeholder="As on your bank account"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition"
                />
              </div>
            </>
          )}

          {type === 'card' && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Card number</label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Expiry</label>
                  <input
                    type="text"
                    placeholder="MM / YY"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">CVV</label>
                  <input
                    type="text"
                    placeholder="123"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition"
                  />
                </div>
              </div>
            </>
          )}

          {type === 'stc' && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">STC Pay number</label>
              <input
                type="text"
                placeholder="+966 5X XXX XXXX"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition"
              />
            </div>
          )}

          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3">
            <IconShield className="h-4 w-4 text-emerald-600 flex-shrink-0" stroke={1.8} />
            <p className="text-xs text-slate-500">Your payment info is encrypted and never shared with pros.</p>
          </div>

          <button
            onClick={() => setSaved(true)}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Add Method
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CustomerPaymentsPage() {
  const [showAddModal, setShowAddModal] = useState(false);

  const totalSpent = TRANSACTIONS
    .filter((t) => t.status === 'paid')
    .reduce((sum, t) => sum + parseInt(t.amount.replace('SAR ', '')), 0);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <p className="mt-1 text-sm text-slate-500">Your payment history and saved methods.</p>
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Spent</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">SAR {totalSpent}</p>
          <p className="mt-1 text-xs text-slate-400">All time</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bookings Paid</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {TRANSACTIONS.filter((t) => t.status === 'paid').length}
          </p>
          <p className="mt-1 text-xs text-slate-400">Services completed</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pending</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            SAR {TRANSACTIONS.filter((t) => t.status === 'pending').reduce((s, t) => s + parseInt(t.amount.replace('SAR ', '')), 0)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Awaiting completion</p>
        </div>
      </div>

      {/* Saved payment methods */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-800">Saved Payment Methods</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
          >
            <IconPlus className="h-3.5 w-3.5" stroke={2.5} />
            Add Method
          </button>
        </div>
        <ul className="divide-y divide-slate-100">
          {SAVED_METHODS.map((method) => (
            <li key={method.id} className="flex items-center gap-4 px-5 py-4">
              <span className="text-2xl">{METHOD_ICONS[method.type]}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">
                  {method.label}
                  {method.last4 && <span className="font-normal text-slate-400"> •••• {method.last4}</span>}
                  {method.default && (
                    <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Default
                    </span>
                  )}
                </p>
                {method.bank && <p className="text-xs text-slate-400">{method.bank}</p>}
              </div>
              <button className="text-xs font-medium text-slate-400 transition hover:text-red-500">
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Transaction history */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-800">Transaction History</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {TRANSACTIONS.map((tx) => {
            const status = STATUS_CONFIG[tx.status as keyof typeof STATUS_CONFIG];
            return (
              <li key={tx.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg">
                  {METHOD_ICONS[tx.method.toLowerCase().replace(' ', '')] ?? '💳'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{tx.service}</p>
                  <p className="truncate text-xs text-slate-400">
                    {tx.pro} · {tx.date} · {tx.method}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold text-slate-800">{tx.amount}</span>
                  <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.pill}`}>
                    {status.icon}
                    {status.label}
                  </span>
                </div>
                <button className="ml-1 flex-shrink-0 rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600">
                  <IconDownload className="h-4 w-4" stroke={1.8} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {showAddModal && <AddPaymentModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
