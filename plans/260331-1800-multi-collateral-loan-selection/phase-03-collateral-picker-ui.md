# Phase 3: Collateral Picker UI

## Context
- [Loan Detail Page](../../src/app/report/loans/[id]/page.tsx) — loan detail with disbursements
- [Collateral Display](../../src/app/report/customers/[id]/components/collateral-display.tsx) — existing grouped display
- [Collateral Config](../../src/app/report/customers/[id]/components/collateral-config.ts) — type labels

## Overview
- **Priority**: P1
- **Status**: pending
- **Effort**: 1.5h
- **Dependencies**: Phase 1 (API accepts selectedCollateralIds)

Add collateral selection UI trong loan detail page. User chon tai san nao dua vao khoan vay nay.

## Key Insights
- Loan detail page (`/report/loans/[id]`) loads loan via `GET /api/loans/[id]`
- Loan has `customer.id` — can fetch customer's collaterals
- Need new component: collateral picker with checkboxes
- Save via `PATCH /api/loans/[id]` with `selectedCollateralIds`
- Loan type in page.tsx needs `selectedCollateralIds` field

## Requirements
- List all customer collaterals grouped by type (qsd_dat, dong_san, tiet_kiem, tai_san_khac)
- Checkbox per collateral
- Show name, total_value, obligation per item
- Running total of selected values at bottom
- Save button calls PATCH API
- Load existing selection on mount
- Backward compat: empty selection = tat ca (hien thi note)

## Architecture

```
LoanDetailPage
  |-- fetch GET /api/customers/[customerId]/collaterals (new or reuse)
  |-- <CollateralPickerSection>
        |-- grouped by collateral_type
        |-- checkbox per item
        |-- running total
        |-- Save button --> PATCH /api/loans/[id] { selectedCollateralIds }
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/app/report/loans/[id]/components/loan-collateral-picker.tsx` | Collateral picker component |

## Files to Modify

| File | Change |
|------|--------|
| `src/app/report/loans/[id]/page.tsx` | Add collateral picker section, fetch collaterals |
| `src/app/api/loans/[id]/route.ts` | Already done in Phase 1 |

## Implementation Steps

1. **Add selectedCollateralIds to Loan type** in page.tsx:
   ```ts
   type Loan = {
     ...existing fields...
     selectedCollateralIds?: string; // JSON string
   };
   ```

2. **Fetch customer collaterals** — In loan detail page, after loan loads, fetch collaterals:
   ```ts
   // Reuse existing API or direct fetch
   const [collaterals, setCollaterals] = useState<Collateral[]>([]);
   useEffect(() => {
     if (loan?.customer?.id) {
       fetch(`/api/customers/${loan.customer.id}`)
         .then(r => r.json())
         .then(d => setCollaterals(d.customer?.collaterals ?? []));
     }
   }, [loan?.customer?.id]);
   ```
   Check if customer API already includes collaterals. If not, may need a dedicated endpoint or include in existing.

3. **Create `loan-collateral-picker.tsx`** (~120 lines):
   - Props: `collaterals`, `selectedIds`, `onSelectionChange`, `onSave`, `saving`
   - Group by `collateral_type` using labels from collateral-config
   - Checkbox per item with name + value display
   - Running total footer
   - Save button
   - Note when empty: "Chua chon TSBD — se dung tat ca khi xuat bao cao"

4. **Integrate in loan detail page**:
   - Add section after hero card, before disbursement table
   - Parse `loan.selectedCollateralIds` to get initial selection
   - On save: `PATCH /api/loans/[id]` with `JSON.stringify(selectedIds)`
   - Refresh loan data after save

5. **Collateral type** for the picker:
   ```ts
   type PickerCollateral = {
     id: string;
     name: string;
     collateral_type: string;
     total_value: number | null;
     obligation: number | null;
   };
   ```

6. **Compile check**.

## Todo
- [ ] Add selectedCollateralIds to Loan type in page.tsx
- [ ] Check customer API for collateral data availability
- [ ] Create loan-collateral-picker.tsx component
- [ ] Integrate picker in loan detail page
- [ ] Wire save to PATCH API
- [ ] Parse/load existing selection
- [ ] Compile check

## Success Criteria
- User can select/deselect collaterals per loan
- Running total updates on selection change
- Selection persists after save + page reload
- Empty selection shows informational note
- Grouped by collateral type with Vietnamese labels

## Risk
- Medium: Customer collateral API may not exist separately — may need to fetch from customer detail. Check existing endpoints first.

## Security
- Uses existing `requireEditorOrAdmin()` guard on PATCH
- No new auth concerns
