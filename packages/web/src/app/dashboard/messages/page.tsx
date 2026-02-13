'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/portal/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/empty-state';
import { apiClient } from '@/lib/api-client';
import { usePortalBasePath } from '@/lib/portal';
import {
  Info,
  MessageCircle,
  Paperclip,
  Search,
  SendHorizonal,
  Sparkles,
  UserRound,
} from 'lucide-react';

type MessageThread = {
  id: string;
  contact_name: string;
  contact_phone: string;
  last_message: string;
  last_at: number;
  lead_status?: string;
};

type MessageItem = {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  body: string;
  created_at: number;
  status?: string;
  ai_handled?: boolean;
};

const leadBadge = (status?: string) => {
  if (status === 'CONVERTED') return { label: 'Booked', variant: 'success' as const };
  if (status === 'QUALIFIED' || status === 'CONTACTED') return { label: 'Lead', variant: 'warning' as const };
  return { label: 'Open', variant: 'secondary' as const };
};

function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MessagesPage() {
  const router = useRouter();
  const basePath = usePortalBasePath();

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [contextOpen, setContextOpen] = useState(true);
  const [composerValue, setComposerValue] = useState('');

  useEffect(() => {
    let isActive = true;

    const loadThreads = async () => {
      try {
        setLoadingThreads(true);
        const result = await apiClient.getMessageThreads(150);
        if (!isActive) return;

        const list = Array.isArray(result?.threads) ? result.threads : [];
        setThreads(list);
        setError(null);

        if (list.length > 0) {
          setSelectedThreadId((prev) => prev || list[0].id);
        }
      } catch (err) {
        if (!isActive) return;
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        if (isActive) setLoadingThreads(false);
      }
    };

    void loadThreads();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedThreadId) {
      setSelectedThread(null);
      setMessages([]);
      return;
    }

    let isActive = true;

    const loadThread = async () => {
      try {
        setLoadingMessages(true);
        const result = await apiClient.getMessageThread(selectedThreadId, 300);
        if (!isActive) return;

        setSelectedThread(result?.thread || null);
        setMessages(Array.isArray(result?.messages) ? result.messages : []);
      } catch {
        if (!isActive) return;
        setSelectedThread(threads.find((thread) => thread.id === selectedThreadId) || null);
        setMessages([]);
      } finally {
        if (isActive) setLoadingMessages(false);
      }
    };

    void loadThread();

    return () => {
      isActive = false;
    };
  }, [selectedThreadId, threads]);

  const filteredThreads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return threads;

    return threads.filter((thread) => {
      const text = `${thread.contact_name} ${thread.contact_phone} ${thread.last_message}`.toLowerCase();
      return text.includes(query);
    });
  }, [searchQuery, threads]);

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title="Messages" subtitle="There was a problem loading your inbox." />
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-destructive">{error}</p>
            <Button className="mt-3" onClick={() => router.refresh()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Messages"
        title="SMS inbox"
        subtitle="Review AI conversations, respond quickly, and keep context close."
      />

      <Card>
        <CardContent className="p-0">
          <div className="grid min-h-[680px] grid-cols-1 divide-y divide-border xl:grid-cols-[320px_1fr] xl:divide-x xl:divide-y-0">
            <aside className="flex min-h-0 flex-col">
              <div className="border-b border-border p-3">
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search threads"
                  leadingIcon={<Search className="h-4 w-4" />}
                />
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingThreads ? (
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <Skeleton key={index} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredThreads.length === 0 ? (
                  <div className="p-3">
                    <EmptyState
                      icon={<MessageCircle className="h-6 w-6" />}
                      title="No threads"
                      description="Messages will appear here once a contact texts your business line."
                    />
                  </div>
                ) : (
                  filteredThreads.map((thread) => {
                    const selected = thread.id === selectedThreadId;
                    const lead = leadBadge(thread.lead_status);

                    return (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => setSelectedThreadId(thread.id)}
                        className={`w-full border-b border-border px-3 py-3 text-left transition-colors duration-standard ease-standard ${
                          selected ? 'bg-[#13161b]' : 'hover:bg-[#111419]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{thread.contact_name}</p>
                            <p className="truncate text-xs text-muted-foreground">{thread.contact_phone}</p>
                            <p className="mt-2 line-clamp-2 text-xs text-text-faint">{thread.last_message}</p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <Badge variant={lead.variant}>{lead.label}</Badge>
                            <span className="text-[11px] text-text-faint">{formatDateTime(thread.last_at)}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            <section className="flex min-h-0 flex-col">
              {selectedThread ? (
                <>
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">{selectedThread.contact_name}</h2>
                      <p className="text-xs text-muted-foreground">{selectedThread.contact_phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setContextOpen((prev) => !prev)}>
                        <Info className="h-4 w-4" />
                        Context
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => router.push(`${basePath}/messages/${selectedThread.id}`)}>
                        Open thread
                      </Button>
                    </div>
                  </div>

                  <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[1fr_280px]">
                    <div className="flex min-h-0 flex-col">
                      <div className="flex-1 space-y-3 overflow-y-auto p-4">
                        {loadingMessages ? (
                          <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Skeleton key={index} className="h-16 w-2/3" />
                            ))}
                            <div className="inline-flex items-center gap-1 rounded-full border border-border bg-[#0f1115] px-3 py-1 text-xs text-muted-foreground">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-faint" />
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-faint" />
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-faint" />
                              AI is typing
                            </div>
                          </div>
                        ) : messages.length ? (
                          messages.map((message) => (
                            <div key={message.id} className={`flex ${message.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}>
                              <div
                                className={`max-w-[82%] rounded-xl border px-3 py-2 text-sm ${
                                  message.direction === 'OUTBOUND'
                                    ? 'border-primary/40 bg-primary/12 text-[#d8eeff]'
                                    : 'border-border bg-[#0f1115] text-foreground'
                                }`}
                              >
                                <p className="whitespace-pre-wrap">{message.body}</p>
                                <p className="mt-2 text-[11px] text-text-faint">
                                  {formatDateTime(message.created_at)}
                                  {message.ai_handled ? '  -  AI' : ''}
                                  {message.status ? `  -  ${message.status}` : ''}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <EmptyState
                            icon={<MessageCircle className="h-6 w-6" />}
                            title="No messages in thread"
                            description="New messages will appear here in real time."
                          />
                        )}
                      </div>

                      <div className="border-t border-border p-3">
                        <div className="rounded-lg border border-border bg-[#0f1115] p-2">
                          <Input
                            value={composerValue}
                            onChange={(event) => setComposerValue(event.target.value)}
                            placeholder="Type your response..."
                            className="border-transparent bg-transparent shadow-none hover:border-transparent focus-visible:border-transparent"
                          />
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" aria-label="Attach file">
                                <Paperclip className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                Templates
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Sparkles className="mr-1 h-4 w-4" />
                                Suggestion
                              </Button>
                            </div>
                            <Button variant="primary" size="sm" disabled={!composerValue.trim()}>
                                <SendHorizonal className="mr-1 h-4 w-4" />
                              Send
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {contextOpen ? (
                      <aside className="border-t border-border bg-[#0f1115] p-4 xl:border-l xl:border-t-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-text-faint">Contact context</p>
                        <div className="mt-3 space-y-3 rounded-lg border border-border bg-[#13161b] p-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-[#0f1115] text-text-muted">
                              <UserRound className="h-4 w-4" />
                            </span>
                            <div>
                              <p className="text-sm font-medium text-foreground">{selectedThread.contact_name}</p>
                              <p className="text-xs text-muted-foreground">{selectedThread.contact_phone}</p>
                            </div>
                          </div>
                          <div className="space-y-2 text-xs text-muted-foreground">
                            <p>Booking status: {leadBadge(selectedThread.lead_status).label}</p>
                            <p>Last message: {formatDateTime(selectedThread.last_at)}</p>
                            <p>Last call: Not linked yet</p>
                            <p>Notes: No notes on this contact.</p>
                          </div>
                        </div>
                      </aside>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="p-4">
                  <EmptyState
                    icon={<MessageCircle className="h-6 w-6" />}
                    title="Select a conversation"
                    description="Choose a thread from the left to open conversation details."
                  />
                </div>
              )}
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

