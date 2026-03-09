# Disbursement Modules -- Efficiency Review

**Date:** 2026-03-06
**Reviewer:** code-reviewer
**Scope:** 6 files, ~1871 LOC
**Focus:** Efficiency -- redundant work, missed concurrency, hot-path bloat, memory, overly broad ops

---

## Critical / High Priority

### 1. N+1 Sequential DB Writes in Transaction (HIGH)
**File:** `src/services/disbursement.service.ts:202-235` (create) and `:308-340` (fullUpdate)

Beneficiary lines are created one-by-one in a `for` loop. Each iteration:
1. `tx.disbursementBeneficiary.create()` -- 1 query
2. `tx.invoice.createMany()` -- 1 query
3. `tx.disbursementBeneficiary.update()` -- 1 query (to set invoiceAmount)

With N beneficiaries, this is 3N queries inside a transaction. The `invoiceAmount` update (line 230-233, 335-338) could be avoided entirely by computing `invoiceAmount` upfront and passing it in the initial `create` call. This alone halves the beneficiary-line queries from 3 to 2 per line.

**Impact:** For 5 beneficiaries with invoices: 15 queries -> could be 10.

### 2. Duplicate Code: create() and fullUpdate() (HIGH -- DRY + maintenance cost)
**File:** `src/services/disbursement.service.ts:202-235` vs `:308-340`

The beneficiary+invoice creation loop is copy-pasted verbatim between `create()` and `fullUpdate()`. Any bug fix or optimization must be applied in two places. Extract to a shared helper like `createBeneficiaryLines(tx, disbursementId, beneficiaries)`.

### 3. `getCustomerSummary()` Loads Entire DB Graph (HIGH)
**File:** `src/services/invoice.service.ts:222-265`

```typescript
const customers = await prisma.customer.findMany({
  include: { loans: { include: { disbursements: { include: { invoices: ... } } } } }
});
```

This eagerly loads ALL customers -> ALL loans -> ALL disbursements -> ALL invoices into memory. With growth this becomes O(total_invoices) memory. Should be replaced with a single aggregate query:

```sql
SELECT c.id, c.customer_name, COUNT(DISTINCT l.id) as total_loans, ...
FROM customers c LEFT JOIN loans l ... LEFT JOIN disbursements d ... LEFT JOIN invoices i ...
GROUP BY c.id
```

Or use Prisma `groupBy`/raw query.

### 4. `listAll()` Has No Pagination (HIGH)
**File:** `src/services/invoice.service.ts:52-98`

Both branches of `listAll()` call `findMany` with no `take`/`skip`. Returns unbounded results. As invoice count grows, this will cause memory pressure and slow responses.

---

## Medium Priority

### 5. Redundant Summary Query on Every Disbursement List Request
**File:** `src/app/api/loans/[id]/disbursements/route.ts:56-59`

```typescript
const [result, summary] = await Promise.all([
  disbursementService.listByLoan(...),
  disbursementService.getSummaryByLoan(loanId),
]);
```

Good: uses `Promise.all` for concurrency. However, `getSummaryByLoan` runs 2 aggregate queries (`:107-116`) on every page load, even page 2/3/etc where summary hasn't changed. Consider caching summary in the loan record or only fetching on page 1.

### 6. Modal Fires 3 Independent Fetches Sequentially (not parallel)
**File:** `src/components/invoice-tracking/disbursement-form-modal.tsx:97-164`

Three `useEffect` hooks fire independently:
- Line 97: fetch edit data (edit mode)
- Line 142: fetch current outstanding (new mode)
- Line 156: fetch saved beneficiaries

In edit mode, effects at line 97 and 156 run in parallel (separate effects), which is fine. But in new mode, lines 142 and 156 could be combined into a single `Promise.all` to reduce waterfall. Minor since they're independent effects that React batches, but explicit parallel would be clearer.

### 7. `numberToVietnameseWords()` Called on Every Render
**File:** `src/components/invoice-tracking/disbursement-form-modal.tsx:335,345,507`

Called inline in JSX without memoization. Each keystroke on any input triggers re-render and re-computes Vietnamese words for 2-3 numbers. Not expensive per call, but could be wrapped in `useMemo` for cleanliness. Low real-world impact.

### 8. `beneficiarySum` Recomputed on Every Render
**File:** `src/components/invoice-tracking/disbursement-form-modal.tsx:189`

```typescript
const beneficiarySum = beneficiaries.reduce((s, b) => s + num(b.amount), 0);
```

