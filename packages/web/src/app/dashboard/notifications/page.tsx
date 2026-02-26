'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/portal/page-header';
import { apiClient } from '@/lib/api-client';

type NotificationItem = {
  notification_id: string;
  event_key: string;
  category: 'APPOINTMENTS' | 'CALLS' | 'LEADS' | 'USAGE' | 'ACCOUNT' | 'SYSTEM';
  title: string;
  body: string;
  created_at: number;
  is_read: boolean;
  action_url?: string;
};

const CATEGORY_FILTERS = [
  'ALL',
  'APPOINTMENTS',
  'CALLS',
  'LEADS',
  'USAGE',
  'SYSTEM',
] as const;

type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

function groupLabel(createdAt: number) {
  const now = new Date();
  const date = new Date(createdAt);
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = nowStart - 24 * 60 * 60 * 1000;
  const weekStart = nowStart - 7 * 24 * 60 * 60 * 1000;
  const ts = date.getTime();
  if (ts >= nowStart) return 'Today';
  if (ts >= yesterdayStart) return 'Yesterday';
  if (ts >= weekStart) return 'This Week';
  return 'Earlier';
}

function formatTime(ts?: number) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CategoryFilter>('ALL');

  const load = async () => {
    try {
      setLoading(true);
      let lastKey: any = undefined;
      const next: NotificationItem[] = [];
      for (let i = 0; i < 5; i += 1) {
        const page = await apiClient.listNotifications(100, false, lastKey);
        next.push(...((page?.notifications || []) as NotificationItem[]));
        lastKey = page?.lastEvaluatedKey;
        if (!lastKey) break;
      }
      setItems(next);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () =>
      items
        .filter((item) => filter === 'ALL' || item.category === filter)
        .sort((a, b) => b.created_at - a.created_at),
    [items, filter],
  );

  const grouped = useMemo(() => {
    const out: Record<string, NotificationItem[]> = {};
    for (const item of filtered) {
      const label = groupLabel(item.created_at);
      if (!out[label]) out[label] = [];
      out[label].push(item);
    }
    return out;
  }, [filtered]);

  const markRead = async (item: NotificationItem) => {
    if (item.is_read) return;
    await apiClient.markNotificationRead(item.notification_id);
    await load();
  };

  const toggleRead = async (item: NotificationItem) => {
    if (item.is_read) {
      await apiClient.markNotificationUnread(item.notification_id);
    } else {
      await apiClient.markNotificationRead(item.notification_id);
    }
    await load();
  };

  const markAllRead = async () => {
    await apiClient.markAllNotificationsRead();
    await load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notifications"
        title="Notification center"
        subtitle="See all events from calls, leads, appointments, usage, and system updates."
        actions={
          <Button variant="outline" onClick={markAllRead}>
            Mark all read
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {CATEGORY_FILTERS.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setFilter(category)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === category
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {category === 'ALL' ? 'All' : category}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-500">
          No notifications for this category.
        </div>
      ) : (
        <div className="space-y-6">
          {['Today', 'Yesterday', 'This Week', 'Earlier']
            .filter((label) => grouped[label]?.length)
            .map((label) => (
              <section key={label} className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</h2>
                <div className="space-y-2">
                  {grouped[label].map((item) => (
                    <article
                      key={item.notification_id}
                      className={`rounded-2xl border p-4 ${item.is_read ? 'border-slate-100 bg-white' : 'border-emerald-200 bg-emerald-50/40'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`text-sm ${item.is_read ? 'font-medium text-slate-900' : 'font-semibold text-slate-900'}`}>
                            {item.title}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                          <p className="mt-2 text-xs text-slate-400">{formatTime(item.created_at)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void toggleRead(item)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            {item.is_read ? 'Mark unread' : 'Mark read'}
                          </button>
                          {item.action_url ? (
                            <Button asChild size="sm" onClick={() => void markRead(item)}>
                              <Link href={item.action_url}>Open</Link>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
