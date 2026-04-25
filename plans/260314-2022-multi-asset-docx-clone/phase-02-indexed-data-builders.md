---
phase: 2
title: "Indexed Data Builders"
status: pending
effort: 1h
---

# Phase 2: Indexed Data Builders

## Context
- [khcn-report-data-builders.ts](../../src/services/khcn-report-data-builders.ts)
- Current builders: `buildLandCollateralData`, `buildMovableCollateralData`, `buildSavingsCollateralData`, `buildOtherCollateralData`

## Overview
Add indexed variants of collateral data builders that emit `SĐ_1.X`, `SĐ_2.X` etc. instead of just `SĐ.X`.

## Key Insights
- Current `buildLandCollateralData` already calls `extractLandFields()` per collateral but only writes `SĐ.*` from first item
- Same pattern for `buildMovableCollateralData` — only first `ĐS.*`
- Solution: iterate ALL items, write `PREFIX_i.*` for each

## Architecture

Prefix-to-type mapping:
| Prefix | Collateral Type | Builder |
|--------|----------------|---------|
| `SĐ` | `qsd_dat` | `buildLandCollateralData` |
| `ĐS` | `dong_san` | `buildMovableCollateralData` |
| `TK` | `tiet_kiem` | `buildSavingsCollateralData` |
| `TSK` | `tai_san_khac` | `buildOtherCollateralData` |

New exported constant: `COLLATERAL_PREFIX_MAP`

## Related Code Files
- **Modify:** `src/services/khcn-report-data-builders.ts`

## Implementation Steps

1. Add `COLLATERAL_PREFIX_MAP` export mapping prefix → collateral_type
2. Update `buildLandCollateralData`: after existing flat `SĐ.*` from first item, also emit `SĐ_1.*`, `SĐ_2.*`... for ALL land collaterals
3. Same for `buildMovableCollateralData` → `ĐS_1.*`, `ĐS_2.*`
4. Same for `buildSavingsCollateralData` → `TK_1.*`, `TK_2.*`
5. Same for `buildOtherCollateralData` → `TSK_1.*`, `TSK_2.*`
6. Add helper function `emitIndexedFields(data, prefix, fields, index)` to DRY the pattern
7. Export `getCollateralCountByPrefix(collaterals, prefix)` for cloner to know N

## Todo List
- [ ] Add `COLLATERAL_PREFIX_MAP` constant
- [ ] Add `emitIndexedFields()` helper
- [ ] Update 4 builder functions to emit indexed keys
- [ ] Add `getCollateralCountByPrefix()` export
- [ ] Backward compat: keep flat `SĐ.*` from first item (existing templates still work)

## Success Criteria
- Customer with 3 land collaterals → data dict has `SĐ_1.Tên TSBĐ`, `SĐ_2.Tên TSBĐ`, `SĐ_3.Tên TSBĐ` plus legacy `SĐ.Tên TSBĐ` (= first)
- ĐSH.* owner fields also indexed per collateral
