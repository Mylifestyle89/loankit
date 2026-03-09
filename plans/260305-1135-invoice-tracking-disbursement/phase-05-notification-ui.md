---
phase: 5
title: "Notification UI (Bell + Center)"
status: complete
effort: 2h
depends_on: [3, 4]
completed: 2026-03-05
---

# Phase 5: Notification UI

## Context Links

- [Report layout (sidebar)](../../src/app/report/layout.tsx)
- [BaseModal](../../src/components/ui/BaseModal.tsx)
- [Browser notifications helper](./phase-03-notification-system.md)
- [Notification API](./phase-02-services-api.md)

## Overview

Add notification bell icon to sidebar with unread count badge. Clicking opens notification center dropdown. Enable browser push notifications. Poll server every 60s.

## Key Insights

- Bell goes in sidebar bottom area (above theme/language toggles)
- Zustand store with polling for server state
- Badge: red dot with count number
- Dropdown: list of recent notifications, click to navigate, "Mark all read" button
- Browser notification permission requested on first bell click (user gesture)
- Use Framer Motion for dropdown animation (matches existing sidebar pattern)

## Requirements

### Functional
- Bell icon with unread count badge in sidebar
- Click bell -> dropdown panel with notification list
- Each notification: icon (by type), title, message, time ago, click to navigate
- "Mark all as read" button in dropdown header
- Click notification -> mark read + navigate to related disbursement/invoice
- Browser push notification when new unread count detected during polling

### Non-functional
- Polling does not cause re-renders when count unchanged
- Badge hidden when count = 0
- Dropdown z-index above sidebar (z-50+)
- Dark mode support

## Architecture

```
[Zustand Store: use-notification-store.ts]
  - unreadCount: number
  - notifications: AppNotification[]
  - isOpen: boolean
  - startPolling() -> setInterval 60s
  - fetchNotifications()
  - markRead(id)
  - markAllRead()

[Sidebar Layout]
  - <NotificationBell /> component above ThemeToggle
  - Uses store for badge count + dropdown toggle

[NotificationBell]
  - Bell icon + red badge
  - onClick: toggle dropdown, request browser permission (once)
  - Dropdown: NotificationPanel

[NotificationPanel]
  - List notifications (most recent first)
  - Notification item: type icon, title, message, time ago
  - Click -> markRead + router.push to relevant page
  - "Mark all read" header button
```

## Related Code Files

### Create
- `src/app/report/disbursements/stores/use-notification-store.ts`
- `src/app/report/disbursements/components/notification-bell.tsx`
- `src/app/report/disbursements/components/notification-panel.tsx`

### Modify
- `src/app/report/layout.tsx` -- add NotificationBell to sidebar

## Implementation Steps

### 1. Create `use-notification-store.ts`

```typescript
import { create } from "zustand";

type Notification = {
  id: string;
  createdAt: string;
  readAt: string | null;
  type: string;
  title: string;
  message: string;
  metadata: string; // JSON string
};

type NotificationStore = {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  _pollingId: ReturnType<typeof setInterval> | null;

  toggle: () => void;
  close: () => void;
  fetch: () => Promise<void>;
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

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  close: () => set({ isOpen: false }),

  fetch: async () => {
    try {
      const res = await fetch("/api/notifications?unreadOnly=false");
      const data = await res.json();
      if (data.ok) {
        const prevCount = get().unreadCount;
        set({ notifications: data.notifications, unreadCount: data.unreadCount });
        // Trigger browser notification if count increased
        if (data.unreadCount > prevCount && prevCount >= 0) {
          const { showBrowserNotification } = await import("@/lib/notifications/browser-notifications");
          const newest = data.notifications[0];
          if (newest) showBrowserNotification(newest.title, newest.message);
        }
      }
    } catch { /* silent */ }
  },

  markRead: async (id) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    get().fetch();
  },

  markAllRead: async () => {
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    get().fetch();
  },

  startPolling: () => {
    if (get()._pollingId) return;
    get().fetch(); // immediate
    const id = setInterval(() => get().fetch(), 60_000);
    set({ _pollingId: id });
  },

  stopPolling: () => {
    const id = get()._pollingId;
    if (id) clearInterval(id);
    set({ _pollingId: null });
  },
}));
```

### 2. Create `notification-bell.tsx`

```typescript
"use client";

import { useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useNotificationStore } from "../stores/use-notification-store";
import { requestNotificationPermission } from "@/lib/notifications/browser-notifications";
import { NotificationPanel } from "./notification-panel";

export function NotificationBell({ expanded }: { expanded: boolean }) {
  const { unreadCount, isOpen, toggle, startPolling } = useNotificationStore();
  const permissionRequested = useRef(false);

  useEffect(() => {
    startPolling();
    // Cleanup not strictly needed (global store), but good practice
  }, [startPolling]);

  const handleClick = () => {
    toggle();
    // Request browser notification permission on first click (user gesture)
    if (!permissionRequested.current) {
      permissionRequested.current = true;
      requestNotificationPermission();
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        className={`flex w-full items-center rounded-lg py-1.5 text-xs font-medium text-zinc-400 transition-all duration-150 hover:bg-slate-100/70 hover:text-zinc-700 dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-slate-300 ${
          expanded ? "gap-2.5 px-2.5 justify-start" : "justify-center px-0"
        }`}
      >
        <div className="relative">
          <Bell className="h-[17px] w-[17px] shrink-0" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ delay: 0.07, duration: 0.14 }}
              className="truncate"
            >
              Thong bao
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {isOpen && <NotificationPanel />}
    </div>
  );
}
```

