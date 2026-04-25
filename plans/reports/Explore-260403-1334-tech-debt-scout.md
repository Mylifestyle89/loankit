# Tech Debt Scout Report — Item Status Check
**Date:** 2026-04-03 | **Scope:** 5 tech debt items review

---

## Item 1: N+1 DB in data-io-import

**File:** `src/services/report/data-io-import.service.ts`

**Status:** ✅ **FIXED**

**Evidence:**
- Lines 144-187 implement comprehensive PRE-FETCH phase:
  - Customers pre-fetched into `customerMap` (lines 146-150)
  - Loans pre-fetched bulk via `contractNumber { in: [...] }` (lines 155-159)
  - Beneficiaries pre-fetched bulk (lines 164-168)
  - Invoices pre-fetched bulk (lines 183-187)
- Lines 189-331: Sequential processing uses Maps to avoid N+1 reads
- No nested `await` in loops; all DB reads are batched upfront
- Invoice creation uses `upsertInvoice()` helper with invoice map (line 301)

---

## Item 2: normalizeText/tokenize duplication

**Files:** Multiple AI helpers referencing text utilities

**Status:** ✅ **FIXED**

**Evidence:**
- Consolidated shared module: `src/lib/text/normalize.ts` (lines 1-46)
  - Single source: `normalizeText()`, `tokenize()`, `scoreTokenOverlap()`, `decodeXmlText()`
- All consuming files import from shared module:
  - `src/core/use-cases/extraction/extraction-text-helpers.ts` ✅
  - `src/core/use-cases/reverse-template-matcher.ts` ✅
  - `src/services/ai-mapping-helpers.ts` ✅
  - `src/services/auto-tagging-ai-helpers.ts` ✅
  - `src/services/auto-tagging.service.ts` ✅
- No duplicate implementations found

---

## Item 3: Parameter sprawl

**Files:** `LoanPlanInfoGrid`, `FieldCatalogBoard`

**Status:** ⚠️ **PARTIALLY FIXED** (LoanPlanInfoGrid OK, FieldCatalogBoard still high)

**Evidence:**

### LoanPlanInfoGrid
- File: `src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-form-sections.tsx`
- Props interface (lines 18-31): **11 props** ✅ (reduced, acceptable)
  - name, onNameChange
  - interestRateInput, onInterestRateInputChange
  - turnoverCycles, onTurnoverCyclesChange
  - loanAmount, onLoanAmountChange
  - landAreaSau, onLandAreaSauChange
  - farmAddress, onFarmAddressChange

### FieldCatalogBoard
- File: `src/app/report/khdn/mapping/components/field-catalog-board.tsx`
- Props interface (lines 14-51): **37 props** ⚠️ (still high)
  - t, sensors, onDragEnd, groupedFieldTree, hasContext, parentGroups...
  - onRepeaterItemChange, onManualChange, removeRepeaterItem, addRepeaterItem...
  - onFieldLabelChange, onFieldTypeChange, onMoveField, onOpenChangeGroupModal...
  - formulas, onOpenFormulaModal, confidenceByField, sampleByField...
  - ocrSuggestionsByField, onAcceptOcrSuggestion, onDeclineOcrSuggestion

**Recommendation:** LoanPlanInfoGrid is good. FieldCatalogBoard could benefit from context provider or state consolidation.

---

## Item 4: Duplicate types

**Files:** Search for `GroupedTreeNode`, `Loan` type re-declarations

**Status:** ✅ **FIXED**

**Evidence:**

### GroupedTreeNode
- Single declaration: `src/core/use-cases/mapping-engine.ts` (lines 3-6)
- Imported by: `src/app/report/khdn/mapping/components/field-catalog-board.tsx` (line 12)
- No duplicate declarations found ✅

### Loan type
- Centralized at: `src/app/report/loans/types.ts` (lines 1-18)
- Local re-declaration in `src/components/invoice-tracking/loan-edit-modal.tsx` (lines 23-36) — **Still local**
  - Matches structure, but separate type definition for modal scope (acceptable pattern)
- Invoice types centralized: `src/app/report/invoices/types.ts` (Invoice, Customer)
- No significant duplication across invoice module ✅

---

## Item 5: Copy-paste regex validation

**File:** `src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-form-sections.tsx`

**Status:** ⚠️ **PRESENT** (not consolidated)

**Evidence:**
- Line 56: Interest rate regex
  ```tsx
  if (/^\d+([,.]\d*)?$/.test(raw)) onInterestRateInputChange(raw);
  ```
- Line 183: Preferential rate regex (identical)
  ```tsx
  if (r === "" || /^\d+([,.]\d*)?$/.test(r)) onPreferentialRateInputChange(r);
  ```

**Issue:** Same regex pattern in 2 places with different empty-string guards:
- Line 56: No empty-string guard (rejects empty input)
- Line 183: Explicit `r === "" ||` check (allows empty)

**Recommendation:** Extract shared helper function for decimal input validation (e.g., `validateDecimalInput()`).

---

## Summary

| Item | Status | Evidence |
|------|--------|----------|
| 1. N+1 DB | ✅ FIXED | Batch pre-fetch + map lookups (lines 144-187) |
| 2. Text utils duplication | ✅ FIXED | Consolidated in `src/lib/text/normalize.ts` |
| 3. Parameter sprawl | ⚠️ PARTIAL | LoanPlanInfoGrid OK (11 props); FieldCatalogBoard (37 props) |
| 4. Duplicate types | ✅ FIXED | Single `GroupedTreeNode` source; `Loan` types appropriately scoped |
| 5. Regex validation | ⚠️ PRESENT | 2 copies of interest rate regex with different guards (lines 56, 183) |

**Unresolved Questions:**
- Should FieldCatalogBoard props be refactored with context? (Scope dependent)
- Should interest rate validation be extracted to shared utility? (Quick win, ~10 lines)
