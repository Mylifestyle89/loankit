# Code Review: fmtN, UNC parsing, Customer pages quality
**Date**: 2026-03-18 | **Reviewer**: code-reviewer

## Scope
- `src/lib/report/format-number-vn.ts` — fmtN function
- `src/services/khcn-report.service.ts` — UNC amount parsing, collateral totals
- `src/app/report/customers/page.tsx` — 520 LOC, table+card view
- `src/app/report/customers/[id]/page.tsx` — tab logic

## High Priority

### 1. fmtN treats 0 as empty string (BUG)
- Line 5: `v === 0` in falsy check returns `""` — 0 is valid (zero balance, zero profit)
- Fix: remove `v === 0` from condition

### 2. UNC parsing readability
- Line 275: VN number parsing inline — extract `parseVnNumber()` helper
- Current logic is correct but hard to follow

## Medium Priority

### 3. Falsy zero in collateral totals
- Lines 199-203: `totalCollateralValue || ""` returns `""` when sum=0
- Fix: use `?? ""` or explicit `=== 0` check

### 4. customers/page.tsx exceeds 200 LOC (520 lines)
- CustomerTable (12 props — prop drilling), CustomerCard, skeletons, header all inline
- Extract to `./components/`

### 5. Stringly-typed customer_type
- `"corporate" | "individual"` hardcoded across multiple files
- Create shared `CustomerType` type

### 6. handleDelete missing try-catch
- Network errors from fetch unhandled

## Low Priority
- `setTimeout(0)` pattern unexplained in both pages
- `any[]` types for loans/mapping_instances in [id]/page.tsx

## Unresolved
- Purpose of `setTimeout(0)` in data loading effects?
