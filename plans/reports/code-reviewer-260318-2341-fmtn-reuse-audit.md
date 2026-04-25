# Code Reuse Audit: fmtN & Customers Page

## Finding 1 — CRITICAL DRY: `fmtN` duplicates `formatNumberVnDisplay`

**Files:**
- `src/lib/report/format-number-vn.ts` — `fmtN()` (new, 10 lines)
- `src/app/report/mapping/helpers.ts:103` — `formatNumberVnDisplay()` (existing)

**Both** do `toLocaleString("vi-VN")` on parsed numeric input. Differences are minor:
- `fmtN` returns `""` for `0`; `formatNumberVnDisplay` returns `"0"`
- `fmtN` caps at 2 decimal places; `formatNumberVnDisplay` uses up to 6
- `fmtN` does its own string cleaning (`replace(/\./g, "")`); `formatNumberVnDisplay` delegates to `parseNumericLikeValue`

**Action:** Consolidate into one function. Recommended approach:
1. Keep `fmtN` in `format-number-vn.ts` as the canonical formatter (report context needs `""` for zero)
2. Make `formatNumberVnDisplay` call `fmtN` internally, or replace usages in `FieldRow.tsx` with `fmtN`
3. If the `maxFractionDigits` difference matters, add an optional param: `fmtN(v, { maxDecimals: 6 })`

**Impact:** 2 files import `formatNumberVnDisplay` (`FieldRow.tsx`, `helpers.ts`). 4 files import `fmtN`. Low-risk consolidation.

---

## Finding 2 — HIGH: `customers/page.tsx` is 519 lines (limit: 200)

The file contains:
- Main page component with fetch, filter, sort state
- `CustomerTable` sub-component (line 318+)
- `SortIcon` sub-component
- Inline sort logic + toggle type handler

**Action:** Extract:
1. `CustomerTable` + `SortIcon` → `customers/_components/customer-table.tsx`
2. Sort hook (`sortKey`, `sortDir`, `handleSort`, sorted memo) → `customers/_hooks/use-customer-sort.ts`
3. This reduces page.tsx to ~200 lines

---

## Finding 3 — LOW: Sort logic not reused but not duplicated either

The `sortKey/sortDir` pattern in `customers/page.tsx` is the only table-sort in the app. No duplication found. A generic `useTableSort` hook is YAGNI for now — only extract if a second table needs sorting.

---

## Finding 4 — INFO: `void fmtN` dead code

`src/services/khcn-builder-persons.ts:92` has `void fmtN;` — unused import side-effect suppression. Remove the import and this line.

---

## Summary

| # | Severity | Issue | Action |
|---|----------|-------|--------|
| 1 | Critical DRY | `fmtN` ≈ `formatNumberVnDisplay` | Consolidate |
| 2 | High | page.tsx 519 lines | Extract components |
| 3 | Low | Sort logic unique | No action needed |
| 4 | Low | Dead `void fmtN` | Remove |
