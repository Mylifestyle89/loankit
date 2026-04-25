# Phase 3: Builder Dispatch — Tieu Dung + Agriculture

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 1.5h
- **Depends on:** Phase 1

Khi builder DOCX chay voi `loanMethod = tieu_dung` va `income_source_type = agriculture`, phai **dispatch sang logic chung** (cost/revenue/khau hao/PA_TRANO) thay vi hardcode luong.

## Key Insights

- `khcn-builder-loan-plan-tieu-dung.ts:156-165` dang hardcode `HĐTD.Tổng thu nhập từ lương` — can gate theo income_source
- Logic cost/revenue/PA_TRANO da co trong `khcn-builder-loan-plan.ts` (builder chung cho trung_dai)
- Hai approach:
  - (A) Extract logic nong nghiep sang ham chung, ca 2 builder goi
  - (B) Trong tieu dung builder, if agriculture -> delegate call sang builder chung
- **Chon (A)** — sach hon, tranh coupling giua 2 builder

## Related Code Files

### Modify
- src/services/khcn-builder-loan-plan-tieu-dung.ts — them branch agriculture, goi helper chung
- src/services/khcn-builder-loan-plan.ts — extract logic thanh helpers exported

### Create (neu helper >50 line)
- src/services/khcn-builder-agriculture-helpers.ts — chua `buildAgriculturePlaceholders()`, `buildPaTranoRows()`, `buildCostRevenueItems()`

## Implementation Steps

### 1. Extract agriculture helpers
Tach tu `khcn-builder-loan-plan.ts` ra file helper:
```typescript
// khcn-builder-agriculture-helpers.ts
export function buildAgriculturePlaceholders(fin: LoanPlanFinancialsExtended): Record<string, string> {
  const depYears = Number(fin.depreciation_years) || 0;
  const assetPrice = Number(fin.asset_unit_price) || 0;
  const landSau = Number(fin.land_area_sau) || 0;
  const dep = depYears > 0 ? Math.round(assetPrice * landSau / depYears) : 0;
  return {
    "PA.Khấu hao nhà kính": fmtN(dep),
    "PA.Số năm khấu hao": String(depYears || ""),
    "PA.Đơn giá nhà kính/sào": fmtN(assetPrice),
    "PA.Số sào đất": fmtN(landSau),
    "PA.Số HĐ thi công": fin.construction_contract_no ?? "",
    "PA.Ngày HĐ thi công": fin.construction_contract_date ?? "",
  };
}

export function buildPaTranoRows(
  fin: LoanPlanFinancialsExtended,
  loanAmt: number,
  profit: number,
): Record<string, string>[] {
  const depreciation = /* ... compute ... */;
  const annualIncome = profit + depreciation;
  return calcRepaymentSchedule({
    loanAmount: loanAmt,
    termMonths: Number(fin.term_months) || 0,
    standardRate: Number(fin.interestRate) || 0,
    preferentialRate: fin.preferential_rate,
    annualIncome,
  }).map(r => ({
    "Năm": r.periodLabel,
    "Thu nhập trả nợ": fmtN(r.income),
    "Dư nợ": fmtN(r.balance),
    "Gốc trả": fmtN(r.principal),
    "Lãi trả": fmtN(r.interest),
    "TN còn lại": fmtN(r.remaining),
  }));
}
```

### 2. Tieu dung builder: dispatch
```typescript
// khcn-builder-loan-plan-tieu-dung.ts
import { buildAgriculturePlaceholders, buildPaTranoRows } from "./khcn-builder-agriculture-helpers";

export function buildTieuDungLoanPlanData(...) {
  const fin = plan.financials as LoanPlanFinancialsExtended;

  if (fin.income_source_type === "agriculture") {
    // Nhanh nong nghiep — reuse helpers
    const data: Record<string, unknown> = { ...baseData };
    Object.assign(data, buildAgriculturePlaceholders(fin));
    data["PA_TRANO"] = buildPaTranoRows(fin, loanAmt, profit);

    // Set HĐTD.Tổng thu nhập = annualIncome (thay cho lương)
    data["HĐTD.Tổng thu nhập từ nông nghiệp"] = fmtN(annualIncome);
    data["HĐTD.Tổng thu nhập từ lương"] = "0";
    data["HĐTD.Tổng thu nhập từ SXKD"] = "0";
    return data;
  }

  // Nhanh luong (hien tai) — giu nguyen
  // ...existing code...
}
```

### 3. Refactor trung_dai builder (neu da inline)
- Replace inline logic trong `khcn-builder-loan-plan.ts` bang goi helper chung -> no regression

### 4. Income sentence narrative
Neu tieu dung builder co sinh narrative (buildIncomeSentence), them branch agriculture:
```typescript
function buildIncomeSentenceAgriculture(fin: LoanPlanFinancialsExtended): string {
  return `Khach hang canh tac tren dien tich ${fin.land_area_sau} sao tai ${fin.farmAddress ?? ""}, thu nhap hang nam uoc tinh ${fmtN(annualIncome)} dong.`;
}
```

## Todo List
- [ ] Extract `buildAgriculturePlaceholders` + `buildPaTranoRows` helpers
- [ ] Refactor trung_dai builder goi helper (verify no regression)
- [ ] Them branch agriculture trong tieu dung builder
- [ ] Them narrative sentence cho agriculture
- [ ] Compile check
- [ ] Test builder voi sample data tieu dung + agriculture

## Success Criteria
- Tieu dung + agriculture -> DOCX output chua placeholders khau hao + bang PA_TRANO day du
- Tieu dung + salary -> output khong thay doi (backward compat)
- Trung dai builder van chay dung (regression check)

## Risk Mitigation
- Lay `profit`, `loanAmt` phai compute duoc tu financials (cost/revenue items) — dam bao UI bat user nhap
- Neu `term_months <= 12` -> PA_TRANO = [] (short-term tieu dung)

## Unresolved Questions
- Placeholder `HĐTD.Tổng thu nhập từ nông nghiệp` co phai dang ky trong registry chua? (phase 4 xu ly)
- Narrative sentence co phai hard-coded format hay user customize?
