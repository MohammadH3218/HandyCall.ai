'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { PortalInboxShell, type InboxMessageItem, type InboxThreadItem } from '@/components/marketplace/portal-inbox-shell';

export default function MarketplaceInboxPage() {
  const loadThreads = useCallback(async (): Promise<InboxThreadItem[]> => {
    const threads = await apiClient.getProThreads();
    return (Array.isArray(threads) ? threads : []).map((thread: any) => ({
      id: String(thread.thread_id),
      title: thread.customer_name || thread.customer_email || 'Customer',
      headerSubtitle: thread.customer_email || thread.customer_phone || 'Marketplace conversation',
      lastMessage: thread.last_message || '',
      lastAt: thread.last_at,
      unread: Boolean(thread.unread),
      raw: {
        ...thread,
        isExternalUpdate: String(thread.direction || '').toUpperCase() === 'INBOUND',
      },
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
      attachments: payload.attachments,
      customer_email: thread.raw?.customer_email,
      customer_name: thread.raw?.customer_name,
      customer_phone: thread.raw?.customer_phone,
      customer_user_id: thread.raw?.customer_user_id,
      quote_context: thread.raw?.quote_context,
      request_status: thread.raw?.request_status,
    });
  }, []);

  const subscribeToUpdates = useCallback((onUpdate: (payload: any) => void) => {
    const source = new EventSource('/api/portal-messaging/pro/stream');

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
      subtitle="All marketplace conversations in one place, with customers on the left and the active thread on the right."
      searchPlaceholder="Search customers, services, or messages..."
      composerPlaceholder="Type your message to the customer..."
      emptyThreadsTitle="No marketplace chats yet"
      emptyThreadsDescription="Accept a request to start a conversation. Once a customer thread exists, it will show up here."
      loadThreads={loadThreads}
      loadMessages={loadMessages}
      sendMessage={sendMessage}
      subscribeToUpdates={subscribeToUpdates}
    />
  );
}
