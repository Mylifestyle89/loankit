---
phase: 3
title: "Notification System (Scheduler + Browser Push)"
status: complete
effort: 3h
depends_on: [2]
completed: 2026-03-05
---

# Phase 3: Notification System

## Context Links

- [Notification service](./phase-02-services-api.md) (Phase 2)
- [Next.js instrumentation docs](https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation)
- [Browser Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notification)

## Overview

Server-side hourly scheduler checks invoice deadlines, creates AppNotification records. Client-side polls every 60s. Browser Notification API for push alerts.

## Key Insights

- `instrumentation.ts` in project root (or `src/`) -- Next.js calls `register()` once on server boot
- Guard with module-level `let started = false` to prevent HMR double-start
- No service worker needed -- direct `new Notification()` from client
- Permission request must be triggered by user gesture (button click)
- Scheduler checks: invoices where `dueDate` (or `customDeadline`) is within 7 days AND status = "pending" AND no recent notification exists for that invoice

## Requirements

### Functional
- Hourly: find invoices due within 7 days, create "invoice_due_soon" notifications (deduplicated)
- Hourly: find invoices past due with status "pending", auto-update to "overdue", create "invoice_overdue" notifications
- Browser push when new notifications arrive (client-side)

### Non-functional
- Scheduler must not crash the server on error (try/catch + console.error)
- Deduplication: don't create same notification type for same invoice within 24h
- Must handle HMR restarts gracefully

## Architecture

```
[Server Start]
  -> instrumentation.ts register()
    -> deadlineScheduler.start()
      -> setInterval(checkDeadlines, 1 hour)

[checkDeadlines]
  1. Query pending invoices WHERE dueDate <= now + 7 days
  2. For each, check if notification already exists (same invoiceId + type in last 24h)
  3. If not, create AppNotification
  4. Query pending invoices WHERE dueDate < now
  5. Update status to "overdue"
  6. Create "invoice_overdue" notifications (deduplicated)

[Client]
  - Poll GET /api/notifications?unreadOnly=true every 60s
  - If unreadCount increased, fire browser Notification
```

## Related Code Files

### Create
- `src/lib/notifications/deadline-scheduler.ts` -- scheduler logic
- `src/lib/notifications/browser-notifications.ts` -- client-side Notification API helper
- `src/instrumentation.ts` -- boot scheduler

### Modify
- `next.config.ts` -- may need `experimental.instrumentationHook: true` (check if needed for Next.js 14+)

## Implementation Steps

### 1. Create `src/lib/notifications/deadline-scheduler.ts`

```typescript
import { prisma } from "@/lib/prisma";
import { notificationService } from "@/services/notification.service";

const ONE_HOUR = 60 * 60 * 1000;
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

let started = false;

export function startDeadlineScheduler() {
  if (started) return;
  started = true;
  console.log("[deadline-scheduler] Starting hourly invoice deadline check...");

  // Run immediately on boot, then hourly
  void checkDeadlines();
  setInterval(() => void checkDeadlines(), ONE_HOUR);
}

async function checkDeadlines() {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + SEVEN_DAYS);

    // 1. Find pending invoices due within 7 days
    const dueSoon = await prisma.invoice.findMany({
      where: {
        status: "pending",
        dueDate: { lte: sevenDaysFromNow, gt: now },
      },
      include: { disbursement: { include: { customer: true } } },
    });

    for (const inv of dueSoon) {
      // Check effective deadline (customDeadline overrides dueDate for reminder)
      const effectiveDate = inv.customDeadline ?? inv.dueDate;
      const effectiveSoon = new Date(effectiveDate.getTime());
      if (effectiveSoon > sevenDaysFromNow || effectiveSoon <= now) continue;

      // Deduplicate: skip if notification for this invoice in last 24h
      const recentNotif = await prisma.appNotification.findFirst({
        where: {
          type: "invoice_due_soon",
          metadata: { contains: inv.id },
          createdAt: { gte: new Date(now.getTime() - TWENTY_FOUR_HOURS) },
        },
      });
      if (recentNotif) continue;

      await notificationService.create({
        type: "invoice_due_soon",
        title: `HD sap den han: ${inv.invoiceNumber}`,
        message: `HD ${inv.invoiceNumber} (${inv.disbursement.customer.customer_name}) den han ${effectiveDate.toLocaleDateString("vi-VN")}`,
        metadata: { invoiceId: inv.id, disbursementId: inv.disbursementId, customerId: inv.disbursement.customerId },
      });
    }

    // 2. Auto-mark overdue + create notifications
    const overdue = await prisma.invoice.findMany({
      where: { status: "pending", dueDate: { lt: now } },
      include: { disbursement: { include: { customer: true } } },
    });

    for (const inv of overdue) {
      await prisma.invoice.update({ where: { id: inv.id }, data: { status: "overdue" } });

      const recentNotif = await prisma.appNotification.findFirst({
        where: {
          type: "invoice_overdue",
          metadata: { contains: inv.id },
          createdAt: { gte: new Date(now.getTime() - TWENTY_FOUR_HOURS) },
        },
      });
      if (recentNotif) continue;

      await notificationService.create({
        type: "invoice_overdue",
        title: `HD qua han: ${inv.invoiceNumber}`,
        message: `HD ${inv.invoiceNumber} (${inv.disbursement.customer.customer_name}) da qua han`,
        metadata: { invoiceId: inv.id, disbursementId: inv.disbursementId, customerId: inv.disbursement.customerId },
      });
    }

    console.log(`[deadline-scheduler] Checked ${dueSoon.length} due-soon, ${overdue.length} overdue.`);
  } catch (err) {
    console.error("[deadline-scheduler] Error:", err);
  }
}
```

