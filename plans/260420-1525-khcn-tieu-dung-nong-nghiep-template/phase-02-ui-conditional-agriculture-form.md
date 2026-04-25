# Phase 2: UI Conditional Agriculture Form (Tieu Dung)

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 2h
- **Depends on:** Phase 1

Khi user chon `loan_method = "tieu_dung"` + `income_source_type = "agriculture"`, form tieu dung switch tu "form 2 earner luong" sang "form nong nghiep" (cost items, revenue, khau hao, bang tra no preview) — reuse y het form trung_dai.

## Key Insights

- Form trung_dai (greenhouse) da co full UI fields — se extract/copy pattern sang tieu dung
- `LoanPlanTieuDungSection` hien render 2 earner (earner1/2_*) — can conditional wrap
- Fields nong nghiep dung chung state `financials_json` — save logic khong can sua
- Preview bang tra no: reuse component cua trung_dai (neu da co) hoac goi `calcRepaymentSchedule()` realtime

## Related Code Files

### Read
- src/app/report/customers/[id]/loan-plans/[planId]/page.tsx (dropdown income_source + mount section)
- src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-form-sections.tsx (trung_dai form nong nghiep — reference)

### Modify
- src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-tieu-dung-section.tsx — conditional render agriculture form
- src/app/report/customers/[id]/loan-plans/[planId]/page.tsx — ensure dropdown income_source persist truoc khi render section (already does)

### Create (optional — neu agriculture form >100 line)
- src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-agriculture-form.tsx — extract agriculture form dung chung cho trung_dai + tieu_dung

## Implementation Steps

### 1. Extract agriculture form block thanh component chung (optional)
Neu trong `loan-plan-form-sections.tsx` agriculture block >80 line, extract ra `loan-plan-agriculture-form.tsx`:
```tsx
export function LoanPlanAgricultureForm(props: {
  financials: LoanPlanFinancialsExtended;
  onChange: (patch: Partial<LoanPlanFinancialsExtended>) => void;
}) {
  // cost items, revenue items, depreciation inputs, repayment preview
}
```

### 2. Conditional render trong `LoanPlanTieuDungSection`
```tsx
// loan-plan-tieu-dung-section.tsx
const isAgriculture = financials.income_source_type === "agriculture";

return (
  <section>
    {/* Dropdown income_source da render o page.tsx */}
    {isAgriculture ? (
      <LoanPlanAgricultureForm financials={financials} onChange={onChange} />
    ) : (
      <>
        {/* Form 2 earner luong hien tai — giu nguyen */}
        <EarnerFields earnerIndex={1} ... />
        <EarnerFields earnerIndex={2} ... />
        <LivingExpensesFields ... />
      </>
    )}
  </section>
);
```

### 3. Bang tra no preview
- Trong agriculture branch, them table preview goi `calcRepaymentSchedule()` realtime
- Columns: Ky | Thu nhap tra no | Du no | Goc tra | Lai tra | TN con lai
- Chi render khi `term_months > 12` va co `loanAmount`

### 4. Field list cho agriculture form (reuse greenhouse)
Cost items (array), Revenue items (array, dung `CategoryRevenue` type "nong_nghiep"/"chan_nuoi"), va flat fields:
- `depreciation_years`, `asset_unit_price`, `land_area_sau`
- `preferential_rate`, `term_months`, `repayment_frequency`, `principal_rounding`
- `construction_contract_no`, `construction_contract_date` (optional — chan nuoi khong can)
- `farmAddress`

### 5. Validation UX
- Highlight required fields khi thieu: `depreciation_years`, `asset_unit_price`, `land_area_sau`, `term_months`
- Disable save neu missing required (hoac warning inline)

## Todo List
- [ ] Quyet dinh extract `LoanPlanAgricultureForm` hay inline
- [ ] Implement conditional render trong tieu dung section
- [ ] Wire state onChange cho agriculture fields (reuse pattern trung_dai)
- [ ] Them bang tra no preview
- [ ] Test UX switch salary <-> agriculture (state dirty)
- [ ] Verify compile + visual render

## Success Criteria
- Chon income_source = agriculture -> form doi sang nong nghiep
- Nhap du data -> bang tra no preview hien dung
- Save + reload -> fields persist qua financials_json
- Chuyen ve salary -> form quay ve earner (state agriculture giu trong JSON, an khoi UI)

## Risk Mitigation
- Giu earner fields trong financials_json khi switch sang agriculture — khong delete de user quay lai duoc
- Neu extract component, ensure khong break form trung_dai hien tai (shared refs)

## Unresolved Questions
- Co can bat buoc user xoa data earner khi switch sang agriculture khong? (De xuat: khong — giu JSON)
- Repayment frequency default cho tieu dung nong nghiep = 12 (hang nam) hay 6 (nua nam)?
