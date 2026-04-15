export function buildMarketplaceThreadId(companyId: string, quoteId?: string, customerEmail?: string) {
  const normalizedQuoteId = String(quoteId || '').trim();
  const normalizedEmail = String(customerEmail || '').trim().toLowerCase();
  const raw = normalizedQuoteId
    ? `${String(companyId || '').trim()}::quote::${normalizedQuoteId}`
    : `${String(companyId || '').trim()}::${normalizedEmail}`;
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
