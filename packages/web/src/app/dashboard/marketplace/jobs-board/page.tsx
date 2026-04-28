'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconBriefcase,
  IconCheck,
  IconClock,
  IconCoin,
  IconRefresh,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { apiClient } from '@/lib/api-client';

const CATEGORY_LABELS: Record<string, string> = {
  AC_HVAC: 'AC & HVAC',
  PLUMBING: 'Plumbing',
  ELECTRICAL: 'Electrical',
  PAINTING: 'Painting',
  CLEANING: 'Cleaning',
  PEST_CONTROL: 'Pest Control',
  CARPENTRY: 'Carpentry',
  MOVING: 'Moving',
  APPLIANCE_REPAIR: 'Appliance Repair',
  SATELLITE_DISH: 'Satellite & Dish',
  LANDSCAPING: 'Landscaping',
  GENERAL_HANDYMAN: 'General Handyman',
  OTHER: 'Other',
};

function displayCategory(category: string) {
  return CATEGORY_LABELS[category] ?? category;
}

type OpenJob = {
  quote_id: string;
  job_title: string;
  service_category: string;
  job_description: string;
  status: string;
  lead_fee_halalas: number;
  lead_fee_sar: number;
  photos: string[];
  expires_at: number;
  time_remaining_ms: number;
  created_at: number;
};

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

function ClaimModal({
  job,
  loading,
  onCancel,
  onConfirm,
}: {
  job: OpenJob;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
          <IconBriefcase className="h-6 w-6 text-emerald-600" stroke={1.5} />
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-900">{job.job_title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Review the job details, then accept the lead if it is a good fit. The lead fee is charged
          immediately.
        </p>

        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {job.job_description}
          </p>
        </div>

        <div className="mt-4 space-y-2.5 rounded-xl bg-slate-50 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Expires</span>
            <span className="text-right font-medium text-amber-700">
              {formatTimeRemaining(job.time_remaining_ms)}
            </span>
          </div>
          <div className="border-t border-slate-200 pt-2.5">
            <div className="flex justify-between gap-4">
              <span className="font-semibold text-slate-700">Lead fee charged</span>
              <span className="text-lg font-bold text-emerald-700">
                SAR {job.lead_fee_sar.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Claiming...' : `Accept lead - SAR ${job.lead_fee_sar.toFixed(2)}`}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex w-12 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
            aria-label="Cancel"
          >
            <IconX className="h-4 w-4" stroke={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JobsBoardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<OpenJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [confirmJob, setConfirmJob] = useState<OpenJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getJobsBoard({
        category: categoryFilter || undefined,
      });
      setJobs(Array.isArray(data) ? data : []);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setError(err?.message || 'Failed to load jobs board.');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return jobs;
    return jobs.filter((job) =>
      `${job.job_title} ${job.service_category} ${job.job_description}`
        .toLowerCase()
        .includes(query)
    );
  }, [jobs, search]);

  const categories = useMemo(
    () => [...new Set(jobs.map((job) => job.service_category))].sort(),
    [jobs]
  );

  const handleClaim = async (job: OpenJob) => {
    setClaimingId(job.quote_id);
    setConfirmJob(null);
    setError(null);

    try {
      const result = await apiClient.claimJob(job.quote_id);
      const threadId = result?.thread?.thread_id;
      setJobs((current) => current.filter((item) => item.quote_id !== job.quote_id));
      router.push(
        threadId ? `/dashboard/marketplace/inbox/${threadId}` : '/dashboard/marketplace/inbox'
      );
    } catch (err: any) {
      const message = err?.message || '';
      if (message.includes('claimed') || message.includes('expired')) {
        setError(`${message} Refreshing the board.`);
        void loadJobs();
      } else {
        setError(message || 'Failed to claim job.');
      }
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {confirmJob ? (
        <ClaimModal
          job={confirmJob}
          loading={claimingId === confirmJob.quote_id}
          onCancel={() => setConfirmJob(null)}
          onConfirm={() => void handleClaim(confirmJob)}
        />
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Marketplace
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Jobs Board</h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse open customer jobs that match your profile. Claiming charges the displayed lead
            fee and reveals customer details.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {filteredJobs.length} open
          </span>
          <button
            type="button"
            onClick={() => void loadJobs()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <IconRefresh className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} stroke={2} />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <IconSearch
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            stroke={1.8}
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search jobs..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {displayCategory(category)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="h-48 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
          <IconBriefcase className="mx-auto mb-3 h-10 w-10 text-slate-200" stroke={1.5} />
          <p className="text-sm font-medium text-slate-500">No open jobs right now.</p>
          <p className="mt-1 text-xs text-slate-400">
            New customer job posts matching your profile will appear here.
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-400">
            Last refreshed {lastRefreshed.toLocaleTimeString()}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job) => {
              const urgent = job.time_remaining_ms < 6 * 3_600_000;

              return (
                <div
                  key={job.quote_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setConfirmJob(job)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setConfirmJob(job);
                    }
                  }}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="line-clamp-2 text-base font-bold text-slate-900">
                      {job.job_title}
                    </h2>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${urgent ? 'text-red-600' : 'text-amber-600'}`}
                    >
                      <IconClock className="h-3 w-3" stroke={2} />
                      {formatTimeRemaining(job.time_remaining_ms)}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">
                    {job.job_description}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                    <div>
                      <p className="text-xs text-slate-400">Lead fee</p>
                      <p className="flex items-center gap-1 text-base font-bold text-emerald-700">
                        <IconCoin className="h-4 w-4" stroke={1.5} />
                        SAR {job.lead_fee_sar.toFixed(2)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setConfirmJob(job);
                      }}
                      disabled={Boolean(claimingId)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <IconCheck className="h-3.5 w-3.5" stroke={2.5} />
                      View details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
