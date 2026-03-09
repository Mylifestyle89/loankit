# Code Review: Modularization + Invoice Deadline Email Notifications

**Reviewer**: code-reviewer | **Date**: 2026-03-06 | **Branch**: Disbursement-Invoice-tracking-implement
**Score**: 7.5 / 10 | **Recommendation**: Fix critical + high issues before commit

---

## Scope

- **Files**: 18 modified + 7 new = 25 files
- **LOC delta**: +322 / -400 (net reduction -- good)
- **Focus**: Full review of both features
- **TypeScript**: Compiles clean (0 errors)

## Overall Assessment

Solid modularization work (Feature A) and well-structured email notification system (Feature B). DRY improvements are meaningful. However, there are **1 critical** security issue, **3 high** priority issues, and several medium items that need attention before merge.

---

## Critical Issues

### C1. Cron secret comparison vulnerable to timing attack
**File**: `src/app/api/cron/invoice-deadlines/route.ts:11`
**Problem**: `secret !== expected` uses JavaScript string comparison, which is vulnerable to timing-based side-channel attacks. The codebase already uses `crypto.timingSafeEqual` in `src/lib/report/file-token.ts`, so the pattern is established.

**Fix**:
```typescript
import { timingSafeEqual } from "node:crypto";

// Replace line 11
if (!expected || !secret ||
    !timingSafeEqual(Buffer.from(secret), Buffer.from(expected))) {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}
```

---

## High Priority

### H1. N+1 query pattern in deadline-check-logic.ts (dedup check)
**File**: `src/lib/notifications/deadline-check-logic.ts:43-55, 92-100`
**Problem**: For each invoice in `dueSoon` and `overdue` arrays, a separate `prisma.appNotification.findFirst()` runs. With 100 invoices, that's 200 extra DB queries. SQLite handles this OK at small scale but degrades fast.

**Suggested fix**: Batch-fetch recent notifications for all invoice IDs upfront:
```typescript
const recentNotifs = await prisma.appNotification.findMany({
  where: {
    type: "invoice_due_soon",
    createdAt: { gte: new Date(now.getTime() - TWENTY_FOUR_HOURS) },
  },
  select: { metadata: true },
});
const notifiedIds = new Set(recentNotifs.map(n => {
  try { return JSON.parse(n.metadata ?? "{}").invoiceId; } catch { return null; }
}).filter(Boolean));
// Then: if (notifiedIds.has(inv.id)) continue;
```

### H2. No email validation in email.service.ts before sending
**File**: `src/services/email.service.ts:56-85`
**Problem**: The `to` parameter is passed directly to `nodemailer.sendMail()` without validation. While the customer API validates with Zod (`z.string().email()`), the `customer-summary-cards.tsx` UI also allows saving email via PATCH. If an attacker sends a crafted string like `victim@evil.com\nBCC: spam@attacker.com`, it could cause SMTP header injection.

**Fix**: Add basic validation in email service:
```typescript
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.includes('\n') && !email.includes('\r');
}
```
Then check before `sendMail`.

### H3. Race condition between scheduler and cron endpoint
**File**: `src/lib/notifications/deadline-scheduler.ts` + `src/app/api/cron/invoice-deadlines/route.ts`
**Problem**: Both call `runDeadlineCheck()`. If the hourly scheduler fires at the same moment a cron HTTP request arrives, two concurrent runs could create duplicate notifications (the 24h dedup check has a window where both read "no recent notif" before either writes one).

**Suggested fix**: Either (a) remove the in-process scheduler when using the cron endpoint, or (b) add a simple lock (e.g., a `globalThis.__deadline_running__` flag checked at start of `runDeadlineCheck`). Option (a) is simpler and recommended.

---

## Medium Priority

### M1. `handleMarkPaid` missing error handling
**File**: `src/app/report/invoices/page.tsx:75-82`
**Problem**: `fetch` result not checked -- if API returns error, user sees no feedback.
```typescript
async function handleMarkPaid(invoiceId: string) {
  const res = await fetch(...);
  const data = await res.json();
  if (!data.ok) { /* show error toast */ }
  void loadData();
}
```

### M2. `dueDate` fallback to `issueDate` when no disbursement found
**File**: `src/services/disbursement-beneficiary-helpers.ts:58`
**Problem**: `dueDate: disbursementDate ? autoDueDate(disbursementDate) : new Date(inv.issueDate)` -- fallback sets dueDate = issueDate, meaning the invoice is immediately overdue. Should at minimum be issueDate + 1 month.

### M3. `emailValue` state not synced when customer prop changes
**File**: `src/components/invoice-tracking/customer-summary-cards.tsx:54`
**Problem**: `useState(c.customerEmail ?? "")` captures initial value only. If parent re-fetches data and `c.customerEmail` changes, the input won't update. Need a `useEffect` to sync.

