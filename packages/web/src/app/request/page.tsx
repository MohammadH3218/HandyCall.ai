'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Logo } from '@/components/ui/logo';
import { ServiceCategoryCombobox } from '@/components/marketplace/service-category-combobox';
import { apiClient } from '@/lib/api-client';
import { isCustomerProfileComplete } from '@/lib/customer-profile';
import { RIYADH_DISTRICT_VALUES } from '@/constants/riyadh-districts';
import {
  IconChevronRight,
  IconChevronLeft,
  IconTool,
  IconMapPin,
  IconUser,
  IconSend,
} from '@tabler/icons-react';

// Dynamically imported — Mapbox GL requires the browser environment
const CustomerAddressMap = dynamic(() => import('@/components/customer/customer-address-map'), {
  ssr: false,
  loading: () => (
    <div className="h-[380px] animate-pulse rounded-[28px] bg-slate-100 md:h-[480px]" />
  ),
});

const URGENCY_OPTIONS = [
  { value: 'emergency', label: 'Emergency', description: 'Need help within hours' },
  { value: 'urgent', label: 'Within 1-2 days', description: 'Need it done soon' },
  { value: 'this_week', label: 'This week', description: 'Flexible but soon' },
  { value: 'flexible', label: "I'm flexible", description: 'No rush, just get it done' },
];

type Step = 1 | 2 | 3 | 4;

interface FormData {
  pro_id: string;
  selected_service: string;
  job_description: string;
  urgency: string;
  location_address_line1: string;
  location_address_line2: string;
  location_district: string;
  location_lat: number | null;
  location_lng: number | null;
  contact_name: string;
  contact_email: string;
  contact_phone_digits: string; // 9 Saudi digits (05XXXXXXXX local → 5XXXXXXXX stored)
}

const STEP_LABELS: Record<Step, string> = {
  1: 'Service',
  2: 'Details',
  3: 'Location',
  4: 'Contact',
};

const INPUT_CLS =
  'w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100';

/** Sanitize Saudi local phone: extract 9 local digits (starts with 5) */
function sanitizeSaudiLocal(value: string): string {
  const digits = value.replace(/\D/g, '');
  // Remove leading 966 or 00966
  const stripped = digits.startsWith('00966')
    ? digits.slice(5)
    : digits.startsWith('966')
      ? digits.slice(3)
      : digits.startsWith('0')
        ? digits.slice(1)
        : digits;
  return stripped.slice(0, 9);
}

