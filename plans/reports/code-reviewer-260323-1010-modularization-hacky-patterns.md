# Code Review: Modularization Hacky Patterns

**Date:** 2026-03-23
**Scope:** Modularization of 3 large files into 19 sub-modules + feature additions (CIC fields, credit assessment, auth change)
**Focus:** Hacky patterns in NEW files created during modularization

---

## Overall Assessment

Modularization direction is correct -- extracting tabs/sub-components from 1600+ line monoliths. However, the extraction was done mechanically (move JSX, pass everything as props) without rethinking data flow. This produced **severe parameter sprawl** and several **dead-code / leaky-abstraction** issues.

---

## Critical Issues

### 1. [CRITICAL] `tryOpenDocxSavePicker` dead code still in dependency array
**File:** `src/app/report/customers/[id]/components/khcn-doc-checklist.tsx` line 148

The streaming writer code was removed but `tryOpenDocxSavePicker` is still:
- Defined (lines 108-123) -- now entirely unused
- Listed in the `useCallback` dependency array of `handleGenerate` (line 148)

This is dead code that also imports a `SavePickerWindow` type. Remove the function and its dependency reference.

### 2. [CRITICAL] `bkResult` typed as `any` -- leaks untyped data across module boundary
**File:** `src/app/report/khdn/mapping/components/Modals/ai-mapping-tab-bk-import.tsx` line 17

```ts
bkResult: any | null;
```

The parent also uses `any` for `bkResult`. When you modularize, typing the boundary is the one place it matters most. At minimum, define:

```ts
type BkImportResult = {
  values: Record<string, string>;
  metadata?: { sourceFile?: string };
};
```

### 3. [CRITICAL] `onApplyBkImport` typed as `unknown` for disabled check
**File:** `src/app/report/khdn/mapping/components/Modals/ai-mapping-tab-bk-import.tsx` line 36

```ts
onApplyBkImport?: unknown; // used only for disabled check
```

This is a leaky abstraction. The child needs to know "is this callback available?" but throws away the type. Use `boolean` or propagate the real callback type.

---

## High Priority

### 4. Parameter sprawl in `SuggestTab` -- 30 props
**File:** `src/app/report/khdn/mapping/components/Modals/ai-mapping-tab-suggest.tsx` lines 15-58

`SuggestTabProps` has **30 individual props** including 3 refs, 8 state values, 8 setters, and 11 handlers/derived values. This is not a modular component -- it is the original monolith with an extra function call layer.

**Recommendation:** Group related state into objects:
```ts
type SuggestTabProps = {
  refs: { canvas: RefObject<HTMLDivElement>; sourceScroll: RefObject<HTMLDivElement>; targetScroll: RefObject<HTMLDivElement> };
  headerState: { raw: string; setRaw: (v: string) => void; parsed: string[] };
  suggestionState: { ... };
  // etc.
};
```

Or better: move suggest-specific state INTO `SuggestTab` using a custom hook.

### 5. Parameter sprawl in `BatchTab` -- 27 props
**File:** `src/app/report/khdn/mapping/components/Modals/ai-mapping-tab-batch.tsx` lines 12-49

Same issue as SuggestTab. 27 props. Three of them are destructured with underscore prefix (`_uploadingData`, `_uploadingTemplate`, `_error`) meaning they're **passed but never used**.

### 6. Parameter sprawl in `BkImportTab` -- 17 props
**File:** `src/app/report/khdn/mapping/components/Modals/ai-mapping-tab-bk-import.tsx` lines 13-37

17 props, better than the others but still includes state setters that leak parent implementation.

### 7. Parameter sprawl in `CreditAssessmentSection` -- 12 setter props
**File:** `src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-credit-assessment-section.tsx` lines 10-28

6 value props + 6 setter props for individual text fields. These should be a single `Record<string, string>` with one `onChange` handler:

```ts
type CreditAssessmentSectionProps = {
  planId: string;
  planName: string;
  costItems: CostItem[];
  revenueItems: RevenueItem[];
  financials: Record<string, unknown>;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
};
```

### 8. Unused props passed to sub-components (dead prop drilling)
**File:** `ai-mapping-tab-batch.tsx` lines 65-66, 80

Three props are destructured with underscore prefix:
- `uploadingData: _uploadingData` -- passed from parent, never used in BatchTab
- `uploadingTemplate: _uploadingTemplate` -- same
- `error: _error` -- same

**File:** `ai-mapping-tab-suggest.tsx` line 77
- `placeholderLabels: _placeholderLabels` -- passed, never used

These should be removed from the prop interface and not passed.

### 9. `AiMappingModal` still 623 lines -- ALL state remains in parent
**File:** `src/app/report/khdn/mapping/components/Modals/AiMappingModal.tsx`

The parent still holds ~40 `useState` calls and all business logic. The "modularization" only moved JSX rendering to children. Real modularization would move tab-specific state into each tab's own hook (e.g., `useBkImportState()`, `useBatchState()`).

