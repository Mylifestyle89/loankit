## Efficiency Review: Invoice Bulk Operations

### 1. N+1 Bulk Mark Paid -- HIGH

`handleBulkMarkPaid()` fires N parallel PATCH calls. Each triggers `recalcBeneficiaryStatus()` = 2 Prisma queries + 1 update = **3 DB roundtrips per invoice**. For 50 invoices = 150 DB roundtrips total. Worse: invoices sharing the same beneficiary recalc redundantly.

**Recommendation:** Add a `POST /api/invoices/bulk-mark-paid` endpoint that:
- Updates all invoices in one `prisma.invoice.updateMany()`
- Collects unique `disbursementBeneficiaryId`s, recalcs each once
- Reduces 150 roundtrips to ~5-10

### 2. eligibleInvoices in invoice-table.tsx -- LOW

Line 65: `invoices.filter(isSelectable)` runs every render. `isSelectable` is 2 cheap checks (string prefix + status compare). For typical dataset (<500 rows), cost is negligible. `useMemo` would add complexity for no measurable gain.

**No action needed.**

### 3. Double render on filter change -- LOW

Line 109: `useEffect` resets `selectedIds` on filter change. `loadData` also runs via separate `useEffect` on same deps. This causes 2 state updates in same tick -- React 18+ batches these automatically. No double render.

**No action needed.**

### 4. allSelected computation -- LOW

Line 66 in invoice-table.tsx: `.every()` on eligible list is O(n) but short-circuits on first mismatch. Trivial cost for realistic dataset sizes.

**No action needed.**

### Summary

| Issue | Severity | Action |
|-------|----------|--------|
| N+1 bulk PATCH + redundant recalc | HIGH | Create bulk endpoint |
| eligibleInvoices filter | LOW | Skip |
| Double render | LOW | Skip (React batches) |
| allSelected | LOW | Skip |
