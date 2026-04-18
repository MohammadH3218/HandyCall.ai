'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { optimizeImageFile } from '@/lib/image-upload';
import { useAuthStore } from '@/stores/auth-store';
import { useMarketingLanguage } from '@/components/providers/marketing-language-provider';
import { RIYADH_DISTRICT_GROUPS } from '@/constants/houston-areas';
import {
  MARKETPLACE_SERVICE_CATEGORIES,
  getMarketplaceCategoryByTitle,
  getSpecificServicesForCategory,
} from '@/constants/marketplace-service-categories';

const PROPERTY_TYPES = ['Villa', 'Apartment', 'Townhouse', 'Office', 'Commercial', 'Government Building'];
const PAYMENT_METHOD_ICONS: Record<string, React.ReactNode> = {
  cash: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" />
      <path d="M6 10v4M18 10v4" strokeLinecap="round" />
    </svg>
  ),
  apple_pay: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  ),
  card: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" strokeLinecap="round" />
      <path d="M6 15h4" strokeLinecap="round" />
    </svg>
  ),
  mada: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M7 10h10M7 14h5" strokeLinecap="round" />
    </svg>
  ),
  bank_transfer: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M4 10h16M6 10V7h12v3M7 10v7M12 10v7M17 10v7M4 17h16" strokeLinecap="round" />
    </svg>
  ),
};

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'mada', label: 'Mada' },
  { id: 'apple_pay', label: 'Apple Pay' },
  { id: 'card', label: 'Credit / Debit Card' },
  { id: 'bank_transfer', label: 'Bank transfer' },
];
const EMPLOYEE_OPTIONS = ['Just me (solo)', '2-5 employees', '6-20 employees', '20+ employees'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMES = ['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM'];

const EDITOR_TRANSLATIONS: Record<string, string> = {
  Apartment: 'شقة',
  Townhouse: 'تاون هاوس',
  Office: 'مكتب',
  'Commercial': 'تجاري',
  'Government Building': 'مبنى حكومي',
  Cash: 'نقدًا',
  'Apple Pay': 'Apple Pay',
  'Credit / Debit Card': 'بطاقة ائتمانية / خصم',
  'Just me (solo)': 'أنا فقط',
  '2-5 employees': '2-5 موظفين',
  '6-20 employees': '6-20 موظفًا',
  '20+ employees': '20+ موظفًا',
  Sunday: 'الأحد',
  Monday: 'الاثنين',
  Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء',
  Thursday: 'الخميس',
  Friday: 'الجمعة',
  Saturday: 'السبت',
  weekend: 'عطلة نهاية الأسبوع',
};

function editorText(text: string, isArabic: boolean) {
  return isArabic ? EDITOR_TRANSLATIONS[text] || text : text;
}

interface BusinessHourEntry {
  open: boolean;
  from: string;
  to: string;
}

type BusinessHoursMap = Record<string, BusinessHourEntry>;

interface MarketplaceProfile {
  profile_photo: string;
  bio: string;
  years_in_business: string;
  employees: string;
  license_type: string;
  license_number: string;
  is_licensed: boolean;
  is_background_checked: boolean;
  service_category: string;
  services_offered: string[];
  property_types: string[];
  payment_methods: string[];
  instagram: string;
  snapchat: string;
  twitter: string;
  website: string;
  starting_price: string;
  contact_for_price: boolean;
  service_districts: string[];
  business_hours: BusinessHoursMap;
  portfolio_photos: string[];
}

// Which sections have required fields (for validation highlighting)
type SectionKey = 'photo' | 'bio' | 'overview' | 'services' | 'districts' | 'payment';

const defaultHours: BusinessHoursMap = {
  Sunday: { open: true, from: '8:00 AM', to: '6:00 PM' },
  Monday: { open: true, from: '8:00 AM', to: '6:00 PM' },
  Tuesday: { open: true, from: '8:00 AM', to: '6:00 PM' },
  Wednesday: { open: true, from: '8:00 AM', to: '6:00 PM' },
  Thursday: { open: true, from: '8:00 AM', to: '6:00 PM' },
  Friday: { open: false, from: '8:00 AM', to: '6:00 PM' },
  Saturday: { open: false, from: '8:00 AM', to: '6:00 PM' },
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition';
const inputErrorClass =
  'w-full rounded-xl border border-red-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition';
const labelClass = 'mb-1.5 block text-sm font-semibold text-slate-700';
const sectionClass = 'rounded-2xl border border-slate-100 bg-white p-6 shadow-sm';
const sectionErrorClass = 'rounded-2xl border border-red-200 bg-red-50/30 p-6 shadow-sm';
const sectionTitleClass = 'mb-1 text-base font-bold text-slate-900';
const sectionSubClass = 'mb-5 text-xs text-slate-400';

function toggle<T>(items: T[], item: T): T[] {
  return items.includes(item) ? items.filter((entry) => entry !== item) : [...items, item];
}

// ── Photo crop modal ─────────────────────────────────────────────────────────

function PhotoCropModal({
  src,
  onConfirm,
  onCancel,
}: {
  src: string;
  onConfirm: (croppedDataUrl: string) => void;
  onCancel: () => void;
}) {
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewSize = 240;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !dragStart.current) return;
    setOffsetX(dragStart.current.ox + (e.clientX - dragStart.current.x));
    setOffsetY(dragStart.current.oy + (e.clientY - dragStart.current.y));
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
    dragStart.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  function confirmCrop() {
    const canvas = document.createElement('canvas');
    canvas.width = previewSize;
    canvas.height = previewSize;
    const ctx = canvas.getContext('2d');
    if (!ctx || !imgRef.current) return;

    const img = imgRef.current;
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;

    // The display size of the image at zoom=1
    const displayW = naturalW * zoom;
    const displayH = naturalH * zoom;

    // The image center in the preview container
    const cx = previewSize / 2 + offsetX;
    const cy = previewSize / 2 + offsetY;

    // Map back to natural image coordinates
    const scaleX = naturalW / displayW;
    const scaleY = naturalH / displayH;
    const srcX = (cx - previewSize / 2) * scaleX * -1 + naturalW / 2 - previewSize * scaleX / 2;
    const srcY = (cy - previewSize / 2) * scaleY * -1 + naturalH / 2 - previewSize * scaleY / 2;

    ctx.drawImage(img, srcX, srcY, previewSize * scaleX, previewSize * scaleY, 0, 0, previewSize, previewSize);

    onConfirm(canvas.toDataURL('image/jpeg', 0.9));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="mb-1 text-base font-bold text-slate-900">Crop profile photo</h3>
        <p className="mb-4 text-xs text-slate-500">Drag to reposition · Scroll or use slider to zoom</p>

        {/* Crop preview */}
        <div
          className="relative mx-auto overflow-hidden rounded-full border-4 border-emerald-200 bg-slate-100"
          style={{ width: previewSize, height: previewSize, cursor: dragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onWheel={(e) => {
            e.preventDefault();
            setZoom((z) => Math.max(0.5, Math.min(3, z - e.deltaY * 0.002)));
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt="Crop preview"
            draggable={false}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${zoom})`,
              transformOrigin: 'center',
              maxWidth: 'none',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Zoom slider */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-slate-400">−</span>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-emerald-600"
          />
          <span className="text-xs text-slate-400">+</span>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmCrop}
            className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Use this photo
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Searchable category dropdown ──────────────────────────────────────────────

function CategorySearch({
  value,
  onChange,
  isArabic,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  isArabic: boolean;
  hasError?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedCat = MARKETPLACE_SERVICE_CATEGORIES.find(
    (c) => c.title === value || c.key === value,
  );

  const filtered = query.trim()
    ? MARKETPLACE_SERVICE_CATEGORIES.filter(
        (c) =>
          c.title.toLowerCase().includes(query.toLowerCase()) ||
          (c.titleAr && c.titleAr.includes(query)),
      )
    : MARKETPLACE_SERVICE_CATEGORIES;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative mb-4">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setQuery(''); }}
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition outline-none ${
          hasError
            ? 'border-red-300 bg-red-50/30'
            : open
              ? 'border-emerald-400 ring-2 ring-emerald-100'
              : 'border-slate-200 bg-white hover:border-slate-300'
        }`}
      >
        <span className={selectedCat ? 'text-slate-800' : 'text-slate-400'}>
          {selectedCat
            ? (isArabic ? selectedCat.titleAr || selectedCat.title : selectedCat.title)
            : (isArabic ? 'اختر الفئة...' : 'Select category...')}
        </span>
        <svg className="h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <svg className="h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isArabic ? 'بحث...' : 'Search categories...'}
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-300 outline-none"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-2.5 text-xs text-slate-400">No categories match</li>
            ) : (
              filtered.map((c) => (
                <li key={c.key}>
                  <button
                    type="button"
                    onClick={() => { onChange(c.title); setOpen(false); setQuery(''); }}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                      value === c.title || value === c.key
                        ? 'bg-emerald-50 font-semibold text-emerald-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {(value === c.title || value === c.key) && (
                      <svg className="h-3.5 w-3.5 shrink-0 text-emerald-600" viewBox="0 0 12 10" fill="none">
                        <path d="M1 5l3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    <span>
                      {isArabic ? c.titleAr || c.title : c.title}
                      {!isArabic && c.titleAr && <span className="ml-1.5 text-slate-400">{c.titleAr}</span>}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── District selector ─────────────────────────────────────────────────────────

function DistrictSelector({
  selected,
  onChange,
  hasError,
}: {
  selected: string[];
  onChange: (districts: string[]) => void;
  hasError?: boolean;
}) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();

  const filteredGroups = Object.entries(RIYADH_DISTRICT_GROUPS)
    .map(([region, districts]) => [
      region,
      districts.filter((district) =>
        !normalizedQuery
          ? true
          : district.label.toLowerCase().includes(normalizedQuery) ||
            district.region.toLowerCase().includes(normalizedQuery),
      ),
    ] as const)
    .filter(([, districts]) => districts.length > 0);

  const toggleDistrict = (district: string) => {
    onChange(
      selected.includes(district)
        ? selected.filter((item) => item !== district)
        : [...selected, district],
    );
  };

  return (
    <div className="space-y-4">
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((district) => (
            <span
              key={district}
              className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
            >
              {district}
              <button
                type="button"
                onClick={() => toggleDistrict(district)}
                className="leading-none text-emerald-400 hover:text-emerald-700"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Riyadh districts…"
          className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 ${
            hasError ? 'border-red-300 bg-red-50/30' : 'border-slate-200'
          }`}
        />
        <p className="mt-2 text-xs text-slate-500">
          Choose every district you actively serve.
        </p>
      </div>

      <div className="max-h-[28rem] space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
        {filteredGroups.map(([region, districts]) => (
          <div key={region}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{region}</p>
              <p className="text-xs text-slate-400">{districts.length} districts</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {districts.map((district) => {
                const checked = selected.includes(district.label);
                return (
                  <label
                    key={district.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 transition ${
                      checked
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDistrict(district.label)}
                      className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                    />
                    <span className="text-sm text-slate-700">{district.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {filteredGroups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">
            No Riyadh districts matched your search.
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Main editor ───────────────────────────────────────────────────────────────

export function MarketplaceProfileEditor({
  mode,
  returnToSetup = false,
  selectedTier,
}: {
  mode: 'onboarding' | 'dashboard';
  returnToSetup?: boolean;
  selectedTier?: string | null;
}) {
  const router = useRouter();
  const { company } = useAuthStore();
  const { isArabic } = useMarketingLanguage();
  const t = (text: string) => editorText(text, isArabic);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<SectionKey, string>>>({});
  const [customServiceInput, setCustomServiceInput] = useState('');

  // Photo crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);

  // Portfolio
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const existingProfile = ((company as any)?.marketplace_profile || {}) as Partial<MarketplaceProfile>;
  const existingDistricts =
    Array.isArray((company as any)?.service_area_zipcodes) && (company as any)?.service_area_zipcodes.length > 0
      ? ((company as any)?.service_area_zipcodes as string[])
      : [];

  const [profile, setProfile] = useState<MarketplaceProfile>({
    profile_photo: existingProfile.profile_photo || '',
    bio: existingProfile.bio || '',
    years_in_business: existingProfile.years_in_business || '',
    employees: existingProfile.employees || '',
    license_type: existingProfile.license_type || '',
    license_number: existingProfile.license_number || '',
    is_licensed: Boolean(existingProfile.is_licensed),
    is_background_checked: Boolean(existingProfile.is_background_checked),
    service_category: existingProfile.service_category || (company as any)?.service_type || '',
    services_offered: Array.isArray(existingProfile.services_offered) ? existingProfile.services_offered : [],
    property_types: Array.isArray(existingProfile.property_types) ? existingProfile.property_types : [],
    payment_methods:
      Array.isArray(existingProfile.payment_methods) && existingProfile.payment_methods.length > 0
        ? existingProfile.payment_methods
        : ['cash'],
    instagram: existingProfile.instagram || '',
    snapchat: existingProfile.snapchat || '',
    twitter: existingProfile.twitter || '',
    website: existingProfile.website || '',
    starting_price: existingProfile.starting_price || '',
    contact_for_price: Boolean(existingProfile.contact_for_price),
    service_districts:
      Array.isArray(existingProfile.service_districts) && existingProfile.service_districts.length > 0
        ? existingProfile.service_districts
        : existingDistricts,
    business_hours: existingProfile.business_hours || defaultHours,
    portfolio_photos: Array.isArray(existingProfile.portfolio_photos) ? existingProfile.portfolio_photos : [],
  });

  const selectedCategory = getMarketplaceCategoryByTitle(profile.service_category);
  const serviceSubtypes = getSpecificServicesForCategory(profile.service_category);

  // ── Custom service ───────────────────────────────────────────────────────────

  function addCustomService() {
    const nextService = customServiceInput.trim();
    if (!nextService) return;
    if (profile.services_offered.length >= 10) return;
    if (profile.services_offered.some((s) => s.toLowerCase() === nextService.toLowerCase())) {
      setCustomServiceInput('');
      return;
    }
    setProfile((current) => ({
      ...current,
      services_offered: [...current.services_offered, nextService],
    }));
    setCustomServiceInput('');
  }

  // ── Business hours ───────────────────────────────────────────────────────────

  function updateHours(day: string, field: keyof BusinessHourEntry, value: string | boolean) {
    setProfile((current) => ({
      ...current,
      business_hours: {
        ...current.business_hours,
        [day]: { ...current.business_hours[day], [field]: value },
      },
    }));
  }

  // ── Portfolio photos ─────────────────────────────────────────────────────────

  async function handlePhotoFiles(files: FileList) {
    const remaining = 10 - profile.portfolio_photos.length;
    if (remaining <= 0) return;
    setPhotoUploading(true);
    try {
      const selected = Array.from(files).slice(0, remaining);
      const compressed = await Promise.all(
        selected.map(async (file) => (await optimizeImageFile(file, { maxLongEdge: 1800, quality: 0.9 })).url)
      );
      setProfile((current) => ({
        ...current,
        portfolio_photos: [...current.portfolio_photos, ...compressed],
      }));
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removePhoto(index: number) {
    setProfile((current) => ({
      ...current,
      portfolio_photos: current.portfolio_photos.filter((_, i) => i !== index),
    }));
  }

  function movePhoto(index: number, direction: 'up' | 'down') {
    setProfile((current) => {
      const photos = [...current.portfolio_photos];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= photos.length) return current;
      [photos[index], photos[target]] = [photos[target], photos[index]];
      return { ...current, portfolio_photos: photos };
    });
  }

  // ── Profile photo + crop ─────────────────────────────────────────────────────

  async function handleProfilePhotoFileSelected(file: File) {
    setProfilePhotoUploading(true);
    try {
      const optimized = await optimizeImageFile(file, { maxLongEdge: 960, quality: 0.9 });
      setCropSrc(optimized.url);
    } catch {
      // ignore
    } finally {
      setProfilePhotoUploading(false);
      if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = '';
    }
  }

  function handleCropConfirm(croppedDataUrl: string) {
    setProfile((prev) => ({ ...prev, profile_photo: croppedDataUrl }));
    setCropSrc(null);
    // Clear photo error if it was set
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.photo;
      return next;
    });
  }

  // ── Validation ───────────────────────────────────────────────────────────────

  function validate(): boolean {
    const errors: Partial<Record<SectionKey, string>> = {};

    if (!profile.profile_photo) {
      errors.photo = 'Upload a profile photo — customers trust profiles with a face.';
    }
    if (profile.bio.trim().length < 80) {
      errors.bio = 'Your bio must be at least 80 characters. Tell customers who you are and what you specialise in.';
    }
    if (!profile.years_in_business || !profile.employees) {
      errors.overview = 'Years in business and team size are required.';
    }
    if (!profile.service_category) {
      errors.services = 'Select a main category so customers can find you.';
    } else if (profile.services_offered.length < 3) {
      errors.services = 'Add at least 3 specific services — this is what customers search for.';
    }
    if (profile.service_districts.length === 0) {
      errors.districts = 'Select at least one district you actively serve.';
    }
    if (profile.payment_methods.length === 0) {
      errors.payment = 'Select at least one accepted payment method.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!validate()) {
      // Scroll to first error section
      const firstErrorId = Object.keys(fieldErrors)[0];
      document.getElementById(`section-${firstErrorId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSaving(true);
    setError('');
    try {
      await apiClient.updateMyProMarketplaceProfile({
        marketplace_profile: { ...profile, portfolio_photos: [] },
        service_area_cities: ['Riyadh'],
        service_area_zipcodes: profile.service_districts,
        service_area_completed: profile.service_districts.length > 0,
        marketplace_profile_completed: true,
        public_profile_enabled: true,
      });

      // Save photos separately (may be large)
      if (profile.portfolio_photos.length > 0) {
        try {
          await apiClient.updateMyProMarketplaceProfile({
            marketplace_profile: { ...profile },
          });
        } catch {
          // Photos too large — profile already saved without them
        }
      }

      setSaved(true);
      if (mode === 'dashboard') return;
      setTimeout(() => {
        router.replace(returnToSetup ? '/onboarding/setup?marketplace=done' : '/pro/dashboard');
      }, 1200);
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const sectionCls = (key: SectionKey) => (fieldErrors[key] ? sectionErrorClass : sectionClass);
  const errorTag = (key: SectionKey) =>
    fieldErrors[key] ? (
      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600">
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
          <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 4a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 018 5zm0 6.5a.875.875 0 100-1.75.875.875 0 000 1.75z" />
        </svg>
        {fieldErrors[key]}
      </p>
    ) : null;

  return (
    <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Photo crop modal */}
      {cropSrc && (
        <PhotoCropModal
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}

      <div className="mb-2">
        <h1 className="text-2xl font-extrabold text-slate-900">
          {mode === 'dashboard' ? 'Marketplace profile' : 'Complete your marketplace profile'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Customers browse this profile before deciding to contact you. Keep it complete, specific, and trustworthy.
        </p>
        {returnToSetup ? (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-semibold">
              This is the first setup milestone for your {selectedTier || 'selected'} tier.
            </p>
            <p className="mt-1 text-emerald-800/80">
              Finish your marketplace profile first, then we'll bring you back to the rest of the setup flow.
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-6">
        {/* ── Profile photo ────────────────────────────────────────────────── */}
        <section id="section-photo" className={sectionCls('photo')}>
          <h2 className={sectionTitleClass}>
            Profile photo <span className="text-red-500">*</span>
          </h2>
          <p className={sectionSubClass}>
            A clear photo of you or your team builds trust with customers. Required to publish your profile.
          </p>
          <div className="flex items-center gap-5">
            <div className="relative">
              {profile.profile_photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.profile_photo}
                  alt="Profile"
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-emerald-200"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-slate-50 text-3xl font-bold text-slate-300">
                  {(profile.bio || (company as any)?.company_name || '?').charAt(0).toUpperCase()}
                </div>
              )}
              {profilePhotoUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/80">
                  <span className="text-xs text-slate-500">…</span>
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => profilePhotoInputRef.current?.click()}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                {profile.profile_photo ? 'Change photo' : 'Upload photo'}
              </button>
              <p className="mt-1.5 text-xs text-slate-400">JPG or PNG · Max 5 MB · Crop to reposition</p>
              {!profile.profile_photo && (
                <p className="mt-1 text-xs font-medium text-red-500">Required</p>
              )}
            </div>
          </div>
          {errorTag('photo')}
          <input
            ref={profilePhotoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleProfilePhotoFileSelected(file);
            }}
          />
        </section>

        {/* ── About your business ──────────────────────────────────────────── */}
        <section id="section-bio" className={sectionCls('bio')}>
          <h2 className={sectionTitleClass}>
            About your business <span className="text-red-500">*</span>
          </h2>
          <p className={sectionSubClass}>Tell customers who you are and why they should hire you.</p>
          <label className={labelClass}>
            Business bio <span className="text-red-500">*</span>
          </label>
          <textarea
            value={profile.bio}
            onChange={(e) => {
              setProfile({ ...profile, bio: e.target.value });
              if (e.target.value.trim().length >= 80) {
                setFieldErrors((prev) => { const n = { ...prev }; delete n.bio; return n; });
              }
            }}
            rows={4}
            maxLength={500}
            placeholder="Trusted Riyadh service pro with 12 years of experience. We cover selected districts across the city, arrive on time, and keep homeowners updated from first message to completed job."
            className={`${fieldErrors.bio ? inputErrorClass : inputClass} resize-none`}
          />
          <p className="mt-1 text-right text-xs text-slate-400">{profile.bio.length} / 500 (min 80)</p>
          {errorTag('bio')}
        </section>

        {/* ── Overview ─────────────────────────────────────────────────────── */}
        <section id="section-overview" className={sectionCls('overview')}>
          <h2 className={sectionTitleClass}>
            Overview <span className="text-red-500">*</span>
          </h2>
          <p className={sectionSubClass}>Key facts that appear on your profile card.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                Years in business <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={profile.years_in_business}
                onChange={(e) => {
                  setProfile({ ...profile, years_in_business: e.target.value });
                  if (e.target.value && profile.employees) {
                    setFieldErrors((prev) => { const n = { ...prev }; delete n.overview; return n; });
                  }
                }}
                placeholder="e.g. 8"
                className={fieldErrors.overview && !profile.years_in_business ? inputErrorClass : inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Number of employees <span className="text-red-500">*</span>
              </label>
              <select
                value={profile.employees}
                onChange={(e) => {
                  setProfile({ ...profile, employees: e.target.value });
                  if (e.target.value && profile.years_in_business) {
                    setFieldErrors((prev) => { const n = { ...prev }; delete n.overview; return n; });
                  }
                }}
                className={fieldErrors.overview && !profile.employees ? inputErrorClass : inputClass}
              >
                <option value="">Select...</option>
                {EMPLOYEE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(option)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:bg-emerald-50/30">
              <input
                type="checkbox"
                checked={profile.is_licensed}
                onChange={(e) => setProfile({ ...profile, is_licensed: e.target.checked })}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-emerald-600"
              />
              <span className="text-sm font-medium leading-relaxed text-slate-700">
                I am licensed / certified in my trade
              </span>
            </label>
          </div>
          {errorTag('overview')}
        </section>

        {/* ── Credentials (optional) ────────────────────────────────────────── */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Credentials</h2>
          <p className={sectionSubClass}>
            License details appear as a trust badge on your public profile. <em className="text-slate-400">(Optional)</em>
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>License type</label>
              <input
                type="text"
                value={profile.license_type}
                onChange={(e) => setProfile({ ...profile, license_type: e.target.value })}
                placeholder="e.g. Electrician - Master"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>License / certificate number</label>
              <input
                type="text"
                value={profile.license_number}
                onChange={(e) => setProfile({ ...profile, license_number: e.target.value })}
                placeholder="Optional"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* ── Services offered ─────────────────────────────────────────────── */}
        <section id="section-services" className={sectionCls('services')}>
          <h2 className={sectionTitleClass}>
            Services offered <span className="text-red-500">*</span>
          </h2>
          <p className={sectionSubClass}>
            Choose your main category, then list the exact jobs customers should be able to find you for.
          </p>
          <label className={labelClass}>
            Main category <span className="text-red-500">*</span>
          </label>

          <CategorySearch
            value={profile.service_category}
            onChange={(v) => {
              setProfile({ ...profile, service_category: v, services_offered: [] });
              setFieldErrors((prev) => { const n = { ...prev }; delete n.services; return n; });
            }}
            isArabic={isArabic}
            hasError={Boolean(fieldErrors.services && !profile.service_category)}
          />

          <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-semibold">Help search understand what you do</p>
            <p className="mt-1 text-emerald-800/80">
              {selectedCategory?.setupGuidance ||
                'Add the exact services customers would type into search, not just the broad category name.'}
            </p>
            {selectedCategory ? (
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-emerald-700/90">
                Suggested: {selectedCategory.services.slice(0, 4).join(', ')}
              </p>
            ) : null}
          </div>

          <label className={labelClass}>
            Specific services customers can search for{' '}
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({profile.services_offered.length}/10) — min 3 required
            </span>
          </label>
          {serviceSubtypes.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {serviceSubtypes.map((service) => {
                const isChecked = profile.services_offered.includes(service);
                const atLimit = !isChecked && profile.services_offered.length >= 10;
                return (
                  <label
                    key={service}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border border-slate-100 p-2.5 transition hover:border-emerald-200 hover:bg-emerald-50 ${atLimit ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={atLimit}
                      onChange={() => {
                        if (atLimit) return;
                        const next = toggle(profile.services_offered, service);
                        setProfile({ ...profile, services_offered: next });
                        if (next.length >= 3) {
                          setFieldErrors((prev) => { const n = { ...prev }; delete n.services; return n; });
                        }
                      }}
                      className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                    />
                    <span className="text-xs font-medium text-slate-700">{service}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
              Pick a category first, then add the exact services you offer below.
            </div>
          )}

          <div className="mt-4">
            <label className={labelClass}>Add a custom specific service</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={customServiceInput}
                onChange={(e) => setCustomServiceInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomService())}
                placeholder={
                  selectedCategory
                    ? `Example: ${selectedCategory.services[0] || 'Mesh network setup'}`
                    : 'Example: Mesh network setup, ethernet cabling'
                }
                className={inputClass}
              />
              <button
                type="button"
                onClick={addCustomService}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                Add service
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Be specific. Customers may search exact phrases like "mesh Wi-Fi setup" or "rat infestation treatment."
            </p>
          </div>

          {profile.services_offered.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.services_offered.map((service) => (
                <button
                  key={service}
                  type="button"
                  onClick={() =>
                    setProfile({ ...profile, services_offered: profile.services_offered.filter((item) => item !== service) })
                  }
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300"
                >
                  {service} ×
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-5">
            <label className={labelClass}>Property types served</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PROPERTY_TYPES.map((propertyType) => (
                <label
                  key={propertyType}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-100 p-2.5 transition hover:border-emerald-200 hover:bg-emerald-50"
                >
                  <input
                    type="checkbox"
                    checked={profile.property_types.includes(propertyType)}
                    onChange={() =>
                      setProfile({ ...profile, property_types: toggle(profile.property_types, propertyType) })
                    }
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                  />
                  <span className="text-xs font-medium text-slate-700">{t(propertyType)}</span>
                </label>
              ))}
            </div>
          </div>
          {errorTag('services')}
        </section>

        {/* ── Districts ─────────────────────────────────────────────────────── */}
        <section id="section-districts" className={sectionCls('districts')}>
          <h2 className={sectionTitleClass}>
            Riyadh districts you serve <span className="text-red-500">*</span>
          </h2>
          <p className={sectionSubClass}>
            Select the neighbourhoods you actively cover so homeowners see accurate availability.
          </p>
          <DistrictSelector
            selected={profile.service_districts}
            onChange={(districts) => {
              setProfile({ ...profile, service_districts: districts });
              if (districts.length > 0) {
                setFieldErrors((prev) => { const n = { ...prev }; delete n.districts; return n; });
              }
            }}
            hasError={Boolean(fieldErrors.districts)}
          />
          {errorTag('districts')}
        </section>

        {/* ── Starting price ────────────────────────────────────────────────── */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Starting price</h2>
          <p className={sectionSubClass}>This sets customer expectations before they message you.</p>
          <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:bg-emerald-50/30">
            <input
              type="checkbox"
              checked={profile.contact_for_price}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  contact_for_price: e.target.checked,
                  starting_price: e.target.checked ? '' : profile.starting_price,
                })
              }
              className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
            />
            <span className="text-sm font-medium text-slate-700">
              Contact me for pricing{' '}
              <span className="text-slate-400">(hides fixed price on your profile)</span>
            </span>
          </label>
          {!profile.contact_for_price && (
            <div className="flex items-center gap-3">
              <span className="whitespace-nowrap text-sm font-semibold text-slate-500">From SAR</span>
              <input
                type="number"
                min={0}
                value={profile.starting_price}
                onChange={(e) => setProfile({ ...profile, starting_price: e.target.value })}
                placeholder="e.g. 150"
                className={`${inputClass} max-w-xs`}
              />
              <span className="text-sm text-slate-400">/ service</span>
            </div>
          )}
        </section>

        {/* ── Business hours ────────────────────────────────────────────────── */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Business hours</h2>
          <p className={sectionSubClass}>Standard work week is Sun–Thu. Update anything that differs.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="w-28 pb-2 text-left text-xs font-semibold text-slate-400">Day</th>
                  <th className="w-20 pb-2 text-left text-xs font-semibold text-slate-400">Open</th>
                  <th className="pb-2 text-left text-xs font-semibold text-slate-400">From</th>
                  <th className="pb-2 text-left text-xs font-semibold text-slate-400">To</th>
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => {
                  const hours = profile.business_hours[day] ?? { open: false, from: '8:00 AM', to: '6:00 PM' };
                  const isWeekend = day === 'Friday' || day === 'Saturday';
                  return (
                    <tr key={day} className="border-b border-slate-50 last:border-none">
                      <td className="py-2.5 pr-4">
                        <span className={`text-sm font-medium ${isWeekend ? 'text-slate-400' : 'text-slate-700'}`}>
                          {t(day)}
                          {isWeekend ? <span className="ml-1 text-xs text-slate-300">({t('weekend')})</span> : null}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <input
                          type="checkbox"
                          checked={hours.open}
                          onChange={(e) => updateHours(day, 'open', e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                        />
                      </td>
                      <td className="py-2.5 pr-3">
                        <select
                          disabled={!hours.open}
                          value={hours.from}
                          onChange={(e) => updateHours(day, 'from', e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-emerald-400 disabled:opacity-40"
                        >
                          {TIMES.map((time) => (
                            <option key={time}>{time}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5">
                        <select
                          disabled={!hours.open}
                          value={hours.to}
                          onChange={(e) => updateHours(day, 'to', e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-emerald-400 disabled:opacity-40"
                        >
                          {TIMES.map((time) => (
                            <option key={time}>{time}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Payment methods ───────────────────────────────────────────────── */}
        <section id="section-payment" className={sectionCls('payment')}>
          <h2 className={sectionTitleClass}>
            Payment methods <span className="text-red-500">*</span>
          </h2>
          <p className={sectionSubClass}>Tell customers how they can pay you once the job is booked.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PAYMENT_METHODS.map((paymentMethod) => (
              <label
                key={paymentMethod.id}
                className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition ${
                  profile.payment_methods.includes(paymentMethod.id)
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-slate-100 hover:border-emerald-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={profile.payment_methods.includes(paymentMethod.id)}
                  onChange={() => {
                    const next = toggle(profile.payment_methods, paymentMethod.id);
                    setProfile({ ...profile, payment_methods: next });
                    if (next.length > 0) {
                      setFieldErrors((prev) => { const n = { ...prev }; delete n.payment; return n; });
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                <span className={profile.payment_methods.includes(paymentMethod.id) ? 'text-emerald-600' : 'text-slate-400'}>
                  {PAYMENT_METHOD_ICONS[paymentMethod.id]}
                </span>
                <span className="text-xs font-semibold text-slate-700">{paymentMethod.label}</span>
              </label>
            ))}
          </div>
          {errorTag('payment')}
        </section>

        {/* ── Social media ──────────────────────────────────────────────────── */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Social media & website</h2>
          <p className={sectionSubClass}>Links shown on your profile so customers can see your work online.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { key: 'instagram', label: 'Instagram username' },
              { key: 'snapchat', label: 'Snapchat username' },
              { key: 'twitter', label: 'Twitter / X username' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className={labelClass}>{label}</label>
                <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
                  <span className="border-r border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-400">@</span>
                  <input
                    type="text"
                    value={(profile as any)[key]}
                    onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                    placeholder="yourhandle"
                    className="flex-1 bg-white px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>
            ))}
            <div>
              <label className={labelClass}>Website URL</label>
              <input
                type="url"
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                placeholder="https://yoursite.com"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* ── Portfolio photos ──────────────────────────────────────────────── */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Projects & work photos</h2>
          <p className={sectionSubClass}>Photos improve trust and increase inquiry rates.</p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handlePhotoFiles(e.target.files)}
          />

          {profile.portfolio_photos.length > 0 ? (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {profile.portfolio_photos.map((src, index) => (
                <div key={index} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Work photo ${index + 1}`} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex flex-col items-end justify-between bg-black/40 p-1.5 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold leading-none transition hover:bg-red-700"
                      title="Remove"
                    >
                      ×
                    </button>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => movePhoto(index, 'up')}
                        disabled={index === 0}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-slate-700 text-xs disabled:opacity-30 hover:bg-white"
                        title="Move left"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => movePhoto(index, 'down')}
                        disabled={index === profile.portfolio_photos.length - 1}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-slate-700 text-xs disabled:opacity-30 hover:bg-white"
                        title="Move right"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                  <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-xs text-white">
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {profile.portfolio_photos.length < 10 ? (
            <div
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
                isDragging
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/40'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files.length) void handlePhotoFiles(e.dataTransfer.files);
              }}
            >
              <div className="mb-3 text-3xl">📷</div>
              <p className="text-sm font-semibold text-slate-700">
                {isDragging ? 'Drop photos here' : 'Upload photos of your work'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Up to 10 photos · JPG, PNG · Max 5 MB each · {10 - profile.portfolio_photos.length} remaining
              </p>
              <p className="mt-0.5 text-xs text-slate-400">Drag & drop or click to browse</p>
              <button
                type="button"
                disabled={photoUploading}
                className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              >
                {photoUploading ? 'Compressing...' : 'Add photos'}
              </button>
            </div>
          ) : (
            <p className="text-center text-xs text-slate-400">10 / 10 photos added. Remove one to add more.</p>
          )}
        </section>

        {/* ── Errors ───────────────────────────────────────────────────────── */}
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {Object.keys(fieldErrors).length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold">Please fix the highlighted sections before saving:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-amber-700">
              {Object.values(fieldErrors).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {saved ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
            <div className="text-4xl">✅</div>
            <p className="text-base font-bold text-emerald-800">
              {mode === 'dashboard'
                ? 'Marketplace profile updated successfully.'
                : returnToSetup
                  ? 'Profile saved! Taking you back to setup...'
                  : 'Profile saved! Taking you to your dashboard...'}
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving
              ? 'Saving profile...'
              : mode === 'dashboard'
                ? 'Save marketplace profile'
                : returnToSetup
                  ? 'Save profile & continue setup →'
                  : 'Complete profile →'}
          </button>
          {mode === 'dashboard' && (
            <button
              onClick={() => router.replace('/pro/dashboard/marketplace/requests')}
              className="rounded-xl border border-slate-200 px-6 py-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Back to marketplace
            </button>
          )}
        </div>

        <p className="pb-4 text-center text-xs text-slate-400">
          You can update your marketplace profile anytime from your dashboard settings.
        </p>
      </div>
    </div>
  );
}
