'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconArrowRight,
  IconCheck,
  IconLoader2,
  IconPlus,
  IconTrash,
  IconClockHour4,
  IconMapPin,
  IconBuildingBank,
  IconUser,
  IconBriefcase,
  IconTools,
} from '@tabler/icons-react';
import { apiClient } from '@/lib/api-client';
import { RIYADH_DISTRICTS } from '@handycall/shared';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'loading' | 'identity' | 'profile' | 'services' | 'payout' | 'complete';

type ServiceCategory =
  | 'AC_HVAC'
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'PAINTING'
  | 'CLEANING'
  | 'PEST_CONTROL'
  | 'CARPENTRY'
  | 'MOVING'
  | 'APPLIANCE_REPAIR'
  | 'SATELLITE_DISH'
  | 'LANDSCAPING'
  | 'GENERAL_HANDYMAN';

type PricingType = 'FIXED' | 'HOURLY' | 'QUOTE';
type DayOfWeek = 'SAT' | 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU';

interface ServiceItem {
  category: ServiceCategory;
  title: string;
  pricing_type: PricingType;
  price_sar: string;
  min_price_sar: string;
  max_price_sar: string;
  vat_included: boolean;
  estimated_duration_minutes: string;
}

interface AvailabilitySlot {
  day_of_week: DayOfWeek;
  open_time: string;
  close_time: string;
  is_available: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_CATEGORIES: { value: ServiceCategory; label: string; labelAr: string }[] = [
  { value: 'AC_HVAC', label: 'AC / HVAC', labelAr: 'تكييف وتبريد' },
  { value: 'PLUMBING', label: 'Plumbing', labelAr: 'سباكة' },
  { value: 'ELECTRICAL', label: 'Electrical', labelAr: 'كهرباء' },
  { value: 'PAINTING', label: 'Painting', labelAr: 'دهانات' },
  { value: 'CLEANING', label: 'Cleaning', labelAr: 'تنظيف' },
  { value: 'PEST_CONTROL', label: 'Pest Control', labelAr: 'مكافحة حشرات' },
  { value: 'CARPENTRY', label: 'Carpentry', labelAr: 'نجارة' },
  { value: 'MOVING', label: 'Moving', labelAr: 'نقل عفش' },
  { value: 'APPLIANCE_REPAIR', label: 'Appliance Repair', labelAr: 'إصلاح أجهزة' },
  { value: 'SATELLITE_DISH', label: 'Satellite Dish', labelAr: 'أطباق فضائية' },
  { value: 'LANDSCAPING', label: 'Landscaping', labelAr: 'تنسيق حدائق' },
  { value: 'GENERAL_HANDYMAN', label: 'General Handyman', labelAr: 'صيانة عامة' },
];

const SAUDI_BANKS = [
  'Al Rajhi Bank',
  'Saudi National Bank (SNB)',
  'Riyad Bank',
  'Arab National Bank',
  'Bank AlJazira',
  'Bank Albilad',
  'Saudi British Bank (SABB)',
  'Alinma Bank',
  'Banque Saudi Fransi',
  'Other',
];

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 'SAT', label: 'Saturday' },
  { value: 'SUN', label: 'Sunday' },
  { value: 'MON', label: 'Monday' },
  { value: 'TUE', label: 'Tuesday' },
  { value: 'WED', label: 'Wednesday' },
  { value: 'THU', label: 'Thursday' },
];

const PHASE_ORDER: Phase[] = ['identity', 'profile', 'services', 'payout'];
const STEP_LABELS = ['Business Info', 'Profile', 'Services', 'Coverage & Payout'];

function phaseToStepIndex(phase: Phase): number {
  return PHASE_ORDER.indexOf(phase);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <span className="text-sm font-medium text-slate-700">{children}</span>
      {hint && <span className="ml-2 text-xs text-slate-400">{hint}</span>}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  className,
  dir,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      dir={dir}
      className={cn(
        'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400',
        'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
        'transition',
        className,
      )}
    />
  );
}

