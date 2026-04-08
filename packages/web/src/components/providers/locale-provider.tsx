'use client';

import { createContext, useContext, useEffect } from 'react';
import type { Locale } from '@/lib/locale';

/**
 * null  → we are NOT inside a [locale] route (non-marketing pages)
 * 'en'/'ar' → we are inside a [locale] route; URL locale takes precedence
 */
export const LocaleContext = createContext<Locale | null>(null);

export function useLocale(): Locale | null {
  return useContext(LocaleContext);
}

export function LocaleProvider({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = 'ltr';
  }, [locale]);

  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}