### 2. Create `src/instrumentation.ts`

```typescript
export async function register() {
  // Only run on server (not edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startDeadlineScheduler } = await import("@/lib/notifications/deadline-scheduler");
    startDeadlineScheduler();
  }
}
```

### 3. Create `src/lib/notifications/browser-notifications.ts`

```typescript
// Client-side utility for Browser Notification API

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isBrowserNotificationSupported()) return "denied";
  return Notification.requestPermission();
}

export function showBrowserNotification(title: string, body: string, onClick?: () => void) {
  if (!isBrowserNotificationSupported()) return;
  if (Notification.permission !== "granted") return;

  const notif = new Notification(title, {
    body,
    icon: "/favicon.ico",
    tag: "invoice-reminder", // Prevents duplicate OS notifications
  });

  if (onClick) {
    notif.onclick = () => {
      window.focus();
      onClick();
      notif.close();
    };
  }
}
```

### 4. Update `next.config.ts` if needed

Check if `experimental.instrumentationHook` is needed. In Next.js 14.1+, instrumentation is stable -- no experimental flag needed. Verify by checking the Next.js version:

```bash
cat package.json | grep '"next"'
```

If version >= 14.1, no config change needed.

## Todo List

- [x] Create `src/lib/notifications/deadline-scheduler.ts`
- [x] Create `src/instrumentation.ts`
- [x] Create `src/lib/notifications/browser-notifications.ts`
- [x] Check Next.js version for instrumentation support
- [x] Update `next.config.ts` if needed
- [x] Test scheduler runs on `npm run dev`
- [x] Fix HMR double-start with globalThis guard (M2 post-review)

## Success Criteria

- [x] Console logs `[deadline-scheduler] Starting...` on server boot (once only)
- [x] Pending invoices past due date get auto-updated to "overdue"
- [x] AppNotification records created for due-soon and overdue invoices
- [x] No duplicate notifications for same invoice within 24h
- [x] `browser-notifications.ts` exports work in client components
- [x] Server does not crash if DB is empty or scheduler hits error

## Implementation Summary

**3 Modules Created:**
- `deadline-scheduler.ts` - Hourly scheduler checks due-soon (7-day window) and overdue invoices, respects customDeadline, creates notifications, deduplicates by invoice ID + type in 24h window
- `instrumentation.ts` - Next.js boot hook that calls startDeadlineScheduler
- `browser-notifications.ts` - Client-side helper for Notification API with permission request

**Post-Review Fixes Applied:**
- **C2 Fix:** Updated scheduler overdue logic to respect `customDeadline` using OR logic: `customDeadline < now || (customDeadline IS NULL AND dueDate < now)`
- **M2 Fix:** Changed HMR guard from module-level `let started = false` to `globalThis.__deadline_scheduler_started` to prevent duplicate setInterval during dev restarts
- Deduplication checks metadata contains invoice ID within 24-hour window

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| HMR restarts double scheduler | Medium | Module-level `started` guard |
| Long-running query blocks server | Low | Limit query results, add LIMIT clause |
| Notification spam | Medium | 24h deduplication window |
| instrumentation.ts not picked up | Low | Verify file location matches Next.js convention |

## Security Considerations

- Scheduler runs server-side only, no client exposure
- Browser notifications require explicit user permission (gesture-triggered)
- No sensitive data in notification titles/messages -- only invoice numbers and customer names

## Next Steps

- Phase 5 will consume `browser-notifications.ts` and poll the notification API
