# Efficiency Review: Customers Page, Collateral Builder, KHCN Report Service

**Date:** 2026-03-18 | **Reviewer:** code-reviewer

## Scope
- `src/app/report/customers/page.tsx` (520 LOC)
- `src/services/khcn-builder-collateral-land.ts` (255 LOC)
- `src/services/khcn-report.service.ts` (350 LOC)
- `src/lib/report/format-number-vn.ts` (10 LOC)

## Findings

### 1. `[...filteredCustomers].sort()` copy — NOT an issue
**Verdict: Acceptable.** The spread + sort is the correct pattern since `Array.sort()` mutates in-place. With `useMemo` deps on `filteredCustomers/sortKey/sortDir`, this only runs when those change. Customer lists are typically <500 items — negligible cost.

### 2. `fmtN` — moderate concern on hot path
**`fmtN` implementation:**
```ts
String(v).replace(/\./g, "").replace(/,/g, ".").trim() → Number() → toLocaleString("vi-VN")
```
**Issue:** `toLocaleString` is slow (~10-50x slower than manual string formatting). In `khcn-builder-collateral-land.ts`, `fmtN` is called ~30+ times per collateral in `extractLandFields`, then again in `buildLandCollateralData` for valuation rows and summary table — some values get `fmtN`'d twice (once in `extractLandFields` line 84-94, then again in valuation loop lines 195-197 where `fmtN(ff["DT dat 1"])` re-formats an already-formatted string).

**Impact:** For a customer with 5 land collaterals, that's ~200+ `toLocaleString` calls. Still under 10ms total on modern hardware, but the double-formatting is a correctness risk too — `fmtN("1.234.567")` strips dots, gets `1234567`, re-formats to `"1.234.567"` (happens to be idempotent for integers but will break for decimals).

**Recommendation (HIGH):**
- In `buildLandCollateralData` lines 195-197, the valuation loop calls `fmtN(ff["DT dat 1"])` on values that are already formatted strings from `extractLandFields`. Remove the redundant `fmtN` wrapping — these are already formatted.
- Same issue at line 227-230 in `TSBD_DINH_GIA` map: `fmtN(col.total_value)` is correct (raw number), but `f["Gia tri dat"]` is already formatted — don't re-wrap with `fmtN`.

### 3. `numberToVietnameseWords` double computation
In `khcn-report.service.ts`:
- Line 122: `numberToVietnameseWords(loan.loanAmount)`
- Line 162: `numberToVietnameseWords(latestDisb.debtAmount ?? latestDisb.amount)`
- Lines 191, 201, 228, 230, 252-254: multiple calls

Then in `khcn-builder-collateral-land.ts`:
- Lines 33, 78, 81-82, 228, 230, 252-254: per-collateral calls

**Verdict: Acceptable.** Each call is on a different value. No actual duplication of the same input. `numberToVietnameseWords` is pure arithmetic — fast enough.

### 4. N+1 query patterns — NONE found
`loadFullCustomer` uses a single Prisma query with nested `include` — all relations loaded in one round-trip. No N+1.

### 5. Barrel re-exports — minor concern
`khcn-report-data-builders.ts` is imported with 14 named imports. Let me check if it's a barrel.

**File `khcn-report-data-builders.ts`** re-exports from individual builder modules. Next.js with webpack/turbopack handles named imports well for tree-shaking — this is fine for server-side code (report generation runs server-side only). No action needed.

### 6. `typeFilter` triggers full API reload
In `page.tsx` line 50-56, changing `typeFilter` refetches from API with `?type=` param. But `searchQuery` is client-side only. This means switching "DN" -> "CN" -> "All" fires 3 API calls.

**Recommendation (LOW):** Consider fetching all customers once and filtering client-side (same as search). The API already returns all for `type=all`. This eliminates redundant network calls when toggling filters.

### 7. `new Date(c.updatedAt).toLocaleDateString("vi-VN")` in render loop
Line 396: Called per-row per-render. `toLocaleDateString` is relatively slow.

**Verdict: Acceptable** for <500 rows. Would matter at 1000+.

## Summary of Actionable Items

| # | Priority | File | Issue |
|---|----------|------|-------|
| 1 | **HIGH** | `khcn-builder-collateral-land.ts:195-197` | Double `fmtN` on already-formatted values in valuation loop — remove redundant calls |
| 2 | **LOW** | `customers/page.tsx:50` | `typeFilter` change triggers API reload; consider client-side filtering |

## Unresolved Questions
- Is `fmtN` guaranteed idempotent for decimal values (e.g., `"1.234,56"`)? If not, the double-formatting in valuation rows could produce incorrect output.
