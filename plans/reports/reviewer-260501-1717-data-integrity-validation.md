# Data Integrity, Validation & Core Logic Edge Cases Review

**Date:** 2026-05-01
**Reviewer:** code-reviewer
**Scope:** 7 edge cases across services, API routes, Prisma schema, and calculation logic

---

## 1. Zod Schema Completeness

**Status:** PARTIAL
**Severity:** Medium

### Evidence

**Loan** (POST/PATCH): Fully covered.
- `src/app/api/loans/route.ts:10-29` — createSchema covers all `CreateLoanInput` fields
- `src/app/api/loans/[id]/route.ts:12-53` — updateSchema covers all `UpdateLoanInput` fields including `selectedCollateralIds` JSON validation

**Customer** (POST/PATCH): Fully covered.
- `src/app/api/customers/route.ts:12-42` — createCustomerSchema
- `src/app/api/customers/[id]/route.ts:11-40` — updateCustomerSchema

**Disbursement** (POST): Fully covered.
- `src/app/api/loans/[id]/disbursements/route.ts:33-48` — createSchema with nested beneficiary/invoice schemas

**Invoice** (POST): PARTIAL — missing `items` and `templateType` in create schema.
- `src/app/api/disbursements/[id]/invoices/route.ts:11-20` — createSchema lacks `items` (RetailLineItem[]) and `templateType` fields
- The service `CreateInvoiceInput` type (invoice.service.ts:37-40) accepts both fields
- The update schema at `src/app/api/invoices/[id]/route.ts:19-30` correctly includes both
- Result: retail invoice creation via this endpoint silently drops `items` and `templateType` due to Zod `parse()` stripping unknown keys

### Recommendation
Add `items` and `templateType` to the invoice create schema at `src/app/api/disbursements/[id]/invoices/route.ts`:
```typescript
items: z.array(retailLineItemSchema).optional(),
templateType: z.string().optional(),
```

---

## 2. Cascade Delete Safety

**Status:** HANDLED
**Severity:** Low (no action needed)

### Evidence

Prisma schema defines proper cascade chain:
- `Customer` -> `Loan`: `onDelete: Cascade` (schema.prisma:196)
- `Loan` -> `Disbursement`: `onDelete: Cascade` (schema.prisma:281)
- `Loan` -> `Beneficiary`: `onDelete: Cascade` (schema.prisma:264)
- `Disbursement` -> `Invoice`: `onDelete: Cascade` (schema.prisma:335)
- `Disbursement` -> `DisbursementBeneficiary`: `onDelete: Cascade` (schema.prisma:312)
- `DisbursementBeneficiary` -> `Invoice.disbursementBeneficiaryId`: `onDelete: SetNull` (schema.prisma:337)
- `LoanPlan` -> `Loan.loanPlanId`: `onDelete: SetNull` (schema.prisma:247)

Full cascade path: deleting a Customer cascades through Loan -> Disbursement -> Invoice. No orphan data risk.

Service-level delete methods (`loan.service.ts:241-245`, `disbursement-crud.service.ts:135-139`) properly check existence before delete. Prisma cascade handles child cleanup at DB level.

---

## 3. Financial Calculation Precision

**Status:** PARTIAL
**Severity:** Medium

### Evidence

**All financial columns use `Float` (IEEE 754 double)** in Prisma schema:
- `Loan.loanAmount`, `Loan.interestRate`, `Loan.collateralValue` etc. (schema.prisma:198-207)
- `Disbursement.amount`, `Invoice.amount` (schema.prisma:282, 340)

**Expression evaluator** (`field-calc-expression-evaluator.ts`) uses native JS arithmetic:
- Addition: `left + right` (line 131)
- Division: `left / right` (line 164) — has divide-by-zero guard (returns null)
- Rounding: `roundExcel()` uses `Math.pow(10, digits) * value` then `Math.floor(shifted + 0.5)` (lines 89-95) — standard banker's rounding approximation

**Aggregate functions** (`field-calc-numeric-utils.ts:35-37`): `sum()` uses naive `reduce((a,b) => a + b, 0)` which accumulates floating point errors for large arrays.

