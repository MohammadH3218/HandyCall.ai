'use client';

import { useMarketingLanguage } from '@/components/providers/marketing-language-provider';

type LanguageSwitcherProps = {
  className?: string;
};

export function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const { language, setLanguage } = useMarketingLanguage();

  return (
    <div
      className={`inline-flex items-center rounded-full border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur ${className}`}
      dir="ltr"
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          language === 'en'
            ? 'bg-slate-900 text-white'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('ar')}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          language === 'ar'
            ? 'bg-slate-900 text-white'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        AR
      </button>
    </div>
  );
}
