# Notification Patterns for Next.js + SQLite (Local App)

**Date:** 2026-03-05 | **Stack:** Next.js 16 (App Router), Prisma, better-sqlite3, Zustand
**Scope:** Invoice due-date reminders, UI badges, browser push — no external services

---

## 1. Browser Notification API

**No service worker needed when the tab is open.** Two constructors exist:

| Method | Requires SW | Works when tab closed |
|---|---|---|
| `new Notification(title, opts)` | No | No |
| `registration.showNotification(title, opts)` | Yes | Yes |

For a local app where the user has the tab open (typical internal tool), `new Notification()` is sufficient and simpler.

### Permission + Fire pattern (client component)

```typescript
// src/lib/notifications/browser-notify.ts
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function fireNotification(title: string, body: string, tag?: string) {
  if (Notification.permission !== 'granted') return;
  new Notification(title, {
    body,
    tag,          // deduplicates: same tag replaces previous
    icon: '/favicon.ico',
  });
}
```

```typescript
// Usage in a client component (after user gesture)
import { requestNotificationPermission, fireNotification } from '@/lib/notifications/browser-notify';

async function handleEnableNotifications() {
  const ok = await requestNotificationPermission();
  if (ok) fireNotification('Reminders enabled', 'You will be alerted for upcoming deadlines.');
}
```

**Key rules:**
- `requestPermission()` MUST be called inside a user gesture (click), not on mount — browsers block it otherwise.
- `Notification.permission` is `"default" | "granted" | "denied"` — check before calling.
- `tag` prevents notification spam: second notification with same tag replaces the first.

---

## 2. Service Worker — Skip for This Use Case

**Verdict: Not needed.** Service workers enable notifications when the tab is closed (background push). For a local invoice tool with an always-open tab, the overhead is not justified.

**Periodic Background Sync API** (the SW-based alternative) has further limitations:
- Chrome 80+ only (no Firefox/Safari)
- Requires the app to be installed as PWA
- Browser controls actual sync interval — `minInterval` is a hint, not a guarantee
- Ties sync frequency to "engagement score" (how often user visits)

**If background notifications are ever needed later:** add a service worker at `public/sw.js` and register it once. The `new Notification()` → `registration.showNotification()` migration is a one-line change.

---

## 3. In-App Notification Center (Bell + Badge)

### SQLite schema (add via Prisma migration)

```prisma
model Notification {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  readAt    DateTime?
  type      String   // "deadline_warning" | "deadline_overdue"
  title     String
  body      String
  entityId  String?  // FK to invoice/customer id
  entityType String? // "mapping_instance"

  @@index([readAt])
  @@map("notifications")
}
```

### API routes needed

```
GET  /api/notifications          → list unread (readAt IS NULL), limit 20
POST /api/notifications/read-all → set readAt = now() for all unread
POST /api/notifications/[id]/read → mark single as read
```

### Bell badge component (no library)

```typescript
// src/components/notification-bell.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';

interface Notification { id: string; title: string; body: string; createdAt: string; }

export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchUnread = useCallback(async () => {
    const res = await fetch('/api/notifications');
    if (res.ok) setItems(await res.json());
  }, []);

  // Poll every 60 seconds (see section 4)
  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, 60_000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  const count = items.length;

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className="relative p-2">
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs
                           rounded-full w-5 h-5 flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white shadow-lg rounded-lg z-50 max-h-96 overflow-y-auto">
          {items.length === 0
            ? <p className="p-4 text-sm text-gray-500">No notifications</p>
            : items.map(n => (
                <div key={n.id} className="p-3 border-b hover:bg-gray-50 text-sm">
                  <p className="font-medium">{n.title}</p>
                  <p className="text-gray-500">{n.body}</p>
                </div>
              ))
          }
        </div>
      )}
    </div>
  );
}
```

State lives in component — Zustand store only needed if badge count must sync across distant components. For a single layout bell, local state is fine (KISS).

---

## 4. Polling vs SSE vs WebSocket

**Recommendation: Simple polling (setInterval).** Deadline reminders are low-frequency, low-latency-tolerance events.

| Approach | Complexity | SQLite fit | Verdict |
|---|---|---|---|
| **Polling (60s interval)** | Minimal | Perfect — one SELECT per poll | **Use this** |
| **SSE** | Low | Good — server pushes when found | Overkill for hourly deadlines |
| **WebSocket** | High (needs custom server or socket.io) | Good | Overkill |

**Why polling wins here:**
- Deadlines are checked hourly anyway; 60-second poll is already 60x faster than needed
- SQLite handles concurrent reads well with better-sqlite3
- No persistent HTTP connection required — serverless-compatible
- Zero infrastructure change

**SSE is better if** you need sub-second push (e.g., live collaboration). For invoice reminders that change once per day at most, it adds complexity for no benefit.

