# Phase 3: UI Conditional Form 3-way

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 3h
- **Depends on:** Phase 2

`LoanPlanTieuDungSection` render **3 branches** theo `income_source_type`:
- `salary` -> form 2 earner (hien tai, giu nguyen)
- `agriculture` -> form bang chi phi/doanh thu nong nghiep (6 cot)
- `business` -> form bang doanh thu theo nhom hang (5 cot)

## Key Insights

- 2 bang dynamic rows (array) -> can UI them/xoa row + auto compute totals
- Hierarchy: user them row voi flag "group header" (hien hang to, bold, Roman numeral) hoac "sub-item"
- Preview bang tra no (PA_TRANO) chi hien cho agriculture (term > 12); business tra hang thang -> hien theo thang neu muon

## Related Code Files

### Modify
- src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-tieu-dung-section.tsx — 3-way conditional

### Create
- src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-agriculture-income-form.tsx — bang nong nghiep
- src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-business-income-form.tsx — bang kinh doanh
- src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-editable-item-table.tsx — shared table component voi add/remove/reorder rows (optional — neu 2 form qua tuong dong)

## Implementation Steps

### 1. Shell conditional trong `LoanPlanTieuDungSection`

```tsx
const source = financials.income_source_type ?? "salary";

return (
  <section>
    {source === "salary" && <EarnerSalaryForm {...earnerProps} />}
    {source === "agriculture" && (
      <>
        <NarrativeTextarea
          value={financials.repayment_narrative ?? ""}
          onChange={v => onChange({ repayment_narrative: v })}
          placeholder="VD: Tu loi nhuan hoat dong trong Cat tuong tren 7 sao..."
        />
        <LoanPlanAgricultureIncomeForm financials={financials} onChange={onChange} />
      </>
    )}
    {source === "business" && (
      <>
        <NarrativeTextarea
          value={financials.repayment_narrative ?? ""}
          onChange={v => onChange({ repayment_narrative: v })}
          placeholder="VD: Tu hoat dong kinh doanh ban le thuoc tai 2 dia diem..."
        />
        <LoanPlanBusinessIncomeForm financials={financials} onChange={onChange} />
      </>
    )}
    {/* Common fields: term_months, interestRate, preferential_rate, loan_capital_need, living_expenses */}
    <CommonLoanFields ... />
  </section>
);
```

### 2. LoanPlanAgricultureIncomeForm

Table editor voi 6 cot: STT / Khoan muc / DVT / Don gia / So luong / Thanh tien

**Features:**
- Add row (normal) / Add group header (bold, Roman numeral auto)
- Delete row / Reorder (drag or up/down button)
- Auto-compute `amount = unitPrice * quantity` khi co du 2 field
- Auto-sum `agriculture_total_cost` = sum(amount) truoc group "II.THU NHAP"
- Auto-sum `agriculture_total_revenue` = sum(amount) sau group "II.THU NHAP"
- Auto-calc `agriculture_profit` = revenue - cost

Below table:
- Input: Chi phi sinh hoat BQ/nam (`agriculture_living_expenses_annual`)
- Display: TN tra no = profit - living_expenses
- Preview bang tra no (reuse `calcRepaymentSchedule`) neu term > 12

### 3. LoanPlanBusinessIncomeForm

Table voi 5 cot: STT / Nhom hang / So luong / Gia tri nhap / Doanh thu

**Features:**
- Same add/delete/reorder UX
- Auto-sum `business_total_import` va `business_total_revenue`
- Auto-calc `business_gross_profit_annual = revenue - import`

Below table:
- Input: Chi phi khac (mat bang/nhan cong/thue)/nam (`business_other_costs_annual`)
- Input: Chi phi sinh hoat/thang (`business_living_expenses_monthly`)
- Display: Thu nhap BQ hang thang = (gross_profit - other_costs) / 12
- Display: TN tra no BQ/thang = thu_nhap_thang - living_expenses_monthly

### 4. Shared editable table component (optional)

Neu 2 form qua tuong dong (add row / delete / reorder), extract `LoanPlanEditableItemTable<T>` generic component. **Skip neu phuc tap** — 2 form inline de maintain.

### 5. State management

Dispatcher `onChange(patch: Partial<LoanPlanFinancialsExtended>)` merge vao `financials` state. Auto-compute totals run tren moi lan items[] change (useMemo hoac useEffect).

### 6. UX polish

- Placeholder row khi empty: "Chua co muc chi phi"
- Highlight required: name, amount
- Currency format: dung formatter hien co
- Mobile: table scroll horizontal neu man nho

## Todo List
- [ ] Hide `rental` khoi income_source_type dropdown (chi hien: salary, agriculture, business)
- [ ] Implement `LoanPlanAgricultureIncomeForm`
- [ ] Implement `LoanPlanBusinessIncomeForm`
- [ ] Wire conditional 3-way trong tieu dung section
- [ ] Auto-compute totals logic (isGroupHeader filter khi sum!)
- [ ] Bang tra no preview cho agriculture
- [ ] UX manual test: add/delete/reorder, switch source
- [ ] Compile check

## Success Criteria
- Chon agriculture -> form A hien, nhap row -> total auto update, bang tra no preview dung
- Chon business -> form B hien, nhap row -> total auto update
- Chon salary -> form earner luong (khong regression)
- Switch source -> state giu trong JSON (khong xoa), UI chi hide

## Risk Mitigation
- 2 bang lon co the toc roi DOM -> virtualize neu > 30 row (YAGNI, skip)
- Drag-drop reorder co the phuc tap -> dung up/down button thay drag
- Group header logic phai intuitive -> provide explicit "Add group header" button rieng

## Unresolved Questions
- Co can default template row khi user click "agriculture" lan dau (auto insert "I.TONG CHI PHI", "II.THU NHAP", "III.LAI/LO" group headers)?
- Kinh doanh co case hon 1 bang khong (vd: cua hang 1 + cua hang 2)? File mau B nhap chung 1 bang.
