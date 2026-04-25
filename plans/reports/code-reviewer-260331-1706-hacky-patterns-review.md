# Code Review: Hacky Patterns Audit

**Date:** 2026-03-31
**Scope:** 11 changed files, ~2,600 LOC reviewed
**Focus:** Redundant state, parameter sprawl, copy-paste, leaky abstractions, stringly-typed code, unnecessary nesting/comments

---

## Overall Assessment

Code is functional and well-structured in most places. Main concerns are **parameter sprawl** in the loan plan editor (20+ individual `useState` calls), **duplicate key definitions** across disbursement services, and **file size violations** (4 files exceed 200-line limit).

---

## Critical Issues

None found.

---

## High Priority

### H1. Parameter Sprawl & Redundant State — `page.tsx` (loan-plan editor)
**File:** `src/app/report/customers/[id]/loan-plans/[planId]/page.tsx` (409 lines)
**Severity:** High
**Problem:** 20+ individual `useState` calls for form fields (lines 20-48). Each field has its own setter, creating massive prop drilling into `CreditAssessmentSection` (lines 397-406 — 12 individual props for 6 fields). The `handleSave` function manually assembles all state back into an object.

**Impact:** Adding a new field requires changes in 4+ places: useState, loadPlan, handleSave, JSX. High maintenance burden.

**Suggested fix:** Consolidate into a single `useReducer` or a form state object:
```tsx
const [form, setForm] = useState<LoanPlanForm>(defaultForm);
const update = (key: keyof LoanPlanForm, val: unknown) => setForm(prev => ({...prev, [key]: val}));
```
Pass `form` + `update` to child components instead of 12 individual props.

### H2. Duplicate Extended Keys Array — `loan-plan.service.ts`
**File:** `src/services/loan-plan.service.ts` (lines 92-96 vs 130-136)
**Severity:** High (DRY violation)
**Problem:** The `extKeys` array is defined identically in both `createPlanFromTemplate` and `updatePlan`. If a new field is added, one could easily be missed.

**Suggested fix:** Extract to module-level constant:
```ts
const EXTENDED_FINANCIALS_KEYS = ["depreciation_years", "asset_unit_price", ...] as const;
```

### H3. Duplicate HDTD Alias Keys — `disbursement-report.service.ts` vs `khcn-builder-loan-disbursement.ts`
**Files:** Both services set identical keys like `HDTD.Han tra cuoi`, `HDTD.Dinh ky tra lai`, `HDTD.Lai suat cham tra/qua han`.
**Severity:** High (copy-paste)
**Problem:** `disbursement-report.service.ts` (lines 137-141) and `khcn-builder-loan-disbursement.ts` (`buildDisbursementExtendedData` lines 145-146, `buildLoanExtendedData` lines 38-39) both write the same HDTD-prefixed keys. If the template field name changes, both must be updated.

**Suggested fix:** Extract shared alias constants or let one service call the other. At minimum, define a `HDTD_ALIAS_FIELDS` constant shared between both.

---

## Medium Priority

### M1. File Size Violations (>200 lines)
| File | Lines | Action |
|------|-------|--------|
| `page.tsx` (loan-plan) | 409 | Extract form sections into components |
| `disbursement-report.service.ts` | 291 | Extract `buildReportData` dict into separate file |
| `data-io.service.ts` | 437 | Already modular functions, but import logic could be split |
| `docx-engine-helpers.ts` | 240 | Minor — `mergeAdjacentRuns` could be its own file |

### M2. Stringly-Typed Template Keys
**File:** `disbursement-report.service.ts`, `khcn-builder-loan-disbursement.ts`
**Problem:** All template placeholder keys are raw Vietnamese strings (`"HDTD.So HD tin dung"`, `"GN.So tien goc nhan no"`, etc.). Typos are invisible until runtime template rendering fails silently.

**Suggested fix:** Define a `const TEMPLATE_FIELDS = { ... } as const` enum-like object and reference from there. This enables autocomplete and typo detection.

### M3. `updateRevenue` uses `keyof RevenueItem | "unit"` union
**File:** `page.tsx` line 165
**Problem:** `"unit"` is listed separately from `keyof RevenueItem`, implying `unit` was recently added to `RevenueItem` but the type union wasn't cleaned up. If `unit` is now part of `RevenueItem`, the union `| "unit"` is redundant. If not, it's a type safety gap.

