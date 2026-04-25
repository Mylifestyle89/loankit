## Code Review: Bulk Complete & Bang Ke Filter

**Files:** page.tsx (457L), invoice-table.tsx (192L), invoice.service.ts (384L) | **LOC changed:** ~120

### Critical

1. **No error handling per-item in bulk operation** -- `page.tsx:131-142` fires `Promise.all` for N PATCH calls. One failure rejects all, but `loadData()` runs unconditionally after catch. Partial success leaves UI inconsistent: some invoices marked paid server-side, but `selectedIds` cleared and no indication which failed.
   - Fix: use `Promise.allSettled`, report individual failures, only clear succeeded IDs.

2. **`loadData()` called outside try/finally** -- `page.tsx:145-146` `setBulkLoading(false)` and `loadData()` run after catch, but if `loadData()` itself throws, `bulkLoading` stays false but user sees stale data with no error.

### High

3. **Duplicated eligibility logic (DRY)** -- `isSelectable()` in `invoice-table.tsx:52-55` vs inline filter in `page.tsx:119-121`. Same condition `!virtual- && (pending||overdue)`. Extract to shared util or export `isSelectable` from invoice-table and reuse.

4. **Stringly-typed statuses** -- `"bang_ke"`, `"virtual-"`, `"pending"`, `"overdue"`, `"paid"` scattered as raw strings. No enum/const found in codebase (`InvoiceStatus` grep returned nothing). High risk of typo bugs.

5. **page.tsx at 457 lines** -- Exceeds 200-line limit. Bulk selection logic (state + handlers + toolbar JSX) is a good extraction candidate.

### Medium

6. **`bang_ke` filter duplicated** -- `invoice.service.ts:93-96` and `:321-326` repeat identical `OR` clause. Extract to a shared `excludeBangKeWhere` const.

7. **Hardcoded Vietnamese in UI** -- `page.tsx:319,327,335` and `invoice-table.tsx:68,115` use raw Vietnamese strings instead of `t()` i18n keys.

### Low

8. **Comment restates code** -- `invoice-table.tsx:52` `/** Check if an invoice row is eligible for bulk selection */` on a function named `isSelectable` -- adds no insight.

### Unresolved Questions
- Should bulk PATCH use a single batch API endpoint instead of N parallel calls?
- Is there a plan to introduce an invoice status enum?
