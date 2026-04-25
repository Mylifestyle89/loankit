# Code Review: Greenhouse Loan Plan Template

**Date:** 2026-03-21
**Branch:** Customer-type-modules-refactoring
**Focus:** Financial calculation correctness, backward compatibility, type safety, UI completeness

## Scope
- 8 files reviewed
- ~900 LOC changed/added
- Focus: trung_dai loan method (greenhouse), depreciation, repayment schedule

## Overall Assessment
Solid feature addition. Types well-defined, calculator logic correct, UI conditionally renders trung_dai fields. However, significant DRY violation: repayment schedule logic duplicated 3 times.

---

## Critical Issues

None.

## High Priority

### 1. DRY violation: repayment schedule logic duplicated 3 times
`calcRepaymentSchedule()` in `loan-plan-calculator.ts` is **never imported**. Identical logic exists inline in:
- `khcn-builder-loan-plan.ts` (lines 189-213)
- `page.tsx` RepaymentScheduleTable component (lines 387-400)

**Fix:** Import and use `calcRepaymentSchedule` from calculator in both places. The builder needs formatted output, so map the result:
```ts
import { calcRepaymentSchedule } from "@/lib/loan-plan/loan-plan-calculator";
const rows = calcRepaymentSchedule({ loanAmount, termMonths, standardRate, preferentialRate, annualIncome });
```

### 2. DRY violation: depreciation calculation duplicated
`calcDepreciation()` exported but unused. Same `Math.round(assetPrice * landSau / depYears)` appears inline in:
- `khcn-builder-loan-plan.ts` line 52
- `page.tsx` line 279, 288

### 3. Missing try-catch on `loadPlan` fetch (page.tsx line 86)
`fetch` call not wrapped in try-catch. Network error will cause unhandled rejection.

**Fix:**
```ts
try {
  const res = await fetch(...);
  // ...
} catch (err) {
  setError("Loi ket noi"); setLoading(false);
}
```

### 4. `handleSave` missing try-catch (page.tsx line 130)
Same issue -- network failure unhandled.

## Medium Priority

### 5. Page.tsx at 435 lines -- exceeds 200-line limit
The page contains: main editor, TreeRow, Stat, RepaymentScheduleTable components. Extract `RepaymentScheduleTable` and `FinancialSummary` section to separate files.

### 6. `financials` useMemo missing trung_dai extended fields
`useMemo` on line 113-125 computes base `Financials` but does NOT include `depreciation_years`, `asset_unit_price`, `land_area_sau`, etc. These extended fields are only sent on save (line 138-143) but the local `financials` object type includes them yet they're never populated.

**Impact:** Minor -- only affects local display, not save. But type mismatch is confusing.

### 7. Seed script `findFirst` by `name` instead of `category` (line 174)
Changed from category-based lookup to name-based. If template name is edited in DB, seed will create duplicates. Acceptable for dev tooling but worth noting.

### 8. `META_KEY_MAP` maps "Số sào đất" to `landArea` but type has `landAreaSau`
In `xlsx-loan-plan-parser-type-a.ts` line 34: `"Số sào đất": "landArea"` but `XlsxParseMeta` has `landAreaSau`. There's also line 37: `"Số sào đất NN": "landAreaSau"`. The first mapping writes to an untyped `landArea` (falls through to `[key: string]: unknown` index sig). Not a crash but data silently lost if XLSX has "Số sào đất" without "NN".

**Fix:** Map both to `landAreaSau` or add `landArea` to `XlsxParseMeta`.

## Low Priority

### 9. `preferentialRate` fallback to `stdRate` in builder
Line 186: `const prefRate = Number(financials.preferential_rate) || stdRate;` -- if preferential rate is explicitly 0 (no preference), it falls back to stdRate. This is correct behavior for this domain but the `|| stdRate` masks intentional 0. Use `?? stdRate` if 0 should mean "no preference".

### 10. RepaymentScheduleTable receives `preferentialRate || interestRate` (line 287)
If user clears preferential rate field, `preferentialRate` = 0, so `0 || interestRate` = interestRate. Correct behavior but `??` would be more explicit.

---

## Positive Observations
- Clean type definitions with good Vietnamese documentation comments
- `safeNum` and `toRevenueInput` provide robust parsing
- Conditional UI rendering for trung_dai is well-structured
- Seed template includes sensible defaults for greenhouse scenario
- Placeholder registry properly registers both depreciation group and repayment loop

## Recommended Actions (priority order)
1. **Refactor:** Use `calcRepaymentSchedule` and `calcDepreciation` from calculator (eliminate 3x duplication)
2. **Fix:** Add try-catch to `loadPlan` and `handleSave`
3. **Fix:** `META_KEY_MAP` "Số sào đất" should map to `landAreaSau`
4. **Refactor:** Extract RepaymentScheduleTable to separate file (page exceeds 200 lines)
5. **Minor:** Replace `||` with `??` for rate fallbacks

## Metrics
- Type Coverage: Good (all new types properly defined)
- Test Coverage: No tests for calculator functions (calcDepreciation, calcRepaymentSchedule)
- Linting Issues: Not checked (no build run)

## Unresolved Questions
- Should `calcRepaymentSchedule` support partial-year terms (e.g., 30 months = 2.5 years)? Current `Math.ceil` rounds up, last year gets remainder principal. Verify with business requirements.
- Is `landArea` vs `landAreaSau` distinction intentional for different XLSX formats?
