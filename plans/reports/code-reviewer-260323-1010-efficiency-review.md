# Efficiency Review

**Date:** 2026-03-23
**Scope:** Unstaged diff — modularization of AiMappingModal, FinancialAnalysisModal, LoanPlanEditor; new proxy.ts; KHCN doc-checklist simplification; CIC fields; credit assessment section
**Files reviewed:** ~25 changed/new files

---

## Overall Assessment

The diff is predominantly a **modularization refactor** splitting large monolithic components into sub-files. This is structurally positive but introduces several efficiency concerns — mostly around prop drilling causing unnecessary re-renders, dead code left behind, and an O(n^2) lookup pattern that survived the split.

---

## Critical Findings

### 1. [HIGH] O(n^2) isMapped lookup in SuggestTab — per-render linear scan

**File:** `src/app/report/khdn/mapping/components/Modals/ai-mapping-tab-suggest.tsx:233`

```tsx
const isMapped = Object.values(suggestion).includes(header);
```

This is called inside `.map(parsedHeaders)`, making it O(headers x suggestion-values) on every render. With 50+ headers and 50+ placeholders, this runs 2500+ string comparisons per render tick.

**Fix:** Pre-compute a `Set` once via `useMemo`:

```tsx
const mappedHeaders = useMemo(() => new Set(Object.values(suggestion)), [suggestion]);
// Then in the loop:
const isMapped = mappedHeaders.has(header);
```

---

### 2. [HIGH] AiMappingModal still owns 36 useState hooks — all tab states initialized unconditionally

**File:** `src/app/report/khdn/mapping/components/Modals/AiMappingModal.tsx`

All 36 `useState` calls execute on mount even when user only uses the "suggest" tab. BK-import state (6 hooks), batch state (12 hooks), tagging hook are initialized but never read until tab switch. Any setter call on any of these 36 states re-renders AiMappingModal AND all 4 tab components because all state lives in the parent.

**Impact:** A keystroke in the headers textarea triggers re-render of BatchTab, BkImportTab, TaggingTab even though they are not visible.

**Fix (incremental):** Move tab-local state into each tab component. For example, `bkFile`, `bkImporting`, `bkResult`, `bkError`, `bkAccepted`, `bkExpandedGroups`, `bkMode`, `bkTemplateName` belong inside `BkImportTab`. Same for batch-tab state. Only truly shared state (like `headersRaw` used by both suggest and tagging) should stay in the parent.

---

### 3. [HIGH] LoanPlanEditorPage has 26 useState hooks — credit assessment adds 6 more

**File:** `src/app/report/customers/[id]/loan-plans/[planId]/page.tsx` (399 lines, exceeds 200-line limit)

Same pattern as AiMappingModal: every textarea keystroke in the credit-assessment section triggers re-render of the entire page including the cost-items table, revenue table, repayment schedule, and all financial calculations.

**Fix:** Group credit-assessment state into a single `useReducer` or pass it through a local state object in `CreditAssessmentSection` (the section already wraps these fields — it should own the state and expose values via a callback).

---

## Medium Findings

### 4. [MEDIUM] Dead code: `tryOpenDocxSavePicker` in khcn-doc-checklist.tsx

**File:** `src/app/report/customers/[id]/components/khcn-doc-checklist.tsx:108-123`

The function body is now unused — the streaming write path that called `writer.write()` was removed, and the code always falls through to `setPreview(...)`. But the `useCallback` for `tryOpenDocxSavePicker` is still defined (line 108-123) and still in the dependency array of `handleGenerate` (line 148). This is dead code that allocates a callback object on every render for no reason.

**Fix:** Remove `tryOpenDocxSavePicker` entirely and remove it from `handleGenerate`'s dependency array.

---

### 5. [MEDIUM] `depPerYear` calculated inline twice

**File:** `src/app/report/customers/[id]/loan-plans/[planId]/page.tsx`

The `Math.round(assetUnitPrice * landAreaSau / depreciationYears)` calculation appears:
- Inside the `financials` useMemo (line ~248 of diff)
- In the JSX display `{fmtVND(Math.round(assetUnitPrice * landAreaSau / depreciationYears))}` (two spots in the render tree, lines ~349 and ~356 of diff)

The display instances should use `financials.totalIndirectCost` (for trung_dai) or a derived field from the memo rather than recomputing inline.

---

### 6. [MEDIUM] `fields` array in CreditAssessmentSection re-created every render

**File:** `src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-credit-assessment-section.tsx:67-74`

The `fields` array is defined inside the component body (not memoized) and creates new objects every render. Since `set` closures change on every parent re-render, this array is unstable.

Not a big deal for 6 items but follows a pattern that could cascade.

---

### 7. [MEDIUM] BatchTab receives `uploadingData`/`uploadingTemplate`/`error` but prefixes them with `_` (unused)

**File:** `src/app/report/khdn/mapping/components/Modals/ai-mapping-tab-batch.tsx:65,66,80`

