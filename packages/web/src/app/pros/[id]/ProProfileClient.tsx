'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  IconArrowLeft,
  IconBriefcase,
  IconCheck,
  IconMapPin,
  IconPhoto,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { apiClient } from '@/lib/api-client';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { useAuthStore } from '@/stores/auth-store';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  mada: 'Mada',
  stc_pay: 'STC Pay',
  apple_pay: 'Apple Pay',
  card: 'Credit / Debit Card',
  bank_transfer: 'Bank Transfer',
  zelle: 'Zelle',
  venmo: 'Venmo',
  check: 'Check',
};

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type Tab = 'about' | 'services' | 'portfolio' | 'availability' | 'reviews';

function getLegacyMarketplaceProfile(provider: any) {
  if (!provider || typeof provider !== 'object') return {};
  return provider.marketplace_profile && typeof provider.marketplace_profile === 'object'
    ? provider.marketplace_profile
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

function StarRating({ rating, count }: { rating: number; count: number }) {
  const filled = Math.floor(rating);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <svg
            key={i}
            viewBox="0 0 20 20"
            className={`h-4 w-4 ${i < filled ? 'text-amber-400' : 'text-slate-200'}`}
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-sm font-semibold text-slate-700">
        {rating > 0 ? Number(rating).toFixed(1) : '0.0'}
      </span>
      <span className="text-sm text-slate-400">
        ({count} {count === 1 ? 'review' : 'reviews'})
      </span>
    </div>
  );
}

