'use client';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}

export function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${accent ? 'border-emerald-200' : 'border-border/80'}`}>
      <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-[28px] font-bold leading-none ${accent ? 'text-emerald-600' : 'text-slate-900'}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-[12px] text-slate-400">{sub}</p>}
    </div>
  );
}
