import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

export type NotificationType =
  | 'new_message'
  | 'new_quote_request'
  | 'request_accepted'
  | 'request_declined'
  | 'new_review';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  /** Contextual data (thread_id, quote_id, etc.) */
  metadata?: Record<string, any>;
  created_at: number;
}

// In-process SSE bus for real-time notification delivery — keyed by user_id
const notificationBus = new EventEmitter();
notificationBus.setMaxListeners(500);

@Injectable()
export class NotificationsService {
  /**
   * Emit a notification to a specific user (pro or customer).
   * The user receives it on their SSE stream if they are currently connected.
   */
  emit(userId: string, payload: NotificationPayload): void {
    notificationBus.emit(`user:${userId}`, payload);
  }

  /**
   * Subscribe to notifications for a user. Returns an unsubscribe function.
   */
  subscribe(userId: string, callback: (payload: NotificationPayload) => void): () => void {
    const channel = `user:${userId}`;
    notificationBus.on(channel, callback);
    return () => notificationBus.off(channel, callback);
  }

  // ── Convenience helpers ─────────────────────────────────────────────────────

  newMessage(params: {
    recipientId: string;
    senderName: string;
    preview: string;
    threadId: string;
  }) {
    this.emit(params.recipientId, {
      type: 'new_message',
      title: `New message from ${params.senderName}`,
      body: params.preview.length > 80 ? params.preview.slice(0, 80) + '…' : params.preview,
      metadata: { thread_id: params.threadId },
      created_at: Date.now(),
    });
  }

  newQuoteRequest(params: {
    proId: string;
    serviceCategory: string;
    district: string;
    quoteId: string;
  }) {
    this.emit(params.proId, {
      type: 'new_quote_request',
      title: 'New service request',
      body: `${params.serviceCategory} · ${params.district}`,
      metadata: { quote_id: params.quoteId },
      created_at: Date.now(),
    });
  }

  requestAccepted(params: {
    customerId: string;
    proName: string;
    serviceCategory: string;
    threadId: string;
    quoteId: string;
  }) {
    this.emit(params.customerId, {
      type: 'request_accepted',
      title: `${params.proName} accepted your request`,
      body: `Your ${params.serviceCategory} request has been accepted. Open chat to coordinate.`,
      metadata: { thread_id: params.threadId, quote_id: params.quoteId },
      created_at: Date.now(),
    });
  }

  requestDeclined(params: {
    customerId: string;
    proName: string;
    serviceCategory: string;
    quoteId: string;
  }) {
    this.emit(params.customerId, {
      type: 'request_declined',
      title: `${params.proName} declined your request`,
      body: `Your ${params.serviceCategory} request was not accepted. Browse other pros.`,
      metadata: { quote_id: params.quoteId },
      created_at: Date.now(),
    });
  }

  newReview(params: {
    proId: string;
    customerName: string;
    rating: number;
    reviewId: string;
  }) {
    this.emit(params.proId, {
      type: 'new_review',
      title: `New review from ${params.customerName}`,
      body: `${'★'.repeat(params.rating)}${'☆'.repeat(5 - params.rating)} — ${params.customerName} left you a review.`,
      metadata: { review_id: params.reviewId },
      created_at: Date.now(),
    });
  }
}