**Suggested fix:** Verify `RevenueItem` type includes `unit` and remove the union.

### M4. No-op `onRefresh` callback
**File:** `src/app/report/khcn/templates/page.tsx` line 22
**Problem:** `const onRefresh = useCallback(() => {}, []);` — a no-op wrapped in useCallback, passed to `TemplateFileActions`. The comment says "file is replaced server-side, registry is static" but the child component may show a refresh button that does nothing.

**Suggested fix:** Either pass `undefined` and make the prop optional in `TemplateFileActions`, or remove the prop entirely if KHCN templates don't support hot-reload.

### M5. VAT Invoice Duplicate Check — N+1 Query
**File:** `src/services/disbursement-beneficiary-helpers.ts` lines 46-51
**Problem:** Each invoice triggers a separate `findFirst` query inside a loop. For a disbursement with 20 invoices, that's 20 DB queries.

**Suggested fix:** Batch check: collect all `(invoiceNumber, supplierName)` pairs, query once with `findMany` + `OR` conditions, then check against results.

---

## Low Priority

### L1. Button Label Mismatch
**File:** `khcn-disbursement-report-modal.tsx` line 90
**Problem:** Button text says "Xem truoc & Tai xuong" but the modal no longer has preview functionality (it was removed — direct download only). Misleading label.

**Suggested fix:** Change to "Tai xuong" or "Xuat bao cao".

### L2. Magic Number 999
**File:** `khcn/templates/page.tsx` line 28
**Problem:** `(ia === -1 ? 999 : ia)` — magic number for sort fallback.

**Suggested fix:** `const SORT_LAST = Number.MAX_SAFE_INTEGER;`

### L3. Unnecessary Comment
**File:** `docx-engine-helpers.ts` line 83
**Problem:** Vietnamese comment `// Tam bo ham unflatten vi gay loi...` is dead code documentation. The function was removed but the comment remains.

---

## Edge Cases Found by Scout

1. **`trHeight` cleanup regex** (`docx-engine-helpers.ts` line 223): The new stricter check `w:hRule="exact"` is good, but Word sometimes emits `w:hRule="atLeast"` for intentional blank rows in forms. These will now be cleaned — verify with Agribank templates that use "at least" height.

2. **Disbursement number format** (`disbursement-report.service.ts` line 91): `5400LDS${yyyy}0${padStart(3)}` — if `disbCountRaw` exceeds 999, the format breaks (4 digits + leading 0 = 5 chars). Low probability but no guard.

3. **`loadPlan` JSON.parse without try-catch** (`page.tsx` lines 85-87): If `cost_items_json` or `financials_json` contains malformed JSON (e.g., from a bad AI import), the entire page crashes with no recovery.

4. **Invoice duplicate check scope** (`disbursement-beneficiary-helpers.ts`): The check queries globally (no `loanId` or `disbursementId` filter). Two different customers could have invoices from the same supplier with the same number — a valid scenario that would be falsely rejected.

---

## Positive Observations

- `proxy.ts` is clean, well-structured, handles all auth paths correctly with clear comments
- `khcn-disbursement-report-modal.tsx` uses `BaseModal` properly with good error handling
- `cleanupRenderedDocXml` has excellent defensive guards (vMerge, nested table skip, empty cell fix)
- `sanitizeRevenueItems` in `loan-plan.service.ts` is a good defensive pattern for AI/import data

---

## Recommended Actions (Priority Order)

1. **H2** Extract `EXTENDED_FINANCIALS_KEYS` constant (5 min fix, prevents bugs)
2. **H3** Consolidate HDTD alias definitions between services
3. **H1** Refactor loan-plan editor to use form state object (larger effort, highest impact)
4. **M5** Batch invoice duplicate check
5. **M1** Split `page.tsx` into form section components
6. **Edge #4** Add `disbursementId` filter to invoice duplicate check

---

## Metrics

- Type Coverage: Good (TypeScript strict mode, types defined)
- Test Coverage: Not assessed (no test files in scope)
- Linting Issues: 0 syntax errors
- Files >200 lines: 4

---

## Unresolved Questions

1. Is `w:hRule="atLeast"` used in any KHCN Agribank templates? If so, the new `trHeight` cleanup may remove intentional blank rows.
2. Should invoice duplicate check be scoped to the loan or remain global?
3. Is the `"unit"` field now part of the `RevenueItem` type definition, or was it added ad-hoc?
