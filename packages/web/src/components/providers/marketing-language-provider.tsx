'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
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

function applyDocumentLanguage(language: MarketingLanguage) {
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
}

export function MarketingLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<MarketingLanguage>('en');

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(STORAGE_KEY);
    const nextLanguage = savedLanguage === 'ar' ? 'ar' : 'en';
    setLanguageState(nextLanguage);
    applyDocumentLanguage(nextLanguage);
  }, []);

  const setLanguage = (nextLanguage: MarketingLanguage) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    applyDocumentLanguage(nextLanguage);
  };

  const value = useMemo(
    () => ({
      language,
      isArabic: language === 'ar',
      setLanguage,
      toggleLanguage: () => setLanguage(language === 'ar' ? 'en' : 'ar'),
    }),
    [language],
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
