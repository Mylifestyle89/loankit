# Code Review: Invoice Tracking & Disbursement Feature

**Reviewer:** code-reviewer | **Date:** 2026-03-05
**Scope:** 4 services, 10 API routes, 2 notification modules, 9 UI components, 5 pages, schema, layout, i18n
**LOC:** ~1,800 new lines across 31 files

---

## Overall Assessment

Solid implementation that follows existing codebase patterns well. Services use `AppError` + `toHttpError` consistently, API routes mirror the `customers/` pattern, Zod validation is present on all write endpoints, and the Prisma schema has appropriate indexes. Three critical/major issues found, mostly around **performance** and **data integrity edge cases**.

---

## Critical Issues

### C1. Invoices Overview Page: Catastrophic N+1 Waterfall

**File:** `src/app/report/invoices/page.tsx` lines 68-91 (`loadAllInvoices`)

The function fetches ALL loans, then sequentially fetches disbursements for each loan, then sequentially fetches invoices for each disbursement. For a customer with 10 loans x 5 disbursements each, this fires **61 sequential HTTP requests** on every filter change.

```typescript
// PROBLEM: sequential waterfall
for (const loan of loansData.loans ?? []) {
  const disbRes = await fetch(`/api/loans/${loan.id}/disbursements`);
  for (const d of disbData.disbursements ?? []) {
    const invRes = await fetch(`/api/disbursements/${d.id}/invoices`);
    // ...
  }
}
```

**Fix:** The `invoiceService.listAll()` method already exists and supports `status` + `customerId` filters. Create a dedicated API route `/api/invoices` that exposes `listAll`:

```typescript
// src/app/api/invoices/route.ts (NEW)
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const customerId = req.nextUrl.searchParams.get("customerId") ?? undefined;
  const invoices = await invoiceService.listAll({ status, customerId });
  return NextResponse.json({ ok: true, invoices });
}
```

Then the page becomes a single fetch. **Severity: Critical** -- current approach will hang or timeout with moderate data.

---

### C2. Scheduler Overdue Logic Ignores `customDeadline`

**File:** `src/lib/notifications/deadline-scheduler.ts` lines 66-73

The "due soon" check (line 39) correctly uses `inv.customDeadline ?? inv.dueDate`, but the overdue query (line 66-73) only filters on `dueDate`:

```typescript
// Overdue query misses customDeadline
const overdue = await prisma.invoice.findMany({
  where: { status: "pending", dueDate: { lt: now } },
```

Meanwhile, `invoiceService.markOverdue()` (invoice.service.ts lines 176-188) correctly handles both `customDeadline` and `dueDate` with an `OR` clause, but it is **never called** -- the scheduler duplicates the logic inline without using it.

**Fix:** Replace the inline overdue query+update in the scheduler with a call to `invoiceService.markOverdue()`, then separately query for newly-overdue invoices for notifications. Or align the inline query to match the service method's logic.

**Impact:** Invoices with a `customDeadline` in the past but `dueDate` in the future will never be marked overdue by the scheduler.

---

## Major Issues

### M1. Scheduler `metadata: { contains: inv.id }` -- False Positive Deduplication

**File:** `src/lib/notifications/deadline-scheduler.ts` lines 43-49, 81-88

The deduplication uses `{ contains: inv.id }` on the JSON string. CUID IDs (e.g., `cm2abc123`) are 25 chars and collision-resistant, but if an invoice ID happens to be a prefix/substring of another ID in the metadata JSON, deduplication would incorrectly suppress notifications.

**More practically:** If the metadata JSON contains multiple fields and a CUID appears in a different field, it would match. Example: `metadata: '{"invoiceId":"cm2abc","customerId":"cm2abc..."}'`.

**Suggested fix:** Use structured JSON search or include the field name in the contains pattern:

```typescript
metadata: { contains: `"invoiceId":"${inv.id}"` }
```

**Severity: Major** -- low probability with CUIDs but violates correctness guarantees.

### M2. Scheduler HMR Guard Uses Module-Level Variable

**File:** `src/lib/notifications/deadline-scheduler.ts` line 8

```typescript
let started = false;
```

During Next.js HMR in development, module re-evaluation resets `started` to `false`, causing multiple scheduler instances (duplicate `setInterval` timers). The `instrumentation.ts` approach (`register()`) mitigates this somewhat since Next.js calls `register()` once, but module-level state can still be reset.

