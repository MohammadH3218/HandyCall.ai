'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import {
  IconStar,
  IconMapPin,
  IconPhone,
  IconCircleCheck,
  IconArrowLeft,
  IconMessage,
  IconCalendar,
} from '@tabler/icons-react';

interface Review {
  review_id: string;
  reviewer_name?: string;
  rating: number;
  comment?: string;
  created_at: number;
  response?: string;
}

interface Provider {
  company_id: string;
  company_name: string;
  public_slug?: string;
  public_description?: string;
  profile_photo_url?: string;
  categories?: string[];
  overall_rating?: number;
  total_reviews?: number;
  verified?: boolean;
  city?: string;
  state?: string;
  phone?: string;
  years_in_business?: number;
  license_number?: string;
  booking_link?: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <IconStar
          key={n}
          className={`h-4 w-4 ${n <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
          stroke={1.5}
        />
      ))}
    </div>
  );
}

export default function ProviderProfilePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { status: sessionStatus, data: session } = useSession();
  const poolType = ((session as any)?.poolType as string | undefined) || '';
  const canViewProfile = sessionStatus === 'authenticated' && poolType === 'customer';

  const [provider, setProvider] = useState<Provider | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canViewProfile) {
      setLoading(false);
      return;
    }
    if (!slug) return;
    const load = async () => {
      try {
        const [providerData, reviewsData] = await Promise.all([
          apiClient.getProviderBySlug(slug),
          apiClient.getProviderReviews(slug).catch(() => []),
        ]);
        setProvider(providerData);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      } catch (err: any) {
        setError(err?.message || 'Provider not found');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [slug, canViewProfile]);

  if (sessionStatus !== 'authenticated' || poolType !== 'customer') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <SiteHeader />
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
            <h1 className="text-xl font-bold text-slate-900">Sign in to view provider details</h1>
            <p className="mt-2 text-sm text-slate-500">
              You can search freely, but profile details require a customer account.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Link
                href={`/login?audience=customer&callbackUrl=${encodeURIComponent(`/find-pros/${slug}`)}`}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
              >
                Sign in as customer
              </Link>
              <Link
                href={`/register?audience=customer`}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Create customer account
              </Link>
            </div>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-24 rounded bg-slate-200" />
            <div className="h-48 rounded-xl border border-slate-200 bg-white" />
            <div className="h-64 rounded-xl border border-slate-200 bg-white" />
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <SiteHeader />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-slate-900 font-semibold">Provider not found</p>
            <p className="mt-1 text-sm text-slate-500">{error || 'This profile may not exist or has been removed.'}</p>
            <Link href="/find-pros" className="mt-4 inline-block text-sm text-emerald-600 hover:underline">
              Back to search
            </Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const rating = provider.overall_rating ?? 0;
  const reviewCount = provider.total_reviews ?? 0;
  const location = [provider.city, provider.state].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        <Link
          href="/find-pros"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 w-fit"
        >
          <IconArrowLeft className="h-4 w-4" stroke={1.5} />
          Back to search
        </Link>

        {/* Hero card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-start gap-5">
            {provider.profile_photo_url ? (
              <img
                src={provider.profile_photo_url}
                alt={provider.company_name}
                className="h-20 w-20 rounded-2xl object-cover shrink-0"
              />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                <span className="text-3xl font-bold text-slate-700">
                  {provider.company_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900">{provider.company_name}</h1>
                {provider.verified && (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <IconCircleCheck className="h-3.5 w-3.5" stroke={1.5} />
                    Verified
                  </span>
                )}
              </div>

              {reviewCount > 0 && (
                <div className="mt-1.5 flex items-center gap-2">
                  <StarRating rating={rating} />
                  <span className="text-sm text-slate-500">
                    {rating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              )}

              {location && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                  <IconMapPin className="h-4 w-4" stroke={1.5} />
                  {location}
                </p>
              )}

              {provider.categories && provider.categories.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {provider.categories.map((cat) => (
                    <span
                      key={cat}
                      className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {provider.public_description && (
            <p className="mt-5 text-sm text-slate-700 leading-relaxed border-t border-slate-100 pt-5">
              {provider.public_description}
            </p>
          )}

          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            {provider.booking_link ? (
              <a
                href={provider.booking_link}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
              >
                <IconCalendar className="h-4 w-4" stroke={1.5} />
                Book Now
              </a>
            ) : (
              <button
                disabled
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white opacity-50 cursor-not-allowed"
              >
                <IconCalendar className="h-4 w-4" stroke={1.5} />
                Book Now
              </button>
            )}
            {provider.phone && (
              <a
                href={`tel:${provider.phone}`}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <IconPhone className="h-4 w-4" stroke={1.5} />
                Call
              </a>
            )}
          </div>
        </div>

        {/* Business details */}
        {(provider.years_in_business || provider.license_number) && (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900 mb-3">Business Details</h2>
            <dl className="space-y-2 text-sm">
              {provider.years_in_business && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Years in business</dt>
                  <dd className="font-medium text-slate-900">{provider.years_in_business}</dd>
                </div>
              )}
              {provider.license_number && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">License #</dt>
                  <dd className="font-medium text-slate-900">{provider.license_number}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Reviews */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900 mb-4">
            Reviews {reviewCount > 0 && <span className="text-slate-500 font-normal">({reviewCount})</span>}
          </h2>

          {reviews.length === 0 ? (
            <div className="text-center py-8">
              <IconMessage className="mx-auto h-8 w-8 text-slate-300" stroke={1.5} />
              <p className="mt-3 text-sm text-slate-500">No reviews yet</p>
            </div>
          ) : (
            <div className="space-y-5">
              {reviews.map((review) => (
                <div key={review.review_id} className="border-b border-slate-100 pb-5 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{review.reviewer_name || 'Anonymous'}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(review.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <StarRating rating={review.rating} />
                  </div>
                  {review.comment && (
                    <p className="mt-2 text-sm text-slate-700">{review.comment}</p>
                  )}
                  {review.response && (
                    <div className="mt-3 bg-slate-50 rounded-xl p-3">
                      <p className="text-xs font-medium text-slate-600 mb-1">Response from {provider.company_name}</p>
                      <p className="text-sm text-slate-700">{review.response}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