**SSE pattern (if chosen):**
```typescript
// src/app/api/notifications/stream/route.ts
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const push = (data: object) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));

      const check = async () => {
        const notifs = await getUnreadNotifications(); // Prisma query
        if (notifs.length > 0) push({ notifications: notifs });
      };

      check();
      const id = setInterval(check, 60_000);
      req.signal.addEventListener('abort', () => { clearInterval(id); controller.close(); });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
```

---

## 5. Cron-Like Scheduling in Next.js (No External Tools)

### Option A: `instrumentation.ts` + `node-cron` (RECOMMENDED)

`instrumentation.ts` is called once on server startup (prod) and is the official Next.js hook for side-effect initialization. Pair with `node-cron` (no Redis, no external services).

```typescript
// src/instrumentation.ts
export async function register() {
  // Only run scheduler in Node.js runtime (not edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./lib/notifications/deadline-scheduler');
  }
}
```

```typescript
// src/lib/notifications/deadline-scheduler.ts
import cron from 'node-cron';
import { checkAndCreateDeadlineNotifications } from './deadline-checker';

// Run every hour at :00
cron.schedule('0 * * * *', async () => {
  console.log('[scheduler] Checking deadlines...');
  await checkAndCreateDeadlineNotifications();
});

console.log('[scheduler] Deadline scheduler started.');
```

```typescript
// src/lib/notifications/deadline-checker.ts
import { prisma } from '@/lib/db';

const WARN_DAYS = 7;

export async function checkAndCreateDeadlineNotifications() {
  const now = new Date();
  const cutoff = new Date(now.getTime() + WARN_DAYS * 86_400_000);

  // Query mapping instances with a due date field in data_json
  // Adjust query to match your actual due-date field name
  const instances = await prisma.mappingInstance.findMany({
    where: { status: { not: 'archived' } },
    include: { customer: true },
  });

  for (const inst of instances) {
    const dueDate = extractDueDate(inst); // parse from mappingJsonPath or fieldCatalogJson
    if (!dueDate || dueDate < now || dueDate > cutoff) continue;

    const tag = `deadline-${inst.id}`;
    const exists = await prisma.notification.findFirst({ where: { entityId: inst.id, readAt: null } });
    if (exists) continue; // already notified

    await prisma.notification.create({
      data: {
        type: 'deadline_warning',
        title: `Deadline approaching: ${inst.customer.customer_name}`,
        body: `Due ${dueDate.toLocaleDateString()} — ${Math.ceil((dueDate.getTime() - now.getTime()) / 86_400_000)} days left`,
        entityId: inst.id,
        entityType: 'mapping_instance',
      },
    });
  }
}

function extractDueDate(inst: { mappingJsonPath: string }): Date | null {
  // Implement based on where due date is stored
  return null;
}
```

**install:** `npm install node-cron @types/node-cron`

### Option B: `setInterval` in `instrumentation.ts` (zero deps)

If `node-cron` feels heavy, use `setInterval` directly for an hourly interval — no package needed:

```typescript
// src/lib/notifications/deadline-scheduler.ts
import { checkAndCreateDeadlineNotifications } from './deadline-checker';

const ONE_HOUR = 60 * 60 * 1000;

// Run immediately on startup, then every hour
checkAndCreateDeadlineNotifications().catch(console.error);
setInterval(() => checkAndCreateDeadlineNotifications().catch(console.error), ONE_HOUR);
```

**Note:** In `next dev`, `instrumentation.ts` may be called multiple times due to HMR. Guard with a module-level flag:

```typescript
let scheduled = false;
if (!scheduled) {
  scheduled = true;
  setInterval(...);
}
```

---

## Implementation Priority

1. **Prisma migration** — add `Notification` model
2. **`deadline-checker.ts`** — core logic (adapt `extractDueDate` to actual data shape)
3. **`instrumentation.ts` + scheduler** — triggers checker hourly
4. **API routes** — GET /api/notifications, POST read
5. **`NotificationBell`** — drop into layout, polls every 60s
6. **Browser notify** — call `fireNotification()` inside the fetch callback when new items arrive

---

## Unresolved Questions

1. **Where is the due date stored?** The Prisma schema has no `dueDate` field. Is it inside `fieldCatalogJson`, `mappingJsonPath` file, or `data_json` on `Customer`? The `extractDueDate()` stub must be implemented based on this.
2. **Dev HMR double-init** — `instrumentation.ts` fires multiple times in dev. The `scheduled` flag guard works but should be tested.
3. **SQLite WAL mode** — if many concurrent reads hit the DB during scheduler + user requests, enabling WAL mode in better-sqlite3 (`PRAGMA journal_mode=WAL`) prevents lock contention.
4. **Browser notification timing** — `fireNotification()` is called client-side on poll. If the tab is closed when the notification is created server-side, the user won't see a browser pop-up until next poll after re-opening the tab. Acceptable for local tool?
