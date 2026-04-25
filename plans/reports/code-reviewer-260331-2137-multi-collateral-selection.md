# Code Review: Multi-Collateral Loan Selection

**Reviewer:** code-reviewer | **Date:** 2026-03-31 | **Commit:** 0945582 (HEAD)

## Scope

- Files: 8 (1 new, 7 modified)
- LOC changed: ~120 added, ~20 removed
- Focus: collateral selection per loan, report filtering, customer summary

## Overall Assessment

Feature well-scoped. Backward compatibility handled correctly (empty selection = use all). Picker UI clean and functional. A few issues need attention before shipping.

---

## Critical Issues

### C1. Missing DB migration for `selectedCollateralIds`

`prisma/schema.prisma` adds `selectedCollateralIds String @default("[]")` to Loan model but no corresponding migration file exists in `prisma/migrations/`. Deployment will fail or require manual `prisma db push`.

**Fix:** Run `npx prisma migrate dev --name add_loan_selected_collateral_ids`

### C2. GET collaterals endpoint missing auth guard

`src/app/api/customers/[id]/collaterals/route.ts` line 8: GET handler does NOT call `requireEditorOrAdmin()`. The POST handler does (line 31), but GET is unprotected -- any unauthenticated request can list all customer collateral data including values.

**Fix:**
```ts
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    await requireEditorOrAdmin(); // ADD THIS
    const { id } = await ctx.params;
```

---

## High Priority

### H1. No validation that `selectedCollateralIds` is valid JSON array

`src/app/api/loans/[id]/route.ts` line 47: schema accepts any string. Malformed JSON will silently break report filtering (caught by try-catch in khcn-report, but stores garbage in DB).

**Fix:** Add Zod transform validation:
```ts
selectedCollateralIds: z.string().optional().refine(
  (v) => { if (!v) return true; try { const a = JSON.parse(v); return Array.isArray(a); } catch { return false; } },
  "Must be a JSON array of string IDs"
),
```

### H2. Collateral fetch has no error handling in UI

`src/app/report/loans/[id]/page.tsx` lines 143-152: `.catch(() => {})` silently swallows fetch errors. User gets no feedback if collaterals fail to load -- picker just won't appear.

**Fix:** Add toast notification or at minimum console.error for debugging.

### H3. `fmtVND(0)` returns "---" instead of "0"

`loan-collateral-picker.tsx` line 25-27: `if (!n)` is falsy check -- `fmtVND(0)` returns "---". A collateral with `total_value = 0` shows "--- d" instead of "0 d".

**Fix:** `if (n === null || n === undefined) return "---";`

### H4. Save handler in page.tsx has no error handling

Lines 258-264: `onSave` callback does `await fetch(...)` without try-catch. Network failure or 4xx/5xx will throw unhandled promise rejection. No user feedback on failure.

**Fix:** Wrap in try-catch, show error toast, don't call `loadLoan()` on failure.

---

## Medium Priority

### M1. Loan detail page at 419 lines -- exceeds 200-line guideline

`src/app/report/loans/[id]/page.tsx` is 419 lines. The collateral picker integration adds more state and effects. Consider extracting collateral-related logic into a custom hook.

### M2. `loan?.selectedCollateralIds` default value inconsistency

Schema default is `"[]"` (empty JSON array). But the filtering logic in `khcn-report.service.ts` line 59 checks `if (loan?.selectedCollateralIds)` -- this is truthy for `"[]"`. Then it parses and checks `selectedIds.length > 0`, which handles it correctly. However, the picker's `initialSelectedIds` in page.tsx also does `JSON.parse(loan.selectedCollateralIds || "[]")` -- the `||` fallback is redundant since default is already `"[]"`. Minor but could cause confusion.

### M3. Hardcoded interest rate change unrelated to feature

`khcn-report.service.ts` changes interest rate calculation from dynamic (150% / 130%) to hardcoded strings (`"150% lai suat trong han"` / `"10%/nam"`). This is a separate concern mixed into the collateral PR. The "10%/nam" value also differs from the previous 130% formula -- confirm this is intentional per Agribank policy update.

### M4. Customer summary shows ALL collaterals, not per-loan

`customer.service.ts` `totalCollateralValue` and `totalObligation` aggregate ALL customer collaterals. The profile card shows these as customer-level totals, which is correct. But it could be confusing alongside the per-loan picker. Consider adding a tooltip clarifying this is customer-wide.

---

## Low Priority

### L1. Duplicate `PickerCollateral` type definition

Type defined in both `loan-collateral-picker.tsx` and `page.tsx`. Extract to a shared types file or import from picker.

### L2. `any` cast in collateral fetch

Page.tsx line 147: `(c: any)` in map callback. Could type the API response.

---

## Positive Observations

- Backward compatibility well-handled: empty selection falls through to all collaterals
- Picker UI grouped by type with running totals -- good UX
- `hasChanged` check prevents unnecessary saves
- Visual feedback for save state (disabled button, checkmark animation)
- Warning message when no collaterals selected ("se dung tat ca khi xuat bao cao")

---

## Recommended Actions (Priority Order)

1. **Create migration** for `selectedCollateralIds` column
2. **Add auth guard** to GET collaterals endpoint
3. **Validate JSON format** in Zod schema
4. **Add error handling** to collateral fetch and save in page.tsx
5. **Fix `fmtVND(0)` falsy check** in picker
6. Confirm hardcoded interest rate values are intentional policy change
7. Consider extracting collateral hook from page.tsx

---

## Unresolved Questions

1. Is the interest rate change (dynamic -> hardcoded "10%/nam") confirmed by Agribank policy update? This is a behavioral change unrelated to collateral selection.
2. Should the GET collaterals endpoint require only `requireAuth()` (any logged-in user) or `requireEditorOrAdmin()` (restricted)?
3. Is there a plan to add migration before deployment, or is this handled via `prisma db push` in this project?
