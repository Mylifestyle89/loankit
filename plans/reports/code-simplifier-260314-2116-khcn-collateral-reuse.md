# Code Reuse Review: KHCN Collateral Files

**Date:** 2026-03-14 | **Scope:** New + modified collateral-related files

## Findings

### 1. `docx-engine.ts` — `generateDocx` vs `generateDocxBuffer` heavy duplication
**Lines 170-235 vs 238-319**: ~80 lines of near-identical code (read file, create PizZip, create Docxtemplater, render, error handling). Only differences: `generateDocxBuffer` adds `preProcessZip` hook, post-render XML cleanup, returns Buffer instead of writing file.

**Recommendation:** Extract shared core (read template -> zip -> render) into private helper. Both methods call it.

**Severity:** Medium (maintainability — any bug fix needs applying twice)

### 2. `collateral-config.ts:179` — duplicate `fmtDate` function
`collateral-config.ts` defines its own `fmtDate(v: string)` (line 179) that overlaps with `src/lib/report/report-date-utils.ts:fmtDate`. The implementations differ slightly (one takes `Date | string | null`, other takes `string` only), but functionally equivalent for string inputs.

**Recommendation:** Reuse `report-date-utils.ts` version or extract a shared string-based formatter. Same applies to `fmtNumber` — verify no duplicate exists in lib.

**Severity:** Low (client-side vs server-side, but still DRY violation)

### 3. `khcn-report-data-builders.ts` — `getCollateralCount` is exported but unused
Exported at line 314, not imported anywhere except test file. The counting logic in `khcn-report.service.ts:215-217` uses inline filter instead of calling `getCollateralCount`.

**Recommendation:** Either use `getCollateralCount` in the service or remove the export (YAGNI).

**Severity:** Low

### 4. `khcn-report-data-builders.ts` — repeated collateral builder pattern
`buildLandCollateralData`, `buildMovableCollateralData`, `buildSavingsCollateralData`, `buildOtherCollateralData` all follow identical structure: filter by type -> build loop array -> emit indexed -> emit flat from first. Could be generalized with a higher-order function:

```ts
function buildTypedCollateralData(type: string, prefix: string, extractor: Function, data: Data, collaterals: [...]) { ... }
```

**Recommendation:** Consider but weigh against readability. Each has different extract function, so the abstraction may not save much. **Acceptable as-is** given the extract functions are type-specific.

**Severity:** Low (pattern duplication, not logic duplication)

### 5. `docx-section-cloner.ts:84` — `escapeRegex` is a common utility
No shared `escapeRegex` exists in the codebase. Only used here, so not a problem yet.

**Verdict:** Clean, no action needed.

### 6. `khcn-asset-template-registry.ts` — Clean
Pure data file, well-organized. No reuse issues.

### 7. `collateral-form.tsx` and `collateral-display.tsx` — Clean
Good separation: config in `collateral-config.ts`, form logic in form, display in display. Shared types (`OwnerEntry`, `CollateralItem`) properly centralized in config.

### 8. `collateral-display.tsx:101-112` — minor: double filter for remaining entries
Lines 101 and 105 both filter `entries.filter(([k]) => !usedKeys.has(k))`. Could compute once.

**Severity:** Negligible

## Summary

| # | File | Issue | Severity | Action |
|---|------|-------|----------|--------|
| 1 | `docx-engine.ts` | generateDocx/generateDocxBuffer duplication | Medium | Extract shared render core |
| 2 | `collateral-config.ts` | Duplicate `fmtDate` | Low | Consider reusing report-date-utils |
| 3 | `khcn-report-data-builders.ts` | Unused `getCollateralCount` export | Low | Use it or remove |
| 4 | `khcn-report-data-builders.ts` | Repeated builder pattern | Low | Acceptable as-is |
| 5-8 | Various | Clean / negligible | - | No action |

## Unresolved Questions
- Is `collateral-config.ts` fmtDate intentionally different from `report-date-utils.ts` fmtDate for client-side bundle size reasons?