**Invoice amount calculations** (`invoice-crud.service.ts:117-119`): `items.reduce((s, i) => s + i.amount, 0)` — same naive sum pattern.

**Beneficiary status recalc** (`invoice-crud.service.ts:24`): `invoices.reduce((s, inv) => s + inv.amount, 0)` — floating point comparison at line 28-30 (`totalInvoiceAmount < disbursementAmount`) can produce incorrect threshold results for amounts like 333.33 * 3.

### Recommendation

For a banking app, this is a known risk. However, since:
- Amounts are in VND (typically whole numbers or 2-decimal max)
- Report template output uses ROUND functions
- No interest compounding calculations in the expression evaluator

The practical risk is LOW for current usage. If fractional amounts become common:
- Consider using `Decimal` type in Prisma (supported for SQLite via string storage)
- Or multiply by 100 (store as integer cents)

---

## 4. Date/Timezone Handling

**Status:** PARTIAL
**Severity:** Medium

### Evidence

**Deadline scheduler** (`deadline-check-logic.ts:31-32`):
```typescript
const now = new Date();
const sevenDaysFromNow = new Date(now.getTime() + SEVEN_DAYS);
```
Uses `Date.now()` — server-local time. The 7-day calculation is correct in milliseconds.

**Comparison logic** (lines 92-93, 102):
```typescript
{ customDeadline: { not: null, lte: sevenDaysFromNow, gt: now } }
```
and
```typescript
if (effectiveDate > sevenDaysFromNow || effectiveDate <= now) continue;
```
These use UTC internally via Prisma DateTime. Correct if server and DB both use UTC.

**Risk:** The app creates dates from user input strings:
- `loan.service.ts:158-161`: `new Date(input.startDate)` — parses date string without timezone specification
- `invoice-crud.service.ts:128-130`: `new Date(input.issueDate)`, `new Date(input.dueDate)`
- If user sends `"2026-05-01"` (date-only), JS parses as UTC midnight. But if they send `"2026-05-01T00:00:00"` (no Z), it parses as local time. This inconsistency can shift dates by 1 day in Vietnam (UTC+7).

**Notification display** (line 109): `.toLocaleDateString("vi-VN")` — correct for display, uses server locale.

### Recommendation

Normalize all incoming date strings to UTC explicitly. Either:
- Validate format as ISO date-only (`YYYY-MM-DD`) and append `T00:00:00.000Z`
- Or use a date library (date-fns) to parse with explicit timezone

---

## 5. SQLite Concurrent Write Issues

**Status:** UNHANDLED
**Severity:** Medium

### Evidence

**No WAL mode configuration found.** `src/lib/prisma.ts` creates a PrismaClient via `@prisma/adapter-libsql` for both local SQLite and Turso/LibSQL. No PRAGMA statements are executed.

