'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Logo } from '@/components/ui/logo';
import { apiClient } from '@/lib/api-client';
import { isCustomerProfileComplete, sanitizeUsPhoneDigits, sanitizeZip } from '@/lib/customer-profile';
import {
  IconChevronRight,
  IconChevronLeft,
  IconTool,
  IconMapPin,
  IconUser,
  IconSend,
} from '@tabler/icons-react';

const SERVICE_CATEGORIES = [
  'Plumbing',
  'HVAC',
  'Electrical',
  'Cleaning',
  'Landscaping',
  'Handyman',
  'Pest Control',
  'Roofing',
  'Painting',
  'Flooring',
  'Moving',
  'Appliance Repair',
  'Carpentry',
  'Windows & Doors',
  'Pool & Spa',
  'Other',
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

const URGENCY_OPTIONS = [
  { value: 'emergency', label: 'Emergency', description: 'Need help within hours' },
  { value: 'urgent', label: 'Within 1-2 days', description: 'Need it done soon' },
  { value: 'this_week', label: 'This week', description: 'Flexible but soon' },
  { value: 'flexible', label: "I'm flexible", description: 'No rush, just get it done' },
];

type Step = 1 | 2 | 3 | 4;

interface FormData {
  service_category: string;
  job_description: string;
  urgency: string;
  location_address_line1: string;
  location_address_line2: string;
  location_city: string;
  location_state: string;
  location_zipcode: string;
  contact_name: string;
  contact_email: string;
  contact_phone_digits: string;
}

const STEP_LABELS: Record<Step, string> = {
  1: 'Service',
  2: 'Details',
  3: 'Location',
  4: 'Contact',
};

const STEP_ICONS: Record<Step, React.ElementType> = {
  1: IconTool,
  2: IconTool,
  3: IconMapPin,
  4: IconUser,
};

const INPUT_CLS =
  'w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100';

function formatPhoneDigits(value: string) {
  const digits = sanitizeUsPhoneDigits(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function RequestPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const preselectedCategory = searchParams.get('category') || '';

  const [step, setStep] = useState<Step>(preselectedCategory ? 2 : 1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileHydrating, setProfileHydrating] = useState(true);

  const [form, setForm] = useState<FormData>({
    service_category: preselectedCategory,
    job_description: '',
    urgency: '',
    location_address_line1: '',
    location_address_line2: '',
    location_city: '',
    location_state: 'TX',
    location_zipcode: '',
    contact_name: '',
    contact_email: (session?.user?.email as string | undefined) || '',
    contact_phone_digits: '',
  });

  const isSignedInCustomer =
    (session as any)?.poolType === 'customer' &&
    Boolean((session as any)?.idToken || (session as any)?.accessToken);

  const contactPhone = useMemo(() => {
    if (form.contact_phone_digits.length !== 10) return '';
    return `+1${form.contact_phone_digits}`;
  }, [form.contact_phone_digits]);

  const set = (key: keyof FormData, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

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

        setForm((current) => ({
          ...current,
          location_address_line1: current.location_address_line1 || profile.address_line1 || '',
          location_address_line2: current.location_address_line2 || profile.address_line2 || '',
          location_city: current.location_city || profile.city || '',
          location_state: current.location_state || profile.state || 'TX',
          location_zipcode: current.location_zipcode || sanitizeZip(profile.zipcode || ''),
          contact_name: current.contact_name || profile.name || String(session?.user?.name || ''),
          contact_email:
            current.contact_email || String(session?.user?.email || profile.email || ''),
          contact_phone_digits:
            current.contact_phone_digits || sanitizeUsPhoneDigits(profile.phone || ''),
        }));
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'We could not load your saved account details.');
      } finally {
        if (mounted) setProfileHydrating(false);
      }
    };

    void hydrateProfile();
    return () => {
      mounted = false;
    };
  }, [isSignedInCustomer, pathname, router, searchParams, session?.user?.email, session?.user?.name]);

  const canAdvance = (): boolean => {
    if (step === 1) return !!form.service_category;
    if (step === 2) return form.job_description.trim().length >= 20 && !!form.urgency;
    if (step === 3) {
      return Boolean(
        form.location_address_line1.trim() &&
          form.location_city.trim() &&
          form.location_state.trim() &&
          form.location_zipcode.length === 5,
      );
    }
    if (step === 4) {
      return Boolean(
        form.contact_name.trim() &&
          form.contact_email.trim() &&
          form.contact_phone_digits.length === 10,
      );
    }
    return false;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await apiClient.submitQuoteRequest({
        service_category: form.service_category,
        job_description: form.job_description.trim(),
        urgency: form.urgency,
        location_address_line1: form.location_address_line1.trim(),
        location_address_line2: form.location_address_line2.trim() || undefined,
        location_city: form.location_city.trim(),
        location_state: form.location_state.trim(),
        location_zipcode: form.location_zipcode,
        contact_name: form.contact_name.trim(),
        contact_email: form.contact_email.trim(),
        contact_phone: contactPhone,
        customer_user_id: isSignedInCustomer ? (session?.user as any)?.id : undefined,
      });

      if (isSignedInCustomer) {
        router.push('/customer/dashboard/requests?submitted=1');
        return;
      }

      router.push('/customer/login?callbackUrl=/customer/dashboard/requests&submitted_request=1');
    } catch (err: any) {
      setError(err?.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const StepIcon = STEP_ICONS[step];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/">
            <Logo width={130} height={32} />
          </Link>
          <Link href="/find-pros" className="text-sm text-slate-500 hover:text-slate-700">
            Browse pros instead
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-10">
        <div className="mx-auto w-full max-w-xl">
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
                  <span className={`text-xs font-medium ${s === step ? 'text-slate-900' : 'text-slate-400'}`}>
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
            {profileHydrating ? (
              <div className="flex h-56 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              </div>
            ) : (
              <>
            {step === 1 && (
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <StepIcon className="h-5 w-5 text-slate-600" stroke={1.5} />
                  <h2 className="text-xl font-bold text-slate-900">What service do you need?</h2>
                </div>
                <p className="mb-5 text-sm text-slate-500">Select the category that best matches your job.</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {SERVICE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => set('service_category', cat)}
                      className={`rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                        form.service_category === cat
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <StepIcon className="h-5 w-5 text-slate-600" stroke={1.5} />
                  <h2 className="text-xl font-bold text-slate-900">Describe your job</h2>
                </div>
                <p className="mb-5 text-sm text-slate-500">
                  The more detail you provide, the more accurate your quotes will be.
                </p>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                      Job Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={5}
                      className={`${INPUT_CLS} resize-none`}
                      placeholder="Example: My kitchen sink is leaking under the cabinet. I need the leak fixed, the drain checked, and a quote for any damaged piping."
                      value={form.job_description}
                      onChange={(e) => set('job_description', e.target.value)}
                    />
                    <p className={`text-xs ${form.job_description.length < 20 ? 'text-slate-400' : 'text-emerald-600'}`}>
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
                          <p className={`mt-0.5 text-xs ${form.urgency === opt.value ? 'text-slate-300' : 'text-slate-400'}`}>
                            {opt.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <StepIcon className="h-5 w-5 text-slate-600" stroke={1.5} />
                  <h2 className="text-xl font-bold text-slate-900">Where is the job?</h2>
                </div>
                <p className="mb-5 text-sm text-slate-500">
                  {isSignedInCustomer
                    ? 'We prefilled this from your account. Change it here anytime if this job is for another location.'
                    : 'Enter the full service address so pros know exactly where the work is needed.'}
                </p>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className={INPUT_CLS}
                      placeholder="123 Main St"
                      value={form.location_address_line1}
                      onChange={(e) => set('location_address_line1', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                      Apt, suite, unit <span className="text-slate-400 text-xs font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      className={INPUT_CLS}
                      placeholder="Apt 4B"
                      value={form.location_address_line2}
                      onChange={(e) => set('location_address_line2', e.target.value)}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_100px_120px]">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-slate-700">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className={INPUT_CLS}
                        placeholder="Katy"
                        value={form.location_city}
                        onChange={(e) => set('location_city', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-slate-700">
                        State <span className="text-red-500">*</span>
                      </label>
                      <select
                        className={INPUT_CLS}
                        value={form.location_state}
                        onChange={(e) => set('location_state', e.target.value)}
                      >
                        {US_STATES.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-slate-700">
                        ZIP <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={INPUT_CLS}
                        placeholder="77449"
                        value={form.location_zipcode}
                        onChange={(e) => set('location_zipcode', sanitizeZip(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <StepIcon className="h-5 w-5 text-slate-600" stroke={1.5} />
                  <h2 className="text-xl font-bold text-slate-900">Your contact info</h2>
                </div>
                <p className="mb-5 text-sm text-slate-500">
                  {isSignedInCustomer
                    ? 'We filled this from your account. You can still change it if another person should be the contact for this job.'
                    : 'Pros will use this to follow up. After you send your request, we&apos;ll take you to your Requests page.'}
                </p>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className={INPUT_CLS}
                      placeholder="Jane Smith"
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
                      placeholder="jane@example.com"
                      value={form.contact_email}
                      onChange={(e) => set('contact_email', e.target.value)}
                    />
                    <p className="text-xs text-slate-400">We&apos;ll send quote responses to this address.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex overflow-hidden rounded-lg border border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
                      <div className="flex items-center gap-2 border-r border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
                        <span aria-hidden="true">🇺🇸</span>
                        <span>+1</span>
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        className="w-full px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none"
                        placeholder="(555) 123-4567"
                        value={formatPhoneDigits(form.contact_phone_digits)}
                        onChange={(e) => set('contact_phone_digits', sanitizeUsPhoneDigits(e.target.value))}
                      />
                    </div>
                    <p className="text-xs text-slate-400">US numbers only. Enter exactly 10 digits.</p>
                  </div>
                </div>

                <div className="mt-5 space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                  <p className="mb-2 font-semibold text-slate-700">Your Request Summary</p>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Service</span>
                    <span className="text-right font-medium text-slate-800">{form.service_category}</span>
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
                      {[form.location_city, form.location_state, form.location_zipcode].filter(Boolean).join(', ')}
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
                  onClick={handleSubmit}
                  disabled={!canAdvance() || submitting}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : (
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
            <Link href="/terms" className="underline hover:text-slate-600">Terms</Link>{' '}
            and{' '}
            <Link href="/privacy-policy" className="underline hover:text-slate-600">Privacy Policy</Link>.
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
