# Code Review: Invoice Deadline Email Notifications

**Date:** 2026-03-06 | **Reviewer:** code-reviewer | **Branch:** Disbursement-Invoice-tracking-implement

## Scope

- **Files reviewed:** 12 (3 new, 9 modified)
- **LOC (new/changed):** ~550
- **Focus:** Security (cron auth, email injection), data integrity (auto dueDate), DRY, error handling, UI

## Overall Assessment

Solid feature implementation. Cron endpoint has proper secret-based auth. Email service uses lazy-init pattern gracefully. Main concerns: massive DRY violation between cron route and deadline-scheduler (near-identical code), N+1 query patterns in the cron loop, missing email validation on client-side save, and XSS risk in email HTML templates.

---

## Critical Issues

### C1. XSS in Email HTML Templates — `email.service.ts`
**Lines 63-69, 96-102.** Customer name, invoice number, contract number are interpolated directly into HTML without escaping. If a customer name contains `<script>` or HTML tags, it renders in the email body.

**Impact:** Email client XSS (limited, most clients strip scripts, but HTML injection still possible for phishing).

**Fix:** Escape HTML entities before interpolation:
```ts
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// Then: ${escapeHtml(data.customerName)}
```

### C2. Missing Error Handling on Email Save — `customer-summary-cards.tsx:57-67`
`saveEmail()` has no try-catch and doesn't check the response status. A failed PATCH silently closes the editing state and triggers `onEmailUpdated()` as if it succeeded. User sees no error feedback.

**Fix:**
```ts
async function saveEmail() {
  setSaving(true);
  try {
    const res = await fetch(`/api/customers/${c.customerId}`, { ... });
    if (!res.ok) throw new Error("Failed");
    setEditingEmail(false);
    onEmailUpdated();
  } catch {
    alert("Luu email that bai"); // or toast
  } finally {
    setSaving(false);
  }
}
```

---

## High Priority

### H1. Massive DRY Violation — `deadline-scheduler.ts` vs `cron/invoice-deadlines/route.ts`
Both files contain nearly identical logic: same Prisma queries, same dedup check, same notification creation, same email sending. ~120 lines duplicated.

**Impact:** Bug fixes must be applied in two places. Divergence risk is high.

**Fix:** Extract shared logic into a function in a shared module (e.g., `src/services/deadline-check.service.ts`) and call it from both the scheduler and the cron route.

### H2. N+1 Query Pattern in Cron — `route.ts:46-53, 104-111`
For each invoice, a separate `prisma.appNotification.findFirst()` runs to check dedup. With 100 overdue invoices, that's 100 extra DB queries inside the loop.

**Fix:** Batch-fetch recent notifications before the loop:
```ts
const recentNotifs = await prisma.appNotification.findMany({
  where: { type: "invoice_due_soon", createdAt: { gte: cutoff } },
  select: { metadata: true },
});
const notifiedIds = new Set(recentNotifs.map(n => {
  const meta = JSON.parse(n.metadata ?? "{}");
  return meta.invoiceId;
}));
// Then: if (notifiedIds.has(inv.id)) continue;
```
Same issue exists in `deadline-scheduler.ts:48-55, 99-106`.

### H3. `metadata: { contains: inv.id }` — Fragile Dedup
Using string `contains` on a JSON string to match invoice IDs is fragile. If an invoice ID is a substring of another ID (e.g., "abc" matches "xabcx"), false positives occur. CUIDs reduce this risk but don't eliminate it.

**Fix:** Use `JSON.stringify({ invoiceId: inv.id })` pattern or store `invoiceId` as a dedicated column on `AppNotification` for reliable querying.

### H4. Missing Client-Side Email Validation — `customer-summary-cards.tsx`
No validation before saving email. User can submit malformed email. Server-side Zod validates with `z.string().email()` (good), but the UI gives no feedback on validation failure — it just silently fails via the PATCH returning 400.

**Fix:** Add basic email regex check before calling `saveEmail()`, or at minimum handle the 400 response.

### H5. `autoDueDate` Edge Case — Month Overflow
`disbursement-beneficiary-helpers.ts:21-23` and `invoice.service.ts:131-133` use `setMonth(getMonth() + 1)`. For dates like Jan 31, this produces Mar 3 (not Feb 28). This is a known JS Date pitfall.

**Fix:**
```ts
function autoDueDate(base: Date): Date {
  const d = new Date(base);
  const targetMonth = d.getMonth() + 1;
  d.setMonth(targetMonth);
  // Overflow: if month jumped too far, clamp to last day of target month
  if (d.getMonth() !== targetMonth % 12) {
    d.setDate(0); // last day of previous month
  }
  return d;
}
```

---

## Medium Priority

