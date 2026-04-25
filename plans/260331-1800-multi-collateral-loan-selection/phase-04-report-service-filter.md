# Phase 4: Report Service Filter

## Context
- [khcn-report.service.ts](../../src/services/khcn-report.service.ts) — buildKhcnReportData, generateKhcnReport
- [khcn-report-data-loader.ts](../../src/services/khcn-report-data-loader.ts) — loadFullCustomer

## Overview
- **Priority**: P1
- **Status**: pending
- **Effort**: 30m
- **Dependencies**: Phase 1 (field exists in DB)

Filter collaterals by `loan.selectedCollateralIds` truoc khi build report data. Backward compat: empty array = dung tat ca.

## Key Insights
- `buildKhcnReportData()` loads customer via `loadFullCustomer()` which returns ALL collaterals
- Collaterals used in 3 places within the function:
  1. `data.TSBD` loop (line ~171) — collateral list for templates
  2. Total calculations (line ~185-205) — sum values
  3. Type-specific builders (line ~208-211) — `buildLandCollateralData`, etc.
- `loan` already available in the function (line ~54): `const loan = c.loans[0]`
- Loan model will have `selectedCollateralIds` after Phase 1

## Requirements
- If `loan.selectedCollateralIds` is non-empty JSON array, filter `c.collaterals` to only matching IDs
- Empty array or `"[]"` = use ALL collaterals (backward compat)
- Filtered collaterals used for TSBD loop, totals, AND type-specific builders
- Clone count in `generateKhcnReport` also uses filtered data (via data.TSBD)

## Files to Modify

| File | Change |
|------|--------|
| `src/services/khcn-report.service.ts` | Filter collaterals after loading, before building data |

## Implementation Steps

1. **Add filter logic** — After `const loan = c.loans[0]` (line ~54), add:
   ```ts
   // Filter collaterals by loan selection (empty = use all)
   let collaterals = c.collaterals;
   if (loan?.selectedCollateralIds) {
     try {
       const selectedIds: string[] = JSON.parse(loan.selectedCollateralIds);
       if (selectedIds.length > 0) {
         collaterals = c.collaterals.filter(col => selectedIds.includes(col.id));
       }
     } catch { /* invalid JSON — use all */ }
   }
   ```

2. **Replace `c.collaterals` references** — Use `collaterals` variable instead of `c.collaterals` in:
   - `data.TSBD = collaterals.map(...)` (was `c.collaterals.map`)
   - `totalCollateralValue = collaterals.reduce(...)` (was `c.collaterals.reduce`)
   - `totalObligation = collaterals.reduce(...)` (was `c.collaterals.reduce`)
   - `useCollateralRows = collaterals.length > 0` (was `c.collaterals.length`)
   - `buildLandCollateralData(collaterals, data)` (was `c.collaterals`)
   - `buildMovableCollateralData(collaterals, data)`
   - `buildSavingsCollateralData(collaterals, data)`
   - `buildOtherCollateralData(collaterals, data)`

3. **No change to generateKhcnReport** — It reads from `data.TSBD` which is already filtered.

4. **No change to loadFullCustomer** — Still loads ALL collaterals (needed for other uses).

5. **Compile check**.

## Todo
- [ ] Add collateral filter logic after loan load
- [ ] Replace all `c.collaterals` with filtered `collaterals` in data building
- [ ] Verify generateKhcnReport clone count uses filtered TSBD
- [ ] Compile check

## Success Criteria
- Report with selectedCollateralIds = `["id1","id2"]` only includes those 2 collaterals
- Report with selectedCollateralIds = `"[]"` or missing includes ALL collaterals
- Clone count matches filtered count (not total)
- Totals (TGTTSBĐ, NVBD) reflect filtered selection

## Risk
- Low: Simple filter, backward compat via empty array check
- Edge case: Deleted collateral ID in selection — filter naturally excludes (no error)