**Fix:** Attach the guard to `globalThis`:

```typescript
const KEY = "__deadline_scheduler_started";
export function startDeadlineScheduler() {
  if ((globalThis as any)[KEY]) return;
  (globalThis as any)[KEY] = true;
  // ...
}
```

**Severity: Major in dev** -- duplicate timers cause redundant DB queries and duplicate notifications.

### M3. No Validation for `loanAmount`, `interestRate`, `startDate > endDate`

**File:** `src/services/loan.service.ts` lines 53-68

- `loanAmount` is validated as `z.number().positive()` in the route schema but the service itself only validates `contractNumber`. If the service is called directly (e.g., from scheduler or future code), negative amounts pass.
- No validation that `startDate < endDate`
- `new Date(input.startDate)` with invalid strings produces `Invalid Date` silently

**Fix:** Add service-level validation:

```typescript
if (input.loanAmount <= 0) throw new ValidationError("loanAmount must be positive.");
const start = new Date(input.startDate);
const end = new Date(input.endDate);
if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new ValidationError("Invalid date format.");
if (start >= end) throw new ValidationError("startDate must be before endDate.");
```

Same applies to `disbursement.service.ts` (no date validation) and `invoice.service.ts` (no `issueDate < dueDate` check).

### M4. Loan Delete Has No Cascade Safety Check

**File:** `src/services/loan.service.ts` line 89

The schema uses `onDelete: Cascade`, so deleting a loan cascades to all disbursements and invoices. The delete endpoint has no confirmation or child-count check. A single DELETE request wipes an entire loan tree silently.

**Suggested fix:** Add a pre-delete check warning:

```typescript
async delete(id: string) {
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: { _count: { select: { disbursements: true } } },
  });
  if (!loan) throw new NotFoundError("Loan not found.");
  if (loan._count.disbursements > 0) {
    throw new ValidationError(`Cannot delete: loan has ${loan._count.disbursements} disbursement(s). Delete them first or use force=true.`);
  }
  await prisma.loan.delete({ where: { id } });
}
```

---

## Minor Issues

### m1. `notification.service.ts` Stores Metadata as `JSON.stringify()` String

**File:** `src/services/notification.service.ts` line 27

The `metadata` field is `String?` in the schema, and the service stringifies the object. This works but makes querying awkward (requires `contains` substring matching). Consider using a proper JSON column if the DB supports it, or keep the trade-off documented.

### m2. `InvoiceFormModal` Allows `amount: 0`

**File:** `src/components/invoice-tracking/invoice-form-modal.tsx` line 92

```html
<input type="number" required min="0" step="any" ...>
```

`min="0"` allows zero-value invoices. The Zod schema requires `z.number().positive()` which rejects 0, so the server will reject it, but the UX could be confusing. Change to `min="0.01"` or `min="1"`.

### m3. Hardcoded Vietnamese String in `NotificationBell`

**File:** `src/components/invoice-tracking/notification-bell.tsx` line 52

```tsx
<motion.span ...>Thong bao</motion.span>
```

Should use `t("notifications.title")` for i18n consistency.

### m4. `DisbursementFormModal` Amount Also Allows Zero

Same as m2 -- `min="0"` should be `min="0.01"`.

### m5. Missing Error Handling on `handleMarkPaid` / `handleDeleteInvoice`

**File:** `src/app/report/disbursements/[id]/page.tsx` lines 69-76, 78-82

These fire-and-forget without checking `data.ok`. If the PATCH/DELETE fails, the user sees no error feedback and the page just reloads stale data.

```typescript
// No error handling
async function handleMarkPaid(invoiceId: string) {
  await fetch(`/api/invoices/${invoiceId}`, { method: "PATCH", ... });
  void loadData(); // no check if PATCH succeeded
}
```

### m6. `useNotificationStore.markRead` Does Not Handle Errors

**File:** `src/components/invoice-tracking/use-notification-store.ts` lines 65-68

```typescript
markRead: async (id) => {
  await globalThis.fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
  // No error handling if notification ID doesn't exist
```

### m7. No Pagination on Invoice/Loan List Endpoints

Services like `loanService.list()` and `invoiceService.listAll()` return all records with no `skip`/`take`. Fine for small datasets but will degrade.

---

## Suggestions

