# Efficiency Review — 2026-03-31

## Scope
- Files: 8 (layout, proxy, 4 services, 1 page, 1 builder)
- Focus: Performance regressions in recent diffs

## Overall Assessment
Mostly clean. One real N+1 issue, one query regression, rest are negligible or acceptable.

---

## HIGH: N+1 invoice duplicate check in `disbursement-beneficiary-helpers.ts`

**File:** `src/services/disbursement-beneficiary-helpers.ts` lines 44-55

**Problem:** For each beneficiary with `has_invoice` status, every invoice triggers a separate `findFirst` query to check duplicates. If a disbursement has 3 beneficiaries x 10 invoices each = 30 sequential DB round-trips inside a transaction.

**Impact:** Latency scales linearly with invoice count. Transaction lock held longer, increasing contention risk.

**Fix:** Batch the duplicate check with a single `findMany` + `WHERE (invoiceNumber, supplierName) IN (...)`:

```ts
if (b.invoiceStatus === "has_invoice") {
  const pairs = b.invoices
    .filter((inv) => inv.invoiceNumber)
    .map((inv) => ({ invoiceNumber: inv.invoiceNumber, supplierName: inv.supplierName }));

  if (pairs.length > 0) {
    const dups = await tx.invoice.findMany({
      where: { OR: pairs },
      select: { invoiceNumber: true, supplierName: true },
    });
    if (dups.length > 0) {
      throw new ValidationError(
        `Hoa don "${dups[0].invoiceNumber}" cua "${dups[0].supplierName}" da ton tai.`,
      );
    }
  }
}
```

---

## MEDIUM: `findUnique` -> `findFirst` regression in `data-io.service.ts`

**File:** `src/services/report/data-io.service.ts` lines 408-413

**Problem:** `upsertInvoice` changed from `findUnique` (using composite unique index `invoiceNumber_supplierName`) to `findFirst` with two separate `where` fields. This means Prisma can no longer use the composite unique index directly -- it falls back to a table scan or partial index match depending on DB config.

**Why it was changed:** The composite unique constraint was likely dropped (migration `20260330094600_drop_invoice_unique_constraint` in git status). This is fine functionally, but now queries need a composite index to stay fast.

**Fix:** Add a composite non-unique index on `(invoiceNumber, supplierName)` in Prisma schema:

```prisma
model Invoice {
  // ...
  @@index([invoiceNumber, supplierName])
}
```

Without this, every `findFirst` in the import loop does a sequential scan -- and import can have hundreds of invoices.

---

## LOW: `links.some()` in layout active-state check

**File:** `src/app/report/layout.tsx` line 167

**Problem:** For each link (7 items), `links.some()` iterates up to 7 items to find longer-prefix matches. Total: ~49 comparisons per render.

**Impact:** Negligible. 7 links, pure string ops, no allocation. This is a micro-optimization that does not matter.

**Verdict:** No action needed. The approach is correct for disambiguating `/report/khcn` vs `/report/khcn/templates`.

---

## LOW: `sanitizeRevenueItems` on every create/update

**File:** `src/services/loan-plan.service.ts` lines 41-48

**Problem:** Runs `.map()` over revenue items on every create and update call, even when data is already clean.

**Impact:** Negligible. Revenue items are typically <20 items. The sanitization is a simple `Number()` coercion -- O(n) with tiny constant. This is defensive programming against AI/import producing bad data, which is the right tradeoff.

**Verdict:** No action needed.

---

## NO ISSUE: `firstBen` find in `disbursement-report.service.ts`

**File:** `src/services/disbursement-report.service.ts` line 87

`d.beneficiaryLines.find()` operates on already-loaded in-memory array. No extra DB call. Fine.

---

## NO ISSUE: `proxy.ts` route matching

**File:** `src/proxy.ts`

Clean early-return pattern. Most frequent paths (`/api/auth`, static assets) exit first. `startsWith` checks are O(1) per check. No performance concern.

---

## NO ISSUE: `khcn-builder-loan-disbursement.ts`

Pure data mapping functions. No DB calls, no async. All O(n) with small n. Fine.

---

## NO ISSUE: `khcn/templates/page.tsx`

`groupByCategory()` called at module level (runs once). `CATEGORY_ORDER` sort is O(k log k) with k~15 categories. Template count in `KHCN_TEMPLATES` is static. Fine.

---

## Summary of Recommended Actions

| Priority | File | Issue | Fix |
|----------|------|-------|-----|
| HIGH | `disbursement-beneficiary-helpers.ts` | N+1 findFirst in loop | Batch to single `findMany` with `OR` |
| MEDIUM | `data-io.service.ts` + schema | `findFirst` without index after dropping unique constraint | Add `@@index([invoiceNumber, supplierName])` |

## Unresolved Questions
- Was the composite unique constraint on Invoice dropped intentionally? If so, confirm that a non-unique composite index was added to replace it for query performance.
