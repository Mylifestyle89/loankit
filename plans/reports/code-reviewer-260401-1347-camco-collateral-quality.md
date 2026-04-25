# Code Review: Cam co / TTK collateral + term unit + schema changes

**Scope:** 14 files, ~350 LOC added
**Focus:** Code quality, hacky patterns, DRY, leaky abstractions

## Overall Assessment

Solid feature addition (camco loan type, STK collateral, term unit day/month). Most issues are medium priority — double JSON.parse, date math approximation, and growing file sizes.

---

## Issues Found

### HIGH — Double JSON.parse of same `properties_json` per item

**File:** `src/services/khcn-builder-collateral-savings-other.ts` lines 60, 78-81, 87-88

`extractSavingsFields()` (line 22) already parses `properties_json`. Then `buildSavingsCollateralData` parses it AGAIN in two more places: the `tkGocLai` reduce (line 79) and the `stkLoopRows` map (line 88). That is 3x parse per collateral item.

**Fix:** Extract parsed props once per item, pass alongside `col`:

```ts
const parsed = items.map(col => ({
  col,
  p: JSON.parse(col.properties_json || "{}"),
}));
// Reuse `p` in extractSavingsFields, tkGocLai reduce, stkLoopRows
```

Or have `extractSavingsFields` return `{ fields, parsed }` so callers can reuse the parsed object.

---

### HIGH — Approximate month calculation via magic number 30.44

**File:** `src/components/invoice-tracking/disbursement-form-modal.tsx` lines 255-256
**File:** `src/services/khcn-report.service.ts` line 136 (`30.44 * 24 * 3600000`)

`calcTermFromEndDate` with `unit === "tháng"` uses `30.44 * 24 * 3600000` to estimate months. This will give wrong results for short periods (e.g., Jan 15 to Feb 15 = 31 days / 30.44 = 1.018 → rounds to 1, correct by luck). But Feb 1 to Mar 1 = 28 days / 30.44 = 0.92 → rounds to 1 (ok), while Jan 31 to Mar 1 = 29 days → also 1. Edge cases produce user-confusing display.

Same pattern in `khcn-report.service.ts` line 136.

**Fix:** Use calendar month diff for month unit:

```ts
const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
```

---

### MEDIUM — `calcEndDateFromTerm` / `calcTermFromEndDate` defined inside component

**File:** `src/components/invoice-tracking/disbursement-form-modal.tsx` lines 232-257

These are pure functions (no state deps) defined inside the component body. They get recreated every render. Not a perf issue per se, but they should be extracted outside the component or into a utility — they're also duplicating logic from `khcn-report.service.ts`.

**Fix:** Move to `src/lib/invoice-tracking-format-helpers.ts` or a new `date-calc` utility. Reuse in `khcn-report.service.ts` too.

---

### MEDIUM — `const repaymentEndDate = repaymentEndDateInput` (redundant alias)

**File:** `src/components/invoice-tracking/disbursement-form-modal.tsx` line 293

The old `repaymentEndDate` was a `useMemo`. Now it's just an alias of `repaymentEndDateInput`. Every reference to `repaymentEndDate` downstream can just use `repaymentEndDateInput` directly, eliminating confusion about which is the "source of truth."

**Fix:** Remove line 293, rename `repaymentEndDateInput` to `repaymentEndDate` at declaration (line 210).

---

### MEDIUM — Duplicate field entries in `stkLoopRows`

**File:** `src/services/khcn-builder-collateral-savings-other.ts` lines 93-105

The loop row object has near-duplicate keys:
- `"Số seri"` + `"Số Sêri"` (just accent difference)
- `"Lãi suất của CCTG"` + `"Lãi suất gửi"` + `"Lãi suất"` (all same value)
- `"Số dư/ mệnh giá"` + `"Số dư đồng"` (same formula)

This is template-driven duplication (different DOCX templates use different labels). Acceptable pattern for docx field mapping, but document WHY with a one-line comment so future devs don't "clean" it up.

---

### MEDIUM — File size violations (>200 lines)

| File | Lines |
|------|-------|
| `disbursement-form-modal.tsx` | 470 |
| `collateral-form.tsx` | 426 |
| `khcn-report.service.ts` | 366 |
| `bk-to-customer-relations.ts` | 346 |

Per project rules, files should stay under 200 lines. These were already over before this diff, but each grew further.

---

### MEDIUM — Stringly-typed `termUnit` in schema and service

**File:** `prisma/schema.prisma` line 254 — `termUnit String? @default("tháng")`
**File:** `src/services/disbursement.service.ts` line 61 — `termUnit?: string`

The API zod schema correctly uses `z.enum(["tháng", "ngày"])`, but the Prisma schema and service type are plain `String`/`string`. If someone writes `"thang"` or `"days"` it silently saves.

**Fix:** At minimum, add a comment on the Prisma field documenting valid values. Ideally, validate in `disbursement.service.ts` before save:

```ts
const VALID_UNITS = new Set(["tháng", "ngày"]);
if (input.termUnit && !VALID_UNITS.has(input.termUnit)) throw new Error("Invalid termUnit");
```

---

### LOW — `as "tháng" | "ngày"` type assertion on select value

**File:** `src/components/invoice-tracking/disbursement-form-modal.tsx` line 336

```tsx
onChange={(e) => handleTermUnitChange(e.target.value as "tháng" | "ngày")}
```

Safe here because the `<select>` only has those two `<option>` values, but a safer pattern is to validate or use a type guard.

---

### LOW — Dead delete after fresh create

**File:** `src/services/customer.service.ts` lines 257-258

```ts
const loan = await tx.loan.create({ data: { ... } });
await tx.beneficiary.deleteMany({ where: { loanId: loan.id } });
await tx.disbursement.deleteMany({ where: { loanId: loan.id } });
```

A freshly created loan can't have beneficiaries or disbursements yet. These deletes are no-ops. They only make sense if the loan was found via `findFirst` + update. The `deleteMany` on line 212 (`tx.loan.deleteMany`) already clears old loans + cascaded children.

**Fix:** Remove the two deleteMany calls after `tx.loan.create`.

---

## Positive Observations

- `contractNumber` @unique removal aligns with the critical data-model guardrail (MEMORY.md)
- `data-io.service.ts` correctly changed `findUnique` to `findFirst` with `customerId` scope
- New `khcn-camco-template-registry.ts` is well-structured, clean, under 50 lines
- Collateral subtype/paper_type UI with conditional field visibility is clean

## Recommended Actions (Priority Order)

1. Remove dead `deleteMany` calls after `loan.create` (quick fix, confusing code)
2. Eliminate triple `JSON.parse` in savings builder (perf + clarity)
3. Replace `30.44` magic number with calendar month diff
4. Remove `repaymentEndDate` alias, rename state directly
5. Extract date calc functions outside component body
6. Add validation comment or guard for `termUnit` string values
