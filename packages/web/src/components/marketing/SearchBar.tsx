'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconMapPin, IconSearch } from '@tabler/icons-react';
import { SERVICE_AUTOCOMPLETE_LIST } from '@/constants/home-services';
import { SAUDI_MARKETPLACE_CITIES } from '@/constants/houston-areas';

const MAX_SERVICE_SUGGESTIONS = 8;
const MAX_LOCATION_SUGGESTIONS = 10;

interface SearchBarProps {
  className?: string;
  size?: 'default' | 'lg';
}

export function SearchBar({ className = '', size = 'default' }: SearchBarProps) {
  const router = useRouter();
  const locationRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [showServiceSuggestions, setShowServiceSuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  const paddingY = size === 'lg' ? 'py-4' : 'py-3.5';
  const textSize = size === 'lg' ? 'text-base' : 'text-sm';

  const serviceSuggestions = useMemo(
    () =>
      query.trim().length >= 2
        ? SERVICE_AUTOCOMPLETE_LIST.filter((item) =>
            item.label.toLowerCase().includes(query.trim().toLowerCase()),
          ).slice(0, MAX_SERVICE_SUGGESTIONS)
        : [],
    [query],
  );

  const locationSuggestions = useMemo(() => {
    const term = locationInput.trim().toLowerCase();
    if (!term) return [];
    return SAUDI_MARKETPLACE_CITIES.filter((district) => {
      return (
        district.label.toLowerCase().includes(term) ||
        district.region.toLowerCase().includes(term)
      );
    }).slice(0, MAX_LOCATION_SUGGESTIONS);
  }, [locationInput]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowServiceSuggestions(false);
    setShowLocationSuggestions(false);

    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (selectedLocation || locationInput.trim()) {
      params.set('city', selectedLocation || locationInput.trim());
    }

    const qs = params.toString();
    router.push(qs ? `/search?${qs}` : '/search');
  }

  function handleServiceClick(label: string) {
    setQuery(label);
    setShowServiceSuggestions(false);
    setTimeout(() => locationRef.current?.focus(), 0);
  }

  function handleLocationSelect(value: string, label: string) {
    setSelectedLocation(value);
    setLocationInput(label);
    setShowLocationSuggestions(false);
  }

  return (
    <div className={`relative z-[70] w-full rounded-2xl ${className}`}>
      {/*
       * overflow-hidden on the form clips the green search button to the form's
       * border-radius, removing the squared-corner artefact at the button edges.
       * Dropdowns are rendered as siblings (outside the form) so they aren't clipped.
       */}
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:flex-row"
      >
        {/* Service search input */}
        <div className="flex flex-1 items-center px-4">
          <IconSearch className="h-4 w-4 flex-shrink-0 text-slate-400" stroke={1.8} />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowServiceSuggestions(true);
              setShowLocationSuggestions(false);
            }}
            onFocus={() => {
              if (query.trim().length >= 2) setShowServiceSuggestions(true);
            }}
            onBlur={() => setTimeout(() => setShowServiceSuggestions(false), 150)}
            placeholder="Search for a service"
            className={`w-full bg-transparent pl-3 ${paddingY} ${textSize} text-slate-700 placeholder:text-slate-400 outline-none`}
            autoComplete="off"
          />
        </div>

        <div className="h-px bg-slate-200 sm:h-auto sm:w-px sm:self-stretch" />

        {/* Location input */}
        <div className="flex items-center px-4 sm:w-[280px]">
          <IconMapPin className="h-4 w-4 flex-shrink-0 text-slate-400" stroke={1.8} />
          <input
            ref={locationRef}
            type="text"
            value={locationInput}
            onChange={(e) => {
              setLocationInput(e.target.value);
              setSelectedLocation('');
              setShowLocationSuggestions(true);
              setShowServiceSuggestions(false);
            }}
            onFocus={() => {
              if (locationInput.trim()) setShowLocationSuggestions(true);
            }}
            onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 150)}
            placeholder="Search location"
            className={`w-full bg-transparent pl-3 ${paddingY} ${textSize} text-slate-700 placeholder:text-slate-400 outline-none`}
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

      {/* Service suggestions — sibling of form so overflow-hidden doesn't clip it */}
      {showServiceSuggestions && serviceSuggestions.length > 0 && (
        <div className="absolute left-0 top-full z-[80] mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:w-auto sm:min-w-[320px]">
          {serviceSuggestions.map((item) => (
            <button
              key={`${item.category}-${item.label}`}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleServiceClick(item.label);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-emerald-50"
            >
              <IconSearch className="h-4 w-4 flex-shrink-0 text-slate-400" stroke={1.8} />
              <span className="flex-1 text-sm text-slate-800">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Location suggestions — sibling of form so overflow-hidden doesn't clip it */}
      {showLocationSuggestions && locationSuggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-[80] mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:left-auto sm:right-0 sm:w-[320px]">
          {locationSuggestions.map((district) => (
            <button
              key={district.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleLocationSelect(district.value, district.label);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-emerald-50"
            >
              <IconMapPin className="h-4 w-4 flex-shrink-0 text-slate-400" stroke={1.8} />
              <span className="flex-1 text-sm font-medium text-slate-800">{district.label}</span>
              <span className="text-xs text-slate-400">{district.region}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
