# Code Review: Services & API Routes (Deploy-test Branch)

**Date**: 2026-03-08
**Reviewer**: code-reviewer
**Branch**: Deploy-test (cf115c8..5ef7f43)
**Scope**: 11 files -- backend services, API routes, notification logic

---

## Overall Assessment

Solid implementation with good security practices (timing-safe cron auth, HTML escaping in emails, Zod validation on API routes, template override whitelisting). Modularization of beneficiary helpers is clean. The deadline notification system is well-structured with dedup logic. A few issues need attention, mostly around edge cases in the deadline check loop and missing index for dedup performance.

---

## Critical Issues

### C1. N+1 Overdue Notification Loop -- Sends Emails to ALL Overdue Invoices Every Run

**File**: `src/lib/notifications/deadline-check-logic.ts:98-131`

After `markOverdue()`, the code fetches ALL invoices with `status: "overdue"` and loops over them. The dedup only covers last 24h of notifications. Any invoice overdue for >24h gets a NEW notification + email every single run (hourly by default).

**Impact**: Customer email spam. An invoice overdue for 30 days = ~720 emails.

**Fix**: Either (a) only process newly-marked-overdue invoices (use the IDs from `markOverdue` result), or (b) track `lastNotifiedAt` per invoice and skip if recently notified, or (c) extend dedup window to match the scheduler interval (e.g., check if ANY notification exists for that invoice, not just last 24h).

```ts
// Option (a): Only process newly overdue
// Change markOverdue() to return the IDs it updated, then filter
// Option (c): Broader dedup -- check existence of ANY prior notification
const recentNotifs = await prisma.appNotification.findMany({
  where: {
    type: { in: ["invoice_due_soon", "invoice_overdue"] },
    // Remove the 24h filter for overdue type
  },
  select: { type: true, metadata: true },
});
```

### C2. `markOverdue()` Returns `{ count }` But Not Invoice IDs

**File**: `src/services/invoice.service.ts:270-282`

`prisma.updateMany` returns `{ count }` only. The deadline check logic has no way to know WHICH invoices were just marked overdue. Combined with C1, this means the overdue loop re-processes all overdue invoices.

**Fix**: Either use a raw query returning IDs, or query for newly-overdue invoices separately (e.g., invoices updated in last few minutes with status "overdue").

---

## High Priority

### H1. Due-Soon Filter Logic Has Redundant In-Loop Check

**File**: `src/lib/notifications/deadline-check-logic.ts:62-63`

The Prisma query already filters `lte: sevenDaysFromNow, gt: now`, but line 63 re-checks `if (effectiveDate > sevenDaysFromNow || effectiveDate <= now) continue`. The `customDeadline ?? dueDate` logic in the loop doesn't perfectly mirror the OR query -- e.g., an invoice with `customDeadline = null` and `dueDate` in range is fetched, but if `customDeadline` were non-null and out of range, it could still be fetched via the second OR branch. The query is correct, but the re-check is a defensive redundancy that masks a possible logic mismatch. Harmless but worth documenting the intent.

### H2. `getCustomerSummary()` Loads Entire Customer + Loan + Disbursement + Invoice Graph

**File**: `src/services/invoice.service.ts:286-338`

Eagerly loads ALL customers with ALL nested relations. For a growing database this will become slow and memory-heavy.

**Fix**: Use Prisma `groupBy` or raw SQL aggregation instead of loading full objects.

### H3. `fullUpdate` Deletes All Beneficiary Lines Then Recreates

**File**: `src/services/disbursement.service.ts:231-258`

Cascade-deletes beneficiary lines (and their invoices via DB relation). This means ANY invoices previously linked to beneficiaries are destroyed on disbursement edit. If an invoice had status "paid", it's silently deleted.

**Impact**: Data loss on edit. User edits disbursement beneficiary amounts, loses all existing paid invoices.

**Fix**: Add check before delete -- if any linked invoices have `status !== "pending"`, warn or prevent the operation.

### H4. Missing DB Index for Notification Dedup Query

**File**: `src/lib/notifications/deadline-check-logic.ts:32-37`

The dedup query filters by `type IN (...)` and `createdAt >= ...`. There's an index on `type` and one on `readAt`, but no composite index on `(type, createdAt)`. As notification volume grows, this query slows.

**Fix**: Add `@@index([type, createdAt])` to AppNotification model.

---

## Medium Priority

### M1. DRY Violation: Email Template HTML Duplicated

**File**: `src/services/email.service.ts:70-84` and `103-117`

`sendInvoiceReminder` and `sendInvoiceOverdue` share 90% identical HTML. Only the heading, subject, and one extra paragraph differ.

