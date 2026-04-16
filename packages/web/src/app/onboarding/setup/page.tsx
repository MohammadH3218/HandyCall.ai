'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconArrowRight, IconCheck, IconLoader2, IconPlus, IconTrash } from '@tabler/icons-react';
import { apiClient } from '@/lib/api-client';
import { RIYADH_DISTRICTS } from '@handycall/shared';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'loading' | 'identity' | 'profile' | 'services' | 'payout' | 'complete';
type ServiceCategory =
  | 'AC_HVAC' | 'PLUMBING' | 'ELECTRICAL' | 'PAINTING' | 'CLEANING'
  | 'PEST_CONTROL' | 'CARPENTRY' | 'MOVING' | 'APPLIANCE_REPAIR'
  | 'SATELLITE_DISH' | 'LANDSCAPING' | 'GENERAL_HANDYMAN';
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
  'Al Rajhi Bank', 'Saudi National Bank (SNB)', 'Riyad Bank',
  'Arab National Bank', 'Bank AlJazira', 'Bank Albilad',
  'Saudi British Bank (SABB)', 'Alinma Bank', 'Banque Saudi Fransi', 'Other',
];

const DAYS: { value: DayOfWeek; label: string; short: string }[] = [
  { value: 'SAT', label: 'Saturday', short: 'Sat' },
  { value: 'SUN', label: 'Sunday', short: 'Sun' },
  { value: 'MON', label: 'Monday', short: 'Mon' },
  { value: 'TUE', label: 'Tuesday', short: 'Tue' },
  { value: 'WED', label: 'Wednesday', short: 'Wed' },
  { value: 'THU', label: 'Thursday', short: 'Thu' },
];

const PHASE_ORDER: Phase[] = ['identity', 'profile', 'services', 'payout'];

const STEP_META: Record<string, { title: string; subtitle: string }> = {
  identity: {
    title: 'Business registration',
    subtitle: 'Add your commercial and VAT registration numbers.',
  },
  profile: {
    title: 'About you',
    subtitle: 'Customers see this when they visit your listing.',
  },
  services: {
    title: 'What do you offer?',
    subtitle: 'Add the services you provide with your pricing.',
  },
  payout: {
    title: 'Coverage & payout',
    subtitle: 'Where you work and where we send your earnings.',
  },
};

function stepIndex(phase: Phase) {
  return PHASE_ORDER.indexOf(phase);
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </label>
  );
}

function TextInput({
  value, onChange, placeholder, type = 'text', min, className, dir,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; min?: number; className?: string; dir?: 'ltr' | 'rtl';
}) {
  return (
    <input
      type={type}
      value={value}
      min={min}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      dir={dir}
      className={cn(
        'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-300',
        'transition-shadow duration-150 outline-none',
        'hover:border-slate-300',
        'focus:border-emerald-400 focus:ring-3 focus:ring-emerald-100',
        className,
      )}
    />
  );
}

function NativeSelect({
  value, onChange, children, className,
}: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-[15px] text-slate-900',
          'transition-shadow duration-150 outline-none',
          'hover:border-slate-300',
          'focus:border-emerald-400 focus:ring-3 focus:ring-emerald-100',
          className,
        )}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center">
        <svg className="h-4 w-4 text-slate-400" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function Chip({
  active, onClick, children, className,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode; className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-150 select-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1',
        active
          ? 'bg-emerald-600 text-white shadow-sm'
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700',
        className,
      )}
    >
      {active && (
        <svg className="h-3 w-3 shrink-0" viewBox="0 0 12 10" fill="none">
          <path d="M1 5l3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {children}
    </button>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
      <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="currentColor">
        <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 4a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 018 5zm0 6.5a.875.875 0 100-1.75.875.875 0 000 1.75z" />
      </svg>
      {message}
    </div>
  );
}

