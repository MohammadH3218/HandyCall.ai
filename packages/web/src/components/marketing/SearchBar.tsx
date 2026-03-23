'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SERVICE_AUTOCOMPLETE_LIST, SERVICE_AUTOCOMPLETE_LIST_AR } from '@/constants/home-services';
import { useMarketingLanguage } from '@/components/providers/marketing-language-provider';

const SAUDI_CITIES = [
  { value: 'riyadh',         labelEn: 'Riyadh',          labelAr: 'الرياض' },
  { value: 'jeddah',         labelEn: 'Jeddah',          labelAr: 'جدة' },
  { value: 'mecca',          labelEn: 'Mecca',           labelAr: 'مكة المكرمة' },
  { value: 'medina',         labelEn: 'Medina',          labelAr: 'المدينة المنورة' },
  { value: 'dammam',         labelEn: 'Dammam',          labelAr: 'الدمام' },
  { value: 'khobar',         labelEn: 'Khobar',          labelAr: 'الخبر' },
  { value: 'dhahran',        labelEn: 'Dhahran',         labelAr: 'الظهران' },
  { value: 'jubail',         labelEn: 'Al Jubail',       labelAr: 'الجبيل' },
  { value: 'qatif',          labelEn: 'Qatif',           labelAr: 'القطيف' },
  { value: 'ahsa',           labelEn: 'Al Ahsa',         labelAr: 'الأحساء' },
  { value: 'abha',           labelEn: 'Abha',            labelAr: 'أبها' },
  { value: 'khamis-mushait', labelEn: 'Khamis Mushait',  labelAr: 'خميس مشيط' },
  { value: 'taif',           labelEn: 'Taif',            labelAr: 'الطائف' },
  { value: 'tabuk',          labelEn: 'Tabuk',           labelAr: 'تبوك' },
  { value: 'buraidah',       labelEn: 'Buraidah',        labelAr: 'بريدة' },
  { value: 'hail',           labelEn: 'Hail',            labelAr: 'حائل' },
  { value: 'jizan',          labelEn: 'Jizan',           labelAr: 'جازان' },
  { value: 'najran',         labelEn: 'Najran',          labelAr: 'نجران' },
  { value: 'yanbu',          labelEn: 'Yanbu',           labelAr: 'ينبع' },
  { value: 'hafar-batin',    labelEn: 'Hafar Al-Batin',  labelAr: 'حفر الباطن' },
  { value: 'baha',           labelEn: 'Al Baha',         labelAr: 'الباحة' },
  { value: 'sakaka',         labelEn: 'Sakaka',          labelAr: 'سكاكا' },
  { value: 'arar',           labelEn: 'Arar',            labelAr: 'عرعر' },
  { value: 'unaizah',        labelEn: 'Unaizah',         labelAr: 'عنيزة' },
  { value: 'wajh',           labelEn: 'Al Wajh',         labelAr: 'الوجه' },
];

const MAX_SUGGESTIONS = 8;
const MAX_CITY_SUGGESTIONS = 6;

interface SearchBarProps {
  className?: string;
  size?: 'default' | 'lg';
}

export function SearchBar({ className = '', size = 'default' }: SearchBarProps) {
  const router = useRouter();
  const { isArabic } = useMarketingLanguage();

  const [query, setQuery] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [selectedCityValue, setSelectedCityValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  const paddingY = size === 'lg' ? 'py-4' : 'py-3.5';
  const textSize = size === 'lg' ? 'text-base' : 'text-sm';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setShowCitySuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const autocompleteList = isArabic ? SERVICE_AUTOCOMPLETE_LIST_AR : SERVICE_AUTOCOMPLETE_LIST;

  const suggestions =
    query.length >= 2
      ? autocompleteList
          .filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
          .slice(0, MAX_SUGGESTIONS)
      : [];

  const citySuggestions =
    cityInput.length >= 1
      ? SAUDI_CITIES.filter((c) => {
          const term = cityInput.toLowerCase();
          return (
            c.labelEn.toLowerCase().includes(term) ||
            c.labelAr.includes(cityInput)
          );
        }).slice(0, MAX_CITY_SUGGESTIONS)
      : [];

  const copy = isArabic
    ? {
        placeholder: 'ما الخدمة التي تحتاجها؟',
        cityPlaceholder: 'اختر مدينتك',
        search: 'بحث',
        categoryLabel: 'فئة',
        saudiArabia: 'المملكة العربية السعودية',
      }
    : {
        placeholder: 'What service do you need?',
        cityPlaceholder: 'Your city',
        search: 'Search',
        categoryLabel: 'Category',
        saudiArabia: 'Saudi Arabia',
      };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowSuggestions(false);
    setShowCitySuggestions(false);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (selectedCityValue) params.set('city', selectedCityValue);
    router.push(`/search?${params.toString()}`);
  }

  function handleSuggestionClick(label: string) {
    setQuery(label);
    setShowSuggestions(false);
    const params = new URLSearchParams();
    params.set('q', label);
    if (selectedCityValue) params.set('city', selectedCityValue);
    router.push(`/search?${params.toString()}`);
  }

  function handleCitySelect(city: typeof SAUDI_CITIES[number]) {
    setSelectedCityValue(city.value);
    setCityInput(isArabic ? city.labelAr : city.labelEn);
    setShowCitySuggestions(false);
  }

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`} dir={isArabic ? 'rtl' : 'ltr'}>
      <form onSubmit={handleSubmit} className="flex w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Service input */}
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
              setShowCitySuggestions(false);
            }}
            onFocus={() => query.length >= 2 && setShowSuggestions(true)}
            placeholder={copy.placeholder}
            className={`w-full bg-transparent ${paddingY} ${textSize} text-slate-700 placeholder:text-slate-400 outline-none`}
            autoComplete="off"
          />
        </div>

        <div className="w-px self-stretch bg-slate-200" />

        {/* City input */}
        <div className="flex items-center px-3">
          <svg
            className="h-4 w-4 flex-shrink-0 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            style={{ marginInlineEnd: '0.375rem' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
          </svg>
          <input
            type="text"
            value={cityInput}
            onChange={(e) => {
              setCityInput(e.target.value);
              setSelectedCityValue('');
              setShowCitySuggestions(true);
              setShowSuggestions(false);
            }}
            onFocus={() => {
              setShowCitySuggestions(true);
              setShowSuggestions(false);
            }}
            placeholder={copy.cityPlaceholder}
            className={`w-32 bg-transparent ${paddingY} ${textSize} text-slate-700 placeholder:text-slate-400 outline-none sm:w-40`}
            autoComplete="off"
          />
        </div>

        <button
          type="submit"
          className="flex-shrink-0 bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
        >
          {copy.search}
        </button>
      </form>

      {/* Service suggestions dropdown */}
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
              <span className="text-xs text-slate-400">{item.category}</span>
            </button>
          ))}
        </div>
      )}

      {/* City suggestions dropdown */}
      {showCitySuggestions && citySuggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {citySuggestions.map((city) => (
            <button
              key={city.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleCitySelect(city);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-emerald-50"
            >
              <svg className="h-4 w-4 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
              </svg>
              <span className="flex-1 text-sm font-medium text-slate-800">
                {isArabic ? city.labelAr : city.labelEn}
              </span>
              <span className="text-xs text-slate-400">{copy.saudiArabia}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
