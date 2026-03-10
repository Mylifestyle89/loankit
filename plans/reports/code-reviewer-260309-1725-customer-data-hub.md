# Code Review: Customer Data Hub

**Date:** 2026-03-09 | **Reviewer:** code-reviewer | **Focus:** State management, cross-tab sync, SSR hydration

## Scope

- **Files reviewed:** 8 (3 new, 5 modified)
- **LOC added:** ~180
- **Dependents scouted:** 16 files import `use-customer-store`

| File | Status |
|------|--------|
| `src/stores/use-customer-store.ts` | NEW - shared Zustand store |
| `src/hooks/use-customer-data.ts` | NEW - shared fetch hook |
| `src/components/customer-context-indicator.tsx` | NEW - sidebar widget |
| `src/app/report/mapping/stores/use-customer-store.ts` | MODIFIED - re-export shim |
| `src/app/report/layout.tsx` | MODIFIED - added indicator + hook |
| `src/app/report/customers/page.tsx` | MODIFIED - select button |
| `src/app/report/loans/page.tsx` | MODIFIED - store sync |
| `src/app/report/invoices/page.tsx` | MODIFIED - store sync |

## Overall Assessment

Bien fait. Store architecture is clean: hydration guard, `partialize` for minimal persistence, re-export shim for backward compat. Cross-tab sync pattern (store -> local state via `useEffect`) is correct. No breaking changes to existing mapping consumers.

Two substantive issues found: a double-fetch race and missing error handling in the shared hook.

---

## High Priority

### H1. Double-fetch of `/api/customers` on mapping page

**Problem:** `useCustomerData()` is called in `layout.tsx` (line 44), which fires on every `/report/*` route. Independently, `useMappingEffects.ts` (line 38) calls `loadCustomers()` from `useMappingApi` when the mapping page mounts. Both hit `/api/customers` and both write to the same store.

The guard in `useCustomerData` (`customers.length > 0 || loading`) depends on timing. If `useMappingEffects` fires first and sets `loadingCustomers = true`, the layout hook skips -- fine. But if layout hook fires first (likely, since layout renders before page), *both* will still race because `useMappingApi.loadCustomers` has no such guard.

**Impact:** Redundant API call on every mapping page visit. Benign data-wise (last write wins, same data), but wasteful.

**Fix:** Either:
- (a) Remove `loadCustomers` from `useMappingEffects` -- the layout already fetches. Mapping page can rely on the shared hook.
- (b) Add the same `customers.length > 0 || loading` guard to `useMappingApi.loadCustomers`.

Option (a) is cleaner and aligns with the "single source of truth" intent.

### H2. No error handling in `useCustomerData` hook

**Problem:** `src/hooks/use-customer-data.ts` line 20-25. The `.then()` chain catches nothing. If `/api/customers` returns non-2xx or network error, `setLoading(false)` runs via `.finally()` but the error is silently swallowed. No error state exposed to consumers.

```ts
// Current -- silent failure
fetch("/api/customers")
  .then((r) => r.json())
  .then((d) => { if (d.ok) setCustomers(d.customers ?? []); })
  .finally(() => setLoading(false));
```

**Fix:** Add `.catch()` and expose error. Either add `error` field to store or return it from hook:

```ts
fetch("/api/customers")
  .then((r) => r.json())
  .then((d) => {
    if (d.ok) setCustomers(d.customers ?? []);
    else console.error("Customer fetch failed:", d.error);
  })
  .catch((err) => console.error("Customer fetch error:", err))
  .finally(() => setLoading(false));
```

---

## Medium Priority

### M1. Customers page fetches independently, ignoring shared store

`customers/page.tsx` has its own `loadCustomers` (line 47-58) that maintains local `customers` state. It also reads `selectedCustomerId` from the store but never syncs its fetched customers *back* to the store, nor reads from the store.

This means:
- Layout fetches customers into store (via `useCustomerData`)
- Customers page fetches again into local state (line 62-66)
- Two separate API calls for the same data

**Fix:** Use `useCustomerData()` for the customer list, keep local state only for page-specific concerns (like the export modal selections).

### M2. Loans page: filter desync when user changes `<select>` manually

`loans/page.tsx` syncs store -> `customerId` local state (line 34-36). But user can also change the `<select>` directly (line 109). This local change does NOT write back to the store, so:
- User on loans page selects "Customer A" via dropdown -- only local `customerId` changes
- User navigates away and back -- `storeCustomerId` (possibly empty) overwrites the local selection

This is arguably correct behavior (store = global context, dropdown = local override). But it's confusing UX: the user's dropdown selection doesn't persist across navigation.

**Recommendation:** Either:
- (a) Two-way sync: also write to store on dropdown change. But this means dropdown change on loans page affects invoices page too -- maybe undesirable.
- (b) Keep as-is but document the intent. The current behavior is not a bug, just a design choice.

### M3. `CustomerContextIndicator` missing `AnimatePresence` usage

The `AnimatePresence` import (line 4) is imported but never used. Dead import.

### M4. Customers page exceeds 200-line limit

`customers/page.tsx` is 370 lines. The export modal (lines 267-367) should be extracted to a separate component per project convention.

---

## Low Priority

### L1. `useSelectedCustomer` makes 3 separate selector calls

```ts
const customers = useCustomerStore((s) => s.customers);
const isHydrated = useIsCustomerStoreHydrated();
const selectedId = useCustomerStore((s) => s.selectedCustomerId);
```

Three subscriptions. Could consolidate into one selector returning `{ customers, isHydrated, selectedId }`. Minor perf -- only matters with very frequent re-renders.

### L2. `useCustomerData` dependency array includes `setCustomers` and `setLoading`

These are stable Zustand setters (same reference across renders), so listing them is harmless but unnecessary.

---

## SSR/Hydration Analysis

**Verdict: Safe.**

- `_hasHydrated` flag prevents rendering stale server-side values
- `useIsCustomerStoreHydrated()` correctly gates `CustomerContextIndicator` (returns null before hydration)
- `useSelectedCustomer()` returns null before hydration
- All consuming components are `"use client"`
- `partialize` only persists `selectedCustomerId`, not the customer list -- avoids stale data issues

---

## Positive Observations

1. **Re-export shim** -- backward compat for all 10+ mapping imports without mass refactor
2. **Hydration guard** -- proper `onRehydrateStorage` callback prevents SSR mismatch
3. **`partialize`** -- only persists the selected ID, not the full customer list. Correct choice.
4. **`useSelectedCustomer` with `useMemo`** -- prevents unnecessary re-computation
5. **Layout-level data fetching** -- single fetch point for all tabs, good DRY

---

## Recommended Actions (prioritized)

1. **[H1]** Remove `loadCustomers` from `useMappingEffects` initial load, rely on layout hook
2. **[H2]** Add error handling to `useCustomerData` fetch chain
3. **[M1]** Refactor customers page to use `useCustomerData()` instead of independent fetch
4. **[M3]** Remove unused `AnimatePresence` import from indicator component
5. **[M4]** Extract export modal from customers page into separate component

## Unresolved Questions

- Is the loans/invoices dropdown meant to be a "local override" or should it two-way sync with the global store? This is a UX decision, not a code issue.
- Should `useMappingApi.loadCustomers` be removed entirely now that the layout handles it, or kept as a manual refresh mechanism?