function PrimaryButton({
  onClick, loading, label = 'Continue', fullWidth = true,
}: {
  onClick: () => void; loading: boolean; label?: string; fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5',
        'text-[15px] font-semibold text-white',
        'shadow-sm shadow-emerald-200',
        'transition-all duration-150 hover:bg-emerald-700 active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        fullWidth && 'w-full',
      )}
    >
      {loading ? (
        <IconLoader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          {label}
          <IconArrowRight className="h-4 w-4" stroke={2.5} />
        </>
      )}
    </button>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ phase }: { phase: Phase }) {
  const idx = stepIndex(phase);
  const total = PHASE_ORDER.length;
  const pct = idx < 0 ? 0 : ((idx + 1) / total) * 100;

  return (
    <div className="h-[3px] w-full bg-slate-100">
      <div
        className="h-full bg-emerald-500 transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Step header ──────────────────────────────────────────────────────────────

function StepHeader({ phase }: { phase: Phase }) {
  const idx = stepIndex(phase);
  const meta = STEP_META[phase];
  if (!meta) return null;
  return (
    <div className="mb-8">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-600">
        Step {idx + 1} of {PHASE_ORDER.length}
      </p>
      <h1 className="font-display text-[28px] font-bold leading-tight text-slate-900">
        {meta.title}
      </h1>
      <p className="mt-1.5 text-[15px] text-slate-400">{meta.subtitle}</p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function OnboardingSetupPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Identity
  const [crNumber, setCrNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');

  // Profile
  const [bio, setBio] = useState('');
  const [yearsExp, setYearsExp] = useState('');
  const [speaksArabic, setSpeaksArabic] = useState(true);
  const [speaksEnglish, setSpeaksEnglish] = useState(true);
  const [speaksUrdu, setSpeaksUrdu] = useState(false);
  const [speaksHindi, setSpeaksHindi] = useState(false);

  // Services
  const blank = (): ServiceItem => ({
    category: 'GENERAL_HANDYMAN', title: '', pricing_type: 'FIXED',
    price_sar: '', min_price_sar: '', max_price_sar: '',
    vat_included: false, estimated_duration_minutes: '',
  });
  const [services, setServices] = useState<ServiceItem[]>([blank()]);

  // Payout
  const [iban, setIban] = useState('SA');
  const [bankName, setBankName] = useState('');
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>(
    DAYS.map((d) => ({ day_of_week: d.value, open_time: '08:00', close_time: '20:00', is_available: true })),
  );

  useEffect(() => {
    apiClient.getMyPro()
      .then((pro: any) => {
        const step: number = pro?.onboarding_step ?? 1;
        if (step >= 5) setPhase('complete');
        else if (step === 4) setPhase('payout');
        else if (step === 3) setPhase('services');
        else if (step === 2) setPhase('profile');
        else setPhase('identity');
      })
      .catch(() => setPhase('identity'));
  }, []);

  // ── Submitters ────────────────────────────────────────────────────────────

  const submit = async (fn: () => Promise<void>) => {
    setSaving(true); setError(null);
    try { await fn(); } catch (e: any) { setError(e?.message || 'Something went wrong. Please try again.'); }
    finally { setSaving(false); }
  };

  const submitIdentity = () => submit(async () => {
    await apiClient.proOnboardingIdentity({
      cr_number: crNumber.trim() || undefined,
      vat_number: vatNumber.trim() || undefined,
    });
    setPhase('profile');
  });

  const submitProfile = () => submit(async () => {
    await apiClient.proOnboardingProfile({
      bio: bio.trim() || undefined,
      years_experience: yearsExp !== '' ? Math.max(0, Number(yearsExp)) : undefined,
      speaks_arabic: speaksArabic,
      speaks_english: speaksEnglish,
      speaks_urdu: speaksUrdu || undefined,
      speaks_hindi: speaksHindi || undefined,
    });
    setPhase('services');
  });

  const submitServices = () => {
    for (const svc of services) {
      if (!svc.title.trim()) { setError('Every service needs a title.'); return; }
      if (svc.pricing_type !== 'QUOTE' && Number(svc.price_sar) <= 0) {
        setError('Enter a price greater than 0 for each fixed or hourly service.'); return;
      }
      if (svc.pricing_type === 'QUOTE') {
        if (!svc.min_price_sar || !svc.max_price_sar) { setError('Quote services need a min and max price.'); return; }
        if (Number(svc.min_price_sar) >= Number(svc.max_price_sar)) { setError('Min price must be less than max price.'); return; }
      }
    }
    submit(async () => {
      await apiClient.proOnboardingServices({
        services: services.map((svc) => ({
          category: svc.category, title: svc.title.trim(), pricing_type: svc.pricing_type,
          ...(svc.pricing_type !== 'QUOTE' ? { price_sar: Number(svc.price_sar) } : {}),
          ...(svc.pricing_type === 'QUOTE' ? { min_price_sar: Number(svc.min_price_sar), max_price_sar: Number(svc.max_price_sar) } : {}),
          vat_included: svc.vat_included,
          ...(svc.estimated_duration_minutes ? { estimated_duration_minutes: Number(svc.estimated_duration_minutes) } : {}),
        })),
      });
      setPhase('payout');
    });
  };

  const submitPayout = () => {
    if (!/^SA\d{22}$/.test(iban)) { setError('IBAN must be SA followed by exactly 22 digits.'); return; }
    if (!bankName) { setError('Select your bank.'); return; }
    if (selectedDistricts.length === 0) { setError('Select at least one district.'); return; }
    if (!availability.some((s) => s.is_available)) { setError('Mark at least one available day.'); return; }
    submit(async () => {
      await apiClient.proOnboardingPayout({ iban, bank_name: bankName, service_districts: selectedDistricts, availability });
      setPhase('complete');
    });
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const updateService = (i: number, u: Partial<ServiceItem>) =>
    setServices((p) => p.map((s, idx) => (idx === i ? { ...s, ...u } : s)));

  const toggleDistrict = (d: string) =>
    setSelectedDistricts((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d]);

  const updateSlot = (i: number, u: Partial<AvailabilitySlot>) =>
    setAvailability((p) => p.map((s, idx) => (idx === i ? { ...s, ...u } : s)));

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center">
        <IconLoader2 className="h-7 w-7 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (phase === 'complete') {
    return (
      <div className="flex flex-1 items-center justify-center bg-white px-5">
        <div className="max-w-sm w-full text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <IconCheck className="h-7 w-7 text-emerald-600" stroke={2.5} />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Application submitted</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-400">
            Your profile is under review. We'll activate your listing within 1–2 business days and send you an email when you're live.
          </p>
          <button
            type="button"
            onClick={() => router.push('/pro/dashboard')}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98]"
          >
            Go to dashboard <IconArrowRight className="h-4 w-4" stroke={2.5} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-white">
      <ProgressBar phase={phase} />

      <div className="mx-auto w-full max-w-lg px-5 pb-16 pt-10">
        <StepHeader phase={phase} />

        {/* ── IDENTITY ──────────────────────────────────────────────────── */}
        {phase === 'identity' && (
          <div className="space-y-5">
            <div>
              <Label>Commercial Registration (CR)</Label>
              <TextInput value={crNumber} onChange={setCrNumber} placeholder="e.g. 1010123456" />
            </div>
            <div>
              <Label>VAT Number</Label>
              <TextInput value={vatNumber} onChange={setVatNumber} placeholder="e.g. 300000000000003" />
            </div>

            {error && <ErrorBanner message={error} />}

            <div className="pt-2">
              <PrimaryButton onClick={submitIdentity} loading={saving} />
              <button
                type="button"
                onClick={submitIdentity}
                className="mt-3 w-full py-2 text-center text-sm text-slate-400 hover:text-slate-600 transition"
              >
                Skip — I don't have these yet
              </button>
            </div>
          </div>
        )}

        {/* ── PROFILE ───────────────────────────────────────────────────── */}
        {phase === 'profile' && (
          <div className="space-y-6">
            <div>
              <Label>Bio</Label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={1000}
                rows={5}
                placeholder="Tell customers what you specialise in, your experience, and why they should choose you..."
                className={cn(
                  'w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3',
                  'text-[15px] text-slate-900 placeholder:text-slate-300',
                  'transition-shadow duration-150 outline-none',
                  'hover:border-slate-300',
                  'focus:border-emerald-400 focus:ring-3 focus:ring-emerald-100',
                )}
              />
              <p className="mt-1.5 text-right text-xs text-slate-300">{bio.length} / 1000</p>
            </div>

            <div>
              <Label>Years of experience</Label>
              <TextInput
                type="number"
                min={0}
                value={yearsExp}
                onChange={(v) => setYearsExp(v.replace(/[^0-9]/g, ''))}
                placeholder="0"
              />
            </div>

            <div>
              <Label>Languages</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                <Chip active={speaksArabic} onClick={() => setSpeaksArabic(!speaksArabic)}>Arabic</Chip>
                <Chip active={speaksEnglish} onClick={() => setSpeaksEnglish(!speaksEnglish)}>English</Chip>
                <Chip active={speaksUrdu} onClick={() => setSpeaksUrdu(!speaksUrdu)}>Urdu</Chip>
                <Chip active={speaksHindi} onClick={() => setSpeaksHindi(!speaksHindi)}>Hindi</Chip>
              </div>
            </div>

            {error && <ErrorBanner message={error} />}
            <div className="pt-2">
              <PrimaryButton onClick={submitProfile} loading={saving} />
            </div>
          </div>
        )}

        {/* ── SERVICES ──────────────────────────────────────────────────── */}
        {phase === 'services' && (
          <div className="space-y-4">
            {services.map((svc, i) => (
              <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-300">
                    Service {i + 1}
                  </span>
                  {services.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setServices((p) => p.filter((_, idx) => idx !== i))}
                      className="text-slate-300 transition hover:text-red-400"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Category</Label>
                    <NativeSelect
                      value={svc.category}
                      onChange={(v) => updateService(i, { category: v as ServiceCategory })}
                    >
                      {SERVICE_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label} — {c.labelAr}</option>
                      ))}
                    </NativeSelect>
                  </div>

                  <div>
                    <Label>Service title</Label>
                    <TextInput
                      value={svc.title}
                      onChange={(v) => updateService(i, { title: v })}
                      placeholder="e.g. Split AC Repair & Maintenance"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Pricing</Label>
                      <NativeSelect
                        value={svc.pricing_type}
                        onChange={(v) => updateService(i, {
                          pricing_type: v as PricingType,
                          price_sar: '', min_price_sar: '', max_price_sar: '',
                        })}
                      >
                        <option value="FIXED">Fixed price</option>
                        <option value="HOURLY">Per hour</option>
                        <option value="QUOTE">Quote range</option>
                      </NativeSelect>
                    </div>

                    {svc.pricing_type !== 'QUOTE' ? (
                      <div>
                        <Label>Price (SAR)</Label>
                        <TextInput
                          type="number"
                          min={0}
                          value={svc.price_sar}
                          onChange={(v) => updateService(i, { price_sar: v })}
                          placeholder="0"
                        />
                      </div>
                    ) : (
                      <div>
                        <Label>Range (SAR)</Label>
                        <div className="flex items-center gap-2">
                          <TextInput
                            type="number"
                            min={0}
                            value={svc.min_price_sar}
                            onChange={(v) => updateService(i, { min_price_sar: v })}
                            placeholder="Min"
                          />
                          <span className="shrink-0 text-slate-300">–</span>
                          <TextInput
                            type="number"
                            min={0}
                            value={svc.max_price_sar}
                            onChange={(v) => updateService(i, { max_price_sar: v })}
                            placeholder="Max"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => updateService(i, { vat_included: !svc.vat_included })}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition',
                        svc.vat_included
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 items-center justify-center rounded border transition',
                          svc.vat_included ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300',
                        )}
                      >
                        {svc.vat_included && (
                          <svg viewBox="0 0 10 8" className="h-2.5 w-2.5" fill="none">
                            <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      VAT included
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-slate-300">Duration (min)</span>
                      <input
                        type="number"
                        min={0}
                        value={svc.estimated_duration_minutes}
                        onChange={(e) => updateService(i, { estimated_duration_minutes: e.target.value })}
                        placeholder="—"
                        className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-xs text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setServices((p) => [...p, blank()])}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-3 text-[13px] font-semibold text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
            >
              <IconPlus className="h-4 w-4" /> Add another service
            </button>

            {error && <ErrorBanner message={error} />}
            <div className="pt-2">
              <PrimaryButton onClick={submitServices} loading={saving} />
            </div>
          </div>
        )}

        {/* ── PAYOUT ────────────────────────────────────────────────────── */}
        {phase === 'payout' && (
          <div className="space-y-8">
            {/* Bank & IBAN */}
            <div className="space-y-4">
              <div className="mb-1">
                <p className="font-display text-[15px] font-semibold text-slate-900">Bank account</p>
                <p className="text-[13px] text-slate-400">Where we'll send your payouts.</p>
              </div>
              <div>
                <Label>Bank</Label>
                <NativeSelect value={bankName} onChange={setBankName}>
                  <option value="">Select your bank</option>
                  {SAUDI_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                </NativeSelect>
              </div>
              <div>
                <Label>Saudi IBAN</Label>
                <TextInput
                  value={iban}
                  dir="ltr"
                  onChange={(v) => {
                    const raw = v.toUpperCase();
                    if (!raw.startsWith('SA')) return;
                    setIban('SA' + raw.slice(2).replace(/\D/g, '').slice(0, 22));
                  }}
                  placeholder="SA + 22 digits"
                />
                <div className="mt-1.5 flex items-center justify-between">
                  <p className="text-xs text-slate-300">
                    {iban.length === 24
                      ? <span className="text-emerald-500 font-medium">✓ Correct length</span>
                      : `${iban.length} / 24 characters`}
                  </p>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Districts */}
            <div>
              <div className="mb-4">
                <p className="font-display text-[15px] font-semibold text-slate-900">Service areas</p>
                <p className="text-[13px] text-slate-400">
                  Which Riyadh districts do you cover?{' '}
                  {selectedDistricts.length > 0 && (
                    <span className="font-semibold text-emerald-600">{selectedDistricts.length} selected</span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(RIYADH_DISTRICTS as readonly string[]).map((d) => (
                  <Chip key={d} active={selectedDistricts.includes(d)} onClick={() => toggleDistrict(d)}>
                    {d}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Availability */}
            <div>
              <div className="mb-4">
                <p className="font-display text-[15px] font-semibold text-slate-900">Working hours</p>
                <p className="text-[13px] text-slate-400">Set which days and hours you're available.</p>
              </div>
              <div className="space-y-2">
                {availability.map((slot, i) => (
                  <div
                    key={slot.day_of_week}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-4 py-3 transition-colors',
                      slot.is_available ? 'bg-slate-50' : 'bg-white',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => updateSlot(i, { is_available: !slot.is_available })}
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition',
                        slot.is_available
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-slate-300 bg-white',
                      )}
                    >
                      {slot.is_available && (
                        <svg viewBox="0 0 10 8" className="h-2.5 w-2.5" fill="none">
                          <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>

                    <span className={cn(
                      'w-20 text-[14px] font-semibold',
                      slot.is_available ? 'text-slate-800' : 'text-slate-300',
                    )}>
                      {DAYS[i].label}
                    </span>

                    {slot.is_available ? (
                      <div className="ml-auto flex items-center gap-2">
                        <input
                          type="time"
                          value={slot.open_time}
                          onChange={(e) => updateSlot(i, { open_time: e.target.value })}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        />
                        <span className="text-xs text-slate-300">to</span>
                        <input
                          type="time"
                          value={slot.close_time}
                          onChange={(e) => updateSlot(i, { close_time: e.target.value })}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        />
                      </div>
                    ) : (
                      <span className="ml-auto text-[13px] text-slate-300">Not available</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && <ErrorBanner message={error} />}
            <div className="pt-2">
              <PrimaryButton onClick={submitPayout} loading={saving} label="Submit application" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
