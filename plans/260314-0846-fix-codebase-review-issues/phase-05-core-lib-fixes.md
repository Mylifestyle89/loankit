# Phase 5: Core Lib Splitting & Logic Fixes

**Priority:** IMPORTANT | **Effort:** 3h | **Status:** pending | **Deps:** Phase 1

## Reports Reference

- Core Lib #2, #5, #6, #7, #8, #9, #11

## Implementation Steps

### 5.1 Fix unsafe casts in loan-plan-calculator.ts

**File:** `src/lib/loan-plan/loan-plan-calculator.ts`
- [ ] Lines 57-66: replace `as unknown as` with Zod runtime validation
- [ ] Create schema for revenue category types
- [ ] Return validation error instead of silently producing NaN

### 5.2 Fix formula processor dependency resolution

**File:** `src/core/use-cases/formula-processor.ts`
- [ ] Line 85: replace 2-pass with topological sort
- [ ] Add cycle detection — throw error if circular dependency found
- [ ] This ensures chains of 3+ dependent formulas resolve correctly

### 5.3 Fix rate limiter key collision

**File:** `src/lib/rate-limiter.ts`
- [ ] Line 63: when `TRUSTED_PROXY !== "true"`, use `x-forwarded-for` or request IP instead of `"global"`
- [ ] Fallback to `"global"` only if no IP available, but log a warning

### 5.4 Split field-calc.ts (739 lines)

**File:** `src/lib/report/field-calc.ts`
- [ ] Extract to `src/lib/report/field-calc-expression.ts` — expression evaluation logic
- [ ] Extract to `src/lib/report/field-calc-date.ts` — date arithmetic functions
- [ ] Extract to `src/lib/report/field-calc-docso.ts` — Vietnamese number-to-words
- [ ] Keep `field-calc.ts` as barrel re-export

### 5.5 Split bctc-extractor.ts (605 lines)

**File:** `src/lib/report/bctc-extractor.ts`
- [ ] Extract sheet parser logic
- [ ] Extract ratio computation
- [ ] Extract sub-table parser

### 5.6 Split fs-store.ts (432 lines)

**File:** `src/lib/report/fs-store.ts`
- [ ] Extract state persistence to `fs-store-state.ts`
- [ ] Extract mapping draft CRUD to `fs-store-mapping.ts`
- [ ] Extract template management to `fs-store-templates.ts`

### 5.7 DRY docx-engine.ts (387 lines)

**File:** `src/lib/docx-engine.ts`
- [ ] Extract shared template-loading + rendering logic from `generateDocx` and `generateDocxBuffer`
- [ ] Both methods call shared `loadAndRenderTemplate()` internal function

## Success Criteria

- No files over 200 lines (except pure data files)
- Formula processor handles arbitrary dependency depth
- Rate limiter correctly scopes per-user
- No unsafe type casts in financial calculations
