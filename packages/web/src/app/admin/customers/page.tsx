'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { StatusBadge } from '@/components/admin/status-badge';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { IconLoader2, IconSearch } from '@tabler/icons-react';

const TABS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Suspended', value: 'SUSPENDED' },
  { label: 'Pending Verification', value: 'PENDING_VERIFICATION' },
];

function CustomersListInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams?.get('status') ?? '';
  const [customers, setCustomers] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ action: string; id: string; name: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiClient.adminListCustomers(statusFilter ? { status: statusFilter } : undefined);
      setCustomers(data ?? []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const filtered = query.trim()
    ? customers.filter((c) => `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(query.toLowerCase()))
    : customers;

  const doAction = async () => {
    if (!confirm) return;
    if (confirm.action === 'suspend') await apiClient.adminSuspendCustomer(confirm.id);
    else if (confirm.action === 'reactivate') await apiClient.adminReactivateCustomer(confirm.id);
    else if (confirm.action === 'delete') await apiClient.adminDeleteCustomer(confirm.id);
    setConfirm(null);
    load();
  };

  return (
    <div className="px-8 py-10">
      <h1 className="text-[26px] font-bold text-slate-900">Customers</h1>

      <div className="mt-5 flex gap-1 border-b border-border/60">
        {TABS.map((t) => (
          <button key={t.value} type="button"
            onClick={() => router.push(`/admin/customers${t.value ? `?status=${t.value}` : ''}`)}
            className={`px-4 py-2 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
              statusFilter === t.value ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 w-full max-w-sm">
        <IconSearch className="h-4 w-4 shrink-0 text-slate-400" stroke={1.8} />
        <input type="text" placeholder="Search by name or email…" value={query} onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-[14px] text-slate-700 outline-none placeholder:text-slate-400" />
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center"><IconLoader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border/80 bg-white shadow-sm">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">District</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">No customers found.</td></tr>
              ) : filtered.map((c: any) => (
                <tr key={c.customer_id} className="border-b border-border/40 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={`/admin/customers/${c.customer_id}`} className="font-medium text-slate-900 hover:text-emerald-600">{c.first_name} {c.last_name}</Link>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{c.email}</td>
                  <td className="px-5 py-3 text-slate-500">{c.phone_number ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-500">{c.district ?? '—'}</td>
                  <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-5 py-3 text-slate-400">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Link href={`/admin/customers/${c.customer_id}`} className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200">View</Link>
                      {c.status === 'ACTIVE' && <button type="button" onClick={() => setConfirm({ action: 'suspend', id: c.customer_id, name: `${c.first_name} ${c.last_name}` })} className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100">Suspend</button>}
                      {c.status === 'SUSPENDED' && <button type="button" onClick={() => setConfirm({ action: 'reactivate', id: c.customer_id, name: `${c.first_name} ${c.last_name}` })} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100">Reactivate</button>}
                      <button type="button" onClick={() => setConfirm({ action: 'delete', id: c.customer_id, name: `${c.first_name} ${c.last_name}` })} className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={doAction}
        title={`${confirm?.action?.charAt(0).toUpperCase()}${confirm?.action?.slice(1)} customer?`}
        description={`Are you sure you want to ${confirm?.action} ${confirm?.name}?`}
        confirmLabel={confirm?.action?.charAt(0).toUpperCase() + (confirm?.action?.slice(1) ?? '')}
        destructive={confirm?.action === 'delete' || confirm?.action === 'suspend'}
      />
    </div>
  );
}

export default function CustomersPage() {
  return <Suspense fallback={<div className="flex h-64 items-center justify-center"><IconLoader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>}><CustomersListInner /></Suspense>;
}
