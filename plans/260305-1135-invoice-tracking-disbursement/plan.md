---
title: "Disbursement Invoice Tracking"
description: "Track invoices per disbursement with deadline reminders, surplus/deficit, duplicate detection, and in-app notifications"
status: complete
priority: P1
effort: 16h
branch: OnlyOffice-implement
tags: [disbursement, invoice, notification, prisma, next.js]
created: 2026-03-05
completed: 2026-03-05
---

# Disbursement Invoice Tracking

## Summary

Add ability to track invoices per disbursement, detect duplicates, calculate surplus/deficit, remind before deadlines, and display in-app notifications with browser push support.

## Architecture Overview

- **DB**: 4 new Prisma models (Loan, Disbursement, Invoice, AppNotification) on SQLite
- **Services**: `loan.service.ts`, `disbursement.service.ts`, `invoice.service.ts`, `notification.service.ts`
- **API**: 10 new route files following existing `{ ok: true/false }` envelope pattern
- **Scheduler**: `instrumentation.ts` + `deadline-scheduler.ts` for hourly deadline checks + auto overdue marking
- **UI**: 3 new page groups (`/report/loans`, `/report/disbursements/[id]`, `/report/invoices`), notification bell in layout
- **Stores**: `use-notification-store.ts` for polling + badge state

## Phases

| # | Phase | Status | Effort | File |
|---|-------|--------|--------|------|
| 1 | Database Schema (Loan + Disbursement + Invoice + Notification) | complete | 2h | [phase-01](./phase-01-database-schema.md) |
| 2 | Services + API Routes | complete | 4h | [phase-02](./phase-02-services-api.md) |
| 3 | Notification System | complete | 3h | [phase-03](./phase-03-notification-system.md) |
| 4 | UI Pages (Loan + Disbursement + Invoice) | complete | 5h | [phase-04](./phase-04-ui-pages.md) |
| 5 | Notification UI (Bell + Center) | complete | 2h | [phase-05](./phase-05-notification-ui.md) |

## Dependencies

- Phase 2 depends on Phase 1 (schema must exist before services)
- Phase 3 depends on Phase 2 (notification service creates records via invoice service)
- Phase 4 depends on Phase 2 (pages call API routes)
- Phase 5 depends on Phase 3 (bell reads notification API)

## Key Decisions

1. **No service worker** -- Browser Notification API direct call, no SW overhead
2. **Polling over WebSocket** -- 60s `setInterval` for notification count, simple for SQLite
3. **instrumentation.ts** for scheduler boot -- Next.js built-in, runs once on server start
4. **Duplicate = invoiceNumber + supplierName** -- different suppliers can have same invoice number
5. **Duplicate detection is non-blocking** -- returns warning + confirmation dialog, does not auto-prevent save
6. **Custom deadline** stored per invoice -- separate from `dueDate`, optional override
7. **Overdue auto-update** -- scheduler marks invoices as overdue automatically
8. **Loan model** -- Customer → Loan → Disbursement → Invoice (4-level hierarchy)

## Post-Review Fixes Applied

### C1: N+1 Waterfall in Invoices Overview
**Fixed:** Created `/api/invoices/route.ts` with single `GET` endpoint exposing `invoiceService.listAll()`. Rewrote `src/app/report/invoices/page.tsx` to eliminate sequential waterfall. Changed from 61+ requests to 1 API call. **Status: COMPLETE**

### C2: Scheduler Ignores `customDeadline` in Overdue Logic
**Fixed:** Updated `src/lib/notifications/deadline-scheduler.ts` to respect `customDeadline` in both due-soon and overdue deadline checks. Overdue query now uses `OR` logic: `customDeadline < now || (customDeadline IS NULL AND dueDate < now)`. **Status: COMPLETE**

### M2: HMR Guard Using Module-Level Variable
**Fixed:** Changed `src/lib/notifications/deadline-scheduler.ts` from module-level `let started = false` to `globalThis.__deadline_scheduler_started` key. Prevents duplicate `setInterval` timers during Next.js HMR restarts. **Status: COMPLETE**

### m3: Hardcoded Vietnamese String in NotificationBell
**Fixed:** Updated `src/components/invoice-tracking/notification-bell.tsx` to use `t("notifications.title")` instead of hardcoded "Thong bao". **Status: COMPLETE**

### TypeScript Compilation
**Verified:** `tsc --noEmit` passes on all 31 new files. **Status: PASS**
