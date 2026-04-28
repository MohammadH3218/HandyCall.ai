'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { IconCheck, IconChevronDown, IconSearch } from '@tabler/icons-react';
import { MARKETPLACE_SERVICE_CATEGORIES } from '@/constants/marketplace-service-categories';

type ServiceCategoryComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  error?: string | null;
  className?: string;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
    .trim();
}

export function ServiceCategoryCombobox({
  value,
  onChange,
  label = 'Service category',
  placeholder = 'Search service categories...',
  helperText,
  error,
  className = '',
}: ServiceCategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () =>
      MARKETPLACE_SERVICE_CATEGORIES.find(
        (category) => category.title === value || category.key === value || category.slug === value
      ) || null,
    [value]
  );

  const filtered = useMemo(() => {
    const term = normalize(query);
    if (!term) return MARKETPLACE_SERVICE_CATEGORIES;
    return MARKETPLACE_SERVICE_CATEGORIES.filter((category) => {
      const haystack = [
        category.title,
        category.titleAr,
        category.slug,
        category.description,
        ...category.services,
        ...category.searchKeywords,
      ].join(' ');
      return normalize(haystack).includes(term);
    });
  }, [query]);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {label ? (
        <label className="mb-1.5 block text-sm font-semibold text-slate-900">{label}</label>
      ) : null}
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setQuery('');
        }}
        className={`flex h-11 w-full items-center justify-between rounded-xl border bg-white px-3.5 text-left text-sm transition ${
          error
            ? 'border-red-300 focus:ring-red-100'
            : open
              ? 'border-emerald-400 ring-2 ring-emerald-100'
              : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className={selected ? 'text-slate-800' : 'text-slate-400'}>
          {selected?.title || value || placeholder}
        </span>
        <IconChevronDown
          className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
          stroke={2}
        />
      </button>

      {helperText && !error ? <p className="mt-1.5 text-xs text-slate-400">{helperText}</p> : null}
      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}

      {open ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <IconSearch className="h-4 w-4 shrink-0 text-slate-400" stroke={1.8} />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type a service, e.g. locksmith, sofa cleaning, solar..."
              className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-300"
            />
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400">
                No category found. Try another service name.
              </div>
            ) : (
              filtered.map((category) => {
                const active = selected?.key === category.key || value === category.title;
                return (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => {
                      onChange(category.title);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                      active ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                      {active ? (
                        <IconCheck className="h-4 w-4 text-emerald-600" stroke={2.5} />
                      ) : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{category.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-400">
                        {category.services.slice(0, 4).join(', ')}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
