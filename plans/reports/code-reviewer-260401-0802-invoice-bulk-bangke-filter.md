# Code Review: Invoice Bulk Complete + Bang Ke Filter

## Scope
- `src/services/invoice.service.ts` -- bang_ke OR filter in `listAll()` and `getCustomerSummary()`
- `src/components/invoice-tracking/invoice-table.tsx` -- checkbox column with selectable/disabled logic
- `src/app/report/invoices/page.tsx` -- selection state, bulk toolbar, toggle handlers
- LOC changed: ~120

## Overall Assessment
Feature logic is sound. Bang ke filter is correctly placed in both query paths. Bulk selection UX is clean. A few issues need attention -- one **High** (partial failure in bulk PATCH silently swallowed), one **Medium** (Prisma OR conflict risk), rest are low.

---

## High Priority

### 1. Bulk PATCH: partial failures silently ignored
**File:** `page.tsx` lines 127-147

`Promise.all()` rejects on the **first** failure and short-circuits. If request 3/10 fails:
- Requests 1-2 already committed (status = paid)
- Requests 4-10 may or may not complete (in-flight)
- The `catch` block shows a generic error, clears selection, and reloads -- user has no idea which invoices succeeded

**Impact:** Inconsistent data state + user confusion.

**Fix:**
```ts
async function handleBulkMarkPaid() {
  const ids = Array.from(selectedIds);
  if (ids.length === 0) return;
  setBulkLoading(true);
  const results = await Promise.allSettled(
    ids.map((id) =>
      fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      }).then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return id;
      })
    )
  );
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    alert(`${failed.length}/${ids.length} hoa don khong cap nhat duoc. Vui long thu lai.`);
  }
  setSelectedIds(new Set());
  setBulkLoading(false);
  void loadData();
}
```

### 2. Bulk PATCH: no response status check
**File:** `page.tsx` line 132-139

Even when `fetch` resolves (no network error), a 400/500 response is silently treated as success. The `catch` only catches network failures.

Already addressed in the fix above (`.then(res => { if (!res.ok) throw ... })`).

---

## Medium Priority

### 3. Prisma OR filter correctness -- potential conflict with `where.status`
**File:** `invoice.service.ts` lines 89-98

The spread pattern `{ ...where, ...customerWhere, OR: [...] }` works correctly **only if** `where` does not itself contain an `OR` key. Currently `where` only sets `status`, so this is safe today. But if anyone later adds an `OR` condition to `where`, the later `OR` will silently overwrite the first.

**Recommendation:** Use `AND` wrapper for safety:
```ts
where: {
  AND: [
    where,
    customerWhere,
    {
      OR: [
        { disbursementBeneficiary: { invoiceStatus: { not: "bang_ke" } } },
        { disbursementBeneficiaryId: null },
      ],
    },
  ],
},
```
Not broken now, but defensive coding against future regressions.

### 4. toggleSelectAll scope mismatch in grouped view
**File:** `page.tsx` lines 119-125 and 415-423

`toggleSelectAll()` operates on the full `invoices` array, but in grouped view each `<InvoiceTable>` only shows a subset (`g.invoices`). Clicking "select all" in group A also selects eligible invoices in group B/C/D.

User expectation: "select all" in a group header should only toggle that group's invoices.

**Fix:** Pass a scoped `onToggleSelectAll` per group:
```tsx
onToggleSelectAll={() => {
  const eligible = g.invoices.filter(
    (inv) => !inv.id.startsWith("virtual-") && (inv.status === "pending" || inv.status === "overdue")
  );
  const allSelected = eligible.every((inv) => selectedIds.has(inv.id));
  if (allSelected) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      eligible.forEach((inv) => next.delete(inv.id));
      return next;
    });
  } else {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      eligible.forEach((inv) => next.add(inv.id));
      return next;
    });
  }
}}
```

### 5. Summary fetch not refreshed after bulk mark paid
**File:** `page.tsx` lines 81-85

The initial `useEffect` on mount fetches summary independently. `loadData()` also fetches summary. However after `handleBulkMarkPaid`, `loadData()` is called which does refresh summary -- so this is fine. No issue here (verified).

---

## Low Priority

### 6. Hardcoded Vietnamese strings in bulk toolbar
**File:** `page.tsx` lines 316-334

"Da chon X hoa don", "Hoan thanh da chon", "Bo chon", "Dang xu ly..." -- all hardcoded Vietnamese. Rest of the page uses `t()` from i18n. Should add translation keys for consistency.

### 7. `isSelectable` logic duplicated
**File:** `invoice-table.tsx` line 53-56 and `page.tsx` line 120-122

Same condition (`!virtual && (pending || overdue)`) is defined in both files. Extract to a shared util or export `isSelectable` from invoice-table.

### 8. No confirmation dialog for bulk action
Marking 20+ invoices as paid in one click with no undo and no confirmation dialog. Consider adding a simple `confirm()` before proceeding.

---

## Positive Observations
- Bang ke OR filter is correctly structured -- handles both linked (non-bang_ke) and unlinked (null beneficiary) invoices
- Filter applied consistently in both `listAll()` and `getCustomerSummary()`
- Selection cleared on filter change -- prevents stale selection across different data sets
- Disabled checkbox with tooltip for non-selectable rows -- good UX
- `isSelectable` helper is cleanly separated in invoice-table

## Recommended Actions (priority order)
1. **[HIGH]** Switch `Promise.all` to `Promise.allSettled` + check `res.ok` per request
2. **[MEDIUM]** Scope `toggleSelectAll` per group in grouped view
3. **[MEDIUM]** Wrap Prisma where with `AND` for future safety
4. **[LOW]** Add confirmation dialog for bulk mark paid
5. **[LOW]** Extract duplicated `isSelectable` logic
6. **[LOW]** Add i18n keys for bulk toolbar strings
