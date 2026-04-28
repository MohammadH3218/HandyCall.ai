'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  IconBriefcase,
  IconCheck,
  IconChevronRight,
  IconClipboardText,
  IconMapPin,
} from '@tabler/icons-react';
import { apiClient } from '@/lib/api-client';
import { SAUDI_MARKETPLACE_CITIES } from '@/constants/houston-areas';

const SERVICE_CATEGORIES = [
  { value: 'AC_HVAC', label: 'AC & HVAC' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'PLUMBING', label: 'Plumbing' },
  { value: 'APPLIANCE_REPAIR', label: 'Appliance Repair' },
  { value: 'PEST_CONTROL', label: 'Pest Control' },
  { value: 'MOVING', label: 'Moving' },
  { value: 'GENERAL_HANDYMAN', label: 'General Handyman' },
  { value: 'PAINTING', label: 'Painting' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'CARPENTRY', label: 'Carpentry' },
  { value: 'SATELLITE_DISH', label: 'Satellite & Dish' },
  { value: 'LANDSCAPING', label: 'Landscaping' },
  { value: 'OTHER', label: 'Other / Not sure' },
] as const;

const MIN_DESCRIPTION_LENGTH = 50;

export default function CustomerPostJobPage() {
  const router = useRouter();
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [district, setDistrict] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  const descriptionValid = description.trim().length >= MIN_DESCRIPTION_LENGTH;
  const canSubmit = Boolean(category && district && descriptionValid && !submitting);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      setSubmitting(true);
      setError(null);
      await apiClient.postOpenJob({
        service_category: category,
        job_description: description.trim(),
        district,
        contact_name: contactName.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
      });
      setPosted(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to post your job. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (posted) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mx-auto flex max-w-2xl flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <IconCheck className="h-8 w-8 text-emerald-600" stroke={2.2} />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Your job is posted</h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Available pros in your district can now claim the job. Once a pro accepts, a chat will open so you can coordinate the details.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/customer/dashboard/requests"
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              View requests
            </Link>
            <button
              type="button"
              onClick={() => {
                setPosted(false);
                setCategory('');
                setDescription('');
                setDistrict('');
                setContactName('');
                setContactPhone('');
              }}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Post another job
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Post a Job</h1>
            <p className="mt-1 text-sm text-slate-500">
              Tell Riyadh pros what you need. Posting is free, and only the first available pro connects with you.
            </p>
          </div>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Find a Pro
            <IconChevronRight className="h-4 w-4" stroke={2} />
          </Link>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <label className="text-sm font-semibold text-slate-900">Service category</label>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {SERVICE_CATEGORIES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setCategory(item.value)}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                    category === item.value
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <IconBriefcase className="h-4 w-4 shrink-0" stroke={1.8} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-900">Job details</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              placeholder="Describe what you need, what is broken, timing, and any details that help the pro understand the job."
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            />
            <p className={`mt-1.5 text-xs ${descriptionValid ? 'text-emerald-600' : 'text-slate-400'}`}>
              {descriptionValid
                ? 'Good detail'
                : `${Math.max(0, MIN_DESCRIPTION_LENGTH - description.trim().length)} more characters needed`}
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-900">District</label>
            <div className="relative mt-2">
              <IconMapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" stroke={1.8} />
              <select
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Select your district</option>
                {SAUDI_MARKETPLACE_CITIES.map((item) => (
                  <option key={item.value} value={item.label}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-900">Name</label>
              <input
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                placeholder="Optional"
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-900">Phone</label>
              <input
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                placeholder="Optional"
                type="tel"
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <IconClipboardText className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" stroke={1.8} />
              <p className="text-sm leading-6 text-slate-600">
                Pros see the category, district, and job details. Your contact info is only shared after a pro claims the job.
              </p>
            </div>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Posting...' : 'Post job'}
              <IconChevronRight className="h-4 w-4" stroke={2} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
