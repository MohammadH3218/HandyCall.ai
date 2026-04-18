'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { StatusBadge } from '@/components/admin/status-badge';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { IconLoader2, IconArrowLeft } from '@tabler/icons-react';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ action: string; label: string } | null>(null);

  const load = async () => {
    try { setCustomer(await apiClient.adminGetCustomer(id)); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const doAction = async () => {
    if (!confirm) return;
    if (confirm.action === 'suspend') await apiClient.adminSuspendCustomer(id);
    else if (confirm.action === 'reactivate') await apiClient.adminReactivateCustomer(id);
    else if (confirm.action === 'delete') { await apiClient.adminDeleteCustomer(id); router.push('/admin/customers'); return; }
    setConfirm(null);
    load();
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><IconLoader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>;
  if (!customer) return <div className="px-8 py-10 text-slate-500">Customer not found.</div>;

  return (
    <div className="px-8 py-10">
      <button type="button" onClick={() => router.back()} className="mb-5 flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700">
        <IconArrowLeft className="h-4 w-4" stroke={1.8} /> Back
      </button>

      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-[20px] font-bold text-sky-700">
          {customer.first_name?.[0]}{customer.last_name?.[0]}
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-slate-900">{customer.first_name} {customer.last_name}</h1>
          <p className="text-[13px] text-slate-400">{customer.email} · Joined {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : '—'}</p>
          <div className="mt-1.5"><StatusBadge status={customer.status} /></div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {customer.status === 'ACTIVE' && <button type="button" onClick={() => setConfirm({ action: 'suspend', label: 'Suspend' })} className="rounded-xl bg-amber-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-amber-600">Suspend</button>}
        {customer.status === 'SUSPENDED' && <button type="button" onClick={() => setConfirm({ action: 'reactivate', label: 'Reactivate' })} className="rounded-xl bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-emerald-700">Reactivate</button>}
        <button type="button" onClick={() => setConfirm({ action: 'delete', label: 'Delete' })} className="rounded-xl bg-rose-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-rose-700">Delete Account</button>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/80 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-[15px] font-semibold text-slate-900">Profile</h2>
          <div className="space-y-2 text-[13px]">
            {[
              ['Phone', customer.phone_number],
              ['District', customer.district],
              ['City', customer.city],
              ['Language', customer.preferred_language],
              ['ID Type', customer.id_type],
              ['Email Verified', customer.email_verified ? 'Yes' : 'No'],
              ['PDPL Consent', customer.pdpl_consent ? 'Yes' : 'No'],
            ].map(([label, value]) => value != null && value !== '' ? (
              <div key={String(label)} className="flex justify-between gap-4">
                <span className="text-slate-400">{label}</span>
                <span className="text-right text-slate-700">{String(value)}</span>
              </div>
            ) : null)}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={doAction}
        title={`${confirm?.label} customer?`}
        description={`Are you sure you want to ${confirm?.action} ${customer.first_name} ${customer.last_name}?`}
        confirmLabel={confirm?.label ?? ''}
        destructive={confirm?.action === 'delete' || confirm?.action === 'suspend'}
      />
    </div>
  );
}
