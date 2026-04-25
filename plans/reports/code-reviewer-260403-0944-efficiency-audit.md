# Efficiency Audit — tech-debt-cleanup branch

**Branch:** `refactor/tech-debt-cleanup` vs `main`
**Scope:** 138 files, +8702/-6826 lines (new code only)
**Date:** 2026-04-03

## Overall Assessment

Branch is primarily a modularization refactor — splitting monolithic files into sub-modules. Most code is a straight extract-and-re-export with no logic changes. Efficiency is generally preserved. A few patterns deserve attention.

---

## Findings

### HIGH — N+1 sequential `await` in import loop

**File:** `src/services/report/data-io-import.service.ts` (lines ~15714-15858)

Deeply nested `for` loops each containing sequential `await` calls:
- `for customerRaw` → `await tx.customer.findUnique` + `await tx.customer.update/create`
  - `for loanRaw` → `await tx.loan.findFirst` + `await tx.loan.update/create`
    - `for benRaw` → `await tx.beneficiary.findFirst`
    - `for disbRaw` → `await tx.disbursement.create`
      - `for invRaw` → `await upsertInvoice` (findFirst + update/create)
      - `for lineRaw` → `await tx.disbursementBeneficiary.create`
        - `for invRaw` → `await upsertInvoice`

Each entity is upserted one-by-one. For a dataset with 50 customers x 3 loans x 5 disbursements x 3 invoices = ~2250 sequential DB round-trips inside a single transaction.

**Severity:** HIGH (import can take minutes for real datasets; long transaction holds lock)

**Suggested fix:**
- Batch `createMany` for invoices and beneficiary lines (no upsert needed for newly created disbursements).
- Pre-fetch existing customers/loans in bulk (`findMany WHERE customer_code IN [...]`) before the loop, then decide create vs update.
- Consider chunking the transaction (per-customer transaction instead of one giant one).

---

### MEDIUM — `saveDraft` sequential waterfall: mapping → values → (customer + validate) → loadData

**File:** `src/app/report/khdn/mapping/hooks/use-mapping-api-mutations.ts` (lines ~6323-6458)

```
1. PUT /api/report/mapping          (await)
2. PUT /api/report/values            (await — depends on #1? no, independent)
3. Promise.all([POST /customers/from-draft, POST /report/validate])  (await)
4. await loadData()                  (full re-fetch of all data)
```

Step 2 (values save) does NOT depend on step 1 (mapping save) — they write independent resources. Running them in parallel would cut ~50% of save latency.

Step 4 (`loadData`) re-fetches everything from the server after save, including data just written. If the UI already has the correct state, this is a full no-op reload.

**Severity:** MEDIUM (user feels 1-3s delay on every save)

**Suggested fix:**
- Parallel: `Promise.all([mappingRes, valuesRes])` for steps 1+2.
- Consider optimistic update: skip `loadData()` on success, only call it on error/conflict.

---

### MEDIUM — Repeated `loadState()` calls in sequential service functions

**Files:** `src/lib/report/fs-store-state-ops.ts`, `src/services/report/template-field-operations.service.ts`

`loadState()` reads + parses the full `framework-state.json` from disk. Multiple service functions called in sequence (e.g., `createFieldTemplate` → `listFieldTemplates`) each call `loadState()` independently. Within `template-field-operations.service.ts` line ~16443 and ~16492, `loadState()` is called twice in the same code path when `isDbTemplateModeEnabled()` returns false.

**Severity:** MEDIUM (file I/O on every call; state file grows with run_logs)

**Suggested fix:**
- Pass state as parameter when caller already has it.
- Or introduce a request-scoped cache (e.g., `AsyncLocalStorage`) for `loadState`.

---

### MEDIUM — `getCustomerSummary` loads all invoices into memory

**File:** `src/services/invoice-queries.service.ts` (lines ~14287-14356)

```ts
const invoiceStats = await prisma.invoice.findMany({
  where: { ...EXCLUDE_BANG_KE_INVOICES },
  select: { amount, status, disbursement.loan.customerId },
});
```

This fetches every non-bang_ke invoice into Node.js memory to aggregate by customer. With thousands of invoices, this is O(n) memory and CPU.

**Severity:** MEDIUM (works for small datasets but won't scale)

**Suggested fix:**
- Use `prisma.$queryRaw` with SQL `GROUP BY` to aggregate on the DB side.
- Or use Prisma `groupBy` with `_sum` and `_count` to avoid loading individual rows.

---

### LOW — `new Date(g.disbursementDate).toLocaleDateString("vi-VN")` in render loop

**File:** `src/app/report/invoices/components/invoice-grouped-view.tsx` (line ~587)

Creating `Date` + locale formatting inside `.map()` on every render. Minor cost, but `toLocaleDateString` with locale is surprisingly expensive (Intl resolution).

**Severity:** LOW

**Suggested fix:** Pre-format dates before passing to component, or memoize the formatter.

---

### LOW — `JSON.parse(md.mappingText)` called multiple times in same function

**File:** `src/app/report/khdn/mapping/hooks/use-mapping-api-mutations.ts` (line ~6330, 6357)
Also in `use-field-template-crud.ts` (lines ~5855-5856, 5939-5940)

`md.mappingText` and `md.aliasText` are parsed via `JSON.parse` separately each time a hook function runs. For large mapping JSON, this is redundant CPU work.

**Severity:** LOW (mapping JSON is typically <100KB)

**Suggested fix:** Parse once, store in a local variable.

---

### LOW — Polling loop without max-retry guard

**File:** `src/app/report/khdn/mapping/hooks/use-mapping-api-mutations.ts` (lines ~6510-6522)

```ts
while (latest.phase === "running" || latest.phase === "analyzing") {
  await new Promise((resolve) => setTimeout(resolve, 800));
  // poll...
}
```

No maximum iteration count or timeout guard. If the server never transitions out of `running`/`analyzing`, this loops forever.

**Severity:** LOW (server should always terminate jobs, but defensive coding is better)

**Suggested fix:** Add `maxRetries` counter (e.g., 300 = 4 minutes) and throw on exceed.

---

### INFO — `bulkMarkPaid` beneficiary recalc is parallelized correctly

**File:** `src/services/invoice-crud.service.ts` (line ~14131)

```ts
await Promise.all(beneficiaryIds.map(recalcBeneficiaryStatus));
```

Good: deduplicates beneficiary IDs and runs recalc in parallel. No issue here.

---

### INFO — Export streaming is well-implemented

**File:** `src/services/report/data-io-export.service.ts` (lines ~15528-15561)

`ReadableStream` with batched cursor pagination avoids loading all customers into memory at once. Good pattern.

---

## Summary

| Severity | Count | Category |
|----------|-------|----------|
| HIGH     | 1     | N+1 sequential DB in import |
| MEDIUM   | 3     | Sequential API waterfall, repeated loadState, unbounded query |
| LOW      | 3     | Redundant JSON.parse, render-loop Date, polling no-guard |
| INFO     | 2     | Good patterns noted |

## Unresolved Questions

1. What is the expected max dataset size for `importData`? If consistently <20 customers, the sequential pattern is tolerable.
2. Does `loadData()` in `saveDraft` serve a purpose beyond cache-busting? If server can return updated state in save response, the extra round-trip is unnecessary.
