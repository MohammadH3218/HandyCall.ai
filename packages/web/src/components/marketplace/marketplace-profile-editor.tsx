'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconAlertCircle,
  IconArrowNarrowLeft,
  IconArrowNarrowRight,
  IconCheck,
  IconChevronDown,
  IconGripVertical,
  IconLoader2,
  IconPhoto,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { MARKETPLACE_SERVICE_CATEGORIES } from '@/constants/marketplace-service-categories';
import { RIYADH_DISTRICT_VALUES, SAUDI_MARKETPLACE_CITIES } from '@/constants/houston-areas';
import { useAuthStore } from '@/stores/auth-store';
import type { ServiceCategory } from '@/lib/shared';

const EMPLOYEE_OPTIONS = ['Just me', '2-5 team members', '6-20 team members', '20+ team members'];
const PROPERTY_TYPES = ['Villa', 'Apartment', 'Townhouse', 'Office', 'Commercial', 'Government Building'];
const PAYMENT_METHODS = ['Cash', 'Mada', 'Apple Pay', 'Credit / Debit Card', 'Bank transfer'];
const AVAILABILITY_DAYS = [
  { key: 'SUN', label: 'Sunday' },
  { key: 'MON', label: 'Monday' },
  { key: 'TUE', label: 'Tuesday' },
  { key: 'WED', label: 'Wednesday' },
  { key: 'THU', label: 'Thursday' },
  { key: 'FRI', label: 'Friday' },
  { key: 'SAT', label: 'Saturday' },
] as const;
const TIME_HOUR_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const TIME_MINUTE_OPTIONS = ['00', '15', '30', '45'];
const TIME_MERIDIEM_OPTIONS = ['AM', 'PM'] as const;
const MAX_WORK_PHOTOS = 12;
const SAVE_PROGRESS_STEPS = [
  'Preparing your profile changes',
  'Uploading photos and documents',
  'Saving your marketplace profile',
  'Finishing up and checking the response',
];

const SERVICE_CATEGORY_BY_KEY: Record<string, ServiceCategory> = {
  'ac-hvac': 'AC_HVAC',
  plumbing: 'PLUMBING',
  electrical: 'ELECTRICAL',
  painting: 'PAINTING',
  'house-cleaning': 'CLEANING',
  'pest-control': 'PEST_CONTROL',
  carpentry: 'CARPENTRY',
  moving: 'MOVING',
  'appliance-repair': 'APPLIANCE_REPAIR',
  landscaping: 'LANDSCAPING',
  handyman: 'GENERAL_HANDYMAN',
};

const CATEGORY_KEY_BY_SERVICE_CATEGORY: Partial<Record<ServiceCategory, string>> = Object.fromEntries(
  Object.entries(SERVICE_CATEGORY_BY_KEY).map(([key, value]) => [value, key]),
) as Partial<Record<ServiceCategory, string>>;

type Mode = 'onboarding' | 'dashboard';

type MarketplaceForm = {
  bio: string;
  years_experience: string;
  employee_count_range: string;
  service_category: string;
  services_offered: string[];
  property_types: string[];
  service_districts: string[];
  contact_for_price: boolean;
  starting_price_sar: string;
  payment_methods: string[];
  license_type: string;
  license_number: string;
  cr_number: string;
  vat_number: string;
  speaks_arabic: boolean;
  speaks_english: boolean;
  speaks_urdu: boolean;
  speaks_hindi: boolean;
  availability: Array<{
    day_of_week: (typeof AVAILABILITY_DAYS)[number]['key'];
    open_time: string;
    close_time: string;
    is_available: boolean;
  }>;
};

type SectionKey = 'photo' | 'about' | 'services' | 'districts' | 'payment' | 'availability';

type WorkPhotoItem =
  | {
      id: string;
      kind: 'existing';
      key: string;
      preview: string;
    }
  | {
      id: string;
      kind: 'new';
      uploadId: string;
      file: File;
      preview: string;
    };

const DEFAULT_FORM: MarketplaceForm = {
  bio: '',
  years_experience: '',
  employee_count_range: '',
  service_category: '',
  services_offered: [],
  property_types: [],
  service_districts: [],
  contact_for_price: false,
  starting_price_sar: '',
  payment_methods: [],
  license_type: '',
  license_number: '',
  cr_number: '',
  vat_number: '',
  speaks_arabic: true,
  speaks_english: true,
  speaks_urdu: false,
  speaks_hindi: false,
  availability: AVAILABILITY_DAYS.map((day) => ({
    day_of_week: day.key,
    open_time: '09:00',
    close_time: '18:00',
    is_available: day.key !== 'FRI' && day.key !== 'SAT',
  })),
};

function getLegacyMarketplaceProfile(pro: any) {
  if (!pro || typeof pro !== 'object') return {};
  return pro.marketplace_profile && typeof pro.marketplace_profile === 'object'
    ? pro.marketplace_profile
    : {};
}

function getFirstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function getFirstArray(...values: unknown[]) {
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    const normalized = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
    if (normalized.length > 0) {
      return normalized;
    }
  }
  return [];
}

function getCategoryTitle(rawCategory: string) {
  if (!rawCategory) return '';

  return (
    MARKETPLACE_SERVICE_CATEGORIES.find(
      (item) => item.key === CATEGORY_KEY_BY_SERVICE_CATEGORY[rawCategory as ServiceCategory],
    )?.title ||
    MARKETPLACE_SERVICE_CATEGORIES.find((item) => item.title === rawCategory)?.title ||
    rawCategory
  );
}

function getLegacyAvailability(hours: any) {
  if (!hours || typeof hours !== 'object') return null;

  const dayMap: Record<string, string> = {
    SUN: 'sunday',
    MON: 'monday',
    TUE: 'tuesday',
    WED: 'wednesday',
    THU: 'thursday',
    FRI: 'friday',
    SAT: 'saturday',
  };

  return AVAILABILITY_DAYS.map((day) => {
    const key = dayMap[day.key];
    const slot = hours?.[key];
    return {
      day_of_week: day.key,
      open_time: normalizeTwentyFourHourTime(getFirstString(slot?.from, slot?.open_time, slot?.open) || '09:00'),
      close_time: normalizeTwentyFourHourTime(getFirstString(slot?.to, slot?.close_time, slot?.close) || '18:00'),
      is_available:
        typeof slot?.open === 'boolean'
          ? slot.open
          : slot?.closed === true
            ? false
            : day.key !== 'FRI' && day.key !== 'SAT',
    };
  });
}

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Failed to read image.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}

async function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image.'));
    image.src = src;
  });
}

