'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { StatusBadge } from '@/components/admin/status-badge';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { IconLoader2, IconArrowLeft } from '@tabler/icons-react';

export default function ProDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pro, setPro] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ action: string; label: string } | null>(null);

  const load = async () => {
    try { setPro(await apiClient.adminGetPro(id)); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const doAction = async () => {
    if (!confirm) return;
    if (confirm.action === 'approve') await apiClient.adminApprovePro(id);
    else if (confirm.action === 'reject') await apiClient.adminRejectPro(id);
    else if (confirm.action === 'suspend') await apiClient.adminSuspendPro(id);
    else if (confirm.action === 'reactivate') await apiClient.adminReactivatePro(id);
    else if (confirm.action === 'delete') { await apiClient.adminDeletePro(id); router.push('/admin/pros'); return; }
    setConfirm(null);
    load();
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><IconLoader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>;
  if (!pro) return <div className="px-8 py-10 text-slate-500">Pro not found.</div>;

  return (
    <div className="px-8 py-10">
      <button type="button" onClick={() => router.back()} className="mb-5 flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700">
        <IconArrowLeft className="h-4 w-4" stroke={1.8} /> Back
      </button>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-[20px] font-bold text-emerald-700">
          {pro.first_name?.[0]}{pro.last_name?.[0]}
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-slate-900">{pro.first_name} {pro.last_name}</h1>
          <p className="text-[13px] text-slate-400">{pro.email} · Joined {pro.created_at ? new Date(pro.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : '—'}</p>
          <div className="mt-1.5"><StatusBadge status={pro.status} /></div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-5 flex flex-wrap gap-2">
        {pro.status === 'PENDING_REVIEW' && <>
          <button type="button" onClick={() => setConfirm({ action: 'approve', label: 'Approve' })} className="rounded-xl bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-emerald-700">Approve</button>
          <button type="button" onClick={() => setConfirm({ action: 'reject', label: 'Reject' })} className="rounded-xl bg-rose-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-rose-700">Reject</button>
        </>}
        {pro.status === 'ACTIVE' && <button type="button" onClick={() => setConfirm({ action: 'suspend', label: 'Suspend' })} className="rounded-xl bg-amber-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-amber-600">Suspend</button>}
        {pro.status === 'SUSPENDED' && <button type="button" onClick={() => setConfirm({ action: 'reactivate', label: 'Reactivate' })} className="rounded-xl bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-emerald-700">Reactivate</button>}
        <button type="button" onClick={() => setConfirm({ action: 'delete', label: 'Delete' })} className="rounded-xl bg-rose-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-rose-700">Delete Account</button>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* Profile */}
        <Section title="Profile">
          <Row label="City" value={pro.city} />
          <Row label="Bio" value={pro.bio} />
          <Row label="Experience" value={pro.years_experience != null ? `${pro.years_experience} years` : undefined} />
          <Row label="Districts" value={pro.service_districts?.join(', ')} />
          <Row label="Languages" value={[pro.speaks_arabic && 'Arabic', pro.speaks_english && 'English'].filter(Boolean).join(', ')} />
          <Row label="Rating" value={pro.average_rating ? `${pro.average_rating.toFixed(1)} ★ (${pro.total_reviews} reviews)` : undefined} />
          <Row label="Bookings" value={pro.total_bookings} />
        </Section>

        {/* Business */}
        <Section title="Business Info">
          <Row label="CR Number" value={pro.cr_number} />
          <Row label="VAT Number" value={pro.vat_number} />
          <Row label="IBAN" value={pro.iban} />
          <Row label="Bank" value={pro.bank_name} />
          <Row label="ID Type" value={pro.id_type} />
        </Section>

        {/* Services */}
        {Array.isArray(pro.services) && (
          <div className="lg:col-span-2">
            <Section title={`Services (${pro.services.length})`}>
              {pro.services.length === 0 ? <p className="text-[13px] text-slate-400">No services.</p> : (
                <div className="space-y-2">
                  {pro.services.map((s: any) => (
                    <div key={s.service_id} className="flex items-start justify-between rounded-lg border border-border/60 p-3">
                      <div>
                        <p className="text-[13px] font-medium text-slate-900">{s.title}</p>
                        <p className="text-[12px] text-slate-400">{s.category} · {s.pricing_type}</p>
                      </div>
                      <p className="text-[13px] font-semibold text-slate-700">
                        {s.price_sar != null ? `SAR ${(s.price_sar / 100).toFixed(2)}` : 'Quote'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}

        {/* Availability */}
        {Array.isArray(pro.availability) && (
          <Section title="Availability">
            {pro.availability.map((a: any) => (
              <Row key={a.day_of_week} label={a.day_of_week} value={a.is_available ? `${a.open_time} – ${a.close_time}` : 'Unavailable'} />
            ))}
          </Section>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={doAction}
        title={`${confirm?.label} pro?`}
        description={`Are you sure you want to ${confirm?.action} ${pro.first_name} ${pro.last_name}?`}
        confirmLabel={confirm?.label ?? ''}
        destructive={confirm?.action === 'delete' || confirm?.action === 'reject' || confirm?.action === 'suspend'}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-[15px] font-semibold text-slate-900">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-4 text-[13px]">
      <span className="shrink-0 text-slate-400">{label}</span>
      <span className="text-right text-slate-700">{String(value)}</span>
    </div>
  );
}
