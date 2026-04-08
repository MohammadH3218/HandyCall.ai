'use client';

import { useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { PortalInboxShell, type InboxMessageItem, type InboxThreadItem } from '@/components/marketplace/portal-inbox-shell';
import { apiClient } from '@/lib/api-client';

export default function CustomerInboxPage() {
  const { data: session } = useSession();
  const customerEmail = String(session?.user?.email || '').trim().toLowerCase();
  const customerUserId = String((session?.user as any)?.id || '').trim().toLowerCase();

  const loadThreads = useCallback(async (): Promise<InboxThreadItem[]> => {
    if (!customerEmail && !customerUserId) return [];

    const threads = await apiClient.getCustomerThreads({
      email: customerEmail || undefined,
      userId: customerUserId || undefined,
    });
    return (Array.isArray(threads) ? threads : []).map((thread: any) => ({
      id: String(thread.thread_id),
      title: thread.company_name || 'Pro',
      subtitle: thread.quote_context?.service_category || thread.customer_email || 'Marketplace conversation',
      lastMessage: thread.last_message || '',
      lastAt: thread.last_at,
      meta: thread.quote_context?.location_city || '',
      raw: {
        ...thread,
        isExternalUpdate: String(thread.direction || '').toUpperCase() === 'OUTBOUND',
      },
    }));
  }, [customerEmail, customerUserId]);

  const loadMessages = useCallback(async (thread: InboxThreadItem): Promise<InboxMessageItem[]> => {
    const companyId = thread.raw?.company_id;
    if (!companyId) return [];

    const messages = await apiClient.getCustomerThreadMessages(thread.id, companyId);
    return (Array.isArray(messages) ? messages : []).map((message: any) => ({
      id: message.message_id || message.id || `${message.created_at}`,
      body: message.body || '',
      createdAt: message.created_at,
      isOwn: String(message.direction || '').toUpperCase() !== 'OUTBOUND',
      attachments: Array.isArray(message.attachments) ? message.attachments : [],
      messageType: message.message_type,
      systemEvent: message.system_event,
    }));
  }, []);

  const sendMessage = useCallback(async (
    thread: InboxThreadItem,
    payload: { message: string; attachments: any[] }
  ) => {
    const companyId = thread.raw?.company_id;
    if (!companyId || (!customerEmail && !customerUserId)) return;

    await apiClient.sendCustomerMessage(companyId, {
      thread_id: thread.id,
      message: payload.message,
      customer_email: thread.raw?.customer_email || thread.raw?.quote_context?.contact_email || customerEmail,
      customer_user_id: customerUserId || undefined,
      customer_name: session?.user?.name || undefined,
      attachments: payload.attachments,
      quote_context: thread.raw?.quote_context,
    });
  }, [customerEmail, customerUserId, session?.user?.name]);

  const subscribeToUpdates = useCallback((onUpdate: (payload: any) => void) => {
    const source = new EventSource('/api/portal-messaging/customer/stream');

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        onUpdate(payload);
      } catch {
        // Ignore malformed events and keep the stream alive.
      }
    };

    source.onerror = () => {
      // Let EventSource handle reconnection automatically.
    };

    return () => {
      source.close();
    };
  }, []);

  return (
    <PortalInboxShell
      title="Inbox"
      subtitle="Chat with pros, share photos, and keep the job moving without leaving HandyCall."
      searchPlaceholder="Search conversations..."
      composerPlaceholder="Type a message..."
      emptyThreadsTitle="No conversations yet"
      emptyThreadsDescription="When a pro replies to your request, the conversation will appear here."
      loadThreads={loadThreads}
      loadMessages={loadMessages}
      sendMessage={sendMessage}
      subscribeToUpdates={subscribeToUpdates}
    />
  );
}
