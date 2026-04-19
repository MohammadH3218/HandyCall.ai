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
  isCustomerProfileComplete,
  splitFullName,
} from '@/lib/customer-profile';
import { useAuthStore } from '@/stores/auth-store';
import { IconArrowRight, IconHome, IconMapPin, IconSparkles } from '@tabler/icons-react';

const SAUDI_CITIES = [
  'Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar',
  'Dhahran', 'Taif', 'Tabuk', 'Abha', 'Khamis Mushait', 'Hail',
  'Najran', 'Jizan', 'Yanbu', 'Al Qatif', 'Al Jubail', 'Al Kharj',
  'Buraidah', 'Al Ahsa',
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
    phone: '',
    address_line1: '',
    address_line2: '',
    district: '',
    city: 'Riyadh',
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
          phone: (profile as any).phone || '',
          address_line1: profile.address_line1 || '',
          address_line2: profile.address_line2 || '',
          district: profile.state || '',
          city: profile.city || 'Riyadh',
          zipcode: (profile.zipcode || '').replace(/\D/g, '').slice(0, 5),
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
          form.address_line1.trim() &&
          form.city.trim(),
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
      // Normalize Saudi phone: strip spaces, ensure +966 prefix
      const rawPhone = form.phone.replace(/\s/g, '');
      const normalizedPhone = rawPhone
        ? rawPhone.startsWith('+966')
          ? rawPhone
          : rawPhone.startsWith('0')
          ? `+966${rawPhone.slice(1)}`
          : `+966${rawPhone}`
        : undefined;

      const result = await apiClient.updateCustomerProfile({
        name: form.name.trim(),
        phone: normalizedPhone,
        address_line1: form.address_line1.trim(),
        address_line2: form.address_line2.trim() || undefined,
        city: form.city.trim(),
        state: form.district.trim() || undefined,  // reuse `state` field for district
        zipcode: form.zipcode || undefined,
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
                  <IconSparkles className="h-5 w-5" stroke={1.8} />
                </div>
                <h2 className="mt-4 text-base font-bold text-slate-900">Faster future requests</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Your account keeps your saved details together so future requests and bookings are quicker to complete.
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
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Full name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(event) => set('name', event.target.value)}
                      placeholder="Mohammed Al-Rashid"
                      className={INPUT_CLS}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Mobile number</label>
                    <div className="flex items-center overflow-hidden rounded-2xl border border-slate-200 bg-white/90 focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100">
                      <span className="border-r border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-500 shrink-0">+966</span>
                      <input
                        type="tel"
                        inputMode="tel"
                        value={form.phone}
                        onChange={(event) => set('phone', event.target.value)}
                        placeholder="05XXXXXXXX"
                        className="flex-1 bg-transparent px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Street address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.address_line1}
                      onChange={(event) => set('address_line1', event.target.value)}
                      placeholder="Building no. & street name"
                      className={INPUT_CLS}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Apt / floor / unit</label>
                    <input
                      type="text"
                      value={form.address_line2}
                      onChange={(event) => set('address_line2', event.target.value)}
                      placeholder="Optional"
                      className={INPUT_CLS}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px]">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">District</label>
                      <input
                        type="text"
                        value={form.district}
                        onChange={(event) => set('district', event.target.value)}
                        placeholder="e.g. Al Olaya"
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        City <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={form.city}
                        onChange={(event) => set('city', event.target.value)}
                        className={INPUT_CLS}
                        required
                      >
                        {SAUDI_CITIES.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Postal code</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.zipcode}
                        onChange={(event) => set('zipcode', event.target.value.replace(/\D/g, '').slice(0, 5))}
                        placeholder="12345"
                        className={INPUT_CLS}
                        maxLength={5}
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
