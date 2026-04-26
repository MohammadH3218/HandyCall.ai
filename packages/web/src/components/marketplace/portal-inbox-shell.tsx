'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IconCalendar,
  IconClock,
  IconMapPin,
  IconMessageCircle,
  IconPaperclip,
  IconSearch,
  IconSend,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { optimizeImageFile, type UploadedImagePayload } from '@/lib/image-upload';

export type InboxThreadItem = {
  id: string;
  title: string;
  subtitle?: string;
  headerSubtitle?: string;
  meta?: string;
  lastMessage?: string;
  lastAt?: number | string;
  unread?: boolean;
  accentLabel?: string;
  raw?: any;
};

export type InboxMessageItem = {
  id: string;
  body: string;
  createdAt?: number | string;
  isOwn: boolean;
  attachments?: UploadedImagePayload[];
  messageType?: string;
  systemEvent?: string;
};

export function PortalInboxShell({
  title,
  subtitle,
  searchPlaceholder,
  composerPlaceholder,
  emptyThreadsTitle,
  emptyThreadsDescription,
  initialThreadId,
  loadThreads,
  loadMessages,
  sendMessage,
  subscribeToUpdates,
}: {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  composerPlaceholder: string;
  emptyThreadsTitle: string;
  emptyThreadsDescription: string;
  initialThreadId?: string | null;
  loadThreads: () => Promise<InboxThreadItem[]>;
  loadMessages: (thread: InboxThreadItem) => Promise<InboxMessageItem[]>;
  sendMessage: (
    thread: InboxThreadItem,
    payload: { message: string; attachments: UploadedImagePayload[] }
  ) => Promise<void>;
  subscribeToUpdates?: (
    onUpdate: (payload: { thread_id?: string; company_id?: string; type?: string }) => void,
  ) => () => void;
}) {
  const [threads, setThreads] = useState<InboxThreadItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialThreadId || null);
  const [messages, setMessages] = useState<InboxMessageItem[]>([]);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<UploadedImagePayload[]>([]);
  const [lightboxImages, setLightboxImages] = useState<UploadedImagePayload[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedIdRef = useRef<string | null>(initialThreadId || null);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const updateAutoScrollState = useCallback(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    const distanceFromBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom <= 40;
  }, []);

  const scrollMessagesToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoadingThreads(true);
        const nextThreads = await loadThreads();
        if (!mounted) return;
        setThreads(nextThreads);
        setSelectedId((current) => current || nextThreads[0]?.id || null);
        setError(null);
      } catch (err: any) {
        if (!mounted) return;
        setThreads([]);
        setError(err?.message || 'Failed to load conversations.');
      } finally {
        if (mounted) setLoadingThreads(false);
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [loadThreads]);

  const filteredThreads = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter((thread) =>
      `${thread.title} ${thread.subtitle || ''} ${thread.meta || ''} ${thread.lastMessage || ''}`
        .toLowerCase()
        .includes(query)
    );
  }, [search, threads]);

  const selectedThread =
    filteredThreads.find((thread) => thread.id === selectedId) ||
    threads.find((thread) => thread.id === selectedId) ||
    filteredThreads[0] ||
    null;

  const refreshThreads = useCallback(
    async (incomingThreadId?: string) => {
      const nextThreads = await loadThreads();
      setThreads(nextThreads);

      const currentSelectedId = selectedIdRef.current;
      const currentStillExists = nextThreads.some((thread) => thread.id === currentSelectedId);
      const incomingExists = incomingThreadId
        ? nextThreads.some((thread) => thread.id === incomingThreadId)
        : false;

      const nextSelectedId = currentStillExists
        ? currentSelectedId
        : incomingExists
          ? incomingThreadId || null
          : nextThreads[0]?.id || null;

      setSelectedId(nextSelectedId);
    },
    [loadThreads],
  );

  useEffect(() => {
    if (!selectedThread) {
      setMessages([]);
      return;
    }

    let mounted = true;
    const run = async () => {
      try {
        setLoadingMessages(true);
        const nextMessages = await loadMessages(selectedThread);
        if (!mounted) return;
        setMessages(nextMessages);
        setError(null);
      } catch (err: any) {
        if (!mounted) return;
        setMessages([]);
        setError(err?.message || 'Failed to load messages.');
      } finally {
        if (mounted) setLoadingMessages(false);
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [loadMessages, selectedThread]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }, [draft]);

  useEffect(() => {
    if (!selectedThread) return;
    shouldStickToBottomRef.current = true;
  }, [selectedThread?.id]);

  useEffect(() => {
    if (loadingMessages) return;
    if (!shouldStickToBottomRef.current) return;
    scrollMessagesToBottom();
  }, [loadingMessages, messages, scrollMessagesToBottom]);

  useEffect(() => {
    if (!shouldStickToBottomRef.current) return;
    scrollMessagesToBottom();
  }, [draft, pendingAttachments.length, scrollMessagesToBottom]);

  useEffect(() => {
    if (!subscribeToUpdates) return;

    return subscribeToUpdates((payload) => {
      if (payload?.type === 'heartbeat') return;

      // If it's a new message on the current thread, append it without a full reload
      if (payload?.type === 'message' && payload.thread_id && payload.message) {
        const msg = payload.message as any;
        const incomingId: string = msg.message_id || msg.id || '';

        if (payload.thread_id === selectedIdRef.current) {
          setMessages((current) => {
            // Skip if already present (optimistic or previous SSE)
            if (incomingId && current.some((m) => m.id === incomingId)) return current;
            const newItem: InboxMessageItem = {
              id: incomingId || `sse-${Date.now()}`,
              body: msg.body || '',
              isOwn: String(msg.direction || '').toUpperCase() === 'OUTBOUND',
              createdAt: msg.created_at,
              attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
              messageType: msg.message_type,
              systemEvent: msg.system_event,
            };
            return [...current, newItem];
          });
        }

        // Update thread last message in the sidebar
        setThreads((current) =>
          current.map((t) =>
            t.id === payload.thread_id
              ? { ...t, lastMessage: msg.body || t.lastMessage, lastAt: msg.created_at || t.lastAt }
              : t,
          ),
        );
      } else {
        // For other events (thread created, etc.) do a full thread refresh
        void refreshThreads(payload?.thread_id);
      }
    });
  }, [refreshThreads, subscribeToUpdates]);

  async function handleAttachmentSelect(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files).slice(0, 6 - pendingAttachments.length);
    const nextImages = await Promise.all(
      selected.map((file) => optimizeImageFile(file, { maxLongEdge: 1600, quality: 0.9 }))
    );
    setPendingAttachments((current) => [...current, ...nextImages]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSend() {
    if (!selectedThread) return;
    const message = draft.trim();
    if (!message && pendingAttachments.length === 0) return;

    const optimisticMessage: InboxMessageItem = {
      id: `optimistic-${Date.now()}`,
      body: message,
      isOwn: true,
      createdAt: Date.now(),
      attachments: pendingAttachments,
    };

    setSending(true);
    setError(null);
    setMessages((current) => [...current, optimisticMessage]);
    setDraft('');
    setPendingAttachments([]);

    try {
      await sendMessage(selectedThread, {
        message,
        attachments: optimisticMessage.attachments || [],
      });
      // No full reload — optimistic message stays and SSE will confirm it.
      // Just update the thread sidebar preview locally.
      setThreads((current) =>
        current.map((t) =>
          t.id === selectedThread.id
            ? { ...t, lastMessage: message || (optimisticMessage.attachments?.length ? '📎 Attachment' : ''), lastAt: Date.now() }
            : t,
        ),
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to send the message.');
      setMessages((current) => current.filter((item) => item.id !== optimisticMessage.id));
    } finally {
      setSending(false);
    }
  }

  function formatTime(value?: number | string) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function formatThreadTime(value?: number | string) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const sameDay = now.toDateString() === date.toDateString();
    return sameDay
      ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const emptyState = (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <IconMessageCircle className="h-7 w-7" stroke={1.5} />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-700">{emptyThreadsTitle}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-400">{emptyThreadsDescription}</p>
    </div>
  );

  const requestContext = selectedThread?.raw?.quote_context || null;

  function formatRequestDate(value?: number | string) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return (
    <>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          {loadingThreads ? (
            <div className="flex h-[calc(100vh-13rem)] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            </div>
          ) : threads.length === 0 ? (
            <div className="h-[calc(100vh-13rem)]">{emptyState}</div>
          ) : (
            <div className="grid h-[calc(100vh-13rem)] grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]">
              <aside className="flex h-full flex-col border-r border-slate-200 bg-[#fafafa]">
                <div className="border-b border-slate-200 px-4 py-4">
                  <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200">
                    <IconSearch className="h-4 w-4 text-slate-400" stroke={1.8} />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={searchPlaceholder}
                      className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2 py-2">
                  {filteredThreads.map((thread) => {
                    const active = thread.id === selectedThread?.id;
                    return (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => setSelectedId(thread.id)}
                        className={`mb-1.5 w-full rounded-2xl px-4 py-3 text-left transition ${
                          active
                            ? 'bg-white shadow-sm ring-1 ring-emerald-200'
                            : 'hover:bg-white/80'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                            active ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {thread.title.trim().charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-slate-900">{thread.title}</p>
                              <span className="shrink-0 text-[11px] text-slate-400">
                                {formatThreadTime(thread.lastAt)}
                              </span>
                            </div>
                            {thread.lastMessage ? (
                              <p className="mt-1 line-clamp-2 text-xs text-slate-400">{thread.lastMessage}</p>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="flex h-full min-h-0 flex-col bg-white">
                {selectedThread ? (
                  <>
                    <div className="border-b border-slate-200 px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{selectedThread.title}</p>
                          {selectedThread.headerSubtitle || selectedThread.subtitle ? (
                            <p className="mt-1 truncate text-sm text-slate-500">
                              {selectedThread.headerSubtitle || selectedThread.subtitle}
                            </p>
                          ) : null}
                        </div>
                        {requestContext ? (
                          <button
                            type="button"
                            onClick={() => setRequestModalOpen(true)}
                            className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            View Request
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div
                      ref={messagesViewportRef}
                      onScroll={updateAutoScrollState}
                      className="flex-1 overflow-y-auto bg-[#f7f8fa] px-4 py-5 sm:px-6"
                    >
                      {loadingMessages ? (
                        <div className="flex h-full items-center justify-center">
                          <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-sm text-slate-400">
                          No messages yet.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {messages.map((message) => {
                            const attachments = message.attachments || [];
                            const isSystemMessage = String(message.messageType || '').toUpperCase() === 'SYSTEM';
                            return (
                              <div
                                key={message.id}
                                className={`flex ${
                                  isSystemMessage ? 'justify-center' : message.isOwn ? 'justify-end' : 'justify-start'
                                }`}
                              >
                                <div
                                  className={`flex flex-col gap-2 ${
                                    isSystemMessage
                                      ? 'max-w-full items-center'
                                      : `max-w-[82%] ${message.isOwn ? 'items-end' : 'items-start'}`
                                  }`}
                                >
                                  {isSystemMessage ? (
                                    <p className="px-3 text-center text-xs font-medium text-slate-400">{message.body}</p>
                                  ) : null}
                                  {(message.body || attachments.length > 0) ? (
                                    !isSystemMessage ? (() => {
                                      const hasText = Boolean(message.body);
                                      const imageAttachments = attachments.filter((a) => !a.is_video);
                                      const videoAttachments = attachments.filter((a) => a.is_video);

                                      const imageGrid = imageAttachments.length > 0 ? (
                                        <div className={`grid gap-0.5 ${imageAttachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                          {imageAttachments.map((attachment, index) => (
                                            <button
                                              key={`${attachment.url}-${index}`}
                                              type="button"
                                              onClick={() => {
                                                setLightboxImages(imageAttachments);
                                                setLightboxIndex(index);
                                              }}
                                              className="block overflow-hidden"
                                            >
                                              <img
                                                src={attachment.url}
                                                alt={attachment.name || `Attachment ${index + 1}`}
                                                className="aspect-square w-full object-cover"
                                              />
                                            </button>
                                          ))}
                                        </div>
                                      ) : null;

                                      const videoGrid = videoAttachments.length > 0 ? (
                                        <div className="space-y-0.5">
                                          {videoAttachments.map((attachment, index) => (
                                            <video
                                              key={`${attachment.url}-${index}`}
                                              src={attachment.url}
                                              controls
                                              preload="metadata"
                                              className="w-full max-h-64 rounded-none"
                                            />
                                          ))}
                                        </div>
                                      ) : null;

                                      // Images-only: no bubble, no padding — just the image grid
                                      if (!hasText && imageAttachments.length > 0 && videoAttachments.length === 0) {
                                        return (
                                          <div className={`overflow-hidden rounded-[22px] shadow-sm ${message.isOwn ? 'rounded-br-md' : 'rounded-bl-md'} max-w-[280px]`}>
                                            {imageGrid}
                                          </div>
                                        );
                                      }

                                      // Video-only: minimal container
                                      if (!hasText && videoAttachments.length > 0 && imageAttachments.length === 0) {
                                        return (
                                          <div className={`overflow-hidden rounded-[22px] shadow-sm ${message.isOwn ? 'rounded-br-md' : 'rounded-bl-md'} max-w-xs`}>
                                            {videoGrid}
                                          </div>
                                        );
                                      }

                                      // Text (+ optional media): standard bubble
                                      return (
                                        <div className={`rounded-[22px] px-4 py-3 text-sm shadow-sm ${message.isOwn ? 'rounded-br-md bg-emerald-600 text-white' : 'rounded-bl-md bg-slate-200 text-slate-900'}`}>
                                          {hasText ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
                                          {imageAttachments.length > 0 ? (
                                            <div className={`${hasText ? 'mt-2' : ''} overflow-hidden rounded-xl`}>
                                              {imageGrid}
                                            </div>
                                          ) : null}
                                          {videoAttachments.length > 0 ? (
                                            <div className={`${hasText ? 'mt-2' : ''} overflow-hidden rounded-xl`}>
                                              {videoGrid}
                                            </div>
                                          ) : null}
                                        </div>
                                      );
                                    })() : null
                                  ) : null}

                                  <p className={`px-1 text-[11px] text-slate-400 ${isSystemMessage ? 'text-center' : ''}`}>
                                    {formatTime(message.createdAt)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
                      {pendingAttachments.length > 0 ? (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {pendingAttachments.map((attachment, index) => (
                            <div key={`${attachment.url}-${index}`} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                              <img src={attachment.url} alt={attachment.name || `Pending attachment ${index + 1}`} className="h-20 w-20 object-cover" />
                              <button
                                type="button"
                                onClick={() => setPendingAttachments((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                                className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
                              >
                                <IconX className="h-3 w-3" stroke={2} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="flex items-end gap-3 rounded-[24px] border border-slate-200 bg-[#fafafa] px-3 py-3 shadow-sm">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,video/mp4,video/quicktime,video/webm"
                          multiple
                          className="hidden"
                          onChange={(event) => void handleAttachmentSelect(event.target.files)}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-full p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
                          aria-label="Attach images"
                        >
                          <IconPaperclip className="h-5 w-5" stroke={1.8} />
                        </button>
                        <textarea
                          ref={textareaRef}
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                              event.preventDefault();
                              void handleSend();
                            }
                          }}
                          rows={1}
                          placeholder={composerPlaceholder}
                          className="max-h-[220px] min-h-[24px] flex-1 resize-none overflow-y-auto bg-transparent py-1 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => void handleSend()}
                          disabled={sending || (!draft.trim() && pendingAttachments.length === 0)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Send message"
                        >
                          {sending ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <IconSend className="h-4 w-4" stroke={1.8} />
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  emptyState
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      {lightboxImages ? (
        <ImageLightbox
          images={lightboxImages.map((image, index) => ({
            src: image.url,
            alt: image.name || `Attachment ${index + 1}`,
          }))}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxImages(null)}
        />
      ) : null}

      {requestModalOpen && requestContext ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setRequestModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">Request Details</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  {requestContext.service_category || 'Service request'}
                </h2>
                {selectedThread?.lastAt ? (
                  <p className="mt-1 text-sm text-slate-500">Last updated {formatRequestDate(selectedThread.lastAt)}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
                aria-label="Close request details"
              >
                <IconX className="h-5 w-5" stroke={1.8} />
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <IconUser className="h-4 w-4" stroke={1.8} />
                  Customer
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">
                  {requestContext.contact_name || selectedThread?.title || '—'}
                </p>
                {(requestContext.contact_email || selectedThread?.headerSubtitle) ? (
                  <p className="mt-1 text-sm text-slate-500">{requestContext.contact_email || selectedThread?.headerSubtitle}</p>
                ) : null}
                {requestContext.contact_phone ? (
                  <p className="mt-1 text-sm text-slate-500">{requestContext.contact_phone}</p>
                ) : null}
              </div>

              {(() => {
                const addressParts = [
                  requestContext.address_line1,
                  requestContext.address_line2,
                  requestContext.location_city || 'Riyadh',
                  'Saudi Arabia',
                ].filter(Boolean);
                const addressQuery = encodeURIComponent(addressParts.join(', '));
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${addressQuery}`;
                const embedUrl = `https://maps.google.com/maps?q=${addressQuery}&output=embed`;

                return (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                      <IconMapPin className="h-4 w-4" stroke={1.8} />
                      Location
                    </div>
                    {/* Clickable map embed */}
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-xl border border-slate-200 hover:opacity-90 transition"
                    >
                      <iframe
                        src={embedUrl}
                        width="100%"
                        height="160"
                        loading="lazy"
                        className="pointer-events-none block border-0"
                        title="Job location map"
                      />
                    </a>
                    <div className="mt-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {requestContext.location_city || 'Riyadh'}
                      </p>
                      {requestContext.address_line1 ? (
                        <p className="mt-0.5 text-sm text-slate-500">{requestContext.address_line1}</p>
                      ) : null}
                      {requestContext.address_line2 ? (
                        <p className="mt-0.5 text-sm text-slate-500">{requestContext.address_line2}</p>
                      ) : null}
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline"
                      >
                        Open in Google Maps →
                      </a>
                    </div>
                  </div>
                );
              })()}

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <IconClock className="h-4 w-4" stroke={1.8} />
                  Timing
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">
                  {requestContext.urgency
                    ? ({ emergency: 'Emergency', urgent: 'Within 1-2 days', this_week: 'This week', flexible: 'Flexible' } as Record<string, string>)[requestContext.urgency] ?? requestContext.urgency
                    : '—'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <IconCalendar className="h-4 w-4" stroke={1.8} />
                  Submitted
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">
                  {formatRequestDate(requestContext.created_at || selectedThread?.lastAt) || 'Recently'}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Issue description</p>
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                {requestContext.job_description || 'No description provided.'}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
