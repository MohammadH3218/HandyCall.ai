'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SERVICE_AUTOCOMPLETE_LIST } from '@/constants/home-services';
import { useMarketingLanguage } from '@/components/providers/marketing-language-provider';

const SAUDI_CITIES = [
  { value: 'riyadh', labelEn: 'Riyadh', labelAr: 'الرياض' },
  { value: 'jeddah', labelEn: 'Jeddah', labelAr: 'جدة' },
  { value: 'dammam', labelEn: 'Dammam', labelAr: 'الدمام' },
  { value: 'khobar', labelEn: 'Khobar', labelAr: 'الخبر' },
  { value: 'mecca', labelEn: 'Mecca', labelAr: 'مكة المكرمة' },
  { value: 'medina', labelEn: 'Medina', labelAr: 'المدينة المنورة' },
  { value: 'abha', labelEn: 'Abha', labelAr: 'أبها' },
  { value: 'tabuk', labelEn: 'Tabuk', labelAr: 'تبوك' },
  { value: 'hail', labelEn: 'Hail', labelAr: 'حائل' },
];

const MAX_SUGGESTIONS = 8;

interface SearchBarProps {
  className?: string;
  size?: 'default' | 'lg';
}

export function SearchBar({ className = '', size = 'default' }: SearchBarProps) {
  const router = useRouter();
  const { isArabic } = useMarketingLanguage();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('riyadh');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const paddingY = size === 'lg' ? 'py-4' : 'py-3.5';
  const textSize = size === 'lg' ? 'text-base' : 'text-sm';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions =
    query.length >= 2
      ? SERVICE_AUTOCOMPLETE_LIST.filter((item) =>
          item.label.toLowerCase().includes(query.toLowerCase()),
        ).slice(0, MAX_SUGGESTIONS)
      : [];

  const copy = isArabic
    ? {
        placeholder: 'ما الخدمة التي تحتاجها؟',
        search: 'بحث',
        categoryLabel: 'فئة',
      }
    : {
        placeholder: 'What service do you need?',
        search: 'Search',
        categoryLabel: 'Category',
      };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowSuggestions(false);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (city) params.set('city', city);
    router.push(`/search?${params.toString()}`);
  }

  function handleSuggestionClick(label: string) {
    setQuery(label);
    setShowSuggestions(false);
    const params = new URLSearchParams();
    params.set('q', label);
    if (city) params.set('city', city);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`} dir={isArabic ? 'rtl' : 'ltr'}>
      <form onSubmit={handleSubmit} className="flex w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-1 items-center px-4">
          <svg
            className="h-4 w-4 flex-shrink-0 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            style={{ marginInlineEnd: '0.5rem' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => query.length >= 2 && setShowSuggestions(true)}
            placeholder={copy.placeholder}
            className={`w-full bg-transparent ${paddingY} ${textSize} text-slate-700 placeholder:text-slate-400 outline-none`}
            autoComplete="off"
          />
        </div>

        <div className="w-px self-stretch bg-slate-200" />

        <div className="flex items-center px-2">
          <svg
            className="h-4 w-4 flex-shrink-0 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            style={{ marginInlineEnd: '0.25rem' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
          </svg>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={`cursor-pointer appearance-none bg-transparent ${paddingY} pr-6 ${textSize} text-slate-700 outline-none`}
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0px center',
            }}
          >
            {SAUDI_CITIES.map((c) => (
              <option key={c.value} value={c.value}>
                {isArabic ? c.labelAr : c.labelEn}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="flex-shrink-0 bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
        >
          {copy.search}
        </button>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {suggestions.map((item, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSuggestionClick(item.label);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-emerald-50"
            >
              <svg className="h-4 w-4 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <span className="flex-1 text-sm text-slate-800">{item.label}</span>
              <span className="text-xs text-slate-400">{isArabic ? copy.categoryLabel : item.category}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