**Fix**: Extract shared HTML builder function, parameterize heading/color/extra text.

### M2. Invoice Status Not Validated Against Enum

**File**: `src/services/invoice.service.ts:251`

`input.status` is `string` -- no validation against allowed values (`pending`, `paid`, `overdue`). Any arbitrary string can be saved.

**Fix**: Add status validation or use a Zod enum in the API route.

### M3. `disbursement-beneficiary-helpers.ts` Import Uses Relative Path for Service Type

**File**: `src/services/disbursement-beneficiary-helpers.ts:4`

`import type { BeneficiaryLineInput } from "./disbursement.service"` -- this creates a circular dependency risk (disbursement.service imports from helpers, helpers import type from disbursement.service). Currently safe because it's `type`-only import, but fragile.

**Fix**: Extract `BeneficiaryLineInput` to a shared types file.

### M4. `saveFromDraft` Uses `customer_name` for Upsert Match

**File**: `src/services/customer.service.ts:175-178`

Customer name is not unique in the schema, yet `findFirst` by name is used. Two customers with the same name would collide.

**Fix**: Consider using `customer_code` (which IS unique) for matching, or add a unique constraint on name.

### M5. Transporter Singleton Never Resets on Config Change

**File**: `src/services/email.service.ts:7-27`

If SMTP env vars change at runtime (e.g., hot reload in dev), the cached transporter keeps old config. Minor in production but confusing in development.

---

## Low Priority

### L1. `fmtDate` Duplicated Across Files

`email.service.ts:48-52`, `disbursement-report.service.ts:26-34`, `invoice-tracking-format-helpers.ts:35-43` -- three implementations of dd/mm/yyyy formatting. Could share from format-helpers.

### L2. `addOneMonthClamped` Already Fixed

Previous review flagged the month-clamping issue. Current implementation at `invoice-tracking-format-helpers.ts:47-53` handles end-of-month correctly with `setDate(0)`. Good.

### L3. Cron Route Only Supports GET

**File**: `src/app/api/cron/invoice-deadlines/route.ts`

Only `GET` is exported, which is standard for Vercel Cron. Fine for current use.

---

## Positive Observations

1. **Security**: Timing-safe comparison for cron auth (`timingSafeEqual`) -- excellent practice
2. **Security**: HTML escaping (`esc()`) in email templates prevents XSS
3. **Security**: Email format validation with newline/CR injection prevention
4. **Security**: Template override whitelist (`ALLOWED_OVERRIDE_KEYS`) prevents arbitrary field injection
5. **Security**: Zod schema validation on customer API route with proper error handling
6. **Architecture**: Clean separation of `deadline-check-logic.ts` (shared) vs `deadline-scheduler.ts` (in-process) vs `route.ts` (cron) -- dual execution modes with mutual exclusion via `CRON_SECRET`
7. **Architecture**: `disbursement-beneficiary-helpers.ts` extraction is clean modularization
8. **Resilience**: Email service gracefully degrades when SMTP not configured (returns error, doesn't throw)
9. **Data integrity**: Beneficiary amount validation with tolerance (`Math.abs < 0.01`)
10. **Data integrity**: Transaction wrapping for disbursement create/fullUpdate with beneficiary lines

---

## Recommended Actions (Priority Order)

1. **[CRITICAL]** Fix overdue notification spam loop (C1) -- either track notified invoices or limit to newly-overdue only
2. **[HIGH]** Add safeguard in `fullUpdate` to prevent deleting non-pending invoices (H3)
3. **[HIGH]** Add composite index `@@index([type, createdAt])` on AppNotification (H4)
4. **[HIGH]** Optimize `getCustomerSummary` with aggregation query (H2)
5. **[MEDIUM]** Validate invoice status against enum (M2)
6. **[MEDIUM]** Extract shared email HTML builder (M1)
7. **[MEDIUM]** Move `BeneficiaryLineInput` to shared types (M3)

---

## Metrics

| Metric | Value |
|--------|-------|
| Files reviewed | 11 |
| Total LOC | ~750 |
| Critical issues | 2 |
| High issues | 4 |
| Medium issues | 5 |
| Low issues | 3 |
| Type coverage | Good (typed inputs/outputs, Zod on API) |
| Error handling | Good (try-catch, graceful degradation) |
| Security posture | Strong (timing-safe auth, input validation, XSS prevention) |

---

## Unresolved Questions

1. Is the 24h dedup window intentional for due-soon reminders (daily reminder until paid)?
2. Should `fullUpdate` preserve existing invoices or is the delete-recreate pattern by design?
3. Is there a plan to add rate limiting to the cron endpoint beyond secret auth?
