# Code Quality Review: Disbursement Modules

**Date:** 2026-03-06
**Reviewer:** code-reviewer
**Scope:** 5 files, ~1785 LOC

## Overall Assessment

Code is functional but has significant DRY violations and structural issues. The biggest problems are copy-paste duplication between `create` and `fullUpdate` in the disbursement service, excessive state sprawl in the form modal, and duplicate date-formatting functions across files.

---

## Critical Issues

None found.

## High Priority

### H1. Near-duplicate transaction logic in disbursement.service.ts (Copy-Paste)

**Files:** `src/services/disbursement.service.ts:182-238` vs `:282-343`

`create()` and `fullUpdate()` contain almost identical beneficiary-line + invoice creation logic (~55 lines each). The only difference: `create` uses `disbursement.id`, `fullUpdate` uses `id` param.

**Impact:** Any bug fix or new field must be applied twice. High risk of drift.

**Recommendation:** Extract shared function:
```ts
async function createBeneficiaryLines(tx, disbursementId, beneficiaries) { ... }
```

### H2. CreateDisbursementInput vs FullUpdateDisbursementInput near-duplicate types

**Files:** `src/services/disbursement.service.ts:20-36` vs `:45-60`

These two types share 10 identical fields. Only differences: `loanId` (create-only), `status` (update-only), and optionality of `amount`/`disbursementDate`.

**Recommendation:** Extract `BaseDisbursementFields` type, extend for each variant.

### H3. Validation logic duplicated between create and fullUpdate

**Files:** `src/services/disbursement.service.ts:160-178` vs `:265-278`

Same amount > 0 check, date validation, and beneficiary sum validation repeated verbatim.

**Recommendation:** Extract `validateDisbursementInput(input)`.

### H4. 562-line modal far exceeds 200-line limit

**File:** `src/components/invoice-tracking/disbursement-form-modal.tsx` (562 lines)

Per project rules, code files should stay under 200 lines. This modal has:
- 8 individual `useState` calls for form fields (lines 76-83) -- parameter sprawl
- Form JSX (~130 lines of grid markup)
- Sub-component `BeneficiarySection` (~120 lines)

**Recommendation:**
1. Extract `BeneficiarySection` to own file
2. Consolidate 8 field states into single `useReducer` or object state
3. Extract form submission logic to a custom hook

---

## Medium Priority

### M1. Stringly-typed status values without shared constants

**Files:** Multiple locations across all reviewed files

`"pending"`, `"has_invoice"`, `"active"`, `"completed"`, `"cancelled"`, `"overdue"` appear as raw string literals in:
- `disbursement.service.ts:114,211,317`
- `invoice.service.ts:15,210,216,249,250`
- `disbursement-form-modal.tsx:27,125,264,513-515`

No shared enum/const. Each file redeclares the union type inline.

**Recommendation:** Create `src/lib/invoice-tracking-constants.ts` with:
```ts
export const INVOICE_STATUS = { PENDING: "pending", HAS_INVOICE: "has_invoice" } as const;
export const DISBURSEMENT_STATUS = { ACTIVE: "active", COMPLETED: "completed", CANCELLED: "cancelled" } as const;
```

### M2. Duplicate date-formatting functions

**Files:**
- `disbursement-form-modal.tsx:59-68` -- `isoToDisplay()`
- `disbursement-report.service.ts:26-34` -- `fmtDate()`
- `disbursement-report.service.ts:177-182` -- `fmtDateCompact()`
- `lib/invoice-tracking-format-helpers.ts:32` -- `fmtDateDisplay()`

Four different date-to-dd/mm/yyyy functions doing the same thing. `isoToDisplay` in the modal is a client-side copy of what `fmtDate` does server-side.

**Recommendation:** Unify into `invoice-tracking-format-helpers.ts` which is already imported by the modal.

### M3. Derived state stored as independent useState

**File:** `disbursement-form-modal.tsx:76-83`

`currentOutstanding` is fetched and stored, then `remainingLimit` and `totalOutstanding` are computed from it (lines 175-176). This is fine. However, `debtAmount` and `amount` in the payload are always the same value (line 249: `amount: debtNum`). The `amount` field on `CreateDisbursementInput` is redundant with `debtAmount`.

