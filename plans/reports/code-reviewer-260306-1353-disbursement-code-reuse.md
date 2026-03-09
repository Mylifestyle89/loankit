# Code Reuse Review: Disbursement Modules

**Date:** 2026-03-06 | **Reviewer:** code-reviewer | **Focus:** DRY violations, missed utility reuse

## Scope

| File | LOC | Status |
|------|-----|--------|
| `src/services/disbursement.service.ts` | 366 | Exceeds 200 LOC |
| `src/services/disbursement-report.service.ts` | 266 | Exceeds 200 LOC |
| `src/services/invoice.service.ts` | 267 | Exceeds 200 LOC |
| `src/components/invoice-tracking/disbursement-form-modal.tsx` | 562 | Exceeds 200 LOC |
| `src/app/report/loans/[id]/page.tsx` | 324 | Exceeds 200 LOC |
| `src/lib/invoice-tracking-format-helpers.ts` | 36 | Utility file (reference) |

---

## Critical DRY Violations

### 1. Beneficiary+Invoice creation loop duplicated verbatim (HIGH)

**Files:** `disbursement.service.ts:202-234` and `disbursement.service.ts:308-340`

The `create()` and `fullUpdate()` methods contain an **identical** 30-line block that:
- Creates `disbursementBeneficiary` records
- Creates invoices via `createMany`
- Recalculates `invoiceAmount` on the line

**Impact:** Any bug fix or schema change must be applied in two places.
**Fix:** Extract a `createBeneficiaryLines(tx, disbursementId, beneficiaries)` helper.

### 2. Beneficiary amount validation duplicated (HIGH)

**Files:** `disbursement.service.ts:170-178` and `disbursement.service.ts:270-278`

Identical validation block checking `Math.abs(beneficiarySum - debtAmount) > 0.01` exists in both `create()` and `fullUpdate()`.

**Fix:** Extract `validateBeneficiaryAmounts(beneficiaries, debtAmount)` helper.

### 3. Date validation pattern repeated 3 times in same file (MEDIUM)

**Files:** `disbursement.service.ts:163-166`, `:248-252`, `:266-267`

Same `new Date() + isNaN(getTime())` pattern. Also repeated in `loan.service.ts:61-62,87,92`.

**Fix:** Add `parseValidDate(value: string, fieldName: string): Date` to a shared validation util (e.g., `src/lib/validation-helpers.ts`) that throws `ValidationError` on invalid input.

---

## Duplicate Date Formatting Functions

### 4. `isoToDisplay()` duplicates existing `fmtDateDisplay` (HIGH)

**File:** `disbursement-form-modal.tsx:59-68`

Local function `isoToDisplay()` manually formats ISO date to `dd/mm/yyyy`. The existing helper `fmtDateDisplay` in `invoice-tracking-format-helpers.ts:32` does the same thing via `toLocaleDateString("vi-VN")`.

**Difference:** `isoToDisplay` pads with zeros; `fmtDateDisplay` uses `toLocaleDateString`. Output may differ (single vs double digit day/month). If zero-padded output is required, add it as an option to the existing helper rather than a local function.

### 5. `fmtDate()` and `fmtDateCompact()` in report service (MEDIUM)

**File:** `disbursement-report.service.ts:26-34` and `:177-182`

Two local date formatters that produce `dd/mm/yyyy` and `dd-mm-yyyy` respectively. The `dd/mm/yyyy` variant is identical in purpose to `isoToDisplay` in the modal and `fmtDateDisplay` in the helpers.

**Fix:** Consolidate into `invoice-tracking-format-helpers.ts`:
- `fmtDateDMY(d: Date | string): string` -- `dd/mm/yyyy`
- `fmtDateCompact(d: Date | string): string` -- `dd-mm-yyyy` (for filenames)

### 6. `today()` helper (LOW)

**File:** `disbursement-report.service.ts:40-47`

Returns `{dd, mm, yyyy}` for current date. Only used in report data building. Low reuse potential but documents the pattern.

---

## Duplicated CSS Class Constants

### 7. `inputCls`, `readonlyCls`, `labelCls`, `sectionCls` repeated across modals (HIGH)

**Files with identical/near-identical constants:**
- `disbursement-form-modal.tsx:40-45`
- `add-invoice-from-loan-modal.tsx`
- `beneficiary-modal.tsx`
- `loan-edit-modal.tsx`
- `invoice-form-modal.tsx`
- `src/app/report/loans/new/page.tsx`

**Impact:** 6+ files define the same Tailwind class strings. Any design change (border color, ring color) requires editing all files.