### M4. Missing `role="dialog"` and `aria-modal` on DisbursementFormModal
**File**: `src/components/invoice-tracking/disbursement-form-modal.tsx:257`
**Problem**: Custom modal missing accessibility attributes. This is a known pattern issue in the codebase (per previous review). The `BaseModal` component exists at `src/components/ui/BaseModal.tsx` but isn't used here.

### M5. Duplicate `autoDueDate` logic
**Files**: `src/services/disbursement-beneficiary-helpers.ts:20-27` AND `src/services/invoice.service.ts:131-134`
**Problem**: Same month-clamping logic duplicated. Extract to a shared util in `invoice-tracking-format-helpers.ts`.

### M6. `getCustomerSummary` fetches ALL customers with ALL nested data
**File**: `src/services/invoice.service.ts:236-282`
**Problem**: Loads every customer with all loans, disbursements, and invoices. No pagination. With 50 customers averaging 10 loans with 5 disbursements each, this is a lot of data. Consider using Prisma `_count` aggregation or SQL raw query.

---

## Low Priority

### L1. `disbursement-form-modal.tsx` still 391 LOC (over 200-line guideline)
Good reduction from 562, but still nearly 2x the target. The form body (lines 256-389) could be a separate component.

### L2. `loan-edit-modal.tsx` redefines `inputCls`/`labelCls` locally (lines 35-37)
These are now available from `form-styles.ts` but not imported here. Minor DRY issue.

### L3. `fmtDate` duplicated across `email.service.ts`, `disbursement-report.service.ts`, `invoice-tracking-format-helpers.ts`
Three separate implementations of the same dd/mm/yyyy formatter.

---

## Edge Cases Found by Scout

1. **Empty `beneficiaryLines` in DOCX report**: Handled correctly via `.filter()` at line 166 and 177 of `disbursement-report.service.ts`
2. **Null `dueDate` in `deadlineCountdown`**: If `inv.dueDate` is somehow null, `new Date(null)` returns epoch, causing misleading "Qua han X ngay". Type system prevents this at compile time but runtime data from API could mismatch.
3. **`autoDueDate(Jan 31)` edge case**: Jan 31 + 1 month = Feb 28/29. Code handles via `setDate(0)` trick -- correct.
4. **Concurrent email sends**: No rate limiting on email service. If 100 invoices are due, 100 emails fire sequentially (acceptable for now but could hit SMTP rate limits).
5. **`metadata: { contains: inv.id }`** in dedup check: This is a string `contains` search on JSON metadata. If one invoice ID is a substring of another (e.g., `cl_abc` matching `cl_abcdef`), false dedup could occur. Use exact JSON match instead.

---

## Positive Observations

1. Good modularization: `BeneficiarySection`, `form-styles.ts`, `disbursement-beneficiary-helpers.ts` -- clean separation
2. DRY: `deadline-check-logic.ts` shared between scheduler and cron -- well done
3. Zod validation on customer PATCH endpoint -- proper input validation
4. HTML escaping in email templates via `esc()` function
5. Lazy SMTP init prevents crash when env vars missing
6. Beneficiary amount validation with tolerance (±0.01 for float precision)
7. DOCX template override whitelist (security-conscious)

---

## Recommended Actions (Priority Order)

1. **[CRITICAL]** Fix timing-safe comparison in cron route
2. **[HIGH]** Batch notification dedup queries to eliminate N+1
3. **[HIGH]** Add email format validation in email.service before sendMail
4. **[HIGH]** Decide: remove in-process scheduler OR add mutex lock for concurrent runs
5. **[MEDIUM]** Add error handling to `handleMarkPaid`
6. **[MEDIUM]** Fix `dueDate` fallback to issueDate + 1 month
7. **[MEDIUM]** Sync `emailValue` state with prop changes
8. **[MEDIUM]** Extract shared `autoDueDate` to one location
9. **[LOW]** Import `form-styles` in `loan-edit-modal.tsx`
10. **[LOW]** Consolidate `fmtDate` implementations

---

## Metrics

| Metric | Value |
|--------|-------|
| TypeScript errors | 0 |
| Critical issues | 1 |
| High issues | 3 |
| Medium issues | 6 |
| Low issues | 3 |
| New files well-structured | 7/7 |
| DRY improvement | Significant |

---

## Unresolved Questions

1. Is the in-process `deadline-scheduler` still needed now that cron endpoint exists? If external cron (e.g., Vercel cron, crontab) is the plan, the scheduler can be removed entirely -- simplifying the race condition issue.
2. What SMTP rate limits apply? If using Gmail SMTP, the 500/day limit could be hit quickly with many overdue invoices.
3. Should `getCustomerSummary` be paginated or cached? Current implementation loads everything on every page load.
