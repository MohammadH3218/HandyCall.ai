import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationType =
  | 'new_message'
  | 'new_quote_request'
  | 'request_accepted'
  | 'request_declined'
  | 'new_review';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, any>;
  created_at: number;
  read: boolean;
}

export interface NotificationPreferences {
  messages: boolean;
  request_updates: boolean;
  new_requests: boolean; // pro only
  reviews: boolean;      // pro only
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  messages: true,
  request_updates: true,
  new_requests: true,
  reviews: true,
};

interface NotificationState {
  notifications: AppNotification[];
  preferences: NotificationPreferences;
  // Actions
  addNotification: (n: Omit<AppNotification, 'id' | 'read'>) => void;
  markAllRead: () => void;
  clearAll: () => void;
  setPreference: (key: keyof NotificationPreferences, value: boolean) => void;
  // Computed
  unreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      preferences: DEFAULT_PREFERENCES,

      addNotification: (n) => {
        const prefs = get().preferences;

        // Check preferences before adding
        if (n.type === 'new_message' && !prefs.messages) return;
        if ((n.type === 'request_accepted' || n.type === 'request_declined') && !prefs.request_updates) return;
        if (n.type === 'new_quote_request' && !prefs.new_requests) return;
        if (n.type === 'new_review' && !prefs.reviews) return;

        const notification: AppNotification = {
          ...n,
          id: `${n.type}-${n.created_at}-${Math.random().toString(36).slice(2, 7)}`,
          read: false,
        };

        set((state) => ({
          // Keep only the most recent 50 notifications
          notifications: [notification, ...state.notifications].slice(0, 50),
        }));
      },

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      clearAll: () => set({ notifications: [] }),

      setPreference: (key, value) =>
        set((state) => ({
          preferences: { ...state.preferences, [key]: value },
        })),

      unreadCount: () => get().notifications.filter((n) => !n.read).length,
    }),
    {
      name: 'handycall-notifications',
      // Only persist preferences and a capped list of recent notifications
      partialize: (state) => ({
        preferences: state.preferences,
        // Persist last 20 read notifications so the list isn't empty on reload
        notifications: state.notifications.slice(0, 20),
      }),
    },
  ),
);
