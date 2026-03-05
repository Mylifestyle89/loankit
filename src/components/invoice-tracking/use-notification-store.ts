import { create } from "zustand";

type Notification = {
  id: string;
  createdAt: string;
  readAt: string | null;
  type: string;
  title: string;
  message: string;
  metadata: string;
};

type NotificationStore = {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  _pollingId: ReturnType<typeof setInterval> | null;
  _prevCount: number;

  toggle: () => void;
  close: () => void;
  fetchNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,
  _pollingId: null,
  _prevCount: -1,

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  close: () => set({ isOpen: false }),

  fetchNotifications: async () => {
    try {
      const res = await globalThis.fetch("/api/notifications?unreadOnly=false");
      const data = await res.json();
      if (data.ok) {
        const prevCount = get()._prevCount;
        set({
          notifications: data.notifications,
          unreadCount: data.unreadCount,
          _prevCount: data.unreadCount,
        });
        // Trigger browser notification if count increased
        if (prevCount >= 0 && data.unreadCount > prevCount) {
          void import("@/lib/notifications/browser-notifications").then(
            ({ showBrowserNotification }) => {
              const newest = data.notifications[0];
              if (newest) showBrowserNotification(newest.title, newest.message);
            },
          );
        }
      }
    } catch {
      /* silent - network errors during polling are expected */
    }
  },

  markRead: async (id) => {
    await globalThis.fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    void get().fetchNotifications();
  },

  markAllRead: async () => {
    await globalThis.fetch("/api/notifications/mark-all-read", { method: "POST" });
    void get().fetchNotifications();
  },

  startPolling: () => {
    if (get()._pollingId) return;
    void get().fetchNotifications();
    const id = setInterval(() => void get().fetchNotifications(), 60_000);
    set({ _pollingId: id });
  },

  stopPolling: () => {
    const id = get()._pollingId;
    if (id) clearInterval(id);
    set({ _pollingId: null });
  },
}));
