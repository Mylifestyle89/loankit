# Phase 2: Unsecured Loan (Vay khong TSBD)

## Overview
- **Priority**: P2
- **Status**: pending
- **Est**: 2h

Allow existing loan methods to work without collateral. Currently the system falls back to "use all collaterals" when `selectedCollateralIds` is empty. Need to distinguish "not yet selected" from "intentionally no collateral".

## Key Insights
- Current behavior in `khcn-report.service.ts` line 63: empty selectedIds -> use ALL collaterals (backward compat fallback)
- `loan-collateral-picker.tsx` line 85: returns null when `collaterals.length === 0` (picker hidden)
- `loan-collateral-picker.tsx` line 112-114: shows amber warning "Chua chon TSBD - se dung tat ca khi xuat bao cao"
- Need a clear signal: `selectedCollateralIds = "[]"` + a flag or convention for "explicitly no collateral"
- Simplest approach: add `is_unsecured` boolean flag on Loan model (or use properties)

## Design Decision: How to signal "no collateral"

**Option A**: New boolean column `is_unsecured` on Loan -> requires Prisma migration
**Option B**: Convention: `selectedCollateralIds = "NONE"` sentinel value -> no migration
**Option C**: New property in loan's existing JSON/text field

**Chosen: Option A** (`is_unsecured` boolean, default false). Reason:
- Clean, queryable, explicit
- Migration is trivial (add column with default)
- Avoids magic strings

## Related Code Files

### Modify
1. `prisma/schema.prisma` — Add `is_unsecured Boolean @default(false)` to Loan model
2. `src/app/report/loans/[id]/components/loan-collateral-picker.tsx`
   - Show even when `collaterals.length === 0` if we need toggle
   - Add "Khong co TSBD" toggle/checkbox at top
   - When toggled on: clear selection, show "Khong TSBD" badge, disable collateral checkboxes
   - Save `is_unsecured` flag via API
3. `src/app/report/loans/[id]/page.tsx`
   - Pass `is_unsecured` to picker component
   - Show "Khong TSBD" indicator in loan header/summary
4. `src/api/loans/[id]/route.ts`
   - Accept `is_unsecured` in PATCH payload
5. `src/services/khcn-report.service.ts`
   - Line 59-67: if `loan.is_unsecured`, set `collaterals = []` (skip all collateral data)
   - Skip all `build*CollateralData()` calls
   - Set collateral totals to 0/empty
6. `src/services/customer.service.ts`
   - Include `is_unsecured` in loan queries if not already selected

### Create
- None (no new files needed)

## Implementation Steps

### Step 1: DB Migration
1. Add to `prisma/schema.prisma` in Loan model:
   ```prisma
   is_unsecured Boolean @default(false)
   ```
2. Run `npx prisma db push` (SQLite/Turso compatible)

### Step 2: API Update (`src/api/loans/[id]/route.ts`)
1. Accept `is_unsecured` boolean in PATCH body
2. When `is_unsecured = true`, also set `selectedCollateralIds = "[]"`

### Step 3: Collateral Picker UI (`loan-collateral-picker.tsx`)
1. Add prop: `isUnsecured: boolean`, `onToggleUnsecured: (val: boolean) => Promise<void>`
2. Render toggle at top of component:
   ```
   [ ] Khong co tai san bao dam (thau chi / vay luong)
   ```
3. When toggled ON:
   - Call `onToggleUnsecured(true)`
   - Disable all checkboxes, show green "Khong TSBD" badge
   - Clear selectedIds display
4. When toggled OFF:
   - Call `onToggleUnsecured(false)`
   - Re-enable checkboxes
5. Remove the `if (collaterals.length === 0) return null` guard — always show component

### Step 4: Report Service (`khcn-report.service.ts`)
1. After line 59 (collateral filtering), add:
   ```ts
   if (loan?.is_unsecured) {
     collaterals = [];
   }
   ```
2. This naturally skips all collateral builders (they filter by type, get 0 items)
3. Collateral totals become 0 -> template shows empty

### Step 5: Loan Page UI (`loans/[id]/page.tsx`)
1. Pass `is_unsecured` and toggle handler to `LoanCollateralPicker`
2. Show "Khong TSBD" badge in loan summary when `is_unsecured = true`

## Todo List
- [ ] Add `is_unsecured` to Prisma schema
- [ ] Run prisma db push
- [ ] Update PATCH /api/loans/[id] to accept is_unsecured
- [ ] Update LoanCollateralPicker: add unsecured toggle
- [ ] Update loan page: pass is_unsecured prop
- [ ] Update khcn-report.service.ts: skip collateral when unsecured
- [ ] Manual test: toggle unsecured, verify DOCX output has empty collateral fields
- [ ] Verify backward compat: existing loans default is_unsecured = false

## Success Criteria
- Can mark a loan as "khong TSBD" via UI toggle
- DOCX output skips all collateral sections when unsecured
- Existing loans unaffected (default false)
- Can switch back to secured (toggle off, reselect collaterals)

## Risk Assessment
- **Low**: DB migration is additive only (new boolean column with default)
- **Low**: Report service naturally handles empty collaterals (builders emit nothing)
- **Medium**: Some DOCX templates may render broken if collateral placeholders are empty -> need to verify template behavior with empty data
