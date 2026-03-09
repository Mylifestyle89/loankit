# Code Review: Disbursement Invoice Tracking (3 commits)

**Branch:** `Disbursement-Invoice-tracking-implement`
**Range:** `1b640a8..e205cf8` (3 commits, 10 code files)
**Date:** 2026-03-06

## Scope

| File | LOC | Focus |
|------|-----|-------|
| `src/services/invoice.service.ts` | 267 | Auto-recalc beneficiary status on CRUD |
| `src/services/disbursement-report.service.ts` | 253 | DOCX report generation, template mapping |
| `src/app/report/loans/[id]/page.tsx` | 421 | Loan detail page with disbursement table |
| `src/components/invoice-tracking/add-invoice-from-loan-modal.tsx` | 148 | Quick invoice creation from loan detail |
| `src/components/invoice-tracking/disbursement-report-modal.tsx` | 226 | Template selection + override fields + download |
| `src/app/api/disbursements/[id]/invoices/route.ts` | 55 | Invoice CRUD API route |
| `src/app/api/loans/[id]/disbursements/[disbursementId]/report/route.ts` | 36 | Report generation API route |
| `src/lib/number-to-vietnamese-text.ts` | 80 | Number-to-words converter #1 |
| `src/lib/number-to-vietnamese-words.ts` | 81 | Number-to-words converter #2 |
| `src/lib/i18n/translations.ts` | ~46 new keys | i18n additions |

---

## Critical Issues

### C1. Duplicate number-to-Vietnamese-words modules (DRY violation)

**Files:** `number-to-vietnamese-text.ts` and `number-to-vietnamese-words.ts`

Two nearly identical files doing the same thing: converting numbers to Vietnamese currency text. Both have the same DIGITS array, same group-splitting logic, same capitalization. `number-to-vietnamese-text.ts` is used by `disbursement-form-modal.tsx`, while `number-to-vietnamese-words.ts` is used by `disbursement-report.service.ts`.

**Impact:** Maintenance burden, divergent behavior over time. They already differ slightly in edge case handling (negative numbers, `Math.round` vs `Math.floor`).

**Fix:** Delete one, keep `number-to-vietnamese-words.ts` (more complete with `suffix` param). Update all imports.

### C2. Path traversal risk in report generation

**File:** `disbursement-report.service.ts` line 203-210

```ts
const tmpDir = path.join(process.cwd(), "report_assets", "generated");
const tmpFile = path.join(tmpDir, `report-${ts}.docx`);
```

Template paths come from a hardcoded registry (safe), but the `overrides` dict from user input is merged directly into `data` without key sanitization:

```ts
if (overrides) {
  for (const [key, val] of Object.entries(overrides)) {
    if (val !== undefined && val !== "") {
      data[key] = val;
    }
  }
}
```

While `z.record(z.string(), z.string())` ensures string values, override keys can overwrite ANY key in `data` including computed fields like `"GN.Hạn mức tín dụng"` or loop arrays (`UNC`, `HD`). A user could inject `{ "UNC": "garbage" }` and crash the docx engine or produce corrupted reports.

**Fix:** Whitelist override keys per template (already have `OVERRIDE_FIELDS` on frontend -- enforce the same whitelist server-side in `buildReportData`).

---

## High Priority

### H1. `recalcBeneficiaryStatus` has flawed logic

**File:** `invoice.service.ts` lines 6-19

Status is set to `"has_invoice"` if `invoices.length > 0`, regardless of whether invoice amount covers beneficiary amount. The UI (`BeneficiaryInvoiceBadge`) shows 3 states: "has_invoice" (green), partial (yellow, based on `invoiceAmount > 0`), "pending" (red). But the service only writes two values: `"has_invoice"` or `"pending"`.

The yellow "partial" state in the UI is derived from `invoiceAmount > 0` combined with status not being `has_invoice` -- but this state is impossible because any invoice creates `has_invoice` status. The partial badge is dead code.

**Fix:** Add a third status like `"partial"` when `totalAmount < beneficiaryLine.amount`, or change `has_invoice` logic to check if `totalAmount >= beneficiaryLine.amount`.

### H2. UNC template only generates for first beneficiary

**File:** `disbursement-report.service.ts` lines 232-250

```ts
const line = beneficiaryLines[0]; // Only first beneficiary
```

Comment says "future work" for zip, but this is a silent data loss scenario. User expects all beneficiaries printed but only gets the first.

**Fix:** At minimum, warn the user in the modal if there are multiple beneficiaries. Better: generate one DOCX per beneficiary or all in a zip.

### H3. `disbursement-report.service.ts` exceeds 200-line limit

File is 253 lines. Per project rules, files >200 lines should be modularized. `buildReportData` and `generateReport` + helpers could be split.

### H4. No error handling for failed fetch in `loadLoan` / `loadDisbursements`

**File:** `page.tsx` lines 143-168

