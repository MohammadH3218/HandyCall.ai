export function buildMarketplaceThreadId(companyId: string, customerEmail: string) {
  const raw = `${String(companyId || '').trim()}::${String(customerEmail || '')
    .trim()
    .toLowerCase()}`;
  const base64 = globalThis.btoa(raw);

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '').slice(0, 32);
}

export function formatMarketplaceUrgency(value?: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  switch (normalized) {
    case 'emergency':
      return 'Emergency';
    case 'urgent':
      return 'Within 1-2 days';
    case 'this_week':
      return 'This week';
    case 'flexible':
      return 'Flexible';
    default:
      return normalized ? normalized.replace(/_/g, ' ') : 'Not specified';
  }
}