**File:** `disbursement.service.ts:124,171`
Server-side: `input.debtAmount ?? input.amount` -- shows `debtAmount` and `amount` are aliased.

### M4. `listAll` in invoice.service.ts has branching duplication

**File:** `src/services/invoice.service.ts:52-98`

The `listAll` method has two near-identical `prisma.invoice.findMany` calls (lines 58-78 vs 81-98) that differ only by the `where` clause. The `include` block is copy-pasted.

**Recommendation:** Build `where` conditionally, single `findMany` call.

### M5. Silent error swallowing in modal

**File:** `disbursement-form-modal.tsx:135,150,162`

Three `catch { /* ignore */ }` blocks silently swallow fetch errors. User gets no feedback if beneficiary list, outstanding amount, or edit data fails to load.

### M6. Loan detail page at 324 lines exceeds 200-line limit

**File:** `src/app/report/loans/[id]/page.tsx` (324 lines)

11 useState hooks (lines 47-66). Modal management alone is 6 states. Could extract toolbar, loan info card, and summary bar as sub-components.

---

## Low Priority

### L1. Module-level mutable counter

**File:** `disbursement-form-modal.tsx:47`
`let _tempId = 0` is module-scoped mutable state. Works but will accumulate across renders/navigations in SPA. Not a bug, but `crypto.randomUUID()` would be cleaner.

### L2. `any` type annotation

**File:** `disbursement-form-modal.tsx:116`
`// eslint-disable-next-line @typescript-eslint/no-explicit-any` followed by `const lines: any[]` -- then immediately re-typed via inline annotation in `.map()`. The inline type is complex; better to define a `BeneficiaryLineResponse` type.

### L3. Hardcoded Vietnamese strings in modal

**File:** `disbursement-form-modal.tsx:234,235,239,317,405,461,...`

Modal uses `t()` for some strings but hardcodes many Vietnamese labels directly. Inconsistent i18n.

### L4. `getCustomerSummary` N+1-like eager load

**File:** `invoice.service.ts:222-234`

Loads ALL customers with ALL loans with ALL disbursements with ALL invoices in one query. No pagination. Will degrade as data grows.

---

## Summary Table

| # | Severity | Issue | File:Line |
|---|----------|-------|-----------|
| H1 | High | Duplicated beneficiary creation logic | disbursement.service.ts:182-238 vs 282-343 |
| H2 | High | Near-duplicate input types | disbursement.service.ts:20 vs 45 |
| H3 | High | Duplicated validation | disbursement.service.ts:160-178 vs 265-278 |
| H4 | High | 562-line file, state sprawl | disbursement-form-modal.tsx |
| M1 | Medium | Stringly-typed statuses | Multiple files |
| M2 | Medium | 4 duplicate date formatters | Multiple files |
| M3 | Medium | Redundant amount/debtAmount | disbursement.service.ts:124 |
| M4 | Medium | Branching duplication in listAll | invoice.service.ts:52-98 |
| M5 | Medium | Silent error swallowing | disbursement-form-modal.tsx:135,150,162 |
| M6 | Medium | 324-line page, 11 useState | loans/[id]/page.tsx |
| L1 | Low | Module-level mutable counter | disbursement-form-modal.tsx:47 |
| L2 | Low | eslint-disable any | disbursement-form-modal.tsx:116 |
| L3 | Low | Inconsistent i18n | disbursement-form-modal.tsx |
| L4 | Low | Unbounded eager load | invoice.service.ts:222-234 |

## Unresolved Questions

1. Is `amount` on `CreateDisbursementInput` intentionally separate from `debtAmount`, or was it the original field before `debtAmount` was added? If they're always the same, one should be removed.
2. Does `disbursementBeneficiary` cascade-delete its invoices via Prisma schema? Line 283 comment says it does, but `fullUpdate` also manually deletes orphan invoices on line 286. Need to verify schema.
3. Should `getCustomerSummary` be paginated or use a raw aggregate query for production scale?
