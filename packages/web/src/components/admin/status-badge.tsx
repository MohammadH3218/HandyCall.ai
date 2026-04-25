import { Badge } from '@/components/ui/badge';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  INACTIVE: 'bg-slate-100 text-slate-700 border-slate-200',
  UNKNOWN: 'bg-slate-100 text-slate-600 border-slate-200',
};

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = String(status || 'UNKNOWN').toUpperCase();

  return (
    <Badge className={STATUS_STYLES[normalized] || STATUS_STYLES.UNKNOWN}>
      {formatStatus(normalized)}
    </Badge>
  );
}