- For local SQLite: LibSQL adapter defaults to journal_mode=WAL (LibSQL inherits this from SQLite's WAL2 by default), but this is not explicitly configured or verified.
- For Turso (cloud): Turso handles concurrency server-side, so this is not an issue in production.
- `$transaction` usage exists in disbursement CRUD (`disbursement-crud.service.ts:44, 99`) — Prisma interactive transactions acquire a write lock, which is correct.
- However, non-transactional writes (loan create, invoice create, customer create) have no explicit serialization.

**Practical risk:** Low for current usage (single-user desktop app per the app description). If multiple users access the same local SQLite DB simultaneously, write conflicts could occur.

### Recommendation

For local dev/deployment, add a one-time PRAGMA after client creation:
```typescript
await prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL");
```
Not needed for Turso deployment.

---

## 6. Duplicate Invoice Detection

**Status:** PARTIAL
**Severity:** Medium

### Evidence

**Detection logic** (`invoice-crud.service.ts:74-85`):
```typescript
const existing = await prisma.invoice.findFirst({
  where: {
    invoiceNumber: input.invoiceNumber,
    supplierName: input.supplierName,
    disbursementId: input.disbursementId,
  },
});
```

**Matching criteria:** `invoiceNumber` + `supplierName` + `disbursementId` (all three must match).

**Behavior:** Does NOT block creation — creates a notification warning instead (line 83-103). The invoice is still created even if duplicate exists.

### Issues:

1. **False negatives (cross-disbursement):** Same invoice from same supplier used across different disbursements of the same loan is NOT detected. A supplier could issue one invoice, and it gets attached to multiple disbursements.

2. **Case sensitivity:** `invoiceNumber` and `supplierName` comparisons are case-sensitive in SQLite's default LIKE behavior for non-ASCII. "ABC Corp" vs "abc corp" would not match.

3. **No trimming:** Invoice numbers with trailing whitespace ("INV-001 " vs "INV-001") would not match.

4. **Warn-only:** Duplicates are allowed through with just a notification. For financial documents, this should arguably be a blocking validation with user override.

### Recommendation

- Add cross-disbursement duplicate check at the loan level (same `invoiceNumber` + `supplierName` across all disbursements of the same loan)
- Trim and normalize `invoiceNumber` before comparison
- Consider making duplicate detection blocking (return error) with a `force: true` override parameter

---

## 7. Null Safety on Prisma Results

**Status:** HANDLED
**Severity:** Low

### Evidence

All service methods using `findUnique`/`findFirst` properly check for null:

- `loan.service.ts:149`: `if (!loan) throw new NotFoundError("Loan not found.")`
- `loan.service.ts:192-193`: `if (!existing) throw new NotFoundError("Loan not found.")`
- `loan.service.ts:242-243`: Same pattern for delete
- `disbursement-crud.service.ts:30`: `if (!disbursement) throw new NotFoundError("Disbursement not found.")`
- `disbursement-crud.service.ts:69-70`: Same for update
- `disbursement-crud.service.ts:87-88`: Same for fullUpdate
- `disbursement-crud.service.ts:136-137`: Same for delete
- `invoice-crud.service.ts:58`: `if (!invoice) throw new NotFoundError("Invoice not found.")`
- `invoice-crud.service.ts:145-146`: Same for update
- `invoice-crud.service.ts:175-176`: Same for delete
- `customer.service.ts:143-144`: Same pattern

**One minor gap:** `invoice-crud.service.ts:65-71` — when auto-setting dueDate, the disbursement lookup uses `findUnique` and checks `if (disbursement)` (line 69), so null is handled. However, if disbursement is not found (invalid `disbursementId`), it silently continues with whatever `dueDate` was passed, and the invalid `disbursementId` will fail on the `create()` call with a foreign key constraint error — not a clean user-facing error.

### Recommendation

Add an explicit existence check for `disbursementId` before invoice creation:
```typescript
const disbursement = await prisma.disbursement.findUnique({ where: { id: input.disbursementId } });
if (!disbursement) throw new NotFoundError("Disbursement not found.");
```

---

## Summary Table

| # | Edge Case | Status | Severity | Action Needed |
|---|-----------|--------|----------|---------------|
| 1 | Zod schema completeness | PARTIAL | Medium | Add `items`/`templateType` to invoice create schema |
| 2 | Cascade delete safety | HANDLED | Low | None |
| 3 | Financial calculation precision | PARTIAL | Medium | Monitor; consider Decimal type if fractional VND used |
| 4 | Date/timezone handling | PARTIAL | Medium | Normalize incoming date strings to UTC |
| 5 | SQLite concurrent write | UNHANDLED | Medium | Add WAL PRAGMA for local SQLite |
| 6 | Duplicate invoice detection | PARTIAL | Medium | Cross-disbursement check, normalize inputs, consider blocking |
| 7 | Null safety on Prisma results | HANDLED | Low | Minor: validate disbursementId early in invoice create |

---

## Unresolved Questions

1. Is the app always deployed on Turso in production, or are there production local-SQLite deployments? (Affects priority of WAL mode fix)
2. Are retail invoices (`items` field) currently being created via the `disbursements/[id]/invoices` endpoint, or only via a different code path? (Affects urgency of Zod gap)
3. Does the business allow the same physical invoice to be legitimately attached to multiple disbursements? (Affects duplicate detection scope)
