# Code Review: KHCN Disbursement & UNC Flattening

**Branch:** KHCN-implement | **Range:** 340c0ff..0afbdff | **Date:** 2026-03-16
**Scope:** ~6400 LOC across 93 files

## Overall Assessment

Solid feature delivery. Disbursement module (template config, API, UI, DOCX) follows existing patterns. Several issues found: a **critical DRY violation** in UNC flattening, a **performance concern** with isKhcn lookup, and **missing input validation** on the API.

---

## Critical Issues

### 1. DRY Violation: UNC flattening duplicated (CRITICAL)

`src/services/khcn-report.service.ts` — UNC flattening logic is copy-pasted in both `generateKhcnReport()` (line ~233) and `generateKhcnDisbursementReport()` (line ~280). Identical 8-line block.

**Impact:** Bug fixes to one won't reach the other. Already diverging slightly (`overrides?.["UNC.ST bang chu"]` only in disbursement version).

**Fix:** Extract to helper:
```ts
function flattenFirstBeneficiary(data: Record<string, unknown>, overrides?: Record<string, string>) {
  if (!Array.isArray(data.UNC) || data.UNC.length === 0) return;
  const b = data.UNC[0] as Record<string, unknown>;
  data["UNC.STT"] = b["STT"] ?? 1;
  data["UNC.Khach hang thu huong"] = b["Khach hang thu huong"] ?? "";
  // ... etc
}
```

### 2. No auth on disbursement API endpoint (HIGH)

`src/app/api/report/templates/khcn/disbursement/route.ts` — No `requireEditorOrAdmin()` call. Compare with BK import route which correctly added auth. Any unauthenticated user can generate DOCX with customer financial data.

**Fix:** Add `await requireEditorOrAdmin();` at top of POST handler.

---

## High Priority

### 3. N+1: isKhcn lookup on every loan detail fetch

`src/services/loan.service.ts` `getById()` — Extra `prisma.customer.findUnique()` call every time a loan is fetched, just to check if customer exists. This is always true (FK constraint), so `isKhcn` is always `true`.

**Question:** Is the intent to check if the customer has KHCN-specific data (e.g., a `khcn_customer` table)? If so, the query targets wrong table. If customer table is shared KHCN/KHDN, need different detection logic. Currently this is a no-op query returning true always.

### 4. Migration type mismatch: `prior_outstanding`

- `prisma/schema.prisma`: `prior_outstanding Float?`
- `prisma/migrations/.../migration.sql`: `"prior_outstanding" TEXT`

Schema says Float, migration says TEXT. This will cause runtime type errors on read/write. Fix migration to use `DOUBLE PRECISION` or `FLOAT8`.

### 5. `customer-disbursement-section.tsx` exceeds 200 lines (273 LOC)

Per project rules, split into sub-components (form, list, template buttons).

---

## Medium Priority

### 6. `paCost` fallback logic may be wrong

`khcn-report.service.ts` line ~197:
```ts
const paCost = paDirectCost + paInterest || Number(data["PA.Tong chi phi du kien"]) || 0;
```
Due to operator precedence, `paDirectCost + paInterest || fallback` means: if sum is 0 (both zero), use fallback. But if `paDirectCost=100, paInterest=0`, result is `100` not the fallback. This is likely correct, but the `||` pattern with numbers is fragile. Consider explicit `?? 0` or ternary.

### 7. Amendments stored as JSON string in `properties._amendments`

`collateral-form.tsx` serializes amendments to JSON inside `properties` object. But migration added a dedicated `collaterals.amendments` TEXT column. These are disconnected — the column is never used, and data goes into properties JSON. Pick one approach.

### 8. Error status heuristic fragile

`disbursement/route.ts` line ~60:
```ts
const status = msg.toLowerCase().includes("not found") ? 404 : 500;
```
Any error message containing "not found" becomes 404 even for unrelated errors. Use typed errors (e.g., `NotFoundError` instanceof check).

### 9. `collateral-form.tsx` amendments UI duplicated

Amendment section JSX is copy-pasted for both `qsd_dat` and `dong_san` collateral types (~lines 388-401 and 419-432). Extract to shared component.

---

## Low Priority

### 10. BaseModal improvement is good
Added Escape key handler, focus management, `tabIndex={-1}`. Positive change. Still no focus trapping (Tab can escape modal), but acceptable for now.

### 11. BK import added auth
`requireEditorOrAdmin()` added to BK import — good security improvement.

### 12. Loan service pagination
`list()` now supports pagination with `Math.min(limit, 200)` cap — good.

---

## Positive Observations

- Template config pattern (`khcn-disbursement-template-config.ts`) is clean, type-safe, follows existing registry pattern
- BaseModal a11y improvements (Escape, focus, aria)
- BK import auth guard added
- Loan list pagination with limit cap
- Disbursement modal with preview flow is good UX

---

## Recommended Actions (Priority Order)

1. **Add auth** to `/api/report/templates/khcn/disbursement` route
2. **Fix migration** `prior_outstanding` type: TEXT -> FLOAT8
3. **Extract** UNC flattening helper to eliminate duplication
4. **Clarify** isKhcn detection logic — current implementation always returns true
5. **Split** `customer-disbursement-section.tsx` into sub-components
6. **Deduplicate** amendments UI in collateral form
7. **Decide** amendments storage: dedicated column vs properties JSON
8. **Replace** error message heuristic with typed error check

---

## Unresolved Questions

1. How should isKhcn detection work? If all customers are in `customers` table, the current check is meaningless. Is there a separate KHDN table or a type field?
2. Is the `collaterals.amendments` column intended to replace `properties._amendments` JSON, or are they for different purposes?
3. Should the `paCost` fallback use strict null coalescing instead of `||`?
