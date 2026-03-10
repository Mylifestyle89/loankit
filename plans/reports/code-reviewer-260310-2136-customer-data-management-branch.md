# Code Review: customer-data-management-4LZe0

**Branch:** `origin/claude/customer-data-management-4LZe0` vs `Deploy-test`
**Date:** 2026-03-10
**Reviewer:** code-reviewer agent

---

## Scope

Files reviewed (focus areas):
- `src/services/report/customer-xlsx-io.service.ts` (314 lines)
- `src/services/report/data-io.service.ts` (435 lines)
- `src/services/customer.service.ts` (~330 lines effective)
- `src/app/api/customers/[id]/route.ts`
- `src/app/api/report/export-data/route.ts`
- `src/app/api/report/import-data/route.ts`
- `src/app/report/customers/[id]/page.tsx` (249 lines)
- `src/app/report/customers/page.tsx` (246 lines)
- `src/app/report/layout.tsx` (221 lines)
- `src/app/report/mapping/stores/use-customer-store.ts`

Overall: solid refactor. Auth removal is clean. New import/export logic is functional. Issues below are real risks worth fixing before merging.

---

## Critical Issues

### 1. No file size limit on XLSX upload — DoS risk
**File:** `src/app/api/report/import-data/route.ts`

`req.formData()` + `file.arrayBuffer()` reads the entire uploaded file into memory without any size check. A 50MB XLSX will blow up serverless memory.

**Fix:**
```ts
const file = formData.get("file") as File | null;
if (!file) throw new ValidationError("Không tìm thấy file.");
if (file.size > 10 * 1024 * 1024) throw new ValidationError("File quá lớn (tối đa 10MB).");
```

### 2. `new Date()` called on unvalidated user strings — silent NaN propagation
**File:** `src/services/report/data-io.service.ts`, lines 179, 180, 224, 415, 416

`new Date(loanRaw.startDate)` with an invalid string (e.g. from XLSX cell "N/A") produces `Invalid Date`. Prisma will throw a cryptic error mid-transaction, leaving the transaction rolled back with no useful user message.

**Fix:** Add a helper before the transaction:
```ts
function parseDate(s: string, field: string): Date {
  const d = new Date(s);
  if (isNaN(d.getTime())) throw new ValidationError(`Ngày không hợp lệ ở trường "${field}": "${s}"`);
  return d;
}
```

---

## Important Issues

### 3. Duplicate customer store — confusing, breaks DRY
`src/stores/use-customer-store.ts` was deleted and the exact same code was inlined into `src/app/report/mapping/stores/use-customer-store.ts`. The mapping-specific re-export proxy that existed before is gone. Any future consumer outside the mapping path who imports from `@/stores/use-customer-store` will get a module-not-found error. The store code is identical — there should be one canonical location.

**Fix:** Keep `src/stores/use-customer-store.ts` as source of truth; mapping store file re-exports it.

### 4. `handleDelete` and `handleSubmit` have no try-catch — fetch can throw
**Files:** `src/app/report/customers/page.tsx` line 69, `src/app/report/customers/[id]/page.tsx` line 106

Network errors or JSON parse errors will produce unhandled rejections with no UI feedback.

```ts
// page.tsx handleDelete
async function handleDelete(id: string) {
  if (!confirm(...)) return;
  try {
    const res = await fetch(...);
    const data = await res.json();
    if (data.ok) void loadCustomers();
    else setError(data.error ?? "Delete failed.");
  } catch {
    setError("Lỗi kết nối.");
  }
}
```

### 5. XLSX import: invoices joined by contract number, not disbursement — incorrect data linkage
**File:** `src/services/report/customer-xlsx-io.service.ts` lines ~254–270

When parsing the XLSX back to import format, invoices are grouped by `contractNumber` (loan-level) and assigned to every disbursement under that contract. If one loan has multiple disbursements, all disbursements will get all the invoices — wrong duplication.

This is a structural limitation of the flat XLSX format: disbursements don't have their own ID column in the sheet. Either add a disbursement sequence column to XLSX, or document that XLSX import does not support per-disbursement invoice mapping.

### 6. `customer-xlsx-io.service.ts` — dead column definitions (224 lines wasted)
`loanColumns`, `disbursementColumns`, `invoiceColumns`, `beneficiaryColumns` are defined but not used in export (export duplicates column header strings inline). They're silenced with `void` calls at the bottom. Remove them or use them.

### 7. `loadCustomers` in `page.tsx` called with `setTimeout(0)` — known smell
This pattern appears repeatedly (noted in agent memory). Purpose is unclear — likely historical. `useEffect` already runs post-mount; the timeout adds unnecessary delay.

---

## Minor Issues

### 8. `/* eslint-disable @typescript-eslint/no-explicit-any */` on customer detail page
`src/app/report/customers/[id]/page.tsx` uses `any[]` for `loans` and `mapping_instances` in the `FullCustomer` type. Define proper inline types matching the Prisma shape to avoid propagating `any` into components.

### 9. `customer-xlsx-io.service.ts` exceeds 200-line limit (314 lines)
Per project rules, split into:
- `customer-xlsx-export.service.ts`
- `customer-xlsx-import.service.ts`

### 10. `data-io.service.ts` exceeds 200-line limit (435 lines)
Split import and export logic into separate files. The `upsertInvoice` helper and `fullCustomerBatches` generator can move to a `_import-helpers.ts` module.

### 11. Auth removal is clean — no dangling references found
`src/app/report/layout.tsx`, `src/app/report/users/`, auth API routes all removed. `better-auth` removed from `package.json`. No imports of `authClient`, `auth-guard`, or `useSession` remain in the branch.

### 12. Layout simplification is reasonable
Removing mobile hamburger + `isMobile` state + `useEffect` media query listener in `layout.tsx` reduces complexity. The mobile responsiveness for the sidebar appears intentionally deferred (separate plan).

---

## Positive Observations

- `customer.service.ts` is well-structured: clean `FIELD_TO_COLUMN` / `COLUMN_TO_FIELD` maps, proper `toNumber`/`toStringOrNull` helpers, good use of Zod in API routes
- `getFullProfile` computes summary stats in one pass — efficient
- Streaming export with cursor-based pagination (`fullCustomerBatches`) is the right approach for large datasets
- `data-io.service.ts` upserts by natural key (`customer_code`, `contractNumber`, `invoiceNumber+supplierName`) — safe for re-imports
- Import route correctly handles both `multipart/form-data` (XLSX) and JSON content types

---

## Recommended Actions (Prioritized)

1. **Add file size limit** to import-data route (Critical — DoS)
2. **Validate date strings** before `new Date()` in data-io.service (Critical — silent corruption)
3. **Add try-catch** to `handleDelete` and `handleSubmit` in UI pages (Important)
4. **Fix XLSX invoice linkage** or document the limitation (Important)
5. **Remove dead column definitions** from xlsx-io.service (Minor — cleanup)
6. **Resolve store duplication** — one canonical location for customer store (Important)
7. **Split oversized services** per 200-line rule (Minor — housekeeping)

---

## Unresolved Questions

- Is XLSX import meant to support per-disbursement invoice granularity? If yes, the flat sheet format needs a disbursement sequence/ID column.
- `src/app/report/users/` directory was deleted along with auth — is there a replacement user settings page planned or is the users section permanently removed?
- `seed-admin.ts` is deleted from `package.json` scripts but still exists in `prisma/`. Is it still needed?
