'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SERVICE_AUTOCOMPLETE_LIST } from '@/constants/home-services';
import { HOUSTON_METRO_AREAS } from '@/constants/houston-areas';

const MAX_SERVICE_SUGGESTIONS = 8;
const MAX_AREA_SUGGESTIONS = 6;

interface SearchBarProps {
  className?: string;
  size?: 'default' | 'lg';
}

export function SearchBar({ className = '', size = 'default' }: SearchBarProps) {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [zipInput, setZipInput] = useState('');
  const [selectedZip, setSelectedZip] = useState('');
  const [showServiceSuggestions, setShowServiceSuggestions] = useState(false);
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false);
  const zipRef = useRef<HTMLInputElement>(null);

  const paddingY = size === 'lg' ? 'py-4' : 'py-3.5';
  const textSize = size === 'lg' ? 'text-base' : 'text-sm';

  // Service autocomplete
  const serviceSuggestions =
    query.length >= 2
      ? SERVICE_AUTOCOMPLETE_LIST.filter((item) =>
          item.label.toLowerCase().includes(query.toLowerCase())
        ).slice(0, MAX_SERVICE_SUGGESTIONS)
      : [];

  // Houston area autocomplete — match by zip prefix OR area/region name
  const areaSuggestions =
    zipInput.length >= 2
      ? HOUSTON_METRO_AREAS.filter((a) => {
          const term = zipInput.toLowerCase();
          return (
            a.zip.startsWith(zipInput) ||
            a.area.toLowerCase().includes(term) ||
            a.region.toLowerCase().includes(term)
          );
        }).slice(0, MAX_AREA_SUGGESTIONS)
      : [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowServiceSuggestions(false);
    setShowAreaSuggestions(false);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    const zip = selectedZip || zipInput;
    if (zip) params.set('zip', zip);
    router.push(`/search?${params.toString()}`);
  }

  function handleServiceClick(label: string) {
    setQuery(label);
    setShowServiceSuggestions(false);
    setTimeout(() => zipRef.current?.focus(), 0);
  }

  function handleAreaSelect(zip: string, area: string) {
    setSelectedZip(zip);
    setZipInput(`${area} · ${zip}`);
    setShowAreaSuggestions(false);
  }

  return (
    <div className={`relative w-full rounded-xl ${className}`}>
      <form
        onSubmit={handleSubmit}
        className="flex w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        {/* Service input */}
        <div className="flex flex-1 items-center px-4">
          <svg
            className="h-4 w-4 flex-shrink-0 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            style={{ marginRight: '0.5rem' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowServiceSuggestions(true);
              setShowAreaSuggestions(false);
            }}
            onFocus={() => query.length >= 2 && setShowServiceSuggestions(true)}
            onBlur={() => setTimeout(() => setShowServiceSuggestions(false), 150)}
            placeholder="What service do you need?"
            className={`w-full bg-transparent ${paddingY} ${textSize} text-slate-700 placeholder:text-slate-400 outline-none`}
            autoComplete="off"
          />
        </div>

        <div className="w-px self-stretch bg-slate-200" />

        {/* Houston area / zip input */}
        <div className="flex items-center px-3">
          <svg
            className="h-4 w-4 flex-shrink-0 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            style={{ marginRight: '0.375rem' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
          </svg>
          <input
            ref={zipRef}
            type="text"
            value={zipInput}
            onChange={(e) => {
              setZipInput(e.target.value);
              setSelectedZip('');
              setShowAreaSuggestions(true);
              setShowServiceSuggestions(false);
            }}
            onFocus={() => {
              setShowAreaSuggestions(true);
              setShowServiceSuggestions(false);
            }}
            onBlur={() => setTimeout(() => setShowAreaSuggestions(false), 150)}
            placeholder="Neighborhood or zip"
            className={`w-36 bg-transparent ${paddingY} ${textSize} text-slate-700 placeholder:text-slate-400 outline-none sm:w-44`}
            autoComplete="off"
          />
        </div>

        <button
          type="submit"
          className="flex-shrink-0 bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
        >
          Search
        </button>
      </form>

      {/* Service suggestions */}
      {showServiceSuggestions && serviceSuggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {serviceSuggestions.map((item, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleServiceClick(item.label); }}
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

      {/* Houston area suggestions */}
      {showAreaSuggestions && areaSuggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {areaSuggestions.map((a) => (
            <button
              key={a.zip}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleAreaSelect(a.zip, a.area); }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-emerald-50"
            >
              <svg className="h-4 w-4 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
              </svg>
              <span className="flex-1 text-sm font-medium text-slate-800">{a.area}</span>
              <span className="text-xs text-slate-400">{a.zip} · {a.region} Co.</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
