export const LOCALES = ['en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export function isValidLocale(s: string): s is Locale {
  return (LOCALES as ReadonlyArray<string>).includes(s);
}

/**
 * Prefix `path` with the locale segment.
 * Returns the path unchanged if `locale` is null (non-localized page context).
 *
 * localePath('en', '/search') → '/search'
 * localePath(null, '/search') → '/search'
 */
export function localePath(locale: Locale | null, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return clean;
}