async function cropSquareImage(
  file: File,
  crop: { zoom: number; offsetX: number; offsetY: number },
): Promise<{ file: File; previewUrl: string }> {
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const canvas = document.createElement('canvas');
  const size = 900;
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image canvas is unavailable.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2 + crop.offsetX, size / 2 + crop.offsetY);
  ctx.scale(crop.zoom, crop.zoom);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
  ctx.restore();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (!nextBlob) {
        reject(new Error('Failed to prepare the cropped image.'));
        return;
      }
      resolve(nextBlob);
    }, 'image/jpeg', 0.92);
  });

  const croppedFile = new File([blob], file.name.replace(/\.\w+$/, '') + '-cropped.jpg', {
    type: 'image/jpeg',
  });

  return {
    file: croppedFile,
    previewUrl: canvas.toDataURL('image/jpeg', 0.92),
  };
}

function normalizeTwentyFourHourTime(value?: string) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return '09:00';
  return value;
}

function getTimeParts(value?: string) {
  const normalized = normalizeTwentyFourHourTime(value);
  const [rawHour, minute] = normalized.split(':');
  const hour24 = Number(rawHour);
  const meridiem: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return {
    hour: String(hour12),
    minute,
    meridiem,
  };
}

function toTwentyFourHourTime(hour: string, minute: string, meridiem: 'AM' | 'PM') {
  const parsedHour = Number(hour || '12');
  const normalizedHour = parsedHour % 12;
  const hour24 = meridiem === 'PM' ? normalizedHour + 12 : normalizedHour;
  return `${String(hour24).padStart(2, '0')}:${minute}`;
}