### S1. Extract Common API Route Pattern

All 10 routes follow the same try/catch + ZodError + toHttpError boilerplate. Consider a wrapper utility:

```typescript
export function apiHandler(fn: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    try { return await fn(req); }
    catch (error) {
      if (error instanceof z.ZodError) { ... }
      const httpError = toHttpError(error, "Request failed.");
      return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
    }
  };
}
```

### S2. Use `Decimal` Instead of `Float` for Money

**File:** `prisma/schema.prisma`

`Float` introduces floating-point precision issues for financial calculations. For a banking/loan system, `Decimal` (or storing amounts as integers in cents) is more appropriate. This is a design-level concern for a future migration.

### S3. Add `updatedAt` to `AppNotification`

Currently `AppNotification` lacks `updatedAt`. Minor, but useful for auditing notification state changes.

### S4. Consider Optimistic UI Updates

The notification store and invoice actions always refetch after mutations. For better UX, consider optimistic updates (update local state immediately, revert on error).

---

## Positive Observations

1. **Consistent error patterns** -- All routes use `toHttpError()` + `{ ok, error }` response shape matching existing codebase
2. **Schema design** -- Good use of indexes on `status`, `dueDate`, `customerId`, `loanId`, `disbursementId`; unique constraint on `[invoiceNumber, supplierName]`
3. **Duplicate detection** -- Non-blocking approach (warn but still create) is a good UX decision for bank workflows
4. **i18n coverage** -- Complete bilingual translation keys for all new UI text
5. **Dark mode support** -- All components have proper dark mode classes
6. **Surplus/deficit calculation** -- Clean implementation in `disbursementService.getSurplusDeficit()`
7. **Browser notification integration** -- Well-structured with permission request on first click, polling guard, browser notification API

---

## Summary Table

| # | Severity | Issue | File(s) |
|---|----------|-------|---------|
| C1 | Critical | N+1 waterfall in invoices overview (61+ requests) | invoices/page.tsx |
| C2 | Critical | Scheduler overdue logic ignores customDeadline | deadline-scheduler.ts |
| M1 | Major | Metadata substring dedup can false-positive | deadline-scheduler.ts |
| M2 | Major | HMR causes duplicate scheduler timers | deadline-scheduler.ts |
| M3 | Major | Missing service-level date/amount validation | loan/disbursement/invoice services |
| M4 | Major | Cascade delete with no safety check | loan.service.ts |
| m1 | Minor | Metadata stored as stringified JSON | notification.service.ts |
| m2 | Minor | Form allows zero amount | invoice-form-modal.tsx |
| m3 | Minor | Hardcoded Vietnamese in NotificationBell | notification-bell.tsx |
| m4 | Minor | DisbursementForm allows zero amount | disbursement-form-modal.tsx |
| m5 | Minor | No error handling on mark-paid/delete | disbursements/[id]/page.tsx |
| m6 | Minor | No error handling on markRead | use-notification-store.ts |
| m7 | Minor | No pagination on list endpoints | services |
| S1 | Suggestion | Extract common API route wrapper | all routes |
| S2 | Suggestion | Use Decimal for money fields | schema.prisma |
| S3 | Suggestion | Add updatedAt to AppNotification | schema.prisma |
| S4 | Suggestion | Optimistic UI updates | stores/pages |

---

## Recommended Action Priority

1. **Fix C1** -- Create `/api/invoices/route.ts` with `GET` using `invoiceService.listAll()`. Refactor invoices overview page to use single fetch. (~15 min)
2. **Fix C2** -- Either call `invoiceService.markOverdue()` from scheduler or add `customDeadline` to the overdue query. (~10 min)
3. **Fix M2** -- Move `started` guard to `globalThis`. (~5 min)
4. **Fix M3** -- Add date validation in services. (~20 min)
5. **Fix M1** -- Improve metadata dedup query. (~5 min)
6. **Address m3** -- Use `t()` for hardcoded string. (~2 min)
7. **Address m5** -- Add error feedback to mutation handlers. (~15 min)

---

## Unresolved Questions

1. Is there a reason `invoiceService.listAll()` exists but has no API route? Was this intentional or an oversight?
2. Should `Float` to `Decimal` migration for money fields happen now or be deferred to a future phase?
3. Is the scheduler's hourly interval appropriate, or should it be configurable via env var?