### 3. Create `notification-panel.tsx`

```typescript
"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Bell, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { useNotificationStore } from "../stores/use-notification-store";
import { useLanguage } from "@/components/language-provider";

const TYPE_ICONS: Record<string, typeof Bell> = {
  invoice_due_soon: Clock,
  invoice_overdue: AlertTriangle,
  duplicate_invoice: AlertTriangle,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function NotificationPanel() {
  const { notifications, markRead, markAllRead, close } = useNotificationStore();
  const router = useRouter();

  function handleClick(notif: { id: string; readAt: string | null; metadata: string }) {
    if (!notif.readAt) markRead(notif.id);
    try {
      const meta = JSON.parse(notif.metadata);
      if (meta.disbursementId) {
        router.push(`/report/disbursements/${meta.disbursementId}`);
      }
    } catch { /* ignore */ }
    close();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-full left-0 mb-2 w-80 rounded-xl border border-slate-200/60 bg-white shadow-lg dark:border-white/[0.08] dark:bg-[#1a1a1a] z-[60]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/60 px-4 py-2.5 dark:border-white/[0.07]">
        <span className="text-sm font-semibold">Thong bao</span>
        <button onClick={() => markAllRead()} className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">
          Doc tat ca
        </button>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-400 dark:text-slate-500">Khong co thong bao</p>
        ) : (
          notifications.slice(0, 20).map((n) => {
            const Icon = TYPE_ICONS[n.type] ?? Bell;
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.04] ${
                  !n.readAt ? "bg-indigo-50/50 dark:bg-indigo-500/5" : ""
                }`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-zinc-800 dark:text-slate-200">{n.title}</p>
                  <p className="truncate text-xs text-zinc-500 dark:text-slate-400">{n.message}</p>
                </div>
                <span className="shrink-0 text-[10px] text-zinc-400 dark:text-slate-500">{timeAgo(n.createdAt)}</span>
              </button>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
```

### 4. Add NotificationBell to layout sidebar

In `src/app/report/layout.tsx`, in the bottom controls section (before `ThemeToggle`):

```typescript
import { NotificationBell } from "./disbursements/components/notification-bell";

// In JSX, above <ThemeToggle />:
<NotificationBell expanded={hovered} />
```

### 5. Add notification-related i18n keys

```typescript
// vi:
"notifications.title": "Thong bao",
"notifications.markAllRead": "Doc tat ca",
"notifications.empty": "Khong co thong bao",
"notifications.dueSoon": "Sap den han",
"notifications.overdue": "Qua han",
"notifications.duplicate": "Trung lap",

// en:
"notifications.title": "Notifications",
"notifications.markAllRead": "Mark all read",
"notifications.empty": "No notifications",
"notifications.dueSoon": "Due soon",
"notifications.overdue": "Overdue",
"notifications.duplicate": "Duplicate",
```

## Todo List

- [x] Create `use-notification-store.ts`
- [x] Create `notification-bell.tsx`
- [x] Create `notification-panel.tsx`
- [x] Add NotificationBell to layout sidebar
- [x] Add notification i18n keys
- [x] Test polling starts on page load
- [x] Test badge shows correct unread count
- [x] Test "Mark all read" clears badge
- [x] Test click notification navigates to disbursement
- [x] Test browser notification fires on new unread
- [x] Verify dark mode on notification panel

## Success Criteria

- [x] Bell icon visible in sidebar with unread count badge
- [x] Clicking bell opens notification panel dropdown
- [x] Notifications displayed with type icon, title, message, time ago
- [x] Clicking notification marks it read and navigates to disbursement detail
- [x] "Mark all read" clears all unread state
- [x] Browser notification fires when new notifications detected during polling
- [x] Panel closes when clicking outside or navigating
- [x] Dark mode works correctly

## Implementation Summary

**3 Components Created:**
- `use-notification-store.ts` - Zustand store with polling (60s interval), notifications list, unread count, markRead, markAllRead, browser notification integration
- `notification-bell.tsx` - Sidebar bell icon with red unread badge, requests browser permission on first click, toggles dropdown
- `notification-panel.tsx` - Dropdown panel showing 20 most recent notifications with type icons, title, message, time ago, "Mark all read" button, click-to-navigate to disbursement

**Layout Integration:**
- Added NotificationBell to sidebar above ThemeToggle
- Bell shows unread count badge (red dot with 99+ cap)
- Dropdown positioned above bell, z-50+, full dark mode support

**Client-Side Polling:**
- Fetches `/api/notifications?unreadOnly=false` every 60s
- Triggers browser Notification API call when unread count increases
- Silent failures (catch-all error handler)

**Post-Review Fix (m3):**
- Changed hardcoded "Thong bao" to `t("notifications.title")` for proper i18n

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Polling causes unnecessary re-renders | Medium | Only update state if data changed |
| Dropdown position clips on small screens | Low | Position bottom-full (opens upward from bell) |
| Browser notification permission denied | N/A | Graceful fallback, bell still works |

## Security Considerations

- No sensitive data in browser notifications (only invoice numbers)
- Notification permission is user-controlled
- Polling uses same-origin fetch (no CORS concerns)

## Next Steps

- Feature complete after this phase
- Manual QA: full flow from disbursement creation through invoice tracking to notification receipt
- Consider future: email notifications (out of scope for now)
