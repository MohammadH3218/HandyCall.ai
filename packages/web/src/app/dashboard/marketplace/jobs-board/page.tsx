'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/portal/empty-state';
import { PageHeader } from '@/components/portal/page-header';
import { apiClient } from '@/lib/api-client';
import {
  IconBriefcase,
  IconCheck,
  IconClock,
  IconCoin,
  IconFilter,
  IconMapPin,
  IconRefresh,
  IconSearch,
  IconTag,
} from '@tabler/icons-react';

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
  service_category: string;
  job_description: string;
  district: string;
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
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 1) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

function ClaimModal({
  job,
  onConfirm,
  onCancel,
  loading,
}: {
  job: OpenJob;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
          <IconBriefcase className="h-7 w-7 text-emerald-600" stroke={1.5} />
        </div>

        <h2 className="mt-5 text-xl font-bold text-slate-900">Claim this job?</h2>
        <p className="mt-2 text-sm text-slate-500">
          You&apos;ll be charged the lead fee and connected with the customer immediately. First
          come, first served.
        </p>

        <div className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Category</span>
            <span className="font-medium text-slate-800">
              {displayCategory(job.service_category)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">District</span>
            <span className="font-medium text-slate-800">{job.district}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Expires</span>
            <span className="font-medium text-amber-700">
              {formatTimeRemaining(job.time_remaining_ms)}
            </span>
          </div>
          <div className="border-t border-slate-200 pt-3">
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-slate-700">Lead fee</span>
              <span className="text-lg font-bold text-emerald-700">
                SAR {job.lead_fee_sar.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {loading ? 'Claiming…' : `Claim — SAR ${job.lead_fee_sar.toFixed(2)}`}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={loading} className="flex-1">
            Cancel
          </Button>
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
  const [districtFilter, setDistrictFilter] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getJobsBoard({
        category: categoryFilter || undefined,
        district: districtFilter || undefined,
      });
      setJobs(Array.isArray(data) ? data : []);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setError(err?.message || 'Failed to load jobs board.');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, districtFilter]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((job) =>
      `${job.service_category} ${job.job_description} ${job.district}`.toLowerCase().includes(q)
    );
  }, [jobs, search]);

  const uniqueCategories = useMemo(
    () => [...new Set(jobs.map((j) => j.service_category))].sort(),
    [jobs]
  );
  const uniqueDistricts = useMemo(() => [...new Set(jobs.map((j) => j.district))].sort(), [jobs]);

  const handleClaim = async (job: OpenJob) => {
    setClaimingId(job.quote_id);
    setConfirmJob(null);
    setError(null);
    try {
      const result = await apiClient.claimJob(job.quote_id);
      const threadId = result?.thread?.thread_id;
      // Remove from board immediately
      setJobs((current) => current.filter((j) => j.quote_id !== job.quote_id));
      if (threadId) {
        router.push(`/dashboard/marketplace/inbox/${threadId}`);
      } else {
        router.push('/dashboard/marketplace/inbox');
      }
    } catch (err: any) {
      const msg: string = err?.message || '';
      if (msg.includes('claimed')) {
        setError('Another pro just claimed this job. Refreshing the board…');
        void loadJobs();
      } else if (msg.includes('expired')) {
        setError('This job post expired before you could claim it. Refreshing…');
        void loadJobs();
      } else {
        setError(msg || 'Failed to claim job. Please try again.');
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
          onConfirm={() => void handleClaim(confirmJob)}
          onCancel={() => setConfirmJob(null)}
        />
      ) : null}

      <PageHeader
        eyebrow="Marketplace"
        title="Jobs Board"
        subtitle="Browse open job posts from customers in your area. Lead fee is charged when you claim — first pro to accept wins."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
              {filteredJobs.length} open job{filteredJobs.length !== 1 ? 's' : ''}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void loadJobs()}
              disabled={loading}
              className="gap-1.5 text-slate-500"
            >
              <IconRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} stroke={1.8} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs…"
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <IconFilter className="h-4 w-4 text-slate-400" stroke={1.5} />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All categories</option>
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat}>
                {displayCategory(cat)}
              </option>
            ))}
          </select>

          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All districts</option>
            {uniqueDistricts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <EmptyState
          icon={<IconBriefcase className="h-6 w-6 text-muted-foreground" />}
          title="No open jobs right now"
          description="New customer job posts matching your categories and districts will appear here. Check back soon or refresh."
        />
      ) : (
        <>
          <p className="text-xs text-slate-400">
            Last refreshed {lastRefreshed.toLocaleTimeString()}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job) => {
              const isUrgent = job.time_remaining_ms < 6 * 60 * 60 * 1000; // < 6h
              return (
                <div
                  key={job.quote_id}
                  className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        <IconTag className="h-3 w-3" stroke={1.8} />
                        {displayCategory(job.service_category)}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        isUrgent ? 'text-red-600' : 'text-amber-600'
                      }`}
                    >
                      <IconClock className="h-3 w-3" stroke={1.8} />
                      {formatTimeRemaining(job.time_remaining_ms)}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-700">
                    {job.job_description}
                  </p>

                  {/* Meta */}
                  <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <IconMapPin className="h-3.5 w-3.5" stroke={1.5} />
                      {job.district}
                    </span>
                  </div>

                  {/* Footer: lead fee + claim */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                    <div>
                      <p className="text-xs text-slate-400">Lead fee</p>
                      <p className="flex items-center gap-1 text-base font-bold text-emerald-700">
                        <IconCoin className="h-4 w-4" stroke={1.5} />
                        SAR {job.lead_fee_sar.toFixed(2)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setConfirmJob(job)}
                      disabled={!!claimingId}
                      className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <IconCheck className="h-3.5 w-3.5" stroke={2} />
                      Claim Job
                    </Button>
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
