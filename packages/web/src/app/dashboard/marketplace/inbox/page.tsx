'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/portal/page-header';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/portal/empty-state';
import { apiClient } from '@/lib/api-client';
import { formatMarketplaceUrgency } from '@/lib/marketplace';
import { IconMapPin, IconMessageCircle, IconSearch } from '@tabler/icons-react';

type MarketplaceThread = {
  thread_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  last_message?: string;
  last_at: number;
  unread?: boolean;
  quote_context?: {
    service_category?: string;
    location_city?: string;
    urgency?: string;
  };
};

export default function MarketplaceInboxPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<MarketplaceThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const result = await apiClient.getProThreads();
        if (!mounted) return;
        setThreads(Array.isArray(result) ? result : []);
        setError(null);
      } catch (err: any) {
        if (!mounted) return;
        setThreads([]);
        setError(err?.message || 'Failed to load marketplace inbox.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter((thread) =>
      `${thread.customer_name || ''} ${thread.customer_email || ''} ${thread.customer_phone || ''} ${
        thread.last_message || ''
      } ${thread.quote_context?.service_category || ''} ${thread.quote_context?.location_city || ''}`
        .toLowerCase()
        .includes(query)
    );
  }, [search, threads]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketplace"
        title="Inbox"
        subtitle="Chat directly with customers after you accept a marketplace request."
        actions={
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
            {threads.length} active conversation{threads.length === 1 ? '' : 's'}
          </Badge>
        }
      />

      <div className="relative">
        <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9"
          placeholder="Search by customer, service, city, or message..."
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<IconMessageCircle className="h-6 w-6 text-muted-foreground" />}
          title="No marketplace chats yet"
          description="When you accept a request, the conversation will appear here."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((thread) => (
            <button
              key={thread.thread_id}
              type="button"
              onClick={() => router.push(`/dashboard/marketplace/inbox/${thread.thread_id}`)}
              className="w-full rounded-2xl border border-border bg-card p-4 text-left transition hover:border-slate-300"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {thread.customer_name || thread.customer_email || 'Customer'}
                    </p>
                    {thread.unread ? (
                      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">New</Badge>
                    ) : null}
                    {thread.quote_context?.service_category ? (
                      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                        {thread.quote_context.service_category}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {thread.customer_email || thread.customer_phone || 'No customer contact saved'}
                  </p>
                  {thread.last_message ? (
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{thread.last_message}</p>
                  ) : null}
                </div>
                <div className="space-y-2 text-right">
                  <p className="text-xs text-muted-foreground">
                    {thread.last_at ? new Date(thread.last_at).toLocaleString() : ''}
                  </p>
                  {thread.quote_context?.location_city ? (
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <IconMapPin className="h-3.5 w-3.5" stroke={1.5} />
                      {thread.quote_context.location_city}
                    </p>
                  ) : null}
                  {thread.quote_context?.urgency ? (
                    <p className="text-xs font-medium text-amber-700">
                      {formatMarketplaceUrgency(thread.quote_context.urgency)}
                    </p>
                  ) : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
