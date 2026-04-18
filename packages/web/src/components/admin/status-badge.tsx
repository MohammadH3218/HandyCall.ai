'use client';

const STYLES: Record<string, string> = {
  ONBOARDING: 'bg-blue-50 text-blue-700',
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  PENDING_REVIEW: 'bg-amber-50 text-amber-700',
  SUSPENDED: 'bg-rose-50 text-rose-700',
  REJECTED: 'bg-slate-100 text-slate-500',
  PENDING_VERIFICATION: 'bg-sky-50 text-sky-700',
  PENDING_CONFIRMATION: 'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-emerald-50 text-emerald-700',
  IN_PROGRESS: 'bg-blue-50 text-blue-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

const LABELS: Record<string, string> = {
  ONBOARDING: 'Onboarding',
  PENDING_REVIEW: 'Pending Review',
  PENDING_VERIFICATION: 'Pending Verification',
  PENDING_CONFIRMATION: 'Pending',
  IN_PROGRESS: 'In Progress',
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STYLES[status] ?? 'bg-slate-100 text-slate-500';
  const label = LABELS[status] ?? status.replace(/_/g, ' ');
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}
