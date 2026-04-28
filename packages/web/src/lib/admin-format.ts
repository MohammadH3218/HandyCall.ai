export function formatSar(amount?: number | null) {
  const value = typeof amount === 'number' ? amount : 0;
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatHalalaAsSar(amount?: number | null) {
  return formatSar(((amount || 0) as number) / 100);
}

export function formatDate(timestamp?: number | null) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleDateString('en-SA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(timestamp?: number | null) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString('en-SA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatPercent(value?: number | null) {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value)}%`;
}

export function formatRating(value?: number | null) {
  if (value === null || value === undefined) return '—';
  const normalized = value > 5 ? value / 100 : value;
  return normalized.toFixed(1);
}

export function formatPersonName(record?: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}) {
  if (!record) return 'Unknown';
  const fullName = [record.first_name, record.last_name].filter(Boolean).join(' ').trim();
  return fullName || record.email || 'Unknown';
}

export function truncate(value?: string | null, max = 72) {
  if (!value) return '—';
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}