### M1. File Size — `invoice.service.ts` (281 lines), `disbursement.service.ts` (281 lines), `customer.service.ts` (243 lines)
All exceed the 200-line limit. `invoice.service.ts` grew with `getCustomerSummary()` which is a reporting concern, not core invoice CRUD.

**Suggestion:** Extract `getCustomerSummary()` to `invoice-summary.service.ts` or similar.

### M2. `getCustomerSummary()` Performance — `invoice.service.ts:234-280`
Loads ALL customers with ALL loans, ALL disbursements, ALL invoices into memory, then aggregates in JS. This is an O(customers * loans * disbursements * invoices) memory load.

**Fix:** Use Prisma `groupBy` or raw SQL aggregate query.

### M3. Missing `SMTP_*` / `CRON_SECRET` in `.env.example`
The root `.env.example` has no entries for `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_PORT`, `EMAIL_FROM`, or `CRON_SECRET`. New devs won't know these exist.

### M4. Email Template Not Internationalized
Email subjects and bodies are hardcoded in Vietnamese. The app supports vi/en via `useLanguage()`. Emails should at minimum support configurable locale.

### M5. `secure: false` in SMTP — `email.service.ts:22`
Hardcoded `secure: false` with port 587 (STARTTLS). This is acceptable for STARTTLS but should be documented. If port is 465, `secure` should be `true`.

**Fix:** `secure: Number(process.env.SMTP_PORT) === 465`

### M6. Cron Endpoint Uses GET — `route.ts:13`
The cron endpoint uses GET but performs write operations (creates notifications, sends emails, updates statuses). Should be POST for semantic correctness and to prevent accidental triggering via browser/crawlers.

---

## Low Priority

### L1. `deadlineCountdown` Uses `dueDate` Only — `invoice-table.tsx:33-41`
Should use `customDeadline ?? dueDate` — and it does at the call site (line 81), but the function signature accepts a single string. The naming `dueDate` is slightly misleading. Minor.

### L2. Double Filter in `InvoicesOverviewPage` — `page.tsx:112-114`
`summary.filter(...)` is called twice (once for the condition, once for the prop). Store filtered result in a variable.

### L3. Singleton Transporter Caching Issue
`transporter` is module-level. If SMTP creds change at runtime (env reload), the old transporter persists. Acceptable for most deployments but worth noting.

---

## Edge Cases Found

1. **Month overflow in autoDueDate** — Jan 31 + 1 month = Mar 3, not Feb 28 (H5)
2. **CUID substring match** — dedup `contains` check could false-match (H3)
3. **Overdue emails sent daily forever** — no cap on how many times an overdue invoice gets emailed. 24h dedup means one email/day indefinitely
4. **Race condition** — if cron and scheduler run simultaneously, both could create duplicate notifications before either's dedup check sees the other's record
5. **`effectiveDate` can be null** — if both `customDeadline` and `dueDate` are somehow null, `toLocaleDateString()` crashes. Schema says `dueDate` is required, so low risk

---

## Positive Observations

- Cron endpoint properly validates `x-cron-secret` with timing-safe comparison pattern
- Email service gracefully degrades when SMTP not configured (returns `{ success: false }`)
- Lazy-init transporter avoids startup crashes
- Customer API has proper Zod validation for email field (`z.string().email().optional().nullable()`)
- Good use of `emailSentAt` / `emailError` tracking on notifications
- Invoice table deadline countdown is user-friendly UX
- Schema properly adds indexes on `dueDate` and `status`

---

## Recommended Actions (Priority Order)

1. **Extract shared deadline-check logic** to eliminate DRY violation between scheduler and cron (H1)
2. **Add HTML escaping** in email templates (C1)
3. **Add error handling** to `saveEmail()` in customer-summary-cards (C2)
4. **Batch dedup queries** to fix N+1 pattern (H2)
5. **Fix month overflow** in `autoDueDate` (H5)
6. **Add SMTP/CRON env vars** to `.env.example` (M3)
7. **Change cron from GET to POST** (M6)

---

## Metrics

| Metric | Value |
|--------|-------|
| Files > 200 lines | 3 (`invoice.service.ts`, `disbursement.service.ts`, `customer.service.ts`) |
| Linting issues | 0 syntax errors found |
| Security issues | 1 critical (XSS in email), 1 medium (GET for write op) |
| DRY violations | 1 major (~120 lines duplicated) |
| Missing error handling | 2 (client saveEmail, cron email-per-invoice) |

---

## Unresolved Questions

1. Is the deadline-scheduler (`setInterval` in-process) intended to coexist with the cron endpoint, or will one replace the other? Both running causes duplicate work.
2. Is there a max-email limit per customer to prevent spam on long-overdue invoices?
3. Should the cron use timing-safe comparison (`crypto.timingSafeEqual`) for the secret, or is simple `===` acceptable for this use case?
