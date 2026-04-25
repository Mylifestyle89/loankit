# Efficiency Review - Performance Findings

## Scope
Changed + new files across loan-plans, customers, APC import, BK importer.

---

### HIGH

1. **Double-query in `deletePlan` and `deleteCustomer`** - `findUnique` then `delete` = 2 DB round-trips. Use `delete` directly and catch P2025.
   - `src/services/loan-plan.service.ts:117-119` (`deletePlan`)
   - `src/services/customer.service.ts:159-162` (`deleteCustomer`)
   - Same pattern in `updatePlan` (:92) and `updateCustomer` (:151) -- find then update = 2 queries.

2. **`getFullProfile` deep nested include without pagination** - Loads ALL loans, ALL disbursements, ALL invoices, ALL beneficiaries in one query. For customers with many loans, this is an unbounded payload.
   - `src/services/customer.service.ts:234-258`
   - No `take` limit on any relation. Response JSON can be very large.

3. **`CostItemsTable` re-renders entire parent on every keystroke** - `onChange` called on each input change triggers `setCostItems` in parent, which recalculates financials via `useEffect`, which calls `setFinancials`. Three state updates per keystroke.
   - `src/app/report/customers/[id]/loan-plans/[planId]/page.tsx:55-66`
   - `cost-items-table.tsx:17-29` -- `onChange` fires on every character.
   - No debounce on cost/revenue item edits. `saveTimer` ref is declared (:31) but never used.

4. **Inline object/array creation in render path** - `revenueItems.map` with `key={idx}` and inline onClick closures. Each render creates new functions for every row.
   - `src/app/report/customers/[id]/loan-plans/[planId]/page.tsx:145-155`
   - Minor but compounds with item 3 above.

### MEDIUM

5. **`saveTimer` ref declared but never used** - Suggests auto-save debounce was planned but not implemented. Every field change triggers recalc without batching.
   - `src/app/report/customers/[id]/loan-plans/[planId]/page.tsx:31`

6. **`JSON.parse` on every list render** - `LoanPlansListPage` calls `JSON.parse(p.financials_json)` inside `.map()` on every render. Should parse once on fetch.
   - `src/app/report/customers/[id]/loan-plans/page.tsx:84`

7. **`loadCustomers` re-fetches on every `typeFilter` change without debounce** - Rapid tab clicks fire multiple concurrent fetches with no abort/cancel.
   - `src/app/report/customers/page.tsx:53-73`
   - Missing `AbortController` -- stale responses can overwrite newer ones.

8. **`customers/page.tsx` exceeds 200-line limit** (297 lines) - Violates project file size rule.
   - `src/app/report/customers/page.tsx`
   - `src/app/report/customers/[id]/page.tsx` (317 lines) -- same issue.

9. **No `select` clause on list queries** - `listCustomers` and `listPlansForCustomer` return full rows including potentially large JSON columns (`data_json`, `cost_items_json`, `financials_json`) when only summary fields are needed for list views.
   - `src/services/customer.service.ts:125-129`
   - `src/services/loan-plan.service.ts:122-127`

### LOW

10. **`setTimeout(0)` wrapper on initial data load** - Unclear purpose, adds microtask delay for no visible benefit.
    - `src/app/report/customers/page.tsx:69-72`
    - `src/app/report/customers/[id]/page.tsx:110-113`

11. **`grouped` templates recalculated on every render** - `NewLoanPlanPage` computes `grouped` via `.reduce()` on every render. Should use `useMemo`.
    - `src/app/report/customers/[id]/loan-plans/new/page.tsx:44-47`

12. **`bk-importer.ts` unused imports** - `FieldCatalogItem`, `translateFieldLabelVi`, `translateGroupVi`, `FRAMEWORK_TO_BK_LABEL`, `isEmptyValue` imported but only used in `generateFieldCatalogFromBk` which may not always be called. Tree-shaking should handle this but worth noting.
    - `src/lib/import/bk-importer.ts:1-6`

---

## Summary
Top priorities: (1) eliminate double-queries in service CRUD, (2) add pagination/limits to `getFullProfile`, (3) debounce cost-item edits or batch state updates in the loan plan editor.
