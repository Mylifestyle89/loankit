# Code Quality Audit: refactor/tech-debt-cleanup

**Scope:** 138 files changed, ~8700+/6800- lines. Focus: new code (+ lines).
**Verdict:** Refactor is structurally sound -- good modularization direction. A few systemic issues to address.

---

## Findings

### HIGH — Parameter Sprawl (value+onChange prop drilling)

**1. `loan-plan-form-sections.tsx` — InfoGridProps has 12 props (6 value/onChange pairs)**
File: `src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-form-sections.tsx:37-50`
Severity: HIGH
`InfoGridProps` has 12 props, `TrungDaiProps` has 14 props. Each field gets `value` + `onChange` handler individually. This makes the parent call site verbose (lines 286-292, 346-352) and will grow worse when fields are added.

**Fix:** Group related state into a single object + single `onChange` dispatcher:
```tsx
type InfoGridData = { name: string; interestRateInput: string; turnoverCycles: number; ... };
type InfoGridProps = { data: InfoGridData; onChange: <K extends keyof InfoGridData>(key: K, val: InfoGridData[K]) => void };
```

**2. `InvoiceFiltersBar` — 11 props**
File: `src/app/report/invoices/components/invoice-filters-bar.tsx:17-29`
Severity: MEDIUM
Same pattern. Acceptable for now but watch growth.

**3. `FieldCatalogBoardProps` — 35+ props (unchanged from old code)**
File: `src/app/report/khdn/mapping/components/field-catalog-board.tsx:31-67`
Severity: HIGH
The refactor split the rendering but preserved the 35+ prop monster. The modularization into `FieldCatalogGroupSection` (20+ props) just moved the problem. Consider an actions context provider or a `useFieldCatalogActions()` hook that returns a single `actions` object, reducing both components to ~10 props each.

---

### MEDIUM — Duplicate Type Definitions

**4. `Loan` type redefined in 2 new files**
- `src/app/report/loans/[id]/components/loan-detail-header.tsx:12-19` (13 fields)
- `src/app/report/loans/components/loan-list-table.tsx:22-35` (14 fields, different shape)

**5. `GroupedTreeNode` defined identically in 2 new files**
- `src/app/report/khdn/mapping/components/field-catalog-board.tsx:26-29`
- `src/app/report/khdn/mapping/components/field-catalog-group-section.tsx:8-11`

**Fix:** Extract to a shared types file (e.g., `src/app/report/loans/types.ts`, `src/app/report/khdn/mapping/types.ts`).

---

### MEDIUM — Copy-Paste with Slight Variation

**6. Duplicate interest rate regex validation**
- `loan-plan-form-sections.tsx:75`: `if (/^\d+([,.]\d*)?$/.test(raw)) onInterestRateInputChange(raw);`
- `loan-plan-form-sections.tsx:202`: `if (r === "" || /^\d+([,.]\d*)?$/.test(r)) onPreferentialRateInputChange(r);`

The empty-string guard differs between the two. Extract a shared `isValidPercentInput(value: string): boolean` helper.

**7. `applySelectedFieldTemplate` / `startEditingExistingTemplate` near-duplicate fetch+apply blocks**
- `src/app/report/khdn/mapping/hooks/use-field-template-apply.ts:42-58` (fetch + spread)
- `src/app/report/khdn/mapping/hooks/use-field-template-apply.ts:90-103` (same pattern)

Both do the same `fetch /api/report/values` -> spread `diskValues/diskManual/diskFormulas`. Extract a private `fetchAndMergeValues(templateId?, prev)` helper.

**8. Stat card JSX in `LoanDisbursementSummaryCards`**
File: `src/app/report/loans/[id]/components/loan-disbursement-summary-cards.tsx:16-52`
4 cards with identical structure, only icon/color/label differ. Extract a `StatCard` component.

---

### MEDIUM — Dead Code / Leaky Abstraction

