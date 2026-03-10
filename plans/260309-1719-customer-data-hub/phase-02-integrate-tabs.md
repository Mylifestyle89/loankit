# Phase 2: Integrate Tabs + Sidebar Customer Indicator

## Overview
- **Priority:** P1
- **Status:** complete (depends on Phase 1)
- **Effort:** 2h

Wire up global customer selection in Customers tab, auto-filter in Loans/Invoices, and show selected customer in sidebar.

## Key Insights
- Loans page already has a `customerId` state + filter dropdown - just need to sync with store
- Invoices page already has `customerFilter` state + dropdown - same approach
- Customers page has no selection concept - need to add "select as active" button per customer card
- Sidebar (`layout.tsx`) is 310 lines - already at limit, need small component

## Related Code Files

### Modify
- `src/app/report/customers/page.tsx` - add "select customer" action per card
- `src/app/report/loans/page.tsx` - sync `customerId` with store, remove independent customer fetch
- `src/app/report/invoices/page.tsx` - sync `customerFilter` with store, remove independent customer fetch
- `src/app/report/layout.tsx` - add CustomerContextIndicator component

### Create
- `src/components/customer-context-indicator.tsx` - small sidebar widget showing selected customer

## Implementation Steps

### 1. Customers page - add selection
In `src/app/report/customers/page.tsx`:
- Import `useCustomerStore` from `@/stores/use-customer-store`
- Import `useCustomerData` hook (replace local fetch logic with it for the customer list display - but keep local richer `Customer` type for display)
- Actually, keep the local fetch for the FULL customer data (address, etc.) since store only holds minimal fields
- Add a "Select" button on each customer card that calls `setSelectedCustomerId(c.id)`
- Highlight the currently selected customer card (violet border/ring)
- Add a "Clear selection" button in toolbar when a customer is selected

```tsx
// In customer card actions div, add:
<button onClick={() => setSelectedCustomerId(c.id)}
  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
    selectedCustomerId === c.id
      ? "bg-violet-600 text-white"
      : "bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-slate-400 hover:bg-violet-50"
  }`}>
  {selectedCustomerId === c.id ? "Đang chọn" : "Chọn KH"}
</button>
```

### 2. Loans page - sync with store
In `src/app/report/loans/page.tsx`:
- Import `useCustomerStore` and `useCustomerData`
- Replace local `customers` state + fetch with `useCustomerData()` hook
- Initialize `customerId` from `useCustomerStore.selectedCustomerId` instead of `""`
- Sync: when store's `selectedCustomerId` changes, update local `customerId`
- Keep the dropdown so user can still manually filter (override store selection)

```tsx
const storeCustomerId = useCustomerStore((s) => s.selectedCustomerId);
const { customers } = useCustomerData();
const [customerId, setCustomerId] = useState("");

// Sync store -> local filter
useEffect(() => {
  setCustomerId(storeCustomerId);
}, [storeCustomerId]);
```

### 3. Invoices page - sync with store
In `src/app/report/invoices/page.tsx`:
- Same pattern as Loans
- Replace local `customers` state + fetch with `useCustomerData()`
- Sync `customerFilter` with store's `selectedCustomerId`

```tsx
const storeCustomerId = useCustomerStore((s) => s.selectedCustomerId);
const { customers } = useCustomerData();
const [customerFilter, setCustomerFilter] = useState("");

useEffect(() => {
  setCustomerFilter(storeCustomerId);
}, [storeCustomerId]);
```

### 4. Customer context indicator in sidebar
Create `src/components/customer-context-indicator.tsx` (~60 lines):

```tsx
"use client";
import { useCustomerStore, useSelectedCustomer } from "@/stores/use-customer-store";
import { useIsCustomerStoreHydrated } from "@/stores/use-customer-store";
import { User, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function CustomerContextIndicator({ expanded }: { expanded: boolean }) {
  const customer = useSelectedCustomer();
  const hydrated = useIsCustomerStoreHydrated();
  const clear = useCustomerStore((s) => s.setSelectedCustomerId);

  if (!hydrated || !customer) return null;

  return (
    <div className={`mx-1.5 mb-1.5 rounded-lg border border-violet-200 dark:border-violet-500/20
      bg-violet-50 dark:bg-violet-500/10 ${expanded ? "px-2.5 py-2" : "py-2 px-1"}`}>
      {expanded ? (
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-violet-700 dark:text-violet-300">
              {customer.customer_name}
            </p>
            <p className="truncate text-[10px] text-violet-500 dark:text-violet-400/70">
              {customer.customer_code}
            </p>
          </div>
          <button onClick={() => clear("")} className="shrink-0 rounded p-0.5
            hover:bg-violet-200 dark:hover:bg-violet-500/20 transition-colors">
            <X className="h-3 w-3 text-violet-500" />
          </button>
        </div>
      ) : (
        <div className="flex justify-center" title={customer.customer_name}>
          <User className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        </div>
      )}
    </div>
  );
}
```

### 5. Add indicator to layout
In `src/app/report/layout.tsx`:
- Import `CustomerContextIndicator`
- Import `useCustomerData` to ensure store is populated when any report page loads
- Place indicator above nav links (after AI CTA, before `<nav>`)

```tsx
// After AI CTA div, before nav
<CustomerContextIndicator expanded={hovered} />
```

- Also call `useCustomerData()` in the layout to ensure customers are loaded once globally

### 6. Quick navigation from Customers page
- Add navigation links per customer card: "Xem khoản vay" -> `/report/loans?customerId={id}`, "Xem hoa don" -> `/report/invoices?customerId={id}`
- Or simpler: selecting a customer + clicking Loans in sidebar automatically filters (this is already achieved by store sync)
- Decision: **No extra links needed** - the store-based approach already handles this. Select customer -> navigate via sidebar -> auto-filtered.

### 7. Compile + test
- `npx tsc --noEmit`
- Manual test: select customer in Customers tab -> navigate to Loans -> verify auto-filtered
- Clear selection -> verify all tabs show all data

## Todo List
- [x] Add selection action to Customers page cards
- [x] Highlight selected customer card
- [x] Sync Loans page filter with store
- [x] Remove redundant customer fetch in Loans page
- [x] Sync Invoices page filter with store
- [x] Remove redundant customer fetch in Invoices page
- [x] Create CustomerContextIndicator component
- [x] Add indicator to sidebar layout
- [x] Call useCustomerData in layout for global fetch
- [x] Compile check
- [x] Manual smoke test

## Success Criteria
- [x] Selecting customer in Customer List auto-filters Loans and Invoices tabs
- [x] Selected customer visible in sidebar indicator
- [x] Can clear selection to show all data
- [x] Mapping tab still works as before
- [x] No redundant API calls (customers fetched once via shared hook)
- [x] `npx tsc --noEmit` passes

## Risk Assessment
- **Medium**: Loans/Invoices pages have their own filter dropdowns that may conflict with store selection
  - Mitigation: store sets initial value, user can override via dropdown. Store change re-syncs on tab visit.
- **Low**: Layout calling `useCustomerData` might cause unnecessary re-renders
  - Mitigation: Zustand selectors prevent re-renders unless relevant state changes

## Security Considerations
- No security impact - all data already accessible via existing API endpoints
- No new API routes needed
