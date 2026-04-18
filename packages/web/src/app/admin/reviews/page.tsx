'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { IconLoader2, IconStar, IconStarFilled } from '@tabler/icons-react';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => i <= rating
        ? <IconStarFilled key={i} className="h-3.5 w-3.5 text-amber-400" />
        : <IconStar key={i} className="h-3.5 w-3.5 text-slate-300" stroke={1.5} />
      )}
    </span>
  );
}

const TABS = [
  { label: 'All', value: '' },
  { label: 'Visible', value: 'true' },
  { label: 'Hidden', value: 'false' },
];

function ReviewsListInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const visibleFilter = searchParams?.get('visible') ?? '';
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = visibleFilter !== '' ? { visible: visibleFilter === 'true' } : undefined;
      const data = await apiClient.adminListReviews(params);
      setReviews(data ?? []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [visibleFilter]);

  const toggleVisibility = async (reviewId: string, current: boolean) => {
    await apiClient.adminSetReviewVisibility(reviewId, !current);
    load();
  };

  return (
    <div className="px-8 py-10">
      <h1 className="text-[26px] font-bold text-slate-900">Reviews</h1>

      <div className="mt-5 flex gap-1 border-b border-border/60">
        {TABS.map((t) => (
          <button key={t.value} type="button"
            onClick={() => router.push(`/admin/reviews${t.value !== '' ? `?visible=${t.value}` : ''}`)}
            className={`px-4 py-2 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
              visibleFilter === t.value ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center"><IconLoader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border/80 bg-white shadow-sm">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Rating</th>
                <th className="px-5 py-3">Comment</th>
                <th className="px-5 py-3">Pro</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Visible</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">No reviews found.</td></tr>
              ) : reviews.map((r: any) => (
                <tr key={r.review_id} className="border-b border-border/40 hover:bg-slate-50">
                  <td className="px-5 py-3"><Stars rating={r.rating ?? 0} /></td>
                  <td className="px-5 py-3 max-w-xs">
                    <p className="truncate text-slate-700">{r.comment ?? '—'}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-500 font-mono text-[11px]">{r.pro_id?.slice(0, 8)}…</td>
                  <td className="px-5 py-3 text-slate-400">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.is_visible ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {r.is_visible ? 'Visible' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => toggleVisibility(r.review_id, r.is_visible)}
                        className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200">
                        {r.is_visible ? 'Hide' : 'Show'}
                      </button>
                      <button type="button" onClick={() => setDeleteId(r.review_id)}
                        className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return;
          await apiClient.adminDeleteReview(deleteId);
          setDeleteId(null);
          load();
        }}
        title="Delete review?"
        description="This review will be permanently deleted."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

export default function ReviewsPage() {
  return <Suspense fallback={<div className="flex h-64 items-center justify-center"><IconLoader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>}><ReviewsListInner /></Suspense>;
}