function LoginGateModal({ proId, onClose }: { proId: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-bold text-slate-900">Sign in to request a quote</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100"
          >
            <IconX className="h-5 w-5" stroke={1.5} />
          </button>
        </div>
        <div className="space-y-4 p-6">
          <p className="text-sm text-slate-500">
            Create a free account or sign in to message pros and book services.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href={`/customer/login?callbackUrl=/pros/${proId}`}
              className="w-full rounded-xl bg-emerald-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="w-full rounded-xl border border-slate-200 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProProfileClient({ id }: { id: string }) {
  const { isAuthenticated } = useAuthStore();
  const { data: session, status: sessionStatus } = useSession();
  const isCustomer = (session as any)?.poolType === 'customer';
  const router = useRouter();
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('about');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [proReviews, setProReviews] = useState<any[]>([]);

  // Gate: only logged-in customers can view pro profiles
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!isCustomer) {
      router.replace(`/customer/login?callbackUrl=${encodeURIComponent(`/pros/${id}`)}`);
    }
  }, [id, isCustomer, router, sessionStatus]);

  useEffect(() => {
    if (!isCustomer) return;
    apiClient
      .getProviderById(id)
      .then((data) => {
        if (!data) {
          setNotFound(true);
          return;
        }
        setProvider(data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, isCustomer]);

  useEffect(() => {
    if (!isCustomer || !id) return;
    apiClient
      .getProReviews(id)
      .then((list) => setProReviews(list))
      .catch(() => {});
  }, [id, isCustomer]);

  // Show spinner for all non-customer states while redirect fires
  if (sessionStatus === 'loading' || !isCustomer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (notFound || !provider) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-3xl font-extrabold text-slate-900">Pro not found</h1>
          <p className="text-slate-500">
            This profile may have been removed or the link is incorrect.
          </p>
          <Link
            href="/search"
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Browse all pros
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const mp = getLegacyMarketplaceProfile(provider);
  const name =
    provider.company_name ||
    [provider.first_name, provider.last_name].filter(Boolean).join(' ') ||
    provider.email ||
    '';
  const bio = getFirstString(provider.bio, mp.bio, provider.public_description);
  const photo = getFirstString(provider.profile_photo_url, provider.profile_photo_s3_key, mp.profile_photo);
  const cities: string[] =
    getFirstArray(provider.service_districts, mp.service_districts, mp.service_cities).length > 0
      ? getFirstArray(provider.service_districts, mp.service_districts, mp.service_cities)
      : Array.isArray(provider.service_area_cities)
      ? provider.service_area_cities
      : [];
  const primaryCity = provider.city || cities[0] || '';
  const rating = Number((provider.average_rating ?? provider.overall_rating ?? 0)) / 100;
  const reviews = Number(provider.total_reviews || 0);
  const hires = Number(provider.total_hires || provider.hires_count || 0);
  const startingPrice =
    typeof provider.starting_price_sar === 'number'
      ? Number((provider.starting_price_sar / 100).toFixed(0))
      : mp.starting_price;
  const contactForPrice =
    typeof provider.contact_for_price === 'boolean'
      ? provider.contact_for_price
      : Boolean(mp.contact_for_price);
  const services: string[] = Array.isArray(provider.services_offered)
    ? provider.services_offered
    : Array.isArray(provider.services)
      ? provider.services.map((service: any) => service.title).filter(Boolean)
      : Array.isArray(mp.services_offered)
        ? mp.services_offered
      : [];
  const portfolioPhotos: string[] = Array.isArray(provider.work_photo_urls)
      ? provider.work_photo_urls.filter((p: string) => !!p)
      : Array.isArray(provider.work_photo_s3_keys)
        ? provider.work_photo_s3_keys.filter((p: string) => !!p)
        : Array.isArray(mp.portfolio_photos)
          ? mp.portfolio_photos.filter((p: string) => !!p)
        : [];
  const paymentMethods: string[] = getFirstArray(provider.payment_methods, mp.payment_methods);
  const businessHours: Record<string, { open: boolean; from: string; to: string }> =
    (Array.isArray(provider.availability)
      ? provider.availability.reduce((acc: any, slot: any) => {
          acc[slot.day_of_week] = {
            open: Boolean(slot.is_available),
            from: slot.open_time,
            to: slot.close_time,
          };
          return acc;
        }, {})
      : mp.business_hours || {});
  const isLicensed =
    mp.is_licensed ??
    Boolean(provider.license_number || provider.cr_number || mp.license_number || mp.cr_number);
  const isBackgroundChecked = mp.is_background_checked;
  const yearsInBusiness =
    provider.years_experience || mp.years_in_business || mp.years_experience;
  const employees =
    provider.employee_count_range || mp.employees || mp.employee_count_range;
  const serviceCategory = getFirstString(provider.service_category, mp.service_category);
  const instagram = getFirstString(provider.instagram_handle, mp.instagram);
  const twitter = getFirstString(provider.twitter_handle, mp.twitter);
  const website = getFirstString(provider.website_url, mp.website);
  const propertyTypes: string[] = getFirstArray(provider.property_types, mp.property_types);

  const hasPortfolio = portfolioPhotos.length > 0;
  const hasAvailability = Object.keys(businessHours).length > 0;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'about', label: 'About' },
    { id: 'services', label: 'Services' },
    ...(hasPortfolio ? [{ id: 'portfolio' as Tab, label: 'Portfolio' }] : []),
    ...(hasAvailability ? [{ id: 'availability' as Tab, label: 'Availability' }] : []),
    { id: 'reviews', label: `Reviews${reviews > 0 ? ` (${reviews})` : ''}` },
  ];

  function handleRequestQuote() {
    if (isAuthenticated) {
      router.push(`/request?category=${encodeURIComponent(serviceCategory)}`);
    } else {
      setShowLoginGate(true);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <SiteHeader />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/search"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800"
          >
            <IconArrowLeft className="h-4 w-4" stroke={1.8} />
            Back to search
          </Link>

          <div className="flex gap-6 lg:items-start">
            {/* Left: main content */}
            <div className="min-w-0 flex-1 space-y-4">
              {/* Hero card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-5">
                  {photo ? (
                    <img
                      src={photo}
                      alt={name}
                      className="h-28 w-28 shrink-0 rounded-[28px] object-cover ring-2 ring-slate-100 shadow-sm"
                    />
                  ) : (
                    <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[28px] bg-emerald-50 text-4xl font-extrabold text-emerald-600 shadow-sm">
                      {name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-extrabold text-slate-900">{name}</h1>
                      {isLicensed && (
                        <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-bold text-white">
                          Verified
                        </span>
                      )}
                    </div>
                    {serviceCategory && (
                      <p className="mt-1 text-sm font-medium text-emerald-600">{serviceCategory}</p>
                    )}
                    {primaryCity && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                        <IconMapPin className="h-3.5 w-3.5 shrink-0" stroke={1.8} />
                        {primaryCity}
                      </p>
                    )}
                    <div className="mt-2">
                      <StarRating rating={rating} count={reviews} />
                    </div>
                    {hires > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                        <IconBriefcase className="h-3.5 w-3.5 shrink-0 text-slate-400" stroke={1.8} />
                        {hires} {hires === 1 ? 'hire' : 'hires'} on HandyCall
                      </p>
                    )}
                    {bio && (
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">{bio}</p>
                    )}
                    {services.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {services.slice(0, 5).map((service) => (
                          <span
                            key={service}
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                          >
                            {service}
                          </span>
                        ))}
                        {services.length > 5 && (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                            +{services.length - 5} more services
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex border-b border-slate-100">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                        activeTab === tab.id
                          ? 'border-b-2 border-emerald-500 text-emerald-700'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-6">
                  {/* About */}
                  {activeTab === 'about' && (
                    <div className="space-y-6">
                      {(yearsInBusiness || employees || isLicensed || isBackgroundChecked) && (
                        <div>
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Overview
                          </p>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {yearsInBusiness && (
                              <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 p-3">
                                <IconBriefcase className="h-5 w-5 shrink-0 text-slate-400" stroke={1.6} />
                                <div>
                                  <p className="text-xs text-slate-400">Experience</p>
                                  <p className="text-sm font-semibold text-slate-700">
                                    {yearsInBusiness} yrs
                                  </p>
                                </div>
                              </div>
                            )}
                            {employees && (
                              <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 p-3">
                                <IconUsers className="h-5 w-5 shrink-0 text-slate-400" stroke={1.6} />
                                <div>
                                  <p className="text-xs text-slate-400">Team</p>
                                  <p className="text-sm font-semibold text-slate-700">{employees}</p>
                                </div>
                              </div>
                            )}
                            {isLicensed && (
                              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                                <IconCheck className="h-5 w-5 shrink-0 text-emerald-500" stroke={2} />
                                <div>
                                  <p className="text-xs text-emerald-600">Credentials</p>
                                  <p className="text-sm font-semibold text-emerald-700">
                                    License verified
                                  </p>
                                </div>
                              </div>
                            )}
                            {isBackgroundChecked && (
                              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                                <IconCheck className="h-5 w-5 shrink-0 text-emerald-500" stroke={2} />
                                <div>
                                  <p className="text-xs text-emerald-600">Identity</p>
                                  <p className="text-sm font-semibold text-emerald-700">
                                    Background checked
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {paymentMethods.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Payment methods
                          </p>
                          <p className="text-sm text-slate-600">
                            Accepts{' '}
                            {paymentMethods.map((m) => PAYMENT_LABELS[m] || m).join(', ')}
                          </p>
                        </div>
                      )}

                      {propertyTypes.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Property types
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {propertyTypes.map((pt) => (
                              <span
                                key={pt}
                                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                              >
                                {pt}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(instagram || twitter || website) && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Links
                          </p>
                          <div className="flex flex-wrap gap-4">
                            {instagram && (
                              <a
                                href={`https://instagram.com/${instagram}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-slate-600 transition hover:text-emerald-600"
                              >
                                Instagram
                              </a>
                            )}
                            {twitter && (
                              <a
                                href={`https://twitter.com/${twitter}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-slate-600 transition hover:text-emerald-600"
                              >
                                Twitter / X
                              </a>
                            )}
                            {website && (
                              <a
                                href={website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-emerald-600 transition hover:underline"
                              >
                                Website
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {!yearsInBusiness &&
                        !employees &&
                        !isLicensed &&
                        !isBackgroundChecked &&
                        paymentMethods.length === 0 &&
                        !instagram &&
                        !twitter &&
                        !website && (
                          <p className="text-sm text-slate-400">
                            No additional information provided yet.
                          </p>
                        )}
                    </div>
                  )}

                  {/* Services */}
                  {activeTab === 'services' && (
                    <div>
                      {services.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {services.map((s) => (
                            <span
                              key={s}
                              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">No services listed yet.</p>
                      )}
                    </div>
                  )}

                  {/* Portfolio */}
                  {activeTab === 'portfolio' && (
                    <div>
                      {portfolioPhotos.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {portfolioPhotos.slice(0, 7).map((src, i) => (
                            <button
                              key={i}
                              onClick={() => setLightboxIndex(i)}
                              className="group aspect-square overflow-hidden rounded-xl border border-slate-100 bg-slate-100 transition hover:border-emerald-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            >
                              <img
                                src={src}
                                alt={`Work photo ${i + 1}`}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                            </button>
                          ))}
                          {portfolioPhotos.length > 7 && (
                            <button
                              onClick={() => setLightboxIndex(0)}
                              className="group relative aspect-square overflow-hidden rounded-xl border border-slate-100 bg-slate-900 text-white transition hover:border-emerald-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            >
                              <img
                                src={portfolioPhotos[7]}
                                alt="See all portfolio photos"
                                className="h-full w-full object-cover opacity-45 transition duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/35 p-4">
                                <IconPhoto className="h-7 w-7" stroke={1.8} />
                                <span className="mt-2 text-sm font-semibold">
                                  See all {portfolioPhotos.length} photos
                                </span>
                              </div>
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">No portfolio photos yet.</p>
                      )}
                    </div>
                  )}

                  {/* Availability */}
                  {activeTab === 'availability' && (
                    <div>
                      {Object.keys(businessHours).length > 0 ? (
                        <div className="space-y-1">
                          {DAY_ORDER.filter((d) => d in businessHours).map((day) => {
                            const h = businessHours[day];
                            const isWeekend = day === 'Saturday' || day === 'Sunday';
                            return (
                              <div
                                key={day}
                                className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                                  isWeekend ? 'bg-slate-50' : ''
                                }`}
                              >
                                <span
                                  className={`text-sm font-medium ${
                                    isWeekend ? 'text-slate-400' : 'text-slate-700'
                                  }`}
                                >
                                  {day}
                                </span>
                                {h.open ? (
                                  <span className="text-sm text-slate-600">
                                    {h.from} – {h.to}
                                  </span>
                                ) : (
                                  <span className="text-sm text-slate-400">Closed</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">Hours not provided.</p>
                      )}
                    </div>
                  )}

                  {/* Reviews */}
                  {activeTab === 'reviews' && (
                    <div className="space-y-5">
                      {/* Summary */}
                      {reviews > 0 && (
                        <div className="flex items-center gap-4 rounded-xl bg-slate-50 px-5 py-4">
                          <div className="text-center">
                            <p className="text-3xl font-extrabold text-slate-900">
                              {Number(rating).toFixed(1)}
                            </p>
                            <div className="mt-1 flex justify-center gap-0.5">
                              {Array.from({ length: 5 }, (_, i) => (
                                <svg
                                  key={i}
                                  viewBox="0 0 20 20"
                                  className={`h-3.5 w-3.5 ${i < Math.floor(rating) ? 'text-amber-400' : 'text-slate-200'}`}
                                  fill="currentColor"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            <p className="mt-1 text-xs text-slate-400">{reviews} {reviews === 1 ? 'review' : 'reviews'}</p>
                          </div>
                        </div>
                      )}

                      {/* Review list */}
                      {proReviews.length > 0 ? (
                        <div className="space-y-4">
                          {proReviews.map((review: any, i: number) => (
                            <div key={review.review_id || i} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                                    {(review.customer_name || review.reviewer_name || 'C').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                      {review.customer_name || review.reviewer_name || 'Customer'}
                                    </p>
                                    {review.created_at && (
                                      <p className="text-xs text-slate-400">
                                        {new Date(review.created_at * 1000 || review.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex shrink-0 gap-0.5">
                                  {Array.from({ length: 5 }, (_, i) => (
                                    <svg
                                      key={i}
                                      viewBox="0 0 20 20"
                                      className={`h-4 w-4 ${i < (review.rating || 0) ? 'text-amber-400' : 'text-slate-200'}`}
                                      fill="currentColor"
                                    >
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  ))}
                                </div>
                              </div>
                              {review.comment && (
                                <p className="mt-3 text-sm leading-relaxed text-slate-600">{review.comment}</p>
                              )}
                              {review.pro_reply && (
                                <div className="mt-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-slate-700">
                                  <span className="font-semibold text-emerald-700">Pro's reply: </span>
                                  {review.pro_reply}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center">
                          <p className="text-sm font-medium text-slate-500">No reviews yet</p>
                          <p className="mt-1 text-xs text-slate-400">
                            Be the first to leave a review after completing a job.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: sticky sidebar (desktop only) */}
            <div className="hidden w-72 shrink-0 lg:block">
              <div className="sticky top-24 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                {contactForPrice ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Pricing
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-700">Contact for price</p>
                  </div>
                ) : startingPrice ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Starting from
                    </p>
                    <p className="mt-1 text-3xl font-extrabold text-emerald-600">${startingPrice}</p>
                  </div>
                ) : null}

                <button
                  onClick={handleRequestQuote}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.98]"
                >
                  Request a quote
                </button>

                {(isLicensed || isBackgroundChecked || hires > 0) && (
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    {isLicensed && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <IconCheck className="h-4 w-4 shrink-0 text-emerald-500" stroke={2} />
                        License verified
                      </div>
                    )}
                    {isBackgroundChecked && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <IconCheck className="h-4 w-4 shrink-0 text-emerald-500" stroke={2} />
                        Background checked
                      </div>
                    )}
                    {hires > 0 && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <IconBriefcase className="h-4 w-4 shrink-0 text-slate-400" stroke={1.8} />
                        {hires} {hires === 1 ? 'hire' : 'hires'} on HandyCall
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile CTA strip */}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:hidden">
            {contactForPrice ? (
              <p className="mb-3 text-sm font-semibold text-slate-700">Contact for price</p>
            ) : startingPrice ? (
              <p className="mb-3">
                <span className="text-xs text-slate-400">From </span>
                <span className="text-2xl font-extrabold text-emerald-600">${startingPrice}</span>
              </p>
            ) : null}
            <button
              onClick={handleRequestQuote}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Request a quote
            </button>
          </div>
        </div>
      </main>
      <SiteFooter />

      {showLoginGate && (
        <LoginGateModal proId={id} onClose={() => setShowLoginGate(false)} />
      )}
      {lightboxIndex !== null ? (
        <ImageLightbox
          images={portfolioPhotos.map((photo, index) => ({
            src: photo,
            alt: `${name} portfolio photo ${index + 1}`,
          }))}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </div>
  );
}
