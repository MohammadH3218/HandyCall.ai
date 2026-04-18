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
  { label: 'Pending', value: 'PENDING_REVIEW' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Suspended', value: 'SUSPENDED' },
  { label: 'Rejected', value: 'REJECTED' },
];

function ProsListInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams?.get('status') ?? '';

  const [pros, setPros] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ action: string; proId: string; name: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiClient.adminListPros(statusFilter ? { status: statusFilter } : undefined);
      setPros(data ?? []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const filtered = query.trim()
    ? pros.filter((p) => `${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(query.toLowerCase()))
    : pros;

  const doAction = async () => {
    if (!confirm) return;
    if (confirm.action === 'approve') await apiClient.adminApprovePro(confirm.proId);
    else if (confirm.action === 'reject') await apiClient.adminRejectPro(confirm.proId);
    else if (confirm.action === 'suspend') await apiClient.adminSuspendPro(confirm.proId);
    else if (confirm.action === 'reactivate') await apiClient.adminReactivatePro(confirm.proId);
    else if (confirm.action === 'delete') await apiClient.adminDeletePro(confirm.proId);
    setConfirm(null);
    load();
  };

  return (
    <div className="px-8 py-10">
      <h1 className="text-[26px] font-bold text-slate-900">Pros</h1>

      {/* Tabs */}
      <div className="mt-5 flex gap-1 border-b border-border/60">
        {TABS.map((t) => (
          <button key={t.value} type="button"
            onClick={() => router.push(`/admin/pros${t.value ? `?status=${t.value}` : ''}`)}
            className={`px-4 py-2 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
              statusFilter === t.value
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 w-full max-w-sm">
        <IconSearch className="h-4 w-4 shrink-0 text-slate-400" stroke={1.8} />
        <input
          type="text" placeholder="Search by name or email…" value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-[14px] text-slate-700 outline-none placeholder:text-slate-400"
        />
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <IconLoader2 className="h-6 w-6 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border/80 bg-white shadow-sm">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">City</th>
                <th className="px-5 py-3">Rating</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">No pros found.</td></tr>
              ) : filtered.map((pro: any) => (
                <tr key={pro.pro_id} className="border-b border-border/40 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={`/admin/pros/${pro.pro_id}`} className="font-medium text-slate-900 hover:text-emerald-600">
                      {pro.first_name} {pro.last_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{pro.email}</td>
                  <td className="px-5 py-3 text-slate-500">{pro.city ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-500">{pro.average_rating ? `${pro.average_rating.toFixed(1)} ★` : '—'}</td>
                  <td className="px-5 py-3"><StatusBadge status={pro.status} /></td>
                  <td className="px-5 py-3 text-slate-400">{pro.created_at ? new Date(pro.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Link href={`/admin/pros/${pro.pro_id}`} className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200">View</Link>
                      {pro.status === 'PENDING_REVIEW' && <>
                        <button type="button" onClick={() => setConfirm({ action: 'approve', proId: pro.pro_id, name: `${pro.first_name} ${pro.last_name}` })} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100">Approve</button>
                        <button type="button" onClick={() => setConfirm({ action: 'reject', proId: pro.pro_id, name: `${pro.first_name} ${pro.last_name}` })} className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100">Reject</button>
                      </>}
                      {pro.status === 'ACTIVE' && <button type="button" onClick={() => setConfirm({ action: 'suspend', proId: pro.pro_id, name: `${pro.first_name} ${pro.last_name}` })} className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100">Suspend</button>}
                      {pro.status === 'SUSPENDED' && <button type="button" onClick={() => setConfirm({ action: 'reactivate', proId: pro.pro_id, name: `${pro.first_name} ${pro.last_name}` })} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100">Reactivate</button>}
                      <button type="button" onClick={() => setConfirm({ action: 'delete', proId: pro.pro_id, name: `${pro.first_name} ${pro.last_name}` })} className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100">Delete</button>
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
        title={`${confirm?.action?.charAt(0).toUpperCase()}${confirm?.action?.slice(1)} pro?`}
        description={`Are you sure you want to ${confirm?.action} ${confirm?.name}?`}
        confirmLabel={confirm?.action?.charAt(0).toUpperCase() + (confirm?.action?.slice(1) ?? '')}
        destructive={confirm?.action === 'delete' || confirm?.action === 'reject' || confirm?.action === 'suspend'}
      />
    </div>
  );
}

export default function ProsPage() {
  return <Suspense fallback={<div className="flex h-64 items-center justify-center"><IconLoader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>}><ProsListInner /></Suspense>;
}