```tsx
uploadingData: _uploadingData,
uploadingTemplate: _uploadingTemplate,
error: _error,
```

These are passed as props from the parent but intentionally ignored. This is prop drilling waste — the parent re-renders when these change, the child receives them but discards them. Either remove them from the prop type or use them (the original code used `uploadingData || uploadingTemplate` to disable the batch start button).

**Impact:** The batch start button's `disabled` state no longer accounts for ongoing file uploads — regression:
```tsx
// Original:
disabled={autoProcessing || uploadingData || uploadingTemplate}
// New (line 289):
disabled={autoProcessing}
```

---

## Low Findings

### 8. [LOW] proxy.ts cookie-only check — no efficiency issue, but security note

**File:** `src/proxy.ts`

The middleware only checks cookie existence, not validity. This is fine for edge middleware (validation happens in API routes via `requireAdmin`/`requireEditorOrAdmin`). No efficiency concern — it's a fast O(1) check that avoids DB round-trips at the edge.

Note: The `PUBLIC_PATHS` array uses `.some()` with `.startsWith()`, which is correct and efficient for a 2-element array.

---

### 9. [LOW] `bkResult` typed as `any`

**File:** `src/app/report/khdn/mapping/components/Modals/AiMappingModal.tsx:88`

```tsx
const [bkResult, setBkResult] = useState<any | null>(null);
```

`any | null` is effectively `any`. Should be a proper type for type-safety and to help the compiler optimize.

---

### 10. [LOW] `suggestAliasForPlaceholder` called per field per render in SuggestTab

**File:** `src/app/report/khdn/mapping/components/Modals/ai-mapping-tab-suggest.tsx:197`

This function is called inside `.map(docxFields)` on every render. If `docxFields` is large (50+) and `parsedHeaders` is large, this could be noticeable. Consider memoizing the entire docxFields-to-matches mapping.

---

## Summary Table

| # | Severity | Issue | File |
|---|----------|-------|------|
| 1 | HIGH | O(n^2) `Object.values().includes()` in render loop | ai-mapping-tab-suggest.tsx:233 |
| 2 | HIGH | 36 useState in parent, all tabs re-render on any state change | AiMappingModal.tsx |
| 3 | HIGH | 26 useState in page, credit-assessment keystrokes re-render entire page | page.tsx (loan-plan) |
| 4 | MEDIUM | Dead `tryOpenDocxSavePicker` callback | khcn-doc-checklist.tsx:108-123 |
| 5 | MEDIUM | `depPerYear` duplicated inline calculation | page.tsx (loan-plan) |
| 6 | MEDIUM | `fields` array not memoized | loan-plan-credit-assessment-section.tsx:67 |
| 7 | MEDIUM | Unused props `_uploadingData`/`_uploadingTemplate` — disabled state regression | ai-mapping-tab-batch.tsx:65-66,289 |
| 8 | LOW | proxy.ts cookie check — no efficiency issue | proxy.ts |
| 9 | LOW | `any` type for bkResult | AiMappingModal.tsx:88 |
| 10 | LOW | `suggestAliasForPlaceholder` per field per render | ai-mapping-tab-suggest.tsx:197 |

---

## File Size Violations (200-line limit)

| File | Lines |
|------|-------|
| `page.tsx` (loan-plan editor) | 399 |
| `AiMappingModal.tsx` | 623 |
| `FinancialAnalysisModal.tsx` | 402 |
| `ai-mapping-tab-suggest.tsx` | 353 |
| `ai-mapping-tab-batch.tsx` | 321 |

The modularization reduced the original AiMappingModal (~1600 lines) significantly, but the parent still exceeds 200 lines because all state + handlers remain there. Further extraction of state into tab components would bring this into compliance.

---

## Positive Observations

- Modularization is structurally sound: type extraction, util extraction, display component extraction all follow good separation
- `khcn-builder-loan-plan.ts`: `totalDirectCost` rename is correct and consistent with the frontend `financials` type
- New `CreditAssessmentSection` is well-scoped with proper error handling on the AI fetch
- `RepaymentScheduleTable` correctly uses `calcRepaymentSchedule` from the shared lib

---

## Recommended Actions (Priority Order)

1. **Fix #7** immediately — `disabled` state regression means batch can start while file is still uploading
2. **Fix #4** — remove dead `tryOpenDocxSavePicker` code
3. **Fix #1** — pre-compute `Set` for O(1) `isMapped` lookups
4. **Plan #2/#3** — move tab-local state into respective tab components to avoid cascading re-renders (larger refactor, schedule accordingly)

---

## Unresolved Questions

- Is the `proxy.ts` file intended to replace an existing `middleware.ts`? If both exist, they may conflict.
- The `khcn-builder-loan-plan.ts` uses both `totalCost` and `totalDirectCost` — is there a naming convention document that clarifies which is the canonical field name for DOCX placeholders?
