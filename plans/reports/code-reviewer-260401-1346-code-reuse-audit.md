# Code Reuse Audit

**Scope:** Git diff (staged + unstaged) — collateral savings/GTCG, termUnit, camco templates, BK import STK
**Date:** 2026-04-01

---

## Issues Found

### 1. MEDIUM — Duplicated "months diff" magic number `30.44 * 24 * 3600000`

Appears in **3 places** with identical logic:

| File | Line |
|------|------|
| `src/services/khcn-report.service.ts` | ~132, ~256 |
| `src/components/invoice-tracking/disbursement-form-modal.tsx` | ~158-159 |

All do `Math.round(diffMs / (30.44 * 24 * 3600000))`.

Additionally, `field-calc-date-utils.ts` already has `addMonthsClamped()` — a date utility module exists but is not reused.

**Fix:** Extract to a shared util in `src/lib/date-calc.ts`:
```ts
export const MS_PER_DAY = 24 * 3600000;
export const AVG_DAYS_PER_MONTH = 30.44;
export function diffMonths(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / (AVG_DAYS_PER_MONTH * MS_PER_DAY));
}
export function diffDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}
```

### 2. MEDIUM — `mapPaperTypeLabel()` duplicates `GTCG_PAPER_TYPES` label mapping

`mapPaperTypeLabel()` in `khcn-builder-collateral-savings-other.ts:10` hardcodes the same label strings as `GTCG_PAPER_TYPES` in `collateral-config.ts:197-200`:

- `"trai_phieu"` -> `"Trai phieu"` (both files)
- `"chung_chi_tien_gui"` -> `"Chung chi tien gui"` (both files)
- default -> `"So tiet kiem"` (both files)

**Fix:** Import `GTCG_PAPER_TYPES` from collateral-config and derive label via lookup:
```ts
import { GTCG_PAPER_TYPES } from "@/app/report/customers/[id]/components/collateral-config";

function mapPaperTypeLabel(subtype: string, paperType: string): string {
  if (subtype !== "gtcg") return "So tiet kiem";
  return GTCG_PAPER_TYPES.find(t => t.value === paperType)?.label ?? "So tiet kiem";
}
```

### 3. LOW — `calcEndDateFromTerm` / `calcTermFromEndDate` inlined in component

`disbursement-form-modal.tsx:140-159` defines date arithmetic functions inline inside the component body (recreated every render). These are pure functions with no component dependency.

**Fix:** Move to `src/lib/invoice-tracking-format-helpers.ts` or a new `src/lib/date-calc.ts` (same as issue #1). Also wrap with `useCallback` or extract outside component scope since they're pure.

### 4. LOW — `extractSavingsCollateral` follows same pattern as `extractCollateral` but not consolidated

Both functions in `bk-to-customer-relations.ts` follow identical structure: check key field -> build propMapping -> loop -> return CollateralData. Not a blocker since they map different BK fields to different property keys, but the pattern could be DRYer with a generic `extractTypedCollateral(type, keyField, propMapping)` factory.

**Fix (optional):** Create factory function — only worthwhile if a 3rd collateral type (dong_san) is added later. Current duplication is acceptable.

---

## Clean Areas (No Issues)

- **`khcn-camco-template-registry.ts`** (new file) — properly separated from asset registry, follows same pattern
- **`khcn-template-registry.ts`** — clean merge of camco + asset registries
- **`bk-mapping.ts` STK section** — new mapping, no duplication with existing SĐ mappings
- **`collateral-config.ts`** — `TK_SUBTYPES`, `GTCG_PAPER_TYPES`, `GTCG_ONLY_KEYS` are well-placed config constants
- **`disbursement.service.ts`** — `termUnit` additions follow existing field patterns exactly

---

## Summary

| Priority | Count | Action |
|----------|-------|--------|
| Medium | 2 | Extract shared date diff util; DRY paper-type labels |
| Low | 2 | Move pure date funcs out of component; optional collateral factory |

No critical or high-priority code reuse issues.