**Fix:** Extract to `src/components/invoice-tracking/form-styles.ts`:
```ts
export const inputCls = "w-full rounded-md border ...";
export const readonlyCls = "...";
export const labelCls = "...";
export const sectionCls = "...";
```

---

## Missed Utility Reuse

### 8. `invoice.service.ts` `listAll()` duplicates include shape (MEDIUM)

**File:** `invoice.service.ts:58-79` and `:81-98`

The `include` block for `disbursement > loan > customer` is copy-pasted between the two branches of the `if (filters?.customerId)` conditional.

**Fix:** Extract the include object to a const:
```ts
const INVOICE_LIST_INCLUDE = { disbursement: { select: { ... } } };
```
Then use in both branches.

### 9. `recalcBeneficiaryStatus` could be reused by disbursement.service (LOW)

**File:** `invoice.service.ts:6-19`

This function recalculates `invoiceStatus` and `invoiceAmount` on a beneficiary line. Meanwhile, `disbursement.service.ts:229-233` and `:334-338` manually compute and update `invoiceAmount` inline during beneficiary creation.

These serve slightly different contexts (create-time vs post-create recalc), but the logic of "sum invoice amounts and update the line" is the same. After extracting the beneficiary creation helper (#1), consider calling `recalcBeneficiaryStatus` there too.

---

## File Size / Modularization

### 10. `disbursement.service.ts` (366 LOC) -- split recommended

Suggested modules:
- `disbursement-query.service.ts`: `list`, `listByLoan`, `getById`, `getSummaryByLoan`, `getSurplusDeficit`
- `disbursement-mutation.service.ts`: `create`, `update`, `fullUpdate`, `delete`
- `disbursement-beneficiary.helpers.ts`: extracted `createBeneficiaryLines`, `validateBeneficiaryAmounts`

### 11. `disbursement-form-modal.tsx` (562 LOC) -- already partially split

`BeneficiarySection` is already extracted as a sub-component in the same file. Further split:
- Move `BeneficiarySection` to its own file (~120 LOC)
- Move types (`BeneficiaryLine`, `InvoiceLine`, etc.) and helpers (`emptyBeneficiaryLine`, `emptyInvoiceLine`, `num`, `isoToDisplay`) to a shared types/helpers file
- Main modal drops to ~300 LOC, then further split the form sections

### 12. `loans/[id]/page.tsx` (324 LOC) -- acceptable with extracted table

Most complexity is already delegated to `DisbursementTable` and `PaginationControls`. Consider extracting the loan info card (lines 137-204) and summary bar (207-226) as sub-components to get under 200 LOC.

---

## Summary Table

| # | Severity | Issue | Files Affected |
|---|----------|-------|----------------|
| 1 | HIGH | Beneficiary creation loop duplicated | disbursement.service.ts |
| 2 | HIGH | Beneficiary amount validation duplicated | disbursement.service.ts |
| 3 | MEDIUM | Date validation pattern x3 in one file | disbursement.service.ts, loan.service.ts |
| 4 | HIGH | `isoToDisplay` duplicates existing helper | disbursement-form-modal.tsx |
| 5 | MEDIUM | 2 local date formatters in report service | disbursement-report.service.ts |
| 6 | LOW | `today()` helper (niche, low reuse) | disbursement-report.service.ts |
| 7 | HIGH | CSS class constants duplicated in 6+ files | multiple modal/page files |
| 8 | MEDIUM | Include shape duplicated in listAll | invoice.service.ts |
| 9 | LOW | recalcBeneficiaryStatus vs inline calc | invoice.service.ts, disbursement.service.ts |
| 10 | MEDIUM | 366 LOC needs modularization | disbursement.service.ts |
| 11 | MEDIUM | 562 LOC needs modularization | disbursement-form-modal.tsx |
| 12 | LOW | 324 LOC, partially modularized | loans/[id]/page.tsx |

**4 HIGH, 4 MEDIUM, 4 LOW findings.**

---

## Recommended Action Order

1. Extract `createBeneficiaryLines()` + `validateBeneficiaryAmounts()` from `disbursement.service.ts` (#1, #2)
2. Create `src/components/invoice-tracking/form-styles.ts` for shared CSS classes (#7)
3. Replace `isoToDisplay` with centralized helper in `invoice-tracking-format-helpers.ts` (#4, #5)
4. Extract include shape const in `invoice.service.ts` (#8)
5. Add `parseValidDate` to a shared validation util (#3)
6. Modularize `disbursement.service.ts` into query/mutation/helpers (#10)
7. Split `disbursement-form-modal.tsx` sub-components into separate files (#11)