Both `loadLoan` and `loadDisbursements` call `fetch()` without try-catch. Network errors throw uncaught promises. `loadDisbursements` doesn't even set an error state on failure.

```ts
const loadDisbursements = useCallback(async () => {
  setDisbLoading(true);
  const res = await fetch(...); // No try-catch
  const data = await res.json();
  if (data.ok) { ... }
  setDisbLoading(false); // Never reached on network error
}, ...);
```

**Fix:** Wrap in try-catch, show error state.

---

## Medium Priority

### M1. `handleChange` uses loose string keys

**File:** `add-invoice-from-loan-modal.tsx` line 38

```ts
const handleChange = (key: string, value: string) => {
  setForm((prev) => ({ ...prev, [key]: value }));
};
```

`key` should be typed as `keyof typeof form` to prevent typos.

### M2. `Number(form.amount)` could produce NaN

**File:** `add-invoice-from-loan-modal.tsx` line 56

User types non-numeric text into amount field (type="number" doesn't prevent paste of text). `Number("")` = 0, `Number("abc")` = NaN. Zod on server will catch `positive()`, but the UX is bad -- no client-side feedback.

**Fix:** Add client-side number validation before submit.

### M3. Generated temp files in `report_assets/generated/` lack cleanup

**File:** `disbursement-report.service.ts` line 213

```ts
await fs.unlink(tmpFile).catch(() => {});
```

Silent catch on unlink failure means temp files could accumulate. No periodic cleanup mechanism.

### M4. `page.tsx` at 421 lines, well above 200-line limit

Extract `DisbursementTable`, `LoanInfoCard`, `SummaryBar` into separate components.

### M5. Hardcoded Vietnamese strings in UI components

**Files:** `add-invoice-from-loan-modal.tsx`, `disbursement-report-modal.tsx`

Multiple hardcoded Vietnamese strings not using the `t()` i18n function:
- "Vui long dien day du cac truong bat buoc" (line 44)
- "So hoa don *", "Nha cung cap *", etc. (lines 115-136)
- "Don vi thu huong:", "Chon mau bao cao", "Thong tin bo sung" in report modal

These break English locale.

### M6. `getCustomerSummary` loads entire DB into memory

**File:** `invoice.service.ts` lines 221-266

```ts
const customers = await prisma.customer.findMany({
  include: { loans: { include: { disbursements: { include: { invoices: ... } } } } },
});
```

Deeply nested eager loading with no pagination. With 100 customers * 10 loans * 5 disbursements * 20 invoices = 100K rows loaded into memory.

**Fix:** Use Prisma `_count` and `_sum` aggregations, or raw SQL aggregate query.

---

## Low Priority

### L1. `loanTermMonths` doesn't handle negative or zero values
If `startDate > endDate`, months is negative. Display would be confusing.

### L2. `fmtDate` in report service doesn't handle timezone offsets
`new Date("2026-01-15")` may shift to previous day depending on server timezone.

### L3. Missing `aria-label` on icon-only buttons in `DisbursementActions`
Has `title` but no `aria-label` for screen readers.

---

## Positive Observations

- Zod validation on API routes -- good input boundary
- `recalcBeneficiaryStatus` auto-sync pattern is clean and consistent across create/update/delete
- Debounced search with proper cleanup in `useEffect`
- localStorage persistence for report overrides -- nice UX touch
- Proper file download with `URL.createObjectURL` + cleanup via `revokeObjectURL`
- `@@unique([invoiceNumber, supplierName])` DB constraint + soft duplicate warning -- good layered approach
- Clean modal composition with `BaseModal`

---

## Recommended Actions (Prioritized)

1. **[Critical]** Whitelist override keys server-side in `buildReportData` to prevent key injection
2. **[Critical]** Delete `number-to-vietnamese-text.ts`, consolidate to single module
3. **[High]** Fix `recalcBeneficiaryStatus` to support partial invoice coverage status
4. **[High]** Add try-catch to all fetch calls in `page.tsx`
5. **[High]** Address UNC single-beneficiary limitation (at least warn user)
6. **[High]** Split `disbursement-report.service.ts` and `page.tsx` per 200-line rule
7. **[Medium]** Internationalize all hardcoded Vietnamese strings
8. **[Medium]** Replace `getCustomerSummary` eager loading with aggregation query
9. **[Medium]** Add client-side amount validation in `AddInvoiceFromLoanModal`

---

## Metrics

| Metric | Value |
|--------|-------|
| Files reviewed | 10 |
| Lines changed | ~900 (code only) |
| Critical issues | 2 |
| High issues | 4 |
| Medium issues | 6 |
| Low issues | 3 |

## Unresolved Questions

1. Is the "partial" invoice status on beneficiary lines intended to be functional? Currently unreachable.
2. UNC template: is single-beneficiary output by design or a known limitation?
3. Should `number-to-vietnamese-text.ts` handle negative numbers (it does) while `number-to-vietnamese-words.ts` returns empty string for negatives -- which behavior is correct for the business domain?
