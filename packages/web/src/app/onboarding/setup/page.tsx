'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconArrowRight, IconCheck, IconLoader2 } from '@tabler/icons-react';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type IdType = 'NATIONAL_ID' | 'IQAMA';
type Phase = 'loading' | 'identity' | 'address' | 'done';

// ─── Shared primitives ────────────────────────────────────────────────────────

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wide text-slate-400">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  maxLength,
  inputMode,
  disabled,
  prefix,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  disabled?: boolean;
  prefix?: string;
}) {
  const baseClass = cn(
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-300',
    'transition-shadow duration-150 outline-none',
    'hover:border-slate-300',
    'focus:border-emerald-400 focus:ring-3 focus:ring-emerald-100',
    disabled && 'opacity-50 cursor-not-allowed bg-slate-50',
  );

  if (prefix) {
    return (
      <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 focus-within:border-emerald-400 focus-within:ring-3 focus-within:ring-emerald-100 transition-shadow duration-150 hover:border-slate-300">
        <span className="border-r border-slate-200 bg-slate-50 px-4 py-3 text-[15px] font-medium text-slate-500 shrink-0">
          {prefix}
        </span>
        <input
          type={type}
          value={value}
          maxLength={maxLength}
          inputMode={inputMode}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-300 outline-none"
        />
      </div>
    );
  }

  return (
    <input
      type={type}
      value={value}
      maxLength={maxLength}
      inputMode={inputMode}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={baseClass}
    />
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
      className={cn(
        'w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5',
        'text-[15px] font-semibold text-white',
        'shadow-sm shadow-emerald-200',
        'transition-all duration-150 hover:bg-emerald-700 active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:opacity-60',
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
  const pct = phase === 'identity' ? 50 : phase === 'address' ? 100 : 0;
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

function StepHeader({
  step,
  total,
  title,
  subtitle,
}: {
  step: number;
  total: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-8">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-600">
        Step {step} of {total}
      </p>
      <h1 className="font-display text-[28px] font-bold leading-tight text-slate-900">{title}</h1>
      <p className="mt-1.5 text-[15px] text-slate-400">{subtitle}</p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function OnboardingSetupPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Identity fields
  const [idType, setIdType] = useState<IdType>('NATIONAL_ID');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');

  // Address fields
  const [shortAddress, setShortAddress] = useState('');
  const [building, setBuilding] = useState('');
  const [street, setStreet] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('Riyadh');
  const [postalCode, setPostalCode] = useState('');

  useEffect(() => {
    apiClient.getMyPro()
      .then((pro: any) => {
        if (pro?.account_setup_done) {
          // Already done — go straight to marketplace profile
          router.replace('/onboarding/marketplace-profile');
        } else {
          setPhase('identity');
        }
      })
      .catch(() => setPhase('identity'));
  }, [router]);

  // ── Validators ────────────────────────────────────────────────────────────

  const validateIdentity = (): string | null => {
    if (!idNumber.trim()) return 'Enter your ID number.';
    if (!/^\d{10}$/.test(idNumber.trim())) return 'ID number must be exactly 10 digits.';
    if (!phone.trim()) return 'Enter your phone number.';
    const normalised = phone.replace(/\s/g, '');
    if (!/^(\+9665|05)\d{8}$/.test(normalised)) return 'Phone must be a valid Saudi mobile number (e.g. 05XXXXXXXX or +9665XXXXXXXX).';
    return null;
  };

  const submitIdentity = () => {
    const msg = validateIdentity();
    if (msg) { setError(msg); return; }
    setError(null);
    setPhase('address');
  };

  const submitAll = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiClient.proOnboardingAccountSetup({
        id_type: idType,
        id_number: idNumber.trim(),
        phone_number: phone.replace(/\s/g, '').startsWith('+966')
          ? phone.replace(/\s/g, '')
          : `+966${phone.replace(/\s/g, '').replace(/^0/, '')}`,
        national_address_short: shortAddress.trim() || undefined,
        national_address_building: building.trim() || undefined,
        national_address_street: street.trim() || undefined,
        national_address_district: district.trim() || undefined,
        national_address_city: city.trim() || undefined,
        national_address_postal_code: postalCode.trim() || undefined,
      });
      router.replace('/onboarding/marketplace-profile');
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-white">
      <ProgressBar phase={phase} />

      <div className="mx-auto w-full max-w-lg px-5 pb-16 pt-10">

        {/* ── IDENTITY PHASE ────────────────────────────────────────────── */}
        {phase === 'identity' && (
          <>
            <StepHeader
              step={1}
              total={2}
              title="Verify your identity"
              subtitle="We're required by Saudi regulations to verify your identity before you can list services."
            />

            <div className="space-y-6">
              {/* ID type */}
              <div>
                <Label required>ID type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      { value: 'NATIONAL_ID', label: 'Saudi National ID', sublabel: 'هوية وطنية' },
                      { value: 'IQAMA', label: 'Iqama', sublabel: 'إقامة' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setIdType(opt.value); setIdNumber(''); }}
                      className={cn(
                        'flex flex-col items-start rounded-xl border px-4 py-3.5 text-left transition-all',
                        idType === opt.value
                          ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100'
                          : 'border-slate-200 bg-white hover:border-slate-300',
                      )}
                    >
                      <span className="text-[14px] font-semibold text-slate-900">{opt.label}</span>
                      <span className="mt-0.5 text-[12px] text-slate-400">{opt.sublabel}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ID number */}
              <div>
                <Label required>
                  {idType === 'NATIONAL_ID' ? 'National ID number' : 'Iqama number'}
                </Label>
                <TextInput
                  value={idNumber}
                  onChange={(v) => setIdNumber(v.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit number"
                  inputMode="numeric"
                  maxLength={10}
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  {idNumber.length}/10 digits
                </p>
              </div>

              {/* Phone */}
              <div>
                <Label required>Mobile phone number</Label>
                <TextInput
                  value={phone}
                  onChange={setPhone}
                  placeholder="05XXXXXXXX"
                  inputMode="tel"
                  prefix="+966"
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Saudi mobile number. Used to contact you about bookings.
                </p>
              </div>

              {/* Nafath note */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3.5">
                <p className="text-[13px] font-semibold text-emerald-800">Nafath verification</p>
                <p className="mt-1 text-[12px] leading-relaxed text-emerald-700">
                  Full Nafath identity verification is coming soon. For now, your information is submitted directly. We verify IDs during admin review before activating your profile.
                </p>
              </div>

              {error && <ErrorBanner message={error} />}

              <div className="pt-2">
                <PrimaryButton onClick={submitIdentity} loading={false} label="Next: National address" />
              </div>
            </div>
          </>
        )}

        {/* ── ADDRESS PHASE ─────────────────────────────────────────────── */}
        {phase === 'address' && (
          <>
            <StepHeader
              step={2}
              total={2}
              title="National address"
              subtitle="Your registered address is used for verification and compliance purposes."
            />

            <div className="space-y-5">
              {/* Short address */}
              <div>
                <Label>Short address code</Label>
                <TextInput
                  value={shortAddress}
                  onChange={(v) => setShortAddress(v.toUpperCase())}
                  placeholder="e.g. RYED1234"
                  maxLength={8}
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  8-character Saudi National Address code (optional, if you have it).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs text-slate-400">or fill in manually</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Building + Street */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Building number</Label>
                  <TextInput
                    value={building}
                    onChange={setBuilding}
                    placeholder="e.g. 1234"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <Label>Street name</Label>
                  <TextInput
                    value={street}
                    onChange={setStreet}
                    placeholder="e.g. King Fahd Rd"
                  />
                </div>
              </div>

              {/* District */}
              <div>
                <Label>District / neighbourhood</Label>
                <TextInput
                  value={district}
                  onChange={setDistrict}
                  placeholder="e.g. Al Olaya"
                />
              </div>

              {/* City + Postal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>City</Label>
                  <TextInput
                    value={city}
                    onChange={setCity}
                    placeholder="Riyadh"
                  />
                </div>
                <div>
                  <Label>Postal code</Label>
                  <TextInput
                    value={postalCode}
                    onChange={(v) => setPostalCode(v.replace(/\D/g, '').slice(0, 5))}
                    placeholder="e.g. 12345"
                    inputMode="numeric"
                    maxLength={5}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[12px] leading-relaxed text-slate-400">
                  Address details are used for identity verification only and will not be shown on your public profile.
                </p>
              </div>

              {error && <ErrorBanner message={error} />}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setError(null); setPhase('identity'); }}
                  className="rounded-xl border border-slate-200 px-5 py-3.5 text-[14px] font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Back
                </button>
                <div className="flex-1">
                  <PrimaryButton onClick={submitAll} loading={saving} label="Complete account setup" />
                </div>
              </div>

              <button
                type="button"
                onClick={submitAll}
                disabled={saving}
                className="w-full text-center text-xs text-slate-400 underline hover:text-slate-600 transition"
              >
                Skip address — I'll add it later
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