function TimePickerField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const parts = getTimeParts(value);

  function handlePartChange(next: Partial<{ hour: string; minute: string; meridiem: 'AM' | 'PM' }>) {
    const hour = next.hour ?? parts.hour;
    const minute = next.minute ?? parts.minute;
    const meridiem = next.meridiem ?? parts.meridiem;
    onChange(toTwentyFourHourTime(hour, minute, meridiem));
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-slate-900">{label}</Label>
      <div className="grid grid-cols-3 gap-2">
        <select
          value={parts.hour}
          disabled={disabled}
          onChange={(event) => handlePartChange({ hour: event.target.value })}
          className="h-11 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-emerald-300 disabled:bg-slate-50 disabled:text-slate-400"
        >
          {TIME_HOUR_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          value={parts.minute}
          disabled={disabled}
          onChange={(event) => handlePartChange({ minute: event.target.value })}
          className="h-11 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-emerald-300 disabled:bg-slate-50 disabled:text-slate-400"
        >
          {TIME_MINUTE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          value={parts.meridiem}
          disabled={disabled}
          onChange={(event) =>
            handlePartChange({ meridiem: event.target.value as (typeof TIME_MERIDIEM_OPTIONS)[number] })
          }
          className="h-11 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-emerald-300 disabled:bg-slate-50 disabled:text-slate-400"
        >
          {TIME_MERIDIEM_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  invalid,
  children,
}: {
  title: string;
  description: string;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-[28px] border bg-white p-7 shadow-sm ${
        invalid ? 'border-rose-300 shadow-rose-100/60' : 'border-slate-200'
      }`}
    >
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">
          {title}
          {invalid ? <span className="ml-1 text-rose-500">*</span> : null}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function createWorkPhotoId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function SearchableSelect({
  label,
  placeholder,
  value,
  options,
  onSelect,
  error,
}: {
  label: string;
  placeholder: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  error?: string;
}) {
  const [search, setSearch] = useState(value);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return options.filter((option) => option.toLowerCase().includes(term)).slice(0, 8);
  }, [options, search]);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-slate-900">
        {label} <span className="text-rose-500">*</span>
      </Label>
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <IconSearch className="h-4 w-4" stroke={1.7} />
        </div>
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder={placeholder}
          className={`pl-9 pr-10 ${error ? 'border-rose-300 focus-visible:ring-rose-200' : ''}`}
        />
        <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" stroke={1.7} />
        {open && filteredOptions.length > 0 ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            {filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(option);
                  setSearch(option);
                  setOpen(false);
                }}
                className="flex w-full items-center px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-emerald-50"
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}

function SavingOverlay({
  open,
  progress,
  stepLabel,
}: {
  open: boolean;
  progress: number;
  stepLabel: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_40px_120px_-40px_rgba(15,23,42,0.45)]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <IconLoader2 className="h-6 w-6 animate-spin" stroke={1.9} />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">Saving marketplace profile</p>
            <p className="text-sm text-slate-500">Please keep this tab open while we upload your changes.</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
              style={{ width: `${Math.max(8, Math.min(progress, 96))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            <span>In progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <p className="text-sm text-slate-600">{stepLabel}</p>
        </div>
      </div>
    </div>
  );
}

export function MarketplaceProfileEditor({
  mode,
}: {
  mode: Mode;
  selectedTier?: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const workPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const { setProProfile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<MarketplaceForm>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sectionErrors, setSectionErrors] = useState<Partial<Record<SectionKey, string>>>({});
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState('');
  const [workPhotos, setWorkPhotos] = useState<WorkPhotoItem[]>([]);
  const [rawPhotoFile, setRawPhotoFile] = useState<File | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState('');
  const [cropState, setCropState] = useState({ zoom: 1, offsetX: 0, offsetY: 0 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceSearchOpen, setServiceSearchOpen] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');
  const [districtSearchOpen, setDistrictSearchOpen] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveStepIndex, setSaveStepIndex] = useState(0);
  const cropDragPointerIdRef = useRef<number | null>(null);
  const cropDragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const draggedWorkPhotoIdRef = useRef<string | null>(null);
  const saveProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bankInfoRef = useRef({ iban: '', bank_name: '' });
  const initialExistingWorkPhotoKeysRef = useRef<string[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const response = await apiClient.getMyProOnboardingStatus();
        if (!mounted) return;

        const pro = response?.pro || {};
        const legacyProfile = getLegacyMarketplaceProfile(pro);
        const availability = Array.isArray(response?.availability) && response.availability.length > 0
          ? AVAILABILITY_DAYS.map((day) => {
              const existing = response.availability.find((slot: any) => slot.day_of_week === day.key);
              return {
                day_of_week: day.key,
                open_time: existing?.open_time || '09:00',
                close_time: existing?.close_time || '18:00',
                is_available:
                  existing?.is_available === undefined
                    ? day.key !== 'FRI' && day.key !== 'SAT'
                    : Boolean(existing?.is_available),
              };
            })
          : getLegacyAvailability(legacyProfile.business_hours) || DEFAULT_FORM.availability;

        const mergedStartingPrice =
          typeof pro.starting_price_sar === 'number'
            ? String((pro.starting_price_sar / 100).toFixed(0))
            : typeof legacyProfile.starting_price === 'number'
              ? String(legacyProfile.starting_price)
              : getFirstString(legacyProfile.starting_price);

        setForm({
          bio: getFirstString(pro.bio, legacyProfile.bio),
          years_experience:
            typeof pro.years_experience === 'number'
              ? String(pro.years_experience)
              : typeof legacyProfile.years_experience === 'number'
                ? String(legacyProfile.years_experience)
                : typeof legacyProfile.years_in_business === 'number'
                  ? String(legacyProfile.years_in_business)
                  : getFirstString(legacyProfile.years_experience, legacyProfile.years_in_business),
          employee_count_range: getFirstString(
            pro.employee_count_range,
            legacyProfile.employee_count_range,
            legacyProfile.employees,
          ),
          service_category: getCategoryTitle(
            getFirstString(pro.service_category, legacyProfile.service_category),
          ),
          services_offered: getFirstArray(pro.services_offered, legacyProfile.services_offered),
          property_types: getFirstArray(pro.property_types, legacyProfile.property_types),
          service_districts: getFirstArray(
            pro.service_districts,
            legacyProfile.service_districts,
            legacyProfile.service_cities,
          ),
          contact_for_price:
            typeof (pro as any).contact_for_price === 'boolean'
              ? Boolean((pro as any).contact_for_price)
              : Boolean(legacyProfile.contact_for_price),
          starting_price_sar: mergedStartingPrice,
          payment_methods: getFirstArray(pro.payment_methods, legacyProfile.payment_methods),
          license_type: getFirstString(pro.license_type, legacyProfile.license_type),
          license_number: getFirstString(pro.license_number, legacyProfile.license_number),
          cr_number: getFirstString(pro.cr_number, legacyProfile.cr_number),
          vat_number: getFirstString(pro.vat_number, legacyProfile.vat_number),
          speaks_arabic:
            typeof pro.speaks_arabic === 'boolean'
              ? pro.speaks_arabic
              : legacyProfile.speaks_arabic !== false,
          speaks_english:
            typeof pro.speaks_english === 'boolean'
              ? pro.speaks_english
              : legacyProfile.speaks_english !== false,
          speaks_urdu:
            typeof pro.speaks_urdu === 'boolean'
              ? pro.speaks_urdu
              : Boolean(legacyProfile.speaks_urdu),
          speaks_hindi:
            typeof pro.speaks_hindi === 'boolean'
              ? pro.speaks_hindi
              : Boolean(legacyProfile.speaks_hindi),
          availability,
        });
        setProfilePhotoPreview(
          getFirstString(pro.profile_photo_url, pro.profile_photo_s3_key, legacyProfile.profile_photo),
        );
        bankInfoRef.current = {
          iban: typeof (pro as any).iban === 'string' ? (pro as any).iban : '',
          bank_name: typeof (pro as any).bank_name === 'string' ? (pro as any).bank_name : '',
        };
        const nextExistingKeys = Array.isArray((pro as any).work_photo_s3_keys)
          ? (pro as any).work_photo_s3_keys.filter(Boolean)
          : [];
        initialExistingWorkPhotoKeysRef.current = nextExistingKeys;
        const nextExistingPreviews = Array.isArray((pro as any).work_photo_urls)
          ? (pro as any).work_photo_urls.filter(Boolean)
          : nextExistingKeys;
        setWorkPhotos(
          nextExistingKeys.map((key, index) => ({
            id: createWorkPhotoId(),
            kind: 'existing' as const,
            key,
            preview: nextExistingPreviews[index] || key,
          })),
        );
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'Failed to load your marketplace profile.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedCategory = useMemo(
    () => MARKETPLACE_SERVICE_CATEGORIES.find((category) => category.title === form.service_category) || null,
    [form.service_category],
  );

  const serviceSuggestions = useMemo(() => {
    if (!selectedCategory) return [];
    const term = serviceSearch.trim().toLowerCase();
    return selectedCategory.services
      .filter((service) => !form.services_offered.includes(service))
      .filter((service) => !term || service.toLowerCase().includes(term))
      .slice(0, 8);
  }, [form.services_offered, selectedCategory, serviceSearch]);

  const districtSuggestions = useMemo(() => {
    const term = districtSearch.trim().toLowerCase();
    return RIYADH_DISTRICT_VALUES
      .filter((district) => !form.service_districts.includes(district))
      .filter((district) => !term || district.toLowerCase().includes(term))
      .slice(0, 10);
  }, [districtSearch, form.service_districts]);

  const popularDistricts = useMemo(
    () => SAUDI_MARKETPLACE_CITIES.filter((district) => district.popular).map((district) => district.label),
    [],
  );

  useEffect(() => {
    return () => {
      if (saveProgressIntervalRef.current) {
        clearInterval(saveProgressIntervalRef.current);
      }
    };
  }, []);

  function setField<K extends keyof MarketplaceForm>(key: K, value: MarketplaceForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleValue(list: string[], value: string) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  function toggleAvailability(dayKey: (typeof AVAILABILITY_DAYS)[number]['key']) {
    setForm((current) => ({
      ...current,
      availability: current.availability.map((slot) =>
        slot.day_of_week === dayKey ? { ...slot, is_available: !slot.is_available } : slot,
      ),
    }));
  }

  async function handlePhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const imageUrl = await readFileAsDataUrl(file);
    setRawPhotoFile(file);
    setCropImageUrl(imageUrl);
    setCropState({ zoom: 1, offsetX: 0, offsetY: 0 });
    setCropDialogOpen(true);
    event.target.value = '';
  }

  async function applyCrop() {
    if (!rawPhotoFile) return;
    const cropped = await cropSquareImage(rawPhotoFile, cropState);
    setProfilePhotoFile(cropped.file);
    setProfilePhotoPreview(cropped.previewUrl);
    setCropDialogOpen(false);
    setCropImageUrl('');
    setRawPhotoFile(null);
  }

  function handleCropDialogOpenChange(nextOpen: boolean) {
    setCropDialogOpen(nextOpen);
    if (!nextOpen) {
      setCropImageUrl('');
      setRawPhotoFile(null);
      setCropState({ zoom: 1, offsetX: 0, offsetY: 0 });
      cropDragPointerIdRef.current = null;
      setIsDraggingCrop(false);
    }
  }

  function handleCropPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!cropImageUrl) return;
    cropDragPointerIdRef.current = event.pointerId;
    cropDragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: cropState.offsetX,
      offsetY: cropState.offsetY,
    };
    setIsDraggingCrop(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCropPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingCrop || cropDragPointerIdRef.current !== event.pointerId) return;

    const deltaX = event.clientX - cropDragStartRef.current.x;
    const deltaY = event.clientY - cropDragStartRef.current.y;

    setCropState((current) => ({
      ...current,
      offsetX: cropDragStartRef.current.offsetX + deltaX,
      offsetY: cropDragStartRef.current.offsetY + deltaY,
    }));
  }

  function endCropDrag(event?: React.PointerEvent<HTMLDivElement>) {
    if (event && cropDragPointerIdRef.current === event.pointerId) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // ignore pointer release issues
      }
    }
    cropDragPointerIdRef.current = null;
    setIsDraggingCrop(false);
  }

  async function handleWorkPhotosSelected(event: ChangeEvent<HTMLInputElement>) {
    const incomingFiles = Array.from(event.target.files || []);
    if (incomingFiles.length === 0) return;

    const remainingSlots = MAX_WORK_PHOTOS - workPhotos.length;

    if (remainingSlots <= 0) {
      setError(`You can upload up to ${MAX_WORK_PHOTOS} work photos.`);
      event.target.value = '';
      return;
    }

    const acceptedFiles = incomingFiles.slice(0, remainingSlots);
    const acceptedPreviews = await Promise.all(acceptedFiles.map((file) => readFileAsDataUrl(file)));

    if (acceptedFiles.length < incomingFiles.length) {
      setError(`Only ${MAX_WORK_PHOTOS} work photos are allowed total.`);
    } else {
      setError(null);
    }

    setWorkPhotos((current) => [
      ...current,
      ...acceptedFiles.map((file, index) => ({
        id: createWorkPhotoId(),
        kind: 'new' as const,
        uploadId: createWorkPhotoId(),
        file,
        preview: acceptedPreviews[index],
      })),
    ]);
    event.target.value = '';
  }

  function addSpecificService(value: string) {
    const trimmed = value.trim();
    if (!trimmed || form.services_offered.includes(trimmed) || form.services_offered.length >= 10) {
      return;
    }
    setField('services_offered', [...form.services_offered, trimmed]);
    setServiceSearch('');
    setServiceSearchOpen(false);
  }

  function addDistrict(value: string) {
    const trimmed = value.trim();
    if (!trimmed || form.service_districts.includes(trimmed)) return;
    setField('service_districts', [...form.service_districts, trimmed]);
    setDistrictSearch('');
    setDistrictSearchOpen(false);
  }

  function removeWorkPhoto(photoId: string) {
    setWorkPhotos((current) => current.filter((photo) => photo.id !== photoId));
    setError(null);
  }

  function moveWorkPhoto(photoId: string, direction: -1 | 1) {
    setWorkPhotos((current) => {
      const index = current.findIndex((photo) => photo.id === photoId);
      if (index === -1) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;

      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  function moveWorkPhotoToIndex(photoId: string, targetIndex: number) {
    setWorkPhotos((current) => {
      const index = current.findIndex((photo) => photo.id === photoId);
      if (index === -1 || targetIndex < 0 || targetIndex >= current.length || index === targetIndex) {
        return current;
      }

      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  }

  function startSavingFeedback() {
    if (saveProgressIntervalRef.current) {
      clearInterval(saveProgressIntervalRef.current);
    }

    setSaveProgress(12);
    setSaveStepIndex(0);
    saveProgressIntervalRef.current = setInterval(() => {
      setSaveProgress((current) => {
        const next = Math.min(current + (current < 55 ? 11 : current < 78 ? 6 : 3), 92);
        return next;
      });
      setSaveStepIndex((current) => Math.min(current + 1, SAVE_PROGRESS_STEPS.length - 1));
    }, 1400);
  }

  function stopSavingFeedback(nextProgress = 100) {
    if (saveProgressIntervalRef.current) {
      clearInterval(saveProgressIntervalRef.current);
      saveProgressIntervalRef.current = null;
    }
    setSaveProgress(nextProgress);
  }

  function getFriendlySaveError(message: string) {
    const normalized = message.toLowerCase();

    if (normalized.includes('404') || normalized.includes('not found')) {
      return 'Your profile could not be saved because the marketplace save endpoint is unavailable right now. Please try again in a moment or contact support if it keeps happening.';
    }

    if (normalized.includes('missing the saved payout details')) {
      return message;
    }

    if (normalized.includes('work-photo uploads or reordering still require')) {
      return message;
    }

    if (normalized.includes('413') || normalized.includes('payload too large')) {
      return 'One or more photos are too large to upload. Try smaller images or fewer files and save again.';
    }

    if (normalized.includes('network') || normalized.includes('failed to fetch')) {
      return 'Your connection was interrupted while saving. Check your internet connection and try again.';
    }

    return message || 'Failed to save your marketplace profile.';
  }

  function validateForm() {
    const nextFieldErrors: Record<string, string> = {};
    const nextSectionErrors: Partial<Record<SectionKey, string>> = {};

    if (!profilePhotoPreview) {
      nextFieldErrors.profile_photo = 'Profile photo is required.';
      nextSectionErrors.photo = 'Upload and crop a clear profile photo.';
    }

    if (workPhotos.length > MAX_WORK_PHOTOS) {
      nextFieldErrors.work_photos = `Only ${MAX_WORK_PHOTOS} work photos are allowed.`;
      nextSectionErrors.photo = nextSectionErrors.photo || `Keep your work-photo gallery at ${MAX_WORK_PHOTOS} images or fewer.`;
    }

    if (!form.bio.trim() || form.bio.trim().length < 80) {
      nextFieldErrors.bio = 'Add a fuller business bio with at least 80 characters.';
      nextSectionErrors.about = 'Expand the business bio so customers understand what you do.';
    }

    if (!form.years_experience.trim()) {
      nextFieldErrors.years_experience = 'Years in business is required.';
      nextSectionErrors.about = nextSectionErrors.about || 'Add your experience and team size.';
    }

    if (!form.employee_count_range) {
      nextFieldErrors.employee_count_range = 'Team size is required.';
      nextSectionErrors.about = nextSectionErrors.about || 'Add your experience and team size.';
    }

    if (!form.service_category) {
      nextFieldErrors.service_category = 'Main category is required.';
      nextSectionErrors.services = 'Choose the main category customers should find you under.';
    }

    if (form.services_offered.length === 0) {
      nextFieldErrors.services_offered = 'Add at least one specific service.';
      nextSectionErrors.services = nextSectionErrors.services || 'Add the exact services customers should be able to search for.';
    }

    if (form.property_types.length === 0) {
      nextFieldErrors.property_types = 'Choose at least one property type.';
      nextSectionErrors.services = nextSectionErrors.services || 'Select the property types you serve.';
    }

    if (form.service_districts.length === 0) {
      nextFieldErrors.service_districts = 'Choose at least one Riyadh district.';
      nextSectionErrors.districts = 'Choose the districts you actively cover.';
    }

    if (!form.contact_for_price && !form.starting_price_sar.trim()) {
      nextFieldErrors.starting_price_sar = 'Starting price is required.';
      nextSectionErrors.payment = 'Set a starting price and payment methods.';
    }

    if (form.payment_methods.length === 0) {
      nextFieldErrors.payment_methods = 'Choose at least one payment method.';
      nextSectionErrors.payment = nextSectionErrors.payment || 'Set a starting price and payment methods.';
    }

    if (!form.availability.some((slot) => slot.is_available)) {
      nextFieldErrors.availability = 'Open at least one business day.';
      nextSectionErrors.availability = 'Set your working hours for at least one day.';
    }

    setFieldErrors(nextFieldErrors);
    setSectionErrors(nextSectionErrors);

    return Object.keys(nextFieldErrors).length === 0;
  }

  function hasUnsupportedLegacyPhotoChanges() {
    const hasNewWorkPhotos = workPhotos.some((photo) => photo.kind === 'new');
    const existingWorkPhotoOrder = workPhotos
      .filter((photo): photo is Extract<WorkPhotoItem, { kind: 'existing' }> => photo.kind === 'existing')
      .map((photo) => photo.key);

    return (
      hasNewWorkPhotos ||
      existingWorkPhotoOrder.length !== initialExistingWorkPhotoKeysRef.current.length ||
      existingWorkPhotoOrder.some((key, index) => key !== initialExistingWorkPhotoKeysRef.current[index])
    );
  }

  async function submitMarketplaceProfileLegacy(backendCategory: ServiceCategory) {
    if (hasUnsupportedLegacyPhotoChanges()) {
      throw new Error(
        'The live backend can save profile details right now, but work-photo uploads or reordering still require the newer marketplace save API. Save again without changing work photos, or wait for the backend update.',
      );
    }

    const profilePayload = new FormData();
    if (profilePhotoFile) {
      profilePayload.append('profile_photo', profilePhotoFile);
    }
    profilePayload.append('bio', form.bio.trim());
    profilePayload.append('years_experience', form.years_experience.trim());
    profilePayload.append('speaks_arabic', String(form.speaks_arabic));
    profilePayload.append('speaks_english', String(form.speaks_english));
    profilePayload.append('speaks_urdu', String(form.speaks_urdu));
    profilePayload.append('speaks_hindi', String(form.speaks_hindi));
    await apiClient.submitProLegacyProfileSetup(profilePayload);

    await apiClient.submitProLegacyServicesSetup({
      services: form.services_offered.map((service) => ({
        category: backendCategory,
        title: service,
        description: form.bio.trim() || undefined,
        pricing_type: 'QUOTE' as const,
        min_price_sar: form.starting_price_sar.trim()
          ? Number(form.starting_price_sar.trim())
          : undefined,
        max_price_sar: form.starting_price_sar.trim()
          ? Number(form.starting_price_sar.trim())
          : undefined,
        vat_included: true,
        estimated_duration_minutes: 60,
      })),
    });

    if (!bankInfoRef.current.iban || !bankInfoRef.current.bank_name) {
      throw new Error(
        'Your public profile details were updated, but this account is missing the saved payout details required by the live backend. Please contact support so we can finish the business-hours update safely.',
      );
    }

    await apiClient.submitProLegacyPayoutSetup({
      iban: bankInfoRef.current.iban,
      bank_name: bankInfoRef.current.bank_name,
      service_districts: form.service_districts,
      availability: form.availability.map((slot) => ({
        day_of_week: slot.day_of_week,
        open_time: slot.open_time,
        close_time: slot.close_time,
        is_available: slot.is_available,
      })),
    });

    return apiClient.getMyProOnboardingStatus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      setError('Complete the required sections marked in red before submitting.');
      return;
    }

    if (!selectedCategory) {
      setError('Choose a valid marketplace category.');
      return;
    }

    const backendCategory = SERVICE_CATEGORY_BY_KEY[selectedCategory.key];
    if (!backendCategory) {
      setError('This category is not ready for marketplace submission yet.');
      return;
    }

    try {
      setSaving(true);
      startSavingFeedback();
      const payload = new FormData();
      const existingWorkPhotoKeys = workPhotos
        .filter((photo): photo is Extract<WorkPhotoItem, { kind: 'existing' }> => photo.kind === 'existing')
        .map((photo) => photo.key);
      const newWorkPhotos = workPhotos.filter(
        (photo): photo is Extract<WorkPhotoItem, { kind: 'new' }> => photo.kind === 'new',
      );

      if (profilePhotoFile) {
        payload.append('profile_photo', profilePhotoFile);
      }
      payload.append('existing_work_photo_s3_keys', JSON.stringify(existingWorkPhotoKeys));
      payload.append(
        'work_photo_upload_ids',
        JSON.stringify(newWorkPhotos.map((photo) => photo.uploadId)),
      );
      payload.append(
        'work_photo_order',
        JSON.stringify(
          workPhotos.map((photo) =>
            photo.kind === 'existing' ? `existing:${photo.key}` : `new:${photo.uploadId}`,
          ),
        ),
      );
      newWorkPhotos.forEach((photo) => {
        payload.append('work_photos', photo.file);
      });
      payload.append('bio', form.bio.trim());
      payload.append('years_experience', form.years_experience.trim());
      payload.append('employee_count_range', form.employee_count_range);
      payload.append('speaks_arabic', String(form.speaks_arabic));
      payload.append('speaks_english', String(form.speaks_english));
      payload.append('speaks_urdu', String(form.speaks_urdu));
      payload.append('speaks_hindi', String(form.speaks_hindi));
      payload.append('service_category', backendCategory);
      payload.append('services_offered', JSON.stringify(form.services_offered));
      payload.append('property_types', JSON.stringify(form.property_types));
      payload.append('service_districts', JSON.stringify(form.service_districts));
      payload.append('contact_for_price', String(form.contact_for_price));
      if (!form.contact_for_price && form.starting_price_sar.trim()) {
        payload.append('starting_price_sar', form.starting_price_sar.trim());
      }
      payload.append('payment_methods', JSON.stringify(form.payment_methods));
      payload.append('availability', JSON.stringify(form.availability));
      payload.append('license_type', form.license_type.trim());
      payload.append('license_number', form.license_number.trim());
      payload.append('cr_number', form.cr_number.trim());
      payload.append('vat_number', form.vat_number.trim());

      let result: any;
      try {
        result = await apiClient.submitProMarketplaceSetup(payload);
      } catch (marketplaceError: any) {
        const normalizedMessage = String(marketplaceError?.message || '').toLowerCase();
        const shouldFallback =
          normalizedMessage.includes('cannot post /api/v1/pros/onboarding/marketplace') ||
          normalizedMessage.includes('cannot post /pros/onboarding/marketplace') ||
          normalizedMessage.includes('404') ||
          normalizedMessage.includes('not found');

        if (!shouldFallback) {
          throw marketplaceError;
        }

        setSaveStepIndex(2);
        setSaveProgress((current) => Math.max(current, 62));
        result = await submitMarketplaceProfileLegacy(backendCategory);
      }

      stopSavingFeedback(100);
      setSaveStepIndex(SAVE_PROGRESS_STEPS.length - 1);
      setProProfile(result?.pro || result);
      const successMessage =
        mode === 'dashboard'
          ? 'Your public profile changes were saved and submitted for review.'
          : 'Your marketplace profile has been submitted for admin review.';
      setSuccess(successMessage);
      toast({
        title: 'Profile saved',
        description: successMessage,
      });
      if (mode === 'dashboard') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        router.replace('/pro/review-status');
      }
    } catch (err: any) {
      stopSavingFeedback(0);
      const friendlyMessage = getFriendlySaveError(err?.message || 'Failed to save your marketplace profile.');
      setError(friendlyMessage);
      toast({
        title: 'Could not save profile',
        description: friendlyMessage,
        variant: 'destructive',
      });
    } finally {
      if (saveProgressIntervalRef.current) {
        clearInterval(saveProgressIntervalRef.current);
        saveProgressIntervalRef.current = null;
      }
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <IconLoader2 className="h-8 w-8 animate-spin text-emerald-600" stroke={1.7} />
      </div>
    );
  }

  return (
    <>
      <SavingOverlay
        open={saving}
        progress={saveProgress}
        stepLabel={SAVE_PROGRESS_STEPS[saveStepIndex] || SAVE_PROGRESS_STEPS[0]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        {Object.keys(sectionErrors).length > 0 ? (
          <section className="rounded-[28px] border border-rose-200 bg-rose-50 p-6">
            <div className="flex items-start gap-3">
              <IconAlertCircle className="mt-0.5 h-5 w-5 text-rose-600" stroke={1.7} />
              <div>
                <p className="text-sm font-semibold text-rose-700">Complete these required sections</p>
                <ul className="mt-3 space-y-2 text-sm text-rose-700">
                  {Object.values(sectionErrors).map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ) : null}

        <Section
          title={mode === 'dashboard' ? 'Edit your public profile' : 'Complete your marketplace profile'}
          description="Customers will only see this profile after the HandyCall admin team approves it."
          invalid={false}
        >
          <p className="text-sm leading-6 text-slate-600">
            Your profile will stay private until it passes manual review. Updating it later can also send it back through review if the public details change.
          </p>
        </Section>

        <Section
          title="Profile photo"
          description={`A clear headshot is required. You can also add up to ${MAX_WORK_PHOTOS} work photos customers will see on your public profile.`}
          invalid={Boolean(sectionErrors.photo)}
        >
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[28px] border border-dashed border-slate-300 bg-slate-50">
                {profilePhotoPreview ? (
                  <img src={profilePhotoPreview} alt="Profile preview" className="h-full w-full object-cover" />
                ) : (
                  <IconPhoto className="h-8 w-8 text-slate-300" stroke={1.7} />
                )}
              </div>
              <div className="space-y-2">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  {profilePhotoPreview ? 'Change photo' : 'Upload photo'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handlePhotoSelected}
                />
                <p className="text-sm text-slate-500">JPG, PNG, or WebP. Max 5MB.</p>
                {fieldErrors.profile_photo ? (
                  <p className="text-sm text-rose-600">{fieldErrors.profile_photo}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Work photos</p>
                  <p className="text-sm text-slate-500">
                    {workPhotos.length} of {MAX_WORK_PHOTOS} selected
                  </p>
                </div>
                <div className="space-y-2 sm:text-right">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => workPhotoInputRef.current?.click()}
                    disabled={workPhotos.length >= MAX_WORK_PHOTOS}
                  >
                    Add work photos
                  </Button>
                  <input
                    ref={workPhotoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    className="hidden"
                    onChange={handleWorkPhotosSelected}
                  />
                </div>
              </div>

              {workPhotos.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {workPhotos.map((photo, index) => (
                    <div
                      key={photo.id}
                      draggable
                      onDragStart={() => {
                        draggedWorkPhotoIdRef.current = photo.id;
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const draggedId = draggedWorkPhotoIdRef.current;
                        if (draggedId) {
                          moveWorkPhotoToIndex(draggedId, index);
                        }
                        draggedWorkPhotoIdRef.current = null;
                      }}
                      onDragEnd={() => {
                        draggedWorkPhotoIdRef.current = null;
                      }}
                      className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                    >
                      <img
                        src={photo.preview}
                        alt={`${photo.kind === 'existing' ? 'Saved' : 'New'} work photo ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-x-2 top-2 flex items-center justify-between gap-2 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                        <div className="flex items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-[11px] font-medium text-white">
                          <IconGripVertical className="h-3.5 w-3.5" stroke={2} />
                          Drag
                        </div>
                        <button
                          type="button"
                          onClick={() => removeWorkPhoto(photo.id)}
                          className="rounded-full bg-black/65 p-1 text-white"
                        >
                          <IconX className="h-4 w-4" stroke={2} />
                        </button>
                      </div>
                      <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-8 rounded-full bg-white/95 px-2 text-slate-700 shadow-sm"
                          onClick={() => moveWorkPhoto(photo.id, -1)}
                          disabled={index === 0}
                        >
                          <IconArrowNarrowLeft className="h-4 w-4" stroke={2} />
                        </Button>
                        <span className="rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-white">
                          {index + 1}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-8 rounded-full bg-white/95 px-2 text-slate-700 shadow-sm"
                          onClick={() => moveWorkPhoto(photo.id, 1)}
                          disabled={index === workPhotos.length - 1}
                        >
                          <IconArrowNarrowRight className="h-4 w-4" stroke={2} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Add photos of completed jobs, workmanship, or before-and-after results.
                </div>
              )}

              {workPhotos.length > 1 ? (
                <p className="text-sm text-slate-500">
                  Drag photos to reorder them, or use the left and right buttons. The first photo appears first to customers.
                </p>
              ) : null}

              {fieldErrors.work_photos ? (
                <p className="text-sm text-rose-600">{fieldErrors.work_photos}</p>
              ) : null}
            </div>
          </div>
        </Section>

        <Section
          title="About your business"
          description="Everything here is required except the credentials block below."
          invalid={Boolean(sectionErrors.about)}
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bio" className="text-sm font-semibold text-slate-900">
                Business bio <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="bio"
                value={form.bio}
                onChange={(event) => setField('bio', event.target.value)}
                placeholder="Explain the kinds of jobs you take on, what makes your work reliable, and how customers can expect you to show up."
                className={`min-h-[132px] ${fieldErrors.bio ? 'border-rose-300 focus-visible:ring-rose-200' : ''}`}
              />
              {fieldErrors.bio ? <p className="text-sm text-rose-600">{fieldErrors.bio}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="years_experience" className="text-sm font-semibold text-slate-900">
                Years in business <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="years_experience"
                type="number"
                min={0}
                max={60}
                value={form.years_experience}
                onChange={(event) => setField('years_experience', event.target.value)}
                className={fieldErrors.years_experience ? 'border-rose-300 focus-visible:ring-rose-200' : ''}
              />
              {fieldErrors.years_experience ? <p className="text-sm text-rose-600">{fieldErrors.years_experience}</p> : null}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-900">
                Team size <span className="text-rose-500">*</span>
              </Label>
              <div className="grid gap-3">
                {EMPLOYEE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setField('employee_count_range', option)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      form.employee_count_range === option
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {fieldErrors.employee_count_range ? <p className="text-sm text-rose-600">{fieldErrors.employee_count_range}</p> : null}
            </div>

            <div className="space-y-3 md:col-span-2">
              <Label className="text-sm font-semibold text-slate-900">Languages spoken</Label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['speaks_arabic', 'Arabic'],
                  ['speaks_english', 'English'],
                  ['speaks_urdu', 'Urdu'],
                  ['speaks_hindi', 'Hindi'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setField(key as keyof MarketplaceForm, !Boolean(form[key as keyof MarketplaceForm]))
                    }
                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      form[key as keyof MarketplaceForm]
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Services offered"
          description="Choose the broad category customers will land in, then add the exact job phrases they might search for."
          invalid={Boolean(sectionErrors.services)}
        >
          <div className="space-y-6">
            <SearchableSelect
              label="Main category"
              placeholder="Search categories like pest control, plumbing, or AC repair"
              value={form.service_category}
              options={MARKETPLACE_SERVICE_CATEGORIES.map((category) => category.title)}
              onSelect={(value) => {
                setField('service_category', value);
                setField('services_offered', []);
              }}
              error={fieldErrors.service_category}
            />

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm leading-6 text-emerald-800">
              Exact specific-service matches rank ahead of broad category matches. If a customer searches for something like “rat infestation” and you added that exact service, your profile can surface before general pest-control listings.
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-900">
                Specific services customers can search for <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <IconSearch className="h-4 w-4" stroke={1.7} />
                </div>
                <Input
                  value={serviceSearch}
                  onChange={(event) => {
                    setServiceSearch(event.target.value);
                    setServiceSearchOpen(true);
                  }}
                  onFocus={() => setServiceSearchOpen(true)}
                  onBlur={() => setTimeout(() => setServiceSearchOpen(false), 120)}
                  placeholder={
                    selectedCategory
                      ? 'Search suggestions or type a custom specific service'
                      : 'Pick the main category first'
                  }
                  disabled={!selectedCategory}
                  className={`pl-9 ${fieldErrors.services_offered ? 'border-rose-300 focus-visible:ring-rose-200' : ''}`}
                />
                {serviceSearchOpen && selectedCategory && serviceSuggestions.length > 0 ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    {serviceSuggestions.map((service) => (
                      <button
                        key={service}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          addSpecificService(service);
                        }}
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-emerald-50"
                      >
                        <span>{service}</span>
                        <span className="text-xs text-slate-400">Suggested</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {form.services_offered.map((service) => (
                  <span
                    key={service}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800"
                  >
                    {service}
                    <button
                      type="button"
                      onClick={() =>
                        setField(
                          'services_offered',
                          form.services_offered.filter((item) => item !== service),
                        )
                      }
                    >
                      <IconX className="h-3.5 w-3.5" stroke={1.7} />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addSpecificService(serviceSearch)}
                  disabled={!selectedCategory || !serviceSearch.trim()}
                >
                  Add service
                </Button>
                <p className="self-center text-sm text-slate-500">
                  Customers can search phrases like “rat infestation”, “water heater repair”, or “split AC cleaning”.
                </p>
              </div>
              {fieldErrors.services_offered ? <p className="text-sm text-rose-600">{fieldErrors.services_offered}</p> : null}
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-900">
                Property types served <span className="text-rose-500">*</span>
              </Label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {PROPERTY_TYPES.map((propertyType) => {
                  const selected = form.property_types.includes(propertyType);
                  return (
                    <button
                      key={propertyType}
                      type="button"
                      onClick={() => setField('property_types', toggleValue(form.property_types, propertyType))}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        selected
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {propertyType}
                    </button>
                  );
                })}
              </div>
              {fieldErrors.property_types ? <p className="text-sm text-rose-600">{fieldErrors.property_types}</p> : null}
            </div>
          </div>
        </Section>

        <Section
          title="Districts served"
          description="Choose the Riyadh districts you actively cover so location matching can rank nearby pros first."
          invalid={Boolean(sectionErrors.districts)}
        >
          <div className="space-y-5">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-900">
                Districts customers can find you in <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <IconSearch className="h-4 w-4" stroke={1.7} />
                </div>
                <Input
                  value={districtSearch}
                  onChange={(event) => {
                    setDistrictSearch(event.target.value);
                    setDistrictSearchOpen(true);
                  }}
                  onFocus={() => setDistrictSearchOpen(true)}
                  onBlur={() => setTimeout(() => setDistrictSearchOpen(false), 120)}
                  placeholder="Search Riyadh districts like Qortubah, Al Olaya, or Al Malqa"
                  className={`pl-9 ${fieldErrors.service_districts ? 'border-rose-300 focus-visible:ring-rose-200' : ''}`}
                />
                {districtSearchOpen && districtSuggestions.length > 0 ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    {districtSuggestions.map((district) => (
                      <button
                        key={district}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          addDistrict(district);
                        }}
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-emerald-50"
                      >
                        <span>{district}</span>
                        <span className="text-xs text-slate-400">District</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {form.service_districts.map((district) => (
                  <span
                    key={district}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800"
                  >
                    {district}
                    <button
                      type="button"
                      onClick={() =>
                        setField(
                          'service_districts',
                          form.service_districts.filter((item) => item !== district),
                        )
                      }
                    >
                      <IconX className="h-3.5 w-3.5" stroke={1.7} />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addDistrict(districtSearch)}
                  disabled={!districtSearch.trim()}
                >
                  Add district
                </Button>
                <p className="self-center text-sm text-slate-500">
                  Search and add only the districts you actively serve.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-900">Popular districts</Label>
              <div className="flex flex-wrap gap-2">
                {popularDistricts.map((district) => {
                  const selected = form.service_districts.includes(district);
                  return (
                    <button
                      key={district}
                      type="button"
                      onClick={() => setField('service_districts', toggleValue(form.service_districts, district))}
                      className={`rounded-full border px-3 py-2 text-sm transition ${
                        selected
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {district}
                    </button>
                  );
                })}
              </div>
            </div>

            {fieldErrors.service_districts ? <p className="text-sm text-rose-600">{fieldErrors.service_districts}</p> : null}
          </div>
        </Section>

        <Section
          title="Pricing and payment"
          description="Set customer expectations before they contact you."
          invalid={Boolean(sectionErrors.payment)}
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3 md:col-span-2">
              <Label className="text-sm font-semibold text-slate-900">
                Pricing shown on your profile <span className="text-rose-500">*</span>
              </Label>
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setField('contact_for_price', false)}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    !form.contact_for_price
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-semibold">Show a starting price</p>
                  <p className="mt-1 text-sm leading-6 text-inherit/80">
                    Customers will see “From SAR {form.starting_price_sar.trim() || '0'}” on your card and profile.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setField('contact_for_price', true)}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    form.contact_for_price
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-semibold">Contact for price</p>
                  <p className="mt-1 text-sm leading-6 text-inherit/80">
                    Hide the number and show “Contact for price” instead.
                  </p>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="starting_price_sar" className="text-sm font-semibold text-slate-900">
                Starting price (SAR){' '}
                {!form.contact_for_price ? <span className="text-rose-500">*</span> : null}
              </Label>
              <Input
                id="starting_price_sar"
                type="number"
                min={0}
                max={50000}
                value={form.starting_price_sar}
                onChange={(event) => setField('starting_price_sar', event.target.value)}
                disabled={form.contact_for_price}
                placeholder={form.contact_for_price ? 'Disabled while Contact for price is on' : '250'}
                className={fieldErrors.starting_price_sar ? 'border-rose-300 focus-visible:ring-rose-200' : ''}
              />
              <p className="text-sm text-slate-500">
                {form.contact_for_price
                  ? 'Customers will not see a number until they contact you.'
                  : 'Use the minimum “from” price you want shown publicly.'}
              </p>
              {fieldErrors.starting_price_sar ? <p className="text-sm text-rose-600">{fieldErrors.starting_price_sar}</p> : null}
            </div>

            <div className="space-y-3 md:col-span-2">
              <Label className="text-sm font-semibold text-slate-900">
                Payment methods <span className="text-rose-500">*</span>
              </Label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {PAYMENT_METHODS.map((paymentMethod) => {
                  const selected = form.payment_methods.includes(paymentMethod);
                  return (
                    <button
                      key={paymentMethod}
                      type="button"
                      onClick={() => setField('payment_methods', toggleValue(form.payment_methods, paymentMethod))}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        selected
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {paymentMethod}
                    </button>
                  );
                })}
              </div>
              {fieldErrors.payment_methods ? <p className="text-sm text-rose-600">{fieldErrors.payment_methods}</p> : null}
            </div>
          </div>
        </Section>

        <Section
          title="Business hours"
          description="Sunday through Thursday are the default working days. Friday and Saturday start as weekends, but you can turn them on any time."
          invalid={Boolean(sectionErrors.availability)}
        >
          <div className="space-y-4">
            {form.availability.map((slot) => (
              <div
                key={slot.day_of_week}
                className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[180px,1fr,1fr]"
              >
                <button
                  type="button"
                  onClick={() => toggleAvailability(slot.day_of_week)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                    slot.is_available
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                    >
                  {AVAILABILITY_DAYS.find((day) => day.key === slot.day_of_week)?.label}
                </button>
                <TimePickerField
                  label="From"
                  value={slot.open_time}
                  disabled={!slot.is_available}
                  onChange={(value) =>
                    setField(
                      'availability',
                      form.availability.map((item) =>
                        item.day_of_week === slot.day_of_week ? { ...item, open_time: value } : item,
                      ),
                    )
                  }
                />
                <TimePickerField
                  label="To"
                  value={slot.close_time}
                  disabled={!slot.is_available}
                  onChange={(value) =>
                    setField(
                      'availability',
                      form.availability.map((item) =>
                        item.day_of_week === slot.day_of_week ? { ...item, close_time: value } : item,
                      ),
                    )
                  }
                />
              </div>
            ))}
            {fieldErrors.availability ? <p className="text-sm text-rose-600">{fieldErrors.availability}</p> : null}
          </div>
        </Section>

        <Section
          title="Credentials"
          description="This section is optional, but adding it strengthens trust during admin review."
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="license_type" className="text-sm font-semibold text-slate-900">License type</Label>
              <Input id="license_type" value={form.license_type} onChange={(event) => setField('license_type', event.target.value)} placeholder="Electrical contractor, pest control licence, etc." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="license_number" className="text-sm font-semibold text-slate-900">License number</Label>
              <Input id="license_number" value={form.license_number} onChange={(event) => setField('license_number', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr_number" className="text-sm font-semibold text-slate-900">Commercial registration number</Label>
              <Input id="cr_number" value={form.cr_number} onChange={(event) => setField('cr_number', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vat_number" className="text-sm font-semibold text-slate-900">VAT number</Label>
              <Input id="vat_number" value={form.vat_number} onChange={(event) => setField('vat_number', event.target.value)} />
            </div>
          </div>
        </Section>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={saving} className="min-w-[260px]">
            {saving ? <IconLoader2 className="mr-2 h-4 w-4 animate-spin" stroke={1.7} /> : <IconCheck className="mr-2 h-4 w-4" stroke={1.7} />}
            {mode === 'dashboard' ? 'Save profile changes' : 'Submit profile for review'}
          </Button>
        </div>
      </form>

      <Dialog open={cropDialogOpen} onOpenChange={handleCropDialogOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crop profile photo</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div
              className={`relative mx-auto aspect-square max-w-md overflow-hidden rounded-[32px] bg-slate-100 select-none ${isDraggingCrop ? 'cursor-grabbing' : 'cursor-grab'}`}
              onPointerDown={handleCropPointerDown}
              onPointerMove={handleCropPointerMove}
              onPointerUp={endCropDrag}
              onPointerCancel={endCropDrag}
              style={{ touchAction: 'none' }}
            >
              {cropImageUrl ? (
                <img
                  src={cropImageUrl}
                  alt="Crop preview"
                  className="absolute left-1/2 top-1/2 max-w-none pointer-events-none"
                  style={{
                    transform: `translate(calc(-50% + ${cropState.offsetX}px), calc(-50% + ${cropState.offsetY}px)) scale(${cropState.zoom})`,
                  }}
                />
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Drag the image to reposition it inside the frame, then use zoom if needed.
            </div>

            <div className="grid gap-4 sm:grid-cols-1">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">Zoom</Label>
                <input
                  type="range"
                  min="1"
                  max="2.4"
                  step="0.05"
                  value={cropState.zoom}
                  onChange={(event) =>
                    setCropState((current) => ({ ...current, zoom: Number(event.target.value) }))
                  }
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => handleCropDialogOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void applyCrop()}>
                Use this crop
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
