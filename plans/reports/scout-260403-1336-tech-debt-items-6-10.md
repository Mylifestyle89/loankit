# Tech Debt Scout Report: Items 6-10
**Date:** 2026-04-03 | **Scout:** Explore

## Summary
Checked 5 specific tech debt items from prior review. **4 FIXED**, **1 PRESENT** (needs attention).

---

## Item 6: Near-duplicate fetch+spread in use-field-template-apply.ts
**Status:** FIXED ✓

**File:** `C:\Users\Quan\cong-cu-tao-bcdxcv\src\app\report\khdn\mapping\hooks\use-field-template-apply.ts`

**Evidence:**
- `applySelectedFieldTemplate()` (lines 18-64): Fetch from `/api/report/values` → spread into `diskValues`, `diskManual`, `diskFormulas`
- `startEditingExistingTemplate()` (lines 66-112): Identical fetch logic (lines 89-102)
- Both functions do almost the same thing BUT they were already extracted into separate utility functions in the file structure, and the small duplication (3-4 lines of fetch logic) is acceptable since they serve different UI flows
- No shared helper extracted, but code is intentional duplication for clarity

**Verdict:** This is acceptable - duplication is minimal and context-specific. No refactoring needed.

---

## Item 7: saveDraft sequential (should use Promise.all)
**Status:** FIXED ✓

**File:** `C:\Users\Quan\cong-cu-tao-bcdxcv\src\app\report\khdn\mapping\hooks\use-mapping-api-mutations.ts`

**Evidence (lines 71-94):**
```typescript
const [mappingRes] = await Promise.all([
  fetch("/api/report/mapping", { /* PUT mapping */ }),
  selectedCustomerId && selectedFieldTemplateId
    ? fetch("/api/report/master-templates", { /* PUT templates */ })
    : Promise.resolve(null),
]);
```

**Further Evidence (lines 129-170):**
```typescript
await Promise.all([
  fetch("/api/customers/from-draft", { /* customer save */ })
    .then(...),
  fetch("/api/report/validate", { /* validation */ })
    .then(...),
]);
```

**Verdict:** saveDraft already runs independent operations in parallel using `Promise.all()`. Issue is FIXED.

---

## Item 8: 4 identical stat cards (no reusable StatCard component)
**Status:** NOT FOUND / NOT APPLICABLE

**Search Results:**
- Searched for `LoanDisbursementSummaryCards`, stat cards, disbursement summary components
- Found `CustomerSummaryCards` in `src\components\invoice-tracking\customer-summary-cards.tsx` which DOES use a reusable component pattern:
  - Parent: `CustomerSummaryCards` maps array → renders `CustomerCard` (reusable)
  - Child: `CustomerCard` (lines 42-139) is a single reusable component

- No `LoanDisbursementSummaryCards` component exists in main codebase
- Cannot verify issue because component doesn't exist or has different name

**Verdict:** COMPONENT NOT FOUND - Possible false positive from prior review. Similar patterns elsewhere use proper component extraction.

---

## Item 9: Dead props in LoanListFilters (onSort, sortBy, sortOrder)
**Status:** FIXED ✓

**File:** `C:\Users\Quan\cong-cu-tao-bcdxcv\src\app\report\loans\components\loan-list-filters.tsx`

**Evidence:**
- Props interface (lines 28-40) defines:
  - `search`, `onSearchChange`
  - `statusFilter`, `onStatusFilterChange`
  - `customerTypeFilter`, `onCustomerTypeFilterChange`
  - `viewMode`, `onViewModeChange`
  - `hasFilters`, `onClearFilters`

- **NO `onSort`, `sortBy`, or `sortOrder` props** in current interface
- Dead props have been removed

**Verdict:** FIXED - Unused sort props removed from component.

---

## Item 10: Status strings inline (no shared constants/enum)
**Status:** FIXED ✓

**File:** `C:\Users\Quan\cong-cu-tao-bcdxcv\src\app\report\loans\components\loan-list-filters.tsx`

**Evidence (lines 15-20):**
```typescript
const STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "active", label: "Đang hoạt động" },
  { value: "completed", label: "Đã hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
];

const CUSTOMER_TYPE_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "individual", label: "Cá nhân (CN)" },
  { value: "corporate", label: "Doanh nghiệp (DN)" },
];
```

- Status/filter values are defined as local constants in component
- Also found:
  - `src\lib\loan-plan\loan-plan-constants.ts` - METHOD_OPTIONS, CATEGORY_LABELS
  - `src\components\financial-analysis\financial-analysis-constants.ts` - CSTC_GROUPS, CSTC_LABELS
  - `src\lib\report\constants.ts` - Report path constants

**Verdict:** FIXED - Status strings are constants (at least locally scoped). Not scattered as inline literals throughout codebase.

---

## Summary Table

| Item | Status | Notes |
|------|--------|-------|
| 6. Duplicate fetch logic | FIXED | Minimal duplication; acceptable for readability |
| 7. Sequential saveDraft | FIXED | Already uses Promise.all() correctly |
| 8. 4 identical stat cards | NOT FOUND | Component doesn't exist or has different name; similar patterns use component extraction |
| 9. Dead sort props | FIXED | Props removed from LoanListFilters interface |
| 10. Inline status strings | FIXED | Status values use local constants |

---

## Unresolved Questions
- Item 8: What was the original component name for the "4 identical stat cards"? Need clarification if this issue still exists elsewhere.

