'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  IconBell,
  IconCheck,
  IconMessage,
  IconListCheck,
  IconCircleCheck,
  IconCircleX,
  IconStar,
  IconTrash,
} from '@tabler/icons-react';
import { useNotificationStore, type AppNotification, type NotificationType } from '@/stores/notification-store';

function notificationIcon(type: NotificationType) {
  switch (type) {
    case 'new_message': return <IconMessage className="h-4 w-4 text-blue-500" stroke={1.8} />;
    case 'new_quote_request': return <IconListCheck className="h-4 w-4 text-amber-500" stroke={1.8} />;
    case 'request_accepted': return <IconCircleCheck className="h-4 w-4 text-emerald-500" stroke={1.8} />;
    case 'request_declined': return <IconCircleX className="h-4 w-4 text-red-500" stroke={1.8} />;
    case 'new_review': return <IconStar className="h-4 w-4 text-yellow-500" stroke={1.8} />;
    default: return <IconBell className="h-4 w-4 text-slate-400" stroke={1.8} />;
  }
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function NotificationItem({ n }: { n: AppNotification }) {
  return (
    <div className={`flex items-start gap-3 px-4 py-3 ${n.read ? '' : 'bg-emerald-50/60'}`}>
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-100">
        {notificationIcon(n.type)}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[13px] leading-snug ${n.read ? 'text-slate-600' : 'font-semibold text-slate-800'}`}>
          {n.title}
        </p>
        <p className="mt-0.5 text-[12px] leading-snug text-slate-400 line-clamp-2">
          {n.body}
        </p>
        <p className="mt-1 text-[11px] text-slate-300">{relativeTime(n.created_at)}</p>
      </div>
      {!n.read && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
      )}
    </div>
  );
}

export function NotificationBell() {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markAllRead, clearAll, addNotification } = useNotificationStore();
  const count = unreadCount();

  // Open SSE stream once user is authenticated
  useEffect(() => {
    if (status !== 'authenticated') return;

    const source = new EventSource('/api/notifications/stream');

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type && payload?.title) {
          addNotification(payload);
        }
      } catch {
        // Ignore malformed events
      }
    };

    source.onerror = () => {
      // EventSource auto-reconnects; nothing to do here
    };

    return () => source.close();
  }, [status, addNotification]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleOpen() {
    setOpen((v) => !v);
    if (!open && count > 0) {
      markAllRead();
    }
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
        aria-label={`Notifications${count > 0 ? `, ${count} unread` : ''}`}
      >
        <IconBell className="h-4.5 w-4.5" stroke={1.5} />
        {count > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-500 px-0.5 text-[10px] font-bold text-white leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-full top-0 z-50 ml-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={markAllRead}
                    title="Mark all read"
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <IconCheck className="h-3.5 w-3.5" stroke={2.5} />
                  </button>
                  <button
                    onClick={clearAll}
                    title="Clear all"
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                  >
                    <IconTrash className="h-3.5 w-3.5" stroke={1.8} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <IconBell className="mb-2 h-8 w-8 text-slate-200" stroke={1.2} />
                <p className="text-sm font-medium text-slate-400">You're all caught up</p>
                <p className="mt-0.5 text-xs text-slate-300">New activity will appear here</p>
              </div>
            ) : (
              notifications.map((n) => <NotificationItem key={n.id} n={n} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
