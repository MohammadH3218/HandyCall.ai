export function normalizeAuthCallbackUrl(
  candidate: string | null | undefined,
  fallback: string,
) {
  const safeFallback = fallback.startsWith('/') ? fallback : `/${fallback}`;

  if (!candidate) {
    return safeFallback;
  }

  try {
    if (candidate.startsWith('/')) {
      return candidate;
    }

    const url = new URL(candidate);
    return url.pathname + url.search + url.hash || safeFallback;
  } catch {
    return safeFallback;
  }
}
