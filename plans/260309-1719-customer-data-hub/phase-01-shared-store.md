# Phase 1: Relocate Store + Shared Hook

## Overview
- **Priority:** P1
- **Status:** complete
- **Effort:** 1h

Move `useCustomerStore` from mapping-specific location to shared location. Create a reusable hook for fetching/caching customers.

## Key Insights
- Current store at `src/app/report/mapping/stores/use-customer-store.ts` is mapping-specific but already generic
- Store type `Customer` only has `{ id, customer_name, customer_code }` - Customers page has richer type with `address`, `main_business`, etc.
- Need to keep the store type minimal (id, name, code) for selector use, full data fetched per-page as needed
- 11 files in mapping/ import from current path - all need update

## Related Code Files

### Modify
- `src/app/report/mapping/stores/use-customer-store.ts` -> **MOVE** to `src/stores/use-customer-store.ts`
- All 11 files importing from old path (see list below)

### Create
- `src/hooks/use-customer-data.ts` - shared hook to fetch customers into store (DRY)

### Files needing import path update
```
src/app/report/mapping/components/Modals/TemplatePickerModal.tsx
src/app/report/mapping/components/Modals/CustomerPickerModal.tsx
src/app/report/mapping/page.tsx
src/app/report/mapping/hooks/useFieldTemplates.ts
src/app/report/mapping/hooks/useMappingApi.ts
src/app/report/mapping/components/sidebar/sidebar-data-io-section.tsx
src/app/report/mapping/components/MappingHeader.tsx
src/app/report/mapping/hooks/useTemplateActions.ts
src/app/report/mapping/hooks/useMappingEffects.ts
src/app/report/mapping/hooks/useAiOcrActions.ts
```

## Implementation Steps

### 1. Move store file
- Move `src/app/report/mapping/stores/use-customer-store.ts` to `src/stores/use-customer-store.ts`
- Change localStorage key from `"mapping-selected-customer"` to `"selected-customer"` (breaking change is OK since this is dev)
- Keep all existing exports: `useCustomerStore`, `useIsCustomerStoreHydrated`, `useSelectedCustomer`
- No changes to store shape/logic

### 2. Update all import paths
- In all 11 files above, change import path from relative `../stores/use-customer-store` to `@/stores/use-customer-store`
- Verify tsconfig has `@/` alias pointing to `src/`

### 3. Create shared customer fetch hook
Create `src/hooks/use-customer-data.ts`:
```ts
"use client";
import { useEffect } from "react";
import { useCustomerStore } from "@/stores/use-customer-store";

/**
 * Fetches customer list into the shared store if not already loaded.
 * Call this in any page/component that needs customer data.
 */
export function useCustomerData() {
  const customers = useCustomerStore((s) => s.customers);
  const loading = useCustomerStore((s) => s.loadingCustomers);
  const setCustomers = useCustomerStore((s) => s.setCustomers);
  const setLoading = useCustomerStore((s) => s.setLoadingCustomers);

  useEffect(() => {
    if (customers.length > 0 || loading) return;
    setLoading(true);
    fetch("/api/customers")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setCustomers(d.customers ?? []);
      })
      .finally(() => setLoading(false));
  }, [customers.length, loading, setCustomers, setLoading]);

  return { customers, loading };
}
```

### 4. Delete old store directory if empty
- Remove `src/app/report/mapping/stores/` if no other files remain

### 5. Compile check
- Run `npx tsc --noEmit` to verify no broken imports

## Success Criteria
- [x] Store lives at `src/stores/use-customer-store.ts`
- [x] All mapping imports updated and compile
- [x] `useCustomerData` hook created
- [x] `npx tsc --noEmit` passes

## Risk Assessment
- **Low risk**: Only moving file + updating imports, no logic changes
- **Import breakage**: Mitigated by compile check
