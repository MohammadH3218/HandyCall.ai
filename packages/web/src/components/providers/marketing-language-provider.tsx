'use client';

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

export type MarketingLanguage = 'en' | 'ar';

type MarketingLanguageContextValue = {
  language: MarketingLanguage;
  isArabic: boolean;
  setLanguage: (language: MarketingLanguage) => void;
  toggleLanguage: () => void;
};

const STORAGE_KEY = 'handycall-marketing-language';

const MarketingLanguageContext = createContext<MarketingLanguageContextValue | null>(null);

export function MarketingLanguageProvider({ children }: { children: ReactNode }) {
  const value = useMemo(
    () => ({
      language: 'en' as MarketingLanguage,
      isArabic: false,
      setLanguage: (_nextLanguage: MarketingLanguage) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, 'en');
          document.documentElement.lang = 'en';
          document.documentElement.dir = 'ltr';
        }
      },
      toggleLanguage: () => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, 'en');
          document.documentElement.lang = 'en';
          document.documentElement.dir = 'ltr';
        }
      },
    }),
    [],
  );

  return (
    <MarketingLanguageContext.Provider value={value}>
      {children}
    </MarketingLanguageContext.Provider>
  );
}

export function useMarketingLanguage() {
  const context = useContext(MarketingLanguageContext);

  if (!context) {
    throw new Error('useMarketingLanguage must be used within MarketingLanguageProvider');
  }

  return context;
}