**9. `SortIcon` and `onSort` defined but voided in filter bar**
File: `src/app/report/loans/components/loan-list-filters.tsx:83-91`
```tsx
void SortIcon; // exported for external use below if needed — suppress unused warning
void onSort; // used by table component, not here in filter bar
```
`SortIcon` is already defined separately in `loan-list-table.tsx`. Accepting `onSort`/`sortBy`/`sortOrder` as props only to `void` them is parameter sprawl + leaky abstraction. Remove these 4 props from `LoanListFilters` -- the table component handles sorting directly.

---

### MEDIUM — Stringly-Typed Code

**10. Status filter options as raw strings in multiple components**
- `invoice-filters-bar.tsx:15-20`: `"needs_supplement"`, `"pending"`, `"paid"`, `"overdue"` as inline `<option>` values
- `loan-list-filters.tsx:38-42`: `"active"`, `"completed"`, `"cancelled"` inline

These should reference shared constants (e.g., `INVOICE_STATUS` / `LOAN_STATUS` enums or const objects) to prevent typos and ease i18n.

**11. `LOAN_METHOD_LABELS` redefined locally**
File: `src/app/report/loans/components/loan-list-table.tsx:37-42`
This map likely exists elsewhere. Should be in a shared constants file.

---

### LOW — Unnecessary Comments

**12. File-level doc comments that restate the filename**
Multiple new files have comments like:
```tsx
/**
 * loan-plan-form-sections.tsx
 *
 * Reusable form sections for LoanPlanEditorPage: ...
 */
```
The filename repeats itself. The description part is fine but the first line is noise. Minor -- not blocking.

---

### LOW — Module Boundary Concern

**13. Lazy dynamic import for circular dep avoidance in `fs-store-state-ops.ts`**
File: `src/lib/report/fs-store-state-ops.ts:17-20`
```ts
async function getStoreFns() {
  const { loadState, saveState } = await import("@/lib/report/fs-store");
  return { loadState, saveState };
}
```
This works but is a code smell. Every call to `createMappingDraft`, `publishMappingVersion`, etc. pays the dynamic import cost. Consider inverting the dependency: pass `loadState`/`saveState` as parameters, or restructure so `fs-store.ts` imports from `fs-store-state-ops.ts` (not the reverse).

---

### POSITIVE Observations

- **Good modularization direction:** Extracting `InvoiceFiltersBar`, `InvoiceGroupedView`, `LoanDetailHeader`, `LoanDisbursementSummaryCards`, `LoanListFilters`, `LoanListTable` from monolithic pages reduces per-file complexity significantly.
- **`BaseModal` migration:** Consistently renaming `BaseModal.tsx` -> `base-modal.tsx` and updating all imports. Good kebab-case enforcement.
- **`src/lib/ai/` extraction:** `ai-provider-resolver.ts` and `extract-json-from-ai-response.ts` are clean, well-documented utility modules. The 3-strategy JSON extraction is robust.
- **`fs-store` decomposition:** Splitting into `fs-store-mapping-io.ts` and `fs-store-state-ops.ts` with barrel re-exports is correct. Keeps the main file focused on load/save.
- **`CollapsibleSection` dual-mode (controlled/uncontrolled):** Clean discriminated union type approach.
- **Backward-compat re-export** at `src/components/financial-analysis-modal.tsx` prevents breaking existing imports.

---

## Summary by Priority

| Priority | Count | Action |
|----------|-------|--------|
| HIGH | 2 | Reduce prop sprawl (InfoGrid, FieldCatalogBoard) with data objects or context |
| MEDIUM | 7 | Extract shared types, shared helpers, remove dead props, use constants |
| LOW | 2 | Clean up comments, consider dependency injection over lazy import |

## Unresolved Questions

1. Are the `Loan` types in `loan-detail-header.tsx` and `loan-list-table.tsx` intentionally different shapes, or should they share a base type?
2. Is `LOAN_METHOD_LABELS` already defined elsewhere in the codebase? If so, the new file should import it.
3. The `FieldCatalogBoard` 35-prop interface was inherited from the old code -- is there appetite to refactor it further in this branch, or defer?
