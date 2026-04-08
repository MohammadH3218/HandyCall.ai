'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { apiClient } from '@/lib/api-client';
import {
  CustomerProfile,
  formatUsPhoneDigits,
  isCustomerProfileComplete,
  sanitizeUsPhoneDigits,
  sanitizeZip,
  splitFullName,
} from '@/lib/customer-profile';
import { useAuthStore } from '@/stores/auth-store';
import { IconArrowRight, IconHome, IconMapPin, IconPhone, IconSparkles } from '@tabler/icons-react';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

const INPUT_CLS =
  'w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100';

function CustomerOnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const callbackUrl = searchParams.get('callbackUrl') || '/customer/dashboard';
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    phoneDigits: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: 'TX',
    zipcode: '',
  });

  useEffect(() => {
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(
        `/customer/login?callbackUrl=${encodeURIComponent(
          `/customer/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        )}`,
      );
      return;
    }
    if (status !== 'authenticated') return;

    let mounted = true;
    const loadProfile = async () => {
      try {
        const result = await apiClient.getCustomerProfile();
        if (!mounted) return;

        const profile = (result?.profile || {}) as CustomerProfile;
        if (result?.is_complete || isCustomerProfileComplete(profile)) {
          router.replace(callbackUrl);
          return;
        }

        setForm({
          name: profile.name || String(session?.user?.name || ''),
          phoneDigits: sanitizeUsPhoneDigits(profile.phone || ''),
          address_line1: profile.address_line1 || '',
          address_line2: profile.address_line2 || '',
          city: profile.city || '',
          state: profile.state || 'TX',
          zipcode: sanitizeZip(profile.zipcode || ''),
        });
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'We could not load your account details.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadProfile();
    return () => {
      mounted = false;
    };
  }, [callbackUrl, router, session?.user?.name, status]);

  const canSubmit = useMemo(
    () =>
      Boolean(
        form.name.trim() &&
          form.phoneDigits.length === 10 &&
          form.address_line1.trim() &&
          form.city.trim() &&
          form.state.trim() &&
          form.zipcode.length === 5,
      ),
    [form],
  );

  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    setError(null);
    try {
      const result = await apiClient.updateCustomerProfile({
        name: form.name.trim(),
        phone: `+1${form.phoneDigits}`,
        address_line1: form.address_line1.trim(),
        address_line2: form.address_line2.trim() || undefined,
        city: form.city.trim(),
        state: form.state.trim(),
        zipcode: form.zipcode,
      });

      const { firstName, lastName } = splitFullName(form.name);
      useAuthStore.setState((state) => ({
        user: state.user
          ? {
              ...state.user,
              ...(firstName ? { first_name: firstName } : {}),
              ...(lastName ? { last_name: lastName } : {}),
              email: String(session?.user?.email || state.user.email || ''),
            }
          : state.user,
      }));

      if (result?.is_complete || isCustomerProfileComplete(result?.profile)) {
        router.replace(callbackUrl);
        return;
      }

      setError('Please complete all required fields.');
    } catch (err: any) {
      setError(err?.message || 'We could not save your information.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
      <SiteHeader hideLogin={true} />
      <main className="flex flex-1 items-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section
            className={`space-y-6 transition duration-700 ${
              loaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
              <IconSparkles className="h-4 w-4" stroke={1.8} />
              Finish setup
            </div>
            <div className="max-w-xl">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                Save your service details once
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-slate-500">
                We&apos;ll use this to prefill future requests so logged-in customers can move faster, while still
                letting you edit everything later for another property or family member.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <IconHome className="h-5 w-5" stroke={1.8} />
                </div>
                <h2 className="mt-4 text-base font-bold text-slate-900">Primary address</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Your request flow will start with this address already filled in instead of asking from scratch.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <IconPhone className="h-5 w-5" stroke={1.8} />
                </div>
                <h2 className="mt-4 text-base font-bold text-slate-900">Required phone number</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  This closes the Google and Apple signup gap too, so every customer account ends with the same required
                  contact info.
                </p>
              </div>
            </div>
          </section>

          <section
            className={`transition duration-700 delay-100 ${
              loaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}
          >
            <div className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <IconMapPin className="h-6 w-6" stroke={1.8} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Customer onboarding</h2>
                  <p className="mt-1 text-sm text-slate-500">Required before using your customer account.</p>
                </div>
              </div>

              {error ? (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {loading ? (
                <div className="flex h-72 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Full name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(event) => set('name', event.target.value)}
                      placeholder="Jane Smith"
                      className={INPUT_CLS}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone number</label>
                    <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100">
                      <div className="flex items-center gap-2 border-r border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700">
                        <span aria-hidden="true">🇺🇸</span>
                        <span>+1</span>
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={formatUsPhoneDigits(form.phoneDigits)}
                        onChange={(event) => set('phoneDigits', sanitizeUsPhoneDigits(event.target.value))}
                        placeholder="(555) 123-4567"
                        className="w-full px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Address</label>
                    <input
                      type="text"
                      value={form.address_line1}
                      onChange={(event) => set('address_line1', event.target.value)}
                      placeholder="123 Main St"
                      className={INPUT_CLS}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Apt, suite, unit</label>
                    <input
                      type="text"
                      value={form.address_line2}
                      onChange={(event) => set('address_line2', event.target.value)}
                      placeholder="Optional"
                      className={INPUT_CLS}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_110px_130px]">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">City</label>
                      <input
                        type="text"
                        value={form.city}
                        onChange={(event) => set('city', event.target.value)}
                        placeholder="Katy"
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">State</label>
                      <select
                        value={form.state}
                        onChange={(event) => set('state', event.target.value)}
                        className={INPUT_CLS}
                      >
                        {US_STATES.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">ZIP</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.zipcode}
                        onChange={(event) => set('zipcode', sanitizeZip(event.target.value))}
                        placeholder="77449"
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <Link href="/" className="max-w-sm text-sm text-slate-400 transition hover:text-slate-600">
                      Finish later is disabled until this is complete
                    </Link>
                    <button
                      type="submit"
                      disabled={!canSubmit || saving}
                      className="inline-flex items-center justify-center gap-2 self-start rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
                    >
                      {saving ? 'Saving…' : 'Save and continue'}
                      <IconArrowRight className="h-4 w-4" stroke={2} />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export default function CustomerOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        </div>
      }
    >
      <CustomerOnboardingContent />
    </Suspense>
  );
}