Computed outside `useMemo`. Also recomputed at line 238 during submit validation. Minor -- array is small.

### 9. `filteredSaved` in BeneficiarySection Not Memoized
**File:** `src/components/invoice-tracking/disbursement-form-modal.tsx:449-451`

```typescript
const filteredSaved = savedBeneficiaries.filter((s) =>
  s.name.toLowerCase().includes(line.name.toLowerCase())
);
```

Runs on every render of each BeneficiarySection. With many saved beneficiaries and many sections, this is O(N*M) per render. `useMemo` would help.

### 10. Sequential DOCX Generation for Multi-Beneficiary UNC
**File:** `src/services/disbursement-report.service.ts:248-253`

```typescript
for (const line of beneficiaryLines) {
  const { buffer } = await generateSingleDocx(template.path, uncData, template.label);
  zip.file(...);
}
```

Each DOCX is generated sequentially. Since they're independent, could use `Promise.all` to parallelize:
```typescript
const results = await Promise.all(beneficiaryLines.map(line => generateSingleDocx(...)));
```

**Impact:** With 5 beneficiaries, latency = 5x single generation vs 1x.

---

## Low Priority

### 11. `disbursement-form-modal.tsx` at 562 Lines
Exceeds 200-line limit per project rules. BeneficiarySection (lines 430-562) is already extracted as a sub-component but lives in the same file. Could be split to its own file.

### 12. `handleCreated` Only Refreshes Disbursements, Not Loan
**File:** `src/app/report/loans/[id]/page.tsx:127-129`

After creating/editing a disbursement, only `loadDisbursements()` is called. If the loan's aggregate fields (like `disbursementCount`) are displayed, they may go stale. Currently not an issue since summary comes from disbursement endpoint, but worth noting.

### 13. `generateSingleDocx` Writes to Disk Then Reads Back
**File:** `src/services/disbursement-report.service.ts:189-199`

Creates temp file, reads it, then deletes. If `docxEngine` could return a Buffer directly, this disk I/O round-trip would be eliminated. Depends on docx-engine API.

---

## Summary Table

| # | Severity | File | Issue |
|---|----------|------|-------|
| 1 | HIGH | disbursement.service.ts:202-235,308-340 | N+1 sequential DB writes; extra update avoidable |
| 2 | HIGH | disbursement.service.ts:202-340 | DRY violation: duplicated beneficiary creation loop |
| 3 | HIGH | invoice.service.ts:222-265 | getCustomerSummary loads entire DB graph into memory |
| 4 | HIGH | invoice.service.ts:52-98 | listAll has no pagination -- unbounded results |
| 5 | MEDIUM | route.ts:56-59 | Summary re-aggregated on every page change |
| 6 | MEDIUM | disbursement-form-modal.tsx:97-164 | Could combine fetches with Promise.all |
| 7 | MEDIUM | disbursement-form-modal.tsx:335,345,507 | numberToVietnameseWords not memoized |
| 8 | LOW | disbursement-form-modal.tsx:189 | beneficiarySum not memoized |
| 9 | MEDIUM | disbursement-form-modal.tsx:449-451 | filteredSaved filter runs every render per section |
| 10 | MEDIUM | disbursement-report.service.ts:248-253 | Sequential DOCX gen could be parallel |
| 11 | LOW | disbursement-form-modal.tsx | 562 lines, exceeds 200-line rule |
| 12 | LOW | loans/[id]/page.tsx:127-129 | Loan data not refreshed after disbursement change |
| 13 | LOW | disbursement-report.service.ts:189-199 | Unnecessary disk I/O round-trip |

---

## Positive Observations

- `listByLoan` uses `Promise.all` for count+data (line 88-100) -- good
- `getSummaryByLoan` uses `Promise.all` for aggregates (line 107-116) -- good
- API route uses `Promise.all` for list+summary (route.ts:56-59) -- good
- Transaction used for atomic create/update with beneficiaries
- Zod validation at API layer prevents invalid data reaching service
- Debounced search in loan detail page (400ms) prevents excessive API calls

## Unresolved Questions

1. Does `docxEngine.generateDocx` support returning Buffer directly (would eliminate disk I/O in issue #13)?
2. How many customers/invoices are expected at scale? Determines urgency of issues #3 and #4.
3. Does Prisma cascade deletes on `DisbursementBeneficiary -> Invoice` automatically, or does `fullUpdate` line 284 leave orphaned invoices?
