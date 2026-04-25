# Code Reuse Audit — Invoice Bulk Complete + Bang Ke Filter

**Date:** 2026-04-01 | **Scope:** 3 files, duplication check

---

## Findings

### 1. Bang ke filter duplicated (MEDIUM)
**Files:** `src/services/invoice.service.ts` lines 94-97 and 320-323

Identical Prisma `OR` clause:
```ts
OR: [
  { disbursementBeneficiary: { invoiceStatus: { not: "bang_ke" } } },
  { disbursementBeneficiaryId: null },
]
```

**Fix:** Extract as shared constant at top of service file:
```ts
const EXCLUDE_BANG_KE_FILTER = {
  OR: [
    { disbursementBeneficiary: { invoiceStatus: { not: "bang_ke" } } },
    { disbursementBeneficiaryId: null },
  ],
} as const;
```

### 2. `isSelectable` logic duplicated (LOW)
**Files:**
- `src/components/invoice-tracking/invoice-table.tsx:53-56` — `isSelectable()` function
- `src/app/report/invoices/page.tsx:121` — inline filter with same condition

**Fix:** Export `isSelectable` from invoice-table and import in page.tsx. Or extract to a shared util like `src/components/invoice-tracking/invoice-utils.ts`.

### 3. Mark-paid fetch duplicated (MEDIUM)
**Files:** `src/app/report/invoices/page.tsx`
- `handleMarkPaid` (line 149): single invoice PATCH with `res.ok` check
- `handleBulkMarkPaid` (line 127): loops same PATCH but **skips `res.ok` check**

**Fix:** Extract shared helper:
```ts
async function patchInvoiceStatus(id: string, status: string) {
  const res = await fetch(`/api/invoices/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Cap nhat trang thai that bai");
  }
}
```
Then both handlers call it. **Bonus:** this also fixes the missing `res.ok` check in `handleBulkMarkPaid`.

---

## Summary

| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 1 | Bang ke filter constant | Medium | 5 min |
| 2 | isSelectable export | Low | 5 min |
| 3 | patchInvoiceStatus helper | Medium | 10 min |

All three are straightforward extractions with no behavioral risk.
