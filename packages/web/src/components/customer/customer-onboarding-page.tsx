'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import dynamicImport from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { RIYADH_DISTRICTS } from '@/constants/riyadh-districts';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteHeader } from '@/components/marketing/site-header';
import {
  buildCustomerOnboardingCallbackUrl,
  normalizeCustomerPostOnboardingCallback,
} from '@/lib/auth-navigation';
import { apiClient } from '@/lib/api-client';
import {
  CustomerProfile,
  isCustomerProfileComplete,
  sanitizeSaudiPhoneLocalDigits,
} from '@/lib/customer-profile';
import { useAuthStore } from '@/stores/auth-store';
import {
  IconArrowRight,
  IconBuildingCommunity,
  IconMapPin,
  IconPhone,
  IconSearch,
  IconSparkles,
} from '@tabler/icons-react';

const CustomerAddressMap = dynamicImport(
  () => import('@/components/customer/customer-address-map'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] items-center justify-center rounded-[24px] border border-slate-200 bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    ),
  }
);

const INPUT_CLS =
  'w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100';

type AddressResult = {
  label: string;
  lat: number;
  lng: number;
};

const DEFAULT_RIYADH_CENTER = { lat: 24.7136, lng: 46.6753 };

function normalizeForMatch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function inferDistrict(value: string) {
  const normalized = normalizeForMatch(value);
  return (
    RIYADH_DISTRICTS.find((district) => normalized.includes(normalizeForMatch(district))) || ''
  );
}

async function geocodeAddress(query: string): Promise<AddressResult[]> {
  const params = new URLSearchParams({
    q: `${query}, Riyadh, Saudi Arabia`,
    format: 'jsonv2',
    limit: '6',
    addressdetails: '1',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('We could not search Riyadh addresses right now.');
  }

  const data = (await response.json()) as Array<any>;
  return data.map((item) => ({
    label: item.display_name as string,
    lat: Number(item.lat),
    lng: Number(item.lon),
  }));
}

async function reverseGeocode(lat: number, lng: number) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'jsonv2',
    zoom: '18',
    addressdetails: '1',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('We could not confirm that pin location.');
  }

  const data = (await response.json()) as any;
  return {
    label: String(data?.display_name || '').trim(),
    district: inferDistrict(String(data?.display_name || '')),
  };
}

function CustomerOnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const callbackUrl = normalizeCustomerPostOnboardingCallback(searchParams.get('callbackUrl'));
  const loginCallbackUrl = buildCustomerOnboardingCallbackUrl(callbackUrl);
  const districtContainerRef = useRef<HTMLDivElement | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone_digits: '',
    district: '',
    district_query: '',
    preferred_language: 'en' as 'ar' | 'en',
    marketing_consent: false,
    address_query: '',
    address_line1: '',
    address_line2: '',
    address_latitude: null as number | null,
    address_longitude: null as number | null,
  });
  const [districtOpen, setDistrictOpen] = useState(false);
  const [addressResults, setAddressResults] = useState<AddressResult[]>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [updatingPin, setUpdatingPin] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!districtContainerRef.current?.contains(event.target as Node)) {
        setDistrictOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/customer/login?callbackUrl=${encodeURIComponent(loginCallbackUrl)}`);
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

        const district = String(profile.district || '').trim();
        setForm({
          first_name: String(profile.first_name || '').trim(),
          last_name: String(profile.last_name || '').trim(),
          phone_digits: sanitizeSaudiPhoneLocalDigits(String(profile.phone_number || '')),
          district,
          district_query: district,
          preferred_language:
            profile.preferred_language === 'ar' || profile.preferred_language === 'en'
              ? profile.preferred_language
              : 'en',
          marketing_consent: Boolean(profile.marketing_consent),
          address_query: String(profile.address_line1 || '').trim(),
          address_line1: String(profile.address_line1 || '').trim(),
          address_line2: String(profile.address_line2 || '').trim(),
          address_latitude:
            typeof profile.address_latitude === 'number' ? profile.address_latitude : null,
          address_longitude:
            typeof profile.address_longitude === 'number' ? profile.address_longitude : null,
        });
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'We could not load your customer profile.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [callbackUrl, loginCallbackUrl, router, status]);

  const filteredDistricts = useMemo(() => {
    const term = form.district_query.trim().toLowerCase();
    if (!term) return RIYADH_DISTRICTS.slice(0, 12);
    return RIYADH_DISTRICTS.filter((district) => district.toLowerCase().includes(term)).slice(0, 12);
  }, [form.district_query]);

  const phoneNumber = useMemo(
    () => (form.phone_digits ? `+966${form.phone_digits}` : ''),
    [form.phone_digits]
  );

  const canSubmit = useMemo(
    () =>
      Boolean(
        form.first_name.trim() &&
          form.last_name.trim() &&
          /^\+9665\d{8}$/.test(phoneNumber) &&
          form.district.trim() &&
          form.address_line1.trim() &&
          form.address_latitude !== null &&
          form.address_longitude !== null,
      ),
    [form, phoneNumber],
  );

  const set = (key: keyof typeof form, value: string | boolean | number | null) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function handleAddressSearch() {
    if (!form.address_query.trim()) {
      setError('Search for a Riyadh address first.');
      return;
    }

    try {
      setSearchingAddress(true);
      setError(null);
      const results = await geocodeAddress(form.address_query.trim());
      setAddressResults(results);
      if (results.length === 0) {
        setError('No matching Riyadh addresses were found. Try a nearby landmark or street name.');
      }
    } catch (err: any) {
      setError(err?.message || 'We could not search that address.');
    } finally {
      setSearchingAddress(false);
    }
  }

  function applyAddressSelection(result: AddressResult) {
    const district = inferDistrict(result.label);
    setForm((current) => ({
      ...current,
      address_query: result.label,
      address_line1: result.label,
      address_latitude: result.lat,
      address_longitude: result.lng,
      district: district || current.district,
      district_query: district || current.district_query,
    }));
    setAddressResults([]);
  }

  async function updatePinLocation(position: { lat: number; lng: number }) {
    setForm((current) => ({
      ...current,
      address_latitude: position.lat,
      address_longitude: position.lng,
    }));

    try {
      setUpdatingPin(true);
      const result = await reverseGeocode(position.lat, position.lng);
      setForm((current) => ({
        ...current,
        address_line1: result.label || current.address_line1,
        address_query: result.label || current.address_query,
        district: result.district || current.district,
        district_query: result.district || current.district_query,
      }));
    } catch (err: any) {
      setError(err?.message || 'We could not confirm the map pin address.');
    } finally {
      setUpdatingPin(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) {
      setError('Complete your Riyadh profile, including the map pin, before continuing.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await apiClient.updateCustomerProfile({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone_number: phoneNumber,
        district: form.district,
        preferred_language: form.preferred_language,
        marketing_consent: form.marketing_consent,
        address_line1: form.address_line1.trim(),
        address_line2: form.address_line2.trim() || undefined,
        address_latitude: form.address_latitude ?? undefined,
        address_longitude: form.address_longitude ?? undefined,
      });

      useAuthStore.setState((state) => ({
        user: state.user
          ? {
              ...state.user,
              first_name: form.first_name.trim(),
              last_name: form.last_name.trim(),
              phone_number: phoneNumber,
              district: form.district,
              address_line1: form.address_line1.trim(),
              address_line2: form.address_line2.trim() || undefined,
              address_latitude: form.address_latitude ?? undefined,
              address_longitude: form.address_longitude ?? undefined,
              email: String(session?.user?.email || state.user.email || ''),
            }
          : state.user,
      }));

      if (result?.is_complete || isCustomerProfileComplete(result?.profile)) {
        router.replace(callbackUrl);
        return;
      }

      setError('We saved part of your profile, but some required fields are still missing.');
    } catch (err: any) {
      setError(err?.message || 'We could not save your Riyadh profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
      <SiteHeader hideLogin />
      <main className="flex flex-1 items-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <section
            className={`space-y-6 transition duration-700 ${
              loaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
              <IconSparkles className="h-4 w-4" stroke={1.8} />
              Complete your Riyadh setup
            </div>
            <div className="max-w-xl">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                Save your Riyadh customer details once
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-slate-500">
                We use this to speed up future requests, match you to pros in the right Riyadh
                district, and keep your Saudi contact details ready for booking updates.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <IconMapPin className="h-5 w-5" stroke={1.8} />
                </div>
                <h2 className="mt-4 text-base font-bold text-slate-900">Pinned Riyadh address</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Search your address, then place the map pin on the exact location so bookings
                  route to the right property.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <IconPhone className="h-5 w-5" stroke={1.8} />
                </div>
                <h2 className="mt-4 text-base font-bold text-slate-900">Saudi mobile number</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  We keep your Saudi number on file so booking confirmations and provider updates
                  can reach you without re-entering it on every request.
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
                  <IconBuildingCommunity className="h-6 w-6" stroke={1.8} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Customer onboarding</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Required before using your customer account in Riyadh.
                  </p>
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        First name
                      </label>
                      <input
                        type="text"
                        value={form.first_name}
                        onChange={(event) => set('first_name', event.target.value)}
                        placeholder="Mohammad"
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Last name
                      </label>
                      <input
                        type="text"
                        value={form.last_name}
                        onChange={(event) => set('last_name', event.target.value)}
                        placeholder="Al Harbi"
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Saudi mobile number
                    </label>
                    <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white/90 focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100">
                      <div className="flex items-center gap-2 border-r border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700">
                        <span aria-hidden="true" className="text-base">
                          🇸🇦
                        </span>
                        <span>+966</span>
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={form.phone_digits}
                        onChange={(event) =>
                          set('phone_digits', sanitizeSaudiPhoneLocalDigits(event.target.value))
                        }
                        placeholder="5XXXXXXXX"
                        className="h-12 w-full bg-transparent px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Enter the 9 local digits of your Saudi mobile number. It must start with 5.
                    </p>
                  </div>

                  <div ref={districtContainerRef} className="relative">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Riyadh district
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={form.district_query}
                        onFocus={() => setDistrictOpen(true)}
                        onChange={(event) => {
                          set('district_query', event.target.value);
                          set('district', '');
                          setDistrictOpen(true);
                        }}
                        placeholder="Search your district"
                        className={`${INPUT_CLS} pr-11`}
                      />
                      <IconSearch
                        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        stroke={1.8}
                      />
                    </div>
                    {districtOpen ? (
                      <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_40px_rgba(15,23,42,0.12)]">
                        {filteredDistricts.length > 0 ? (
                          filteredDistricts.map((district) => (
                            <button
                              key={district}
                              type="button"
                              onClick={() => {
                                setForm((current) => ({
                                  ...current,
                                  district,
                                  district_query: district,
                                }));
                                setDistrictOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                                form.district === district
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span>{district}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-slate-500">
                            No matching Riyadh district found.
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50/80 p-4 md:p-5">
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Search your address
                        </label>
                        <p className="text-xs text-slate-500">
                          Search first, then move the map until the pin sits on the exact entrance.
                        </p>
                      </div>
                      <label className="sr-only">
                        Search your address
                      </label>
                      <div className="flex flex-col gap-3 md:flex-row">
                        <input
                          type="text"
                          value={form.address_query}
                          onChange={(event) => set('address_query', event.target.value)}
                          placeholder="Street, landmark, compound, or building in Riyadh"
                          className={INPUT_CLS}
                        />
                        <button
                          type="button"
                          onClick={handleAddressSearch}
                          disabled={searchingAddress}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          <IconSearch className="h-4 w-4" stroke={1.8} />
                          {searchingAddress ? 'Searching…' : 'Search'}
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-700">
                              Confirm the exact pin
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              Zoom in, drag the map, or tap a nearby point. The center pin is the
                              final address we save.
                            </p>
                          </div>
                        </div>

                        <CustomerAddressMap
                          latitude={form.address_latitude}
                          longitude={form.address_longitude}
                          onPositionChange={updatePinLocation}
                        />
                      </div>

                      <div className="space-y-3">
                        {addressResults.length > 0 ? (
                          <div className="rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm">
                            <p className="mb-2 text-sm font-medium text-slate-700">Search results</p>
                            <div className="max-h-52 overflow-auto space-y-1">
                              {addressResults.map((result) => (
                                <button
                                  key={`${result.lat}-${result.lng}-${result.label}`}
                                  type="button"
                                  onClick={() => applyAddressSelection(result)}
                                  className="block w-full rounded-2xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                                >
                                  {result.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                          <p className="text-sm font-medium text-slate-700">Pinned address</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {form.address_line1 || 'Search and place the map pin on your Riyadh address.'}
                          </p>
                          {updatingPin ? (
                            <p className="mt-3 text-xs text-emerald-700">
                              Updating address from the map position…
                            </p>
                          ) : null}
                        </div>

                        <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Additional information
                          </label>
                          <textarea
                            value={form.address_line2}
                            onChange={(event) => set('address_line2', event.target.value)}
                            placeholder="Apartment, villa, compound, building, or unit details"
                            className={`${INPUT_CLS} min-h-[120px] resize-none`}
                          />
                          <p className="mt-2 text-xs text-slate-500">
                            Add short details like apartment number, villa number, or compound gate.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Preferred language
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { value: 'en', title: 'English', body: 'Use English across requests and updates.' },
                        { value: 'ar', title: 'Arabic', body: 'Use Arabic where supported across the marketplace.' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => set('preferred_language', option.value)}
                          className={`rounded-2xl border px-4 py-4 text-left transition ${
                            form.preferred_language === option.value
                              ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <p className="font-semibold text-slate-900">{option.title}</p>
                          <p className="mt-1 text-sm text-slate-500">{option.body}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={form.marketing_consent}
                      onChange={(event) => set('marketing_consent', event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 accent-emerald-600"
                    />
                    <span className="text-sm leading-6 text-slate-600">
                      Send occasional HandyCall updates about service availability, new features,
                      and marketplace offers in Riyadh.
                    </span>
                  </label>

                  <div className="flex justify-end border-t border-slate-100 pt-5">
                    <button
                      type="submit"
                      disabled={!canSubmit || saving || updatingPin}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
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