### 10. `page.tsx` still 399 lines -- over 200-line limit
**File:** `src/app/report/customers/[id]/loan-plans/[planId]/page.tsx`

After modularization, this page is still ~400 lines. The credit assessment state (6 new `useState`) and the `loadPlan`/`handleSave` functions contain growing field lists that should be extracted into a `useLoanPlanState()` hook.

---

## Medium Priority

### 11. `Financials` type is a kitchen-sink bag
**File:** `src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-editor-types.ts`

This type mixes:
- Computed financial metrics (totalDirectCost, profit, etc.)
- trung_dai config (depreciation_years, term_months, etc.)
- Credit assessment text fields (legal_assessment, market_input, etc.)

These are 3 distinct concerns. The type should be split or at least use intersection types.

### 12. `fmt` function name collision
Two different `fmt` functions exist:
- `financial-analysis-constants.ts` line 31: `fmt(v: number | null)` -- handles null, rounds
- `loan-plan-repayment-schedule-table.tsx` line 32: `const fmt = (n: number) => n.toLocaleString("vi-VN")` -- local, no null handling

While scoped differently, having the same name in a sibling-like context is confusing. The repayment table should use `fmtVND` from the utils or rename.

### 13. Over-granular financial analysis sub-components
**Files:** `financial-analysis-step-dots.tsx` (25 lines), `financial-analysis-summary-card.tsx` (13 lines), `financial-analysis-collapsible-section.tsx` (44 lines)

`StepDots` (25 lines) and `SummaryCard` (13 lines) are so small that the file overhead (imports, exports, file creation) exceeds the component logic. These two could share a single `financial-analysis-ui-primitives.tsx` file.

### 14. WHAT comments instead of WHY
Multiple files have comments that describe WHAT the code section is rather than WHY:

- `ai-mapping-tab-suggest.tsx` line 100: `{/* Two-panel mapping area with Bezier overlay */}`
- `ai-mapping-tab-batch.tsx` line 108: `{/* Excel file */}`
- `ai-mapping-tab-bk-import.tsx` line 61: `{/* Header info + upload button */}`

These are structure labels, not explanations. Acceptable in JSX but not adding value since the component names already communicate purpose.

### 15. `FinancialAnalysisModal` still 402 lines
**File:** `src/app/report/khdn/mapping/components/Modals/FinancialAnalysisModal.tsx`

After extracting 7 sub-files, the main modal is still 402 lines. The step 2/3/4 render blocks are still inline. Each step could be its own component.

---

## Low Priority

### 16. Inconsistent `"use client"` directives
- `financial-analysis-step-dots.tsx` -- NO `"use client"` (pure render)
- `financial-analysis-summary-card.tsx` -- NO `"use client"` (pure render)
- `financial-analysis-collapsible-section.tsx` -- NO `"use client"` (but uses onClick/state toggle from parent -- OK since parent is client)
- `loan-plan-financial-display.tsx` -- HAS `"use client"` (pure render, no hooks)

Not a bug (Next.js inherits client boundary from parent) but inconsistent.

### 17. `chipStyles` exported from types file
**File:** `ai-mapping-modal-types.ts` line 38

`chipStyles` is a runtime constant, not a type. It should live in `ai-mapping-modal-utils.ts` or a constants file, not a types file.

---

## Positive Observations

- Clean separation of `MappingChip` into its own file with proper props type
- `parseHeaders` and `getChipVariant` utility extraction is correct and focused
- Tab sub-component file naming convention (`ai-mapping-tab-*.tsx`) is consistent and descriptive
- Financial analysis sub-component naming (`financial-analysis-*.tsx`) follows same pattern
- `RepaymentScheduleTable` is a clean extraction with proper props
- The auth change from `requireAdmin` to `requireEditorOrAdmin` for PATCH is a legitimate access scope fix

---

## Recommended Actions (Priority Order)

1. **Remove dead code:** Delete `tryOpenDocxSavePicker` from `khcn-doc-checklist.tsx` and remove from dependency array
2. **Type `bkResult`:** Create proper type, replace `any` in both parent and child
3. **Remove unused props:** Delete `_uploadingData`, `_uploadingTemplate`, `_error` from `BatchTab`; delete `_placeholderLabels` from `SuggestTab`
4. **Consolidate credit assessment props:** Use `Record<string, string>` + single `onChange` instead of 12 individual props
5. **Extract tab state to hooks:** Create `useSuggestState()`, `useBatchState()`, `useBkImportState()` to move state out of parent modal
6. **Split `Financials` type:** Separate computed metrics, trung_dai config, and credit assessment text

---

## Unresolved Questions

- Is `FinancialAnalysisModal` at 402 lines acceptable given it's a 4-step wizard, or should steps 2-4 be extracted?
- The `onApplyBkImport?: unknown` pattern suggests the parent conditionally provides this callback. Should the `BkImportTab` be conditionally rendered instead of receiving an untyped sentinel?
