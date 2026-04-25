# Efficiency Review: Multi-Collateral Loan Selection

**Date:** 2026-03-31
**Focus:** N+1 queries, concurrency, hot-path bloat, memory leaks, overly broad operations

---

## Findings

### HIGH: Sequential waterfall fetches in loan detail page

**File:** `src/app/report/loans/[id]/page.tsx` (lines 140-155)

Three sequential fetches: loan -> disbursements -> collaterals. The collateral fetch (line 144-155) waits for loan to resolve before firing, creating a waterfall:

```
loadLoan() ──[wait]──> setLoan ──> useEffect[loan.customer.id] ──> fetch collaterals
loadDisbursements() ──[parallel with loan, good]──>
```

**Impact:** Extra network round-trip (100-300ms) on every page load. Collateral data is not needed until render, but the sequential dependency is artificial -- the API endpoint `/api/customers/:id/collaterals` only needs `customerId`, which could be resolved from the loan API response in parallel if the loan API returned it eagerly.

**Fix options:**
1. Include collaterals in the loan GET response (server join, single fetch)
2. Fetch collaterals from `customerId` route param if available from referrer URL
3. Use `Promise.all` in a single `useEffect` if both IDs are known

### MEDIUM: `hasChanged` recomputed every render (allocates Set each time)

**File:** `src/app/report/loans/[id]/components/loan-collateral-picker.tsx` (lines 41-46)

```ts
const hasChanged = (() => {
  const initial = new Set(initialSelectedIds);
  if (initial.size !== selectedIds.size) return true;
  for (const id of selectedIds) if (!initial.has(id)) return true;
  return false;
})();
```

Creates a new `Set(initialSelectedIds)` on every render. With typical collateral counts (5-20), this is negligible CPU-wise. However, `initialSelectedIds` is itself parsed from JSON via an IIFE on every parent render (page.tsx line 260):

```ts
initialSelectedIds={(() => { try { return JSON.parse(loan.selectedCollateralIds || "[]"); } catch { return []; } })()}
```

This creates a **new array reference every render**, causing `LoanCollateralPicker` to re-render even when loan data hasn't changed (props are referentially different).

**Fix:** Memoize `initialSelectedIds` with `useMemo`:
```ts
const initialSelectedIds = useMemo(() => {
  try { return JSON.parse(loan?.selectedCollateralIds || "[]"); }
  catch { return []; }
}, [loan?.selectedCollateralIds]);
```

### MEDIUM: `getFullProfile` over-fetches for collateral summary

**File:** `src/services/customer.service.ts` (lines 262-342)

`getFullProfile` loads ALL relations (loans with nested disbursements+invoices+beneficiaryLines, mapping_instances, collaterals, co_borrowers) in a single Prisma query. The `collaterals` select is minimal (`id, total_value, obligation`), which is good. But the deeply nested `disbursements -> invoices` and `disbursements -> beneficiaryLines -> invoices` eager loading means every call to the customer profile page loads the entire disbursement/invoice tree.

**Impact:** For customers with many loans/disbursements/invoices, this is a heavy query. Not a regression from multi-collateral work specifically, but the addition of `collaterals` summary computation (lines 338-339) adds iteration cost proportional to collateral count.

**Current cost:** O(loans * disbursements * invoices) iteration in summary computation. Acceptable for typical KHCN customers (1-3 loans, 5-10 disbursements each), but could degrade for power users.

### LOW: `Array.includes()` in collateral filter (report service)

**File:** `src/services/khcn-report.service.ts` (line 63)

```ts
collaterals = c.collaterals.filter((col) => selectedIds.includes(col.id));
```

`selectedIds` is a `string[]` from `JSON.parse`. `Array.includes()` is O(n) per call, making the filter O(n*m) where n=collaterals, m=selectedIds. With typical counts (5-20 collaterals, 1-10 selected), this is trivially fast.

**No action needed** unless collateral counts grow significantly. If they do, convert to `Set` for O(1) lookup.

### LOW: Collateral API returns full model + parsed JSON

**File:** `src/app/api/customers/[id]/collaterals/route.ts` (lines 11-21)

The API returns all collateral fields plus parsed `properties_json`. The picker only needs `id, name, collateral_type, total_value, obligation`. Over-fetching from DB and over-serializing to client.

**Fix:** Add Prisma `select` to limit fields, or create a separate lightweight endpoint for the picker.

### LOW: No abort controller on collateral fetch

**File:** `src/app/report/loans/[id]/page.tsx` (lines 144-155)

The collateral `useEffect` fetch has no `AbortController`. If `loan.customer.id` changes rapidly (unlikely but possible via navigation), stale responses could overwrite current state.

**Fix:** Add cleanup with `AbortController`:
```ts
useEffect(() => {
  if (!loan?.customer?.id) return;
  const ctrl = new AbortController();
  fetch(`/api/customers/${loan.customer.id}/collaterals`, { signal: ctrl.signal })
    .then(r => r.json())
    .then(d => { if (!ctrl.signal.aborted) setCollaterals(...); })
    .catch(() => {});
  return () => ctrl.abort();
}, [loan?.customer?.id]);
```

---

## No Issues Found

- **N+1 queries:** `loadFullCustomer` in `khcn-report-data-loader.ts` uses a single Prisma query with nested includes -- no N+1
- **Memory leaks:** No event listeners or subscriptions left dangling
- **Concurrency bugs:** State updates in picker use functional `setSelectedIds(prev => ...)` -- correct
- **Overly broad DB operations:** `loadFullCustomer` scopes loans by `loanId` when provided, limits disbursements to `take: 1` -- efficient

---

## Priority Summary

| Priority | Issue | Effort |
|----------|-------|--------|
| HIGH | Sequential waterfall: loan -> collateral fetch | S |
| MEDIUM | `initialSelectedIds` creates new array ref every render | XS |
| MEDIUM | `getFullProfile` eager-loads entire disbursement tree | M (refactor) |
| LOW | `Array.includes` in filter loop | XS |
| LOW | Collateral API over-fetches fields | S |
| LOW | Missing AbortController on collateral fetch | XS |

---

## Unresolved Questions

1. Is `getFullProfile` called on every customer page load or cached? If uncached, the deep include is a scaling concern independent of multi-collateral.
2. Can the loan GET API (`/api/loans/:id`) be extended to include customer collaterals in a single response, eliminating the waterfall?