function formatSaudiLocal(digits: string): string {
  // Display as 5XX XXX XXX (9 digits, no leading 0 — +966 replaces it)
  const d = digits.length <= 9 ? digits : digits.slice(0, 9);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

function RequestPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const proIdParam = searchParams.get('pro_id') || '';
  const categoryParam = searchParams.get('category') || '';

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileHydrating, setProfileHydrating] = useState(true);

  // Pro data fetched from API (services_offered)
  const [proData, setProData] = useState<any>(null);
  const [proLoading, setProLoading] = useState(!!proIdParam);

  const [form, setForm] = useState<FormData>({
    pro_id: proIdParam,
    selected_service: categoryParam,
    job_description: '',
    urgency: '',
    location_address_line1: '',
    location_address_line2: '',
    location_district: '',
    location_lat: null,
    location_lng: null,
    contact_name: '',
    contact_email: String(session?.user?.email || ''),
    contact_phone_digits: '',
  });

  const isSignedInCustomer =
    (session as any)?.poolType === 'customer' &&
    Boolean((session as any)?.idToken || (session as any)?.accessToken);

  const set = (key: keyof FormData, value: any) =>
    setForm((current) => ({ ...current, [key]: value }));

  // Fetch pro data for service selection in step 1
  useEffect(() => {
    if (!proIdParam) {
      setProLoading(false);
      return;
    }
    let mounted = true;
    const fetchPro = async () => {
      try {
        const data = await apiClient.getProviderById(proIdParam);
        if (!mounted) return;
        setProData(data);
      } catch {
        if (!mounted) return;
        // If pro fetch fails, fall back to generic categories
      } finally {
        if (mounted) setProLoading(false);
      }
    };
    void fetchPro();
    return () => {
      mounted = false;
    };
  }, [proIdParam]);

  // Hydrate customer profile into form
  useEffect(() => {
    if (!isSignedInCustomer) {
      setProfileHydrating(false);
      return;
    }

    let mounted = true;
    const hydrateProfile = async () => {
      try {
        const result = await apiClient.getCustomerProfile();
        if (!mounted) return;

        const profile = result?.profile || {};
        if (!result?.is_complete && !isCustomerProfileComplete(profile)) {
          const callback = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
          router.replace(`/customer/onboarding?callbackUrl=${encodeURIComponent(callback)}`);
          return;
        }

        const phoneRaw = String(profile.phone_number || profile.phone || '');
        const phoneSaudi = sanitizeSaudiLocal(phoneRaw);

        setForm((current) => ({
          ...current,
          location_address_line1: current.location_address_line1 || profile.address_line1 || '',
          location_address_line2: current.location_address_line2 || profile.address_line2 || '',
          location_district: current.location_district || profile.district || profile.state || '',
          location_lat: current.location_lat ?? profile.address_latitude ?? null,
          location_lng: current.location_lng ?? profile.address_longitude ?? null,
          contact_name:
            current.contact_name ||
            profile.name ||
            [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
            String(session?.user?.name || ''),
          contact_email:
            current.contact_email || String(session?.user?.email || profile.email || ''),
          contact_phone_digits: current.contact_phone_digits || phoneSaudi,
        }));
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'Could not load your saved account details.');
      } finally {
        if (mounted) setProfileHydrating(false);
      }
    };

    void hydrateProfile();
    return () => {
      mounted = false;
    };
  }, [
    isSignedInCustomer,
    pathname,
    router,
    searchParams,
    session?.user?.email,
    session?.user?.name,
  ]);

  // Determine services available for step 1
  const proServices: string[] = useMemo(() => {
    if (!proData) return [];
    const mp = proData.marketplace_profile || {};
    const services: string[] = Array.isArray(proData.services_offered)
      ? proData.services_offered
      : Array.isArray(mp.services_offered)
        ? mp.services_offered
        : [];
    return services.filter(Boolean);
  }, [proData]);

  const canAdvance = (): boolean => {
    if (step === 1) return !!form.selected_service;
    if (step === 2) return form.job_description.trim().length >= 20 && !!form.urgency;
    if (step === 3) {
      return Boolean(form.location_address_line1.trim() && form.location_district.trim());
    }
    if (step === 4) {
      return Boolean(
        form.contact_name.trim() &&
        form.contact_email.trim() &&
        form.contact_phone_digits.length === 9
      );
    }
    return false;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await apiClient.submitQuoteRequest({
        pro_id: form.pro_id || undefined,
        service_category: form.selected_service,
        job_description: form.job_description.trim(),
        urgency: form.urgency,
        district: form.location_district,
        contact_name: form.contact_name.trim(),
        contact_email: form.contact_email.trim(),
        contact_phone: `+966${form.contact_phone_digits}`,
        address_line1: form.location_address_line1.trim() || undefined,
        address_line2: form.location_address_line2.trim() || undefined,
      });

      router.push('/customer/dashboard/requests?submitted=1');
    } catch (err: any) {
      setError(err?.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = profileHydrating || proLoading;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/">
            <Logo width={130} height={32} />
          </Link>
          <Link href="/search" className="text-sm text-slate-500 hover:text-slate-700">
            Browse pros instead
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-10">
        <div className="mx-auto w-full max-w-xl">
          {/* Step indicator */}
          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              {([1, 2, 3, 4] as Step[]).map((s) => (
                <div key={s} className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                      s <= step
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-200 bg-white text-slate-400'
                    }`}
                  >
                    {s}
                  </div>
                  <span
                    className={`text-xs font-medium ${s === step ? 'text-slate-900' : 'text-slate-400'}`}
                  >
                    {STEP_LABELS[s]}
                  </span>
                </div>
              ))}
            </div>
            <div className="relative h-0.5 rounded-full bg-slate-100">
              <div
                className="absolute left-0 top-0 h-0.5 rounded-full bg-slate-900 transition-all"
                style={{ width: `${((step - 1) / 3) * 100}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            {isLoading ? (
              <div className="flex h-56 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              </div>
            ) : (
              <>
                {/* ── Step 1: Select service ─────────────────────────────── */}
                {step === 1 && (
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <IconTool className="h-5 w-5 text-slate-600" stroke={1.5} />
                      <h2 className="text-xl font-bold text-slate-900">
                        What service do you need?
                      </h2>
                    </div>
                    <p className="mb-5 text-sm text-slate-500">
                      {proServices.length > 0
                        ? 'Select from the services this pro offers.'
                        : 'Select the category that best describes your job.'}
                    </p>
                    {proServices.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {proServices.map((service) => (
                          <button
                            key={service}
                            onClick={() => set('selected_service', service)}
                            className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                              form.selected_service === service
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                            }`}
                          >
                            {service}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <ServiceCategoryCombobox
                        value={form.selected_service}
                        onChange={(value) => set('selected_service', value)}
                        label=""
                        helperText="Search the full category list, including niche home services."
                      />
                    )}
                  </div>
                )}

                {/* ── Step 2: Job details ────────────────────────────────── */}
                {step === 2 && (
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <IconTool className="h-5 w-5 text-slate-600" stroke={1.5} />
                      <h2 className="text-xl font-bold text-slate-900">Describe your job</h2>
                    </div>
                    <p className="mb-1 text-sm text-slate-500">
                      Describe the problem clearly. Don&apos;t include your contact info here —
                      you&apos;ll add that in the last step.
                    </p>

                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-700">
                          Job description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={5}
                          className={`${INPUT_CLS} resize-none`}
                          placeholder="Example: My kitchen faucet is dripping constantly and I need it replaced. The cabinet under the sink shows water damage — please check the drain connection too."
                          value={form.job_description}
                          onChange={(e) => set('job_description', e.target.value)}
                        />
                        <p
                          className={`text-xs ${form.job_description.length < 20 ? 'text-slate-400' : 'text-emerald-600'}`}
                        >
                          {form.job_description.length}/20 characters minimum
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">
                          How soon do you need this? <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {URGENCY_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => set('urgency', opt.value)}
                              className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                                form.urgency === opt.value
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                              }`}
                            >
                              <p className="text-sm font-semibold">{opt.label}</p>
                              <p
                                className={`mt-0.5 text-xs ${form.urgency === opt.value ? 'text-slate-300' : 'text-slate-400'}`}
                              >
                                {opt.description}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 3: Location ──────────────────────────────────── */}
                {step === 3 && (
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <IconMapPin className="h-5 w-5 text-slate-600" stroke={1.5} />
                      <h2 className="text-xl font-bold text-slate-900">Where is the job?</h2>
                    </div>
                    <p className="mb-4 text-sm text-slate-500">
                      {isSignedInCustomer
                        ? 'We prefilled this from your account. Drag the pin or click the map to update it.'
                        : 'Pin your location on the map and fill in the address details.'}
                    </p>

                    <div className="mb-4">
                      <CustomerAddressMap
                        latitude={form.location_lat}
                        longitude={form.location_lng}
                        onPositionChange={(pos) => {
                          set('location_lat', pos.lat);
                          set('location_lng', pos.lng);
                        }}
                        onAddressResolved={({ addressLine1, neighborhood }) => {
                          if (addressLine1) set('location_address_line1', addressLine1);
                          if (neighborhood) {
                            // Try to match the returned neighborhood to a known district label
                            const norm = neighborhood.toLowerCase();
                            const match = RIYADH_DISTRICT_VALUES.find(
                              (d) =>
                                d.toLowerCase().includes(norm) || norm.includes(d.toLowerCase())
                            );
                            set('location_district', match || neighborhood);
                          }
                        }}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-700">
                          Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          className={INPUT_CLS}
                          placeholder="Street name, building number"
                          value={form.location_address_line1}
                          onChange={(e) => set('location_address_line1', e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-700">
                          Apt / floor / unit{' '}
                          <span className="text-xs font-normal text-slate-400">(optional)</span>
                        </label>
                        <input
                          type="text"
                          className={INPUT_CLS}
                          placeholder="Floor 3, Apt 4B"
                          value={form.location_address_line2}
                          onChange={(e) => set('location_address_line2', e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-700">
                          District <span className="text-red-500">*</span>
                        </label>
                        <select
                          className={INPUT_CLS}
                          value={form.location_district}
                          onChange={(e) => set('location_district', e.target.value)}
                        >
                          <option value="">Select district…</option>
                          {RIYADH_DISTRICT_VALUES.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 4: Contact info ──────────────────────────────── */}
                {step === 4 && (
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <IconUser className="h-5 w-5 text-slate-600" stroke={1.5} />
                      <h2 className="text-xl font-bold text-slate-900">Your contact info</h2>
                    </div>
                    <p className="mb-5 text-sm text-slate-500">
                      {isSignedInCustomer
                        ? 'We filled this from your account. You can still change it.'
                        : 'The pro will use this to follow up with you.'}
                    </p>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-700">
                          Full name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          className={INPUT_CLS}
                          placeholder="Ahmad Al-Rashidi"
                          value={form.contact_name}
                          onChange={(e) => set('contact_name', e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-700">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          className={INPUT_CLS}
                          placeholder="ahmad@example.com"
                          value={form.contact_email}
                          onChange={(e) => set('contact_email', e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-700">
                          Phone number <span className="text-red-500">*</span>
                        </label>
                        <div className="flex overflow-hidden rounded-lg border border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
                          <div className="flex shrink-0 items-center gap-2 border-r border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700">
                            <span aria-hidden="true">🇸🇦</span>
                            <span>+966</span>
                          </div>
                          <input
                            type="tel"
                            inputMode="numeric"
                            className="w-full px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none"
                            placeholder="05X XXX XXXX"
                            value={formatSaudiLocal(form.contact_phone_digits)}
                            onChange={(e) =>
                              set('contact_phone_digits', sanitizeSaudiLocal(e.target.value))
                            }
                          />
                        </div>
                        <p className="text-xs text-slate-400">
                          Saudi mobile number — 9 digits starting with 5.
                        </p>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="mt-5 space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                      <p className="mb-2 font-semibold text-slate-700">Your Request Summary</p>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Service</span>
                        <span className="text-right font-medium text-slate-800">
                          {form.selected_service}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Urgency</span>
                        <span className="text-right font-medium text-slate-800">
                          {URGENCY_OPTIONS.find((u) => u.value === form.urgency)?.label}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Location</span>
                        <span className="text-right font-medium text-slate-800">
                          {[form.location_district, 'Riyadh'].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {error ? (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <div className="mt-6 flex items-center justify-between">
                  {step > 1 ? (
                    <button
                      onClick={() => setStep((current) => (current - 1) as Step)}
                      className="flex items-center gap-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <IconChevronLeft className="h-4 w-4" stroke={2} />
                      Back
                    </button>
                  ) : (
                    <div />
                  )}

                  {step < 4 ? (
                    <button
                      onClick={() => setStep((current) => (current + 1) as Step)}
                      disabled={!canAdvance()}
                      className="flex items-center gap-1 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Continue
                      <IconChevronRight className="h-4 w-4" stroke={2} />
                    </button>
                  ) : (
                    <button
                      onClick={() => void handleSubmit()}
                      disabled={!canAdvance() || submitting}
                      className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {submitting ? (
                        'Submitting...'
                      ) : (
                        <>
                          <IconSend className="h-4 w-4" stroke={1.5} />
                          Send Request
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            By submitting, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-slate-600">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy-policy" className="underline hover:text-slate-600">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}

export default function RequestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <RequestPageContent />
    </Suspense>
  );
}
