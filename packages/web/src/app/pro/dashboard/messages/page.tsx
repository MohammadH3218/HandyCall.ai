'use client';

import { Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { PortalInboxShell, type InboxMessageItem, type InboxThreadItem } from '@/components/marketplace/portal-inbox-shell';
import { apiClient } from '@/lib/api-client';

function ProMessagesContent() {
  const searchParams = useSearchParams();
  const initialThreadId = searchParams.get('thread_id') || null;

  const loadThreads = useCallback(async (): Promise<InboxThreadItem[]> => {
    const threads = await apiClient.getProThreads();
    return (Array.isArray(threads) ? threads : []).map((thread: any) => ({
      id: String(thread.thread_id),
      title: thread.customer_name || thread.customer_email || 'Customer',
      subtitle: thread.quote_context?.service_category || 'Service request',
      headerSubtitle: thread.customer_email || '',
      lastMessage: thread.last_message || '',
      lastAt: thread.last_at,
      meta: thread.quote_context?.location_city || '',
      raw: thread,
    }));
  }, []);

  const loadMessages = useCallback(async (thread: InboxThreadItem): Promise<InboxMessageItem[]> => {
    const messages = await apiClient.getProThreadMessages(thread.id);
    return (Array.isArray(messages) ? messages : []).map((message: any) => ({
      id: message.message_id || message.id || `${message.created_at}`,
      body: message.body || '',
      createdAt: message.created_at,
      isOwn: String(message.direction || '').toUpperCase() === 'OUTBOUND',
      attachments: Array.isArray(message.attachments) ? message.attachments : [],
      messageType: message.message_type,
      systemEvent: message.system_event,
    }));
  }, []);

  const sendMessage = useCallback(async (
    thread: InboxThreadItem,
    payload: { message: string; attachments: any[] }
  ) => {
    await apiClient.sendProMessage(thread.id, {
      message: payload.message,
      customer_email: thread.raw?.customer_email || '',
      customer_name: thread.raw?.customer_name || '',
      attachments: payload.attachments,
      quote_context: thread.raw?.quote_context,
    });
  }, []);

  const subscribeToUpdates = useCallback((onUpdate: (payload: any) => void) => {
    const source = new EventSource('/api/portal-messaging/pro/stream');

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        onUpdate(payload);
      } catch {
        // Ignore malformed events.
      }
    };

    source.onerror = () => {
      // EventSource reconnects automatically.
    };

    return () => {
      source.close();
    };
  }, []);

  return (
    <div className="p-5 md:p-8">
    <PortalInboxShell
      title="Inbox"
      subtitle="Chat with customers, share photos, and manage jobs without leaving HandyCall."
      searchPlaceholder="Search conversations..."
      composerPlaceholder="Type a message..."
      emptyThreadsTitle="No conversations yet"
      emptyThreadsDescription="When you accept a customer request, the conversation will appear here."
      initialThreadId={initialThreadId}
      loadThreads={loadThreads}
      loadMessages={loadMessages}
      sendMessage={sendMessage}
      subscribeToUpdates={subscribeToUpdates}
    />
    </div>
  );
}

export default function ProMessagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <ProMessagesContent />
    </Suspense>
  );
}
