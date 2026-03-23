'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/portal/page-header';
import { apiClient } from '@/lib/api-client';
import { formatMarketplaceUrgency } from '@/lib/marketplace';
import {
  IconArrowLeft,
  IconCalendar,
  IconMapPin,
  IconPhone,
  IconSend,
  IconUser,
} from '@tabler/icons-react';

type MarketplaceThread = {
  thread_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  quote_context?: {
    quote_id?: string;
    service_category?: string;
    job_description?: string;
    location_city?: string;
    location_zipcode?: string;
    preferred_date?: string;
    urgency?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
  };
};

type MarketplaceMessage = {
  message_id?: string;
  id?: string;
  direction: 'INBOUND' | 'OUTBOUND';
  body: string;
  created_at: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  quote_context?: MarketplaceThread['quote_context'];
};

export default function MarketplaceInboxThreadPage() {
  const params = useParams();
  const router = useRouter();
  const threadId = String(params?.id || '');
  const [thread, setThread] = useState<MarketplaceThread | null>(null);
  const [messages, setMessages] = useState<MarketplaceMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [threads, threadMessages] = await Promise.all([
          apiClient.getProThreads(),
          apiClient.getProThreadMessages(threadId),
        ]);
        if (!mounted) return;
        const currentThread = (Array.isArray(threads) ? threads : []).find(
          (item: MarketplaceThread) => item.thread_id === threadId
        );
        const currentMessages = Array.isArray(threadMessages) ? threadMessages : [];
        const contextualMessage = currentMessages.find((message) => message.quote_context);
        setThread(
          currentThread || {
            thread_id: threadId,
            customer_name: contextualMessage?.customer_name,
            customer_email: contextualMessage?.customer_email,
            customer_phone: contextualMessage?.customer_phone,
            quote_context: contextualMessage?.quote_context,
          }
        );
        setMessages(currentMessages);
        setError(null);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'Failed to load the conversation.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (threadId) void load();
    return () => {
      mounted = false;
    };
  }, [threadId]);

  const preview = useMemo(() => {
    return (
      thread?.quote_context ||
      messages.find((message) => message.quote_context)?.quote_context ||
      null
    );
  }, [messages, thread]);

  const customerName =
    thread?.customer_name || preview?.contact_name || preview?.contact_email || 'Customer';

  const handleSend = async () => {
    if (!draft.trim() || !threadId) return;
    setSending(true);
    setError(null);
    try {
      await apiClient.sendProMessage(threadId, {
        message: draft.trim(),
        customer_email: thread?.customer_email || preview?.contact_email,
        customer_name: thread?.customer_name || preview?.contact_name,
        customer_phone: thread?.customer_phone || preview?.contact_phone,
        quote_context: preview,
      });
      const refreshed = await apiClient.getProThreadMessages(threadId);
      setMessages(Array.isArray(refreshed) ? refreshed : []);
      setDraft('');
    } catch (err: any) {
      setError(err?.message || 'Failed to send the message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketplace"
        title={loading ? 'Loading conversation...' : customerName}
        subtitle={thread?.customer_email || thread?.customer_phone || 'Marketplace inbox thread'}
        actions={
          <Button variant="outline" onClick={() => router.push('/dashboard/marketplace/inbox')}>
            <IconArrowLeft className="mr-2 h-4 w-4" />
            Back to inbox
          </Button>
        }
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {preview ? (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                Request preview
              </p>
              <h2 className="mt-2 text-xl font-bold text-foreground">
                {preview.service_category || 'Marketplace request'}
              </h2>
              {preview.job_description ? (
                <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {preview.job_description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <IconUser className="h-4 w-4" stroke={1.5} />
                {preview.contact_name || 'Customer'}
              </p>
              {preview.contact_email ? <p className="mt-2 text-sm text-slate-600">{preview.contact_email}</p> : null}
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-900">
                <IconPhone className="h-4 w-4" stroke={1.5} />
                {preview.contact_phone || 'Not provided'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-900">
                <IconMapPin className="h-4 w-4" stroke={1.5} />
                {preview.location_city || preview.location_zipcode || 'Not provided'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timing</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {formatMarketplaceUrgency(preview.urgency)}
              </p>
              {preview.preferred_date ? (
                <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-600">
                  <IconCalendar className="h-4 w-4" stroke={1.5} />
                  {preview.preferred_date}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <p className="text-sm font-semibold text-foreground">Conversation</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep the customer updated here after accepting the request.
          </p>
        </div>

        <div className="space-y-4 px-6 py-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
              No messages in this thread yet.
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={message.message_id || message.id || `${message.created_at}-${index}`}
                className={`flex ${message.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    message.direction === 'OUTBOUND'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.body}</p>
                  <p className="mt-2 text-xs opacity-80">
                    {message.created_at ? new Date(message.created_at).toLocaleString() : ''}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              placeholder="Type your message to the customer..."
              className="min-h-[92px] flex-1 rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button onClick={() => void handleSend()} disabled={sending || !draft.trim()} className="gap-2 self-end">
              <IconSend className="h-4 w-4" stroke={1.8} />
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