function Select({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800',
        'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
        'transition appearance-none',
        className,
      )}
    >
      {children}
    </select>
  );
}

function LangChip({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium border transition-all duration-200 ease-out select-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1',
        checked
          ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-200'
          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700',
      )}
    >
      <span
        className={cn(
          'flex h-4 w-4 items-center justify-center rounded-full border transition-all duration-200',
          checked
            ? 'border-white/60 bg-white/20'
            : 'border-slate-300 bg-transparent',
        )}
      >
        {checked && (
          <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-white" aria-hidden>
            <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500',
          checked ? 'bg-emerald-500' : 'bg-slate-200',
        )}
      >
        <span
          className={cn(
            'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </button>
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

function NextButton({
  onClick,
  loading,
  label = 'Continue',
}: {
  onClick: () => void;
  loading: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
    >
      {loading ? (
        <IconLoader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          {label}
          <IconArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ currentPhase }: { currentPhase: Phase }) {
  const current = phaseToStepIndex(currentPhase);
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEP_LABELS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                  done && 'bg-emerald-500 text-white',
                  active && 'bg-emerald-600 text-white ring-4 ring-emerald-100',
                  !done && !active && 'bg-slate-100 text-slate-400',
                )}
              >
                {done ? <IconCheck className="h-4 w-4" /> : <span>{i + 1}</span>}
              </div>
              <span
                className={cn(
                  'mt-1.5 text-xs font-medium whitespace-nowrap',
                  active ? 'text-emerald-700' : done ? 'text-slate-500' : 'text-slate-300',
                )}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-12 mx-1 mb-5 transition-colors',
                  i < current ? 'bg-emerald-500' : 'bg-slate-200',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function OnboardingSetupPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Identity state
  const [crNumber, setCrNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');

  // ── Profile state
  const [bio, setBio] = useState('');
  const [yearsExp, setYearsExp] = useState('');
  const [speaksArabic, setSpeaksArabic] = useState(true);
  const [speaksEnglish, setSpeaksEnglish] = useState(true);
  const [speaksUrdu, setSpeaksUrdu] = useState(false);
  const [speaksHindi, setSpeaksHindi] = useState(false);

  // ── Services state
  const emptyService = (): ServiceItem => ({
    category: 'GENERAL_HANDYMAN',
    title: '',
    pricing_type: 'FIXED',
    price_sar: '',
    min_price_sar: '',
    max_price_sar: '',
    vat_included: false,
    estimated_duration_minutes: '',
  });
  const [services, setServices] = useState<ServiceItem[]>([emptyService()]);

  // ── Payout state
  const [iban, setIban] = useState('SA');
  const [bankName, setBankName] = useState('');
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>(
    DAYS.map((d) => ({
      day_of_week: d.value,
      open_time: '08:00',
      close_time: '20:00',
      is_available: true,
    })),
  );

  // Load current onboarding step on mount
  useEffect(() => {
    apiClient
      .getMyPro()
      .then((pro: any) => {
        const step: number = pro?.onboarding_step ?? 1;
        if (step >= 5) setPhase('complete');
        else if (step === 4) setPhase('payout');
        else if (step === 3) setPhase('services');
        else if (step === 2) setPhase('profile');
        else setPhase('identity');
      })
      .catch(() => {
        // Not authenticated or no pro record yet — start at identity
        setPhase('identity');
      });
  }, []);

  // ── Submit: Identity ──────────────────────────────────────────────────────
  const submitIdentity = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiClient.proOnboardingIdentity({
        cr_number: crNumber.trim() || undefined,
        vat_number: vatNumber.trim() || undefined,
      });
      setPhase('profile');
    } catch (e: any) {
      setError(e?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Submit: Profile ───────────────────────────────────────────────────────
  const submitProfile = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiClient.proOnboardingProfile({
        bio: bio.trim() || undefined,
        years_experience: yearsExp !== '' ? Number(yearsExp) : undefined,
        speaks_arabic: speaksArabic,
        speaks_english: speaksEnglish,
        speaks_urdu: speaksUrdu || undefined,
        speaks_hindi: speaksHindi || undefined,
      });
      setPhase('services');
    } catch (e: any) {
      setError(e?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Submit: Services ──────────────────────────────────────────────────────
  const submitServices = async () => {
    setError(null);
    for (const svc of services) {
      if (!svc.title.trim()) {
        setError('Every service needs a title.');
        return;
      }
      if (svc.pricing_type !== 'QUOTE') {
        if (!svc.price_sar || Number(svc.price_sar) <= 0) {
          setError('Fixed and hourly services need a price greater than 0.');
          return;
        }
      } else {
        if (!svc.min_price_sar || !svc.max_price_sar) {
          setError('Quote services need both a minimum and maximum price.');
          return;
        }
        if (Number(svc.min_price_sar) >= Number(svc.max_price_sar)) {
          setError('Minimum price must be less than maximum price.');
          return;
        }
      }
    }
    setSaving(true);
    try {
      await apiClient.proOnboardingServices({
        services: services.map((svc) => ({
          category: svc.category,
          title: svc.title.trim(),
          pricing_type: svc.pricing_type,
          ...(svc.pricing_type !== 'QUOTE'
            ? { price_sar: Number(svc.price_sar) }
            : { min_price_sar: Number(svc.min_price_sar), max_price_sar: Number(svc.max_price_sar) }),
          vat_included: svc.vat_included,
          ...(svc.estimated_duration_minutes
            ? { estimated_duration_minutes: Number(svc.estimated_duration_minutes) }
            : {}),
        })),
      });
      setPhase('payout');
    } catch (e: any) {
      setError(e?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Submit: Payout ────────────────────────────────────────────────────────
  const submitPayout = async () => {
    setError(null);
    if (!/^SA\d{22}$/.test(iban)) {
      setError('IBAN must start with SA followed by exactly 22 digits (24 characters total).');
      return;
    }
    if (!bankName) {
      setError('Please select your bank.');
      return;
    }
    if (selectedDistricts.length === 0) {
      setError('Select at least one district where you provide services.');
      return;
    }
    const activeSlots = availability.filter((s) => s.is_available);
    if (activeSlots.length === 0) {
      setError('Mark at least one day as available.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.proOnboardingPayout({
        iban,
        bank_name: bankName,
        service_districts: selectedDistricts,
        availability,
      });
      setPhase('complete');
    } catch (e: any) {
      setError(e?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Helpers: Services ─────────────────────────────────────────────────────
  const updateService = (index: number, updates: Partial<ServiceItem>) => {
    setServices((prev) =>
      prev.map((svc, i) => (i === index ? { ...svc, ...updates } : svc)),
    );
  };
  const removeService = (index: number) => {
    setServices((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Helpers: Districts ────────────────────────────────────────────────────
  const toggleDistrict = (d: string) => {
    setSelectedDistricts((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  };

  // ── Helpers: Availability ─────────────────────────────────────────────────
  const updateSlot = (index: number, updates: Partial<AvailabilitySlot>) => {
    setAvailability((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, ...updates } : slot)),
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <IconLoader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (phase === 'complete') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="max-w-md w-full mx-auto text-center px-6">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <IconCheck className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">
            Application submitted!
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Your profile is now under review. Our team will verify your information and activate your
            listing within 1–2 business days. You&apos;ll receive an email once you&apos;re approved.
          </p>
          <button
            type="button"
            onClick={() => router.push('/pro/dashboard')}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            Go to Dashboard
            <IconArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            HandyCall Pro
          </span>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Set up your pro account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Complete all steps to get your listing live and start receiving bookings.
          </p>
        </div>

        <StepIndicator currentPhase={phase} />

        {/* ── Step 1: Identity ───────────────────────────────────────────── */}
        {phase === 'identity' && (
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <IconBriefcase className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Business registration</h2>
                <p className="text-xs text-slate-400">Optional — add if you have a CR or VAT number</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <FieldLabel hint="Optional">Commercial Registration (CR) Number</FieldLabel>
                <Input
                  value={crNumber}
                  onChange={setCrNumber}
                  placeholder="e.g. 1010123456"
                />
              </div>
              <div>
                <FieldLabel hint="Optional">VAT Number</FieldLabel>
                <Input
                  value={vatNumber}
                  onChange={setVatNumber}
                  placeholder="e.g. 300000000000003"
                />
              </div>
            </div>

            {error && <div className="mt-5"><ErrorBox message={error} /></div>}

            <div className="mt-8 flex justify-end">
              <NextButton onClick={submitIdentity} loading={saving} />
            </div>
          </div>
        )}

        {/* ── Step 2: Profile ────────────────────────────────────────────── */}
        {phase === 'profile' && (
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <IconUser className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Your profile</h2>
                <p className="text-xs text-slate-400">Customers see this when browsing your listing</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <FieldLabel hint="Optional">Bio</FieldLabel>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell customers about your experience, what you specialize in, and why they should hire you..."
                  rows={4}
                  maxLength={1000}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-none"
                />
                <p className="mt-1 text-xs text-slate-400 text-right">{bio.length}/1000</p>
              </div>

              <div>
                <FieldLabel hint="Optional">Years of experience</FieldLabel>
                <Input
                  type="number"
                  value={yearsExp}
                  onChange={setYearsExp}
                  placeholder="e.g. 5"
                />
              </div>

              <div>
                <FieldLabel>Languages spoken</FieldLabel>
                <div className="mt-2 flex flex-wrap gap-2">
                  <LangChip checked={speaksArabic} onChange={setSpeaksArabic} label="Arabic" />
                  <LangChip checked={speaksEnglish} onChange={setSpeaksEnglish} label="English" />
                  <LangChip checked={speaksUrdu} onChange={setSpeaksUrdu} label="Urdu" />
                  <LangChip checked={speaksHindi} onChange={setSpeaksHindi} label="Hindi" />
                </div>
              </div>
            </div>

            {error && <div className="mt-5"><ErrorBox message={error} /></div>}

            <div className="mt-8 flex justify-end">
              <NextButton onClick={submitProfile} loading={saving} />
            </div>
          </div>
        )}

        {/* ── Step 3: Services ───────────────────────────────────────────── */}
        {phase === 'services' && (
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <IconTools className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Your services</h2>
                <p className="text-xs text-slate-400">Add at least one service listing</p>
              </div>
            </div>

            <div className="space-y-6">
              {services.map((svc, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Service {i + 1}
                    </span>
                    {services.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeService(i)}
                        className="text-slate-400 hover:text-red-500 transition"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div>
                    <FieldLabel>Category</FieldLabel>
                    <Select
                      value={svc.category}
                      onChange={(v) => updateService(i, { category: v as ServiceCategory })}
                    >
                      {SERVICE_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label} — {cat.labelAr}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <FieldLabel>Service title</FieldLabel>
                    <Input
                      value={svc.title}
                      onChange={(v) => updateService(i, { title: v })}
                      placeholder="e.g. Split AC Repair & Maintenance"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>Pricing type</FieldLabel>
                      <Select
                        value={svc.pricing_type}
                        onChange={(v) =>
                          updateService(i, {
                            pricing_type: v as PricingType,
                            price_sar: '',
                            min_price_sar: '',
                            max_price_sar: '',
                          })
                        }
                      >
                        <option value="FIXED">Fixed price</option>
                        <option value="HOURLY">Hourly rate</option>
                        <option value="QUOTE">Custom quote</option>
                      </Select>
                    </div>

                    {svc.pricing_type !== 'QUOTE' ? (
                      <div>
                        <FieldLabel>
                          Price (SAR)
                        </FieldLabel>
                        <Input
                          type="number"
                          value={svc.price_sar}
                          onChange={(v) => updateService(i, { price_sar: v })}
                          placeholder="0"
                        />
                      </div>
                    ) : (
                      <div className="col-span-1">
                        <FieldLabel>Price range (SAR)</FieldLabel>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={svc.min_price_sar}
                            onChange={(v) => updateService(i, { min_price_sar: v })}
                            placeholder="Min"
                          />
                          <Input
                            type="number"
                            value={svc.max_price_sar}
                            onChange={(v) => updateService(i, { max_price_sar: v })}
                            placeholder="Max"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <Toggle
                      checked={svc.vat_included}
                      onChange={(v) => updateService(i, { vat_included: v })}
                      label="VAT included in price"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Est. duration (min)</span>
                      <input
                        type="number"
                        value={svc.estimated_duration_minutes}
                        onChange={(e) =>
                          updateService(i, { estimated_duration_minutes: e.target.value })
                        }
                        placeholder="—"
                        className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-center text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setServices((prev) => [...prev, emptyService()])}
                className="flex items-center gap-2 text-sm text-emerald-600 font-medium hover:text-emerald-700 transition"
              >
                <IconPlus className="h-4 w-4" />
                Add another service
              </button>
            </div>

            {error && <div className="mt-5"><ErrorBox message={error} /></div>}

            <div className="mt-8 flex justify-end">
              <NextButton onClick={submitServices} loading={saving} />
            </div>
          </div>
        )}

        {/* ── Step 4: Payout & Coverage ──────────────────────────────────── */}
        {phase === 'payout' && (
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-8 space-y-8">
            {/* Bank & IBAN */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <IconBuildingBank className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Payout details</h2>
                  <p className="text-xs text-slate-400">Where we send your earnings</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <FieldLabel>Bank</FieldLabel>
                  <Select value={bankName} onChange={setBankName}>
                    <option value="">Select your bank</option>
                    {SAUDI_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <FieldLabel>Saudi IBAN</FieldLabel>
                  <Input
                    value={iban}
                    onChange={(v) => {
                      // Always keep the SA prefix
                      const raw = v.toUpperCase();
                      if (!raw.startsWith('SA')) return;
                      // Only allow digits after SA
                      const digits = raw.slice(2).replace(/\D/g, '').slice(0, 22);
                      setIban('SA' + digits);
                    }}
                    placeholder="SA followed by 22 digits"
                    dir="ltr"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Format: SA + 22 digits &mdash; {iban.length}/24 characters
                  </p>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Service Districts */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <IconMapPin className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Service districts</h2>
                  <p className="text-xs text-slate-400">
                    Which parts of Riyadh do you cover? ({selectedDistricts.length} selected)
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(RIYADH_DISTRICTS as readonly string[]).map((d) => {
                  const selected = selectedDistricts.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDistrict(d)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition',
                        selected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                      )}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Availability */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <IconClockHour4 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Weekly availability</h2>
                  <p className="text-xs text-slate-400">Set your working hours for each day</p>
                </div>
              </div>

              <div className="space-y-2">
                {availability.map((slot, i) => (
                  <div
                    key={slot.day_of_week}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-4 py-3 transition',
                      slot.is_available ? 'bg-slate-50' : 'bg-white opacity-60',
                    )}
                  >
                    <Toggle
                      checked={slot.is_available}
                      onChange={(v) => updateSlot(i, { is_available: v })}
                      label={DAYS[i].label}
                    />
                    {slot.is_available && (
                      <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                        <input
                          type="time"
                          value={slot.open_time}
                          onChange={(e) => updateSlot(i, { open_time: e.target.value })}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span>to</span>
                        <input
                          type="time"
                          value={slot.close_time}
                          onChange={(e) => updateSlot(i, { close_time: e.target.value })}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && <ErrorBox message={error} />}

            <div className="flex justify-end">
              <NextButton onClick={submitPayout} loading={saving} label="Submit application" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
