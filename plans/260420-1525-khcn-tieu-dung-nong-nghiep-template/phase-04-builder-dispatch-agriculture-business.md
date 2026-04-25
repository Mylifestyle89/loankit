# Phase 4: Builder Dispatch Agriculture + Business

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 2h
- **Depends on:** Phase 2

Builder tieu dung dispatch 3-way theo `income_source_type`: render loop `PA_CHIPHI_AGRI` (6 cot) hoac `PA_CHIPHI_BIZ` (5 cot) hoac giu logic luong hien tai.

## Key Insights

- `khcn-builder-loan-plan-tieu-dung.ts:156-165` hien hardcode luong -> gate
- Loop PA_TRANO (bang tra no theo nam) chi cho agriculture, build qua `calcRepaymentSchedule()`
- Business khong bat buoc bang tra no (tra goc hang thang) -> render flat placeholders `HDTD.So tien goc BQ/thang`

## Related Code Files

### Modify
- src/services/khcn-builder-loan-plan-tieu-dung.ts — 3-way dispatch

### Create
- src/services/khcn-builder-tieu-dung-income-helpers.ts — chua 3 helpers build placeholders/loops cho 3 nguon

## Implementation Steps

### 1. Helper file moi

```typescript
// khcn-builder-tieu-dung-income-helpers.ts
import { fmtN } from "./format-helpers";
import { calcRepaymentSchedule } from "@/lib/loan-plan/loan-plan-calculator";

/** Agriculture: bang 6 cot + PA_TRANO theo nam */
export function buildAgricultureIncomeData(fin: LoanPlanFinancialsExtended, loanAmt: number) {
  const items = fin.agriculture_items ?? [];
  const profit = Number(fin.agriculture_profit ?? 0);
  const living = Number(fin.agriculture_living_expenses_annual ?? 0);
  const repaymentIncome = profit - living;

  const paChiPhi = items.map(it => ({
    "STT": it.order ?? "",
    "Khoản mục": it.name,
    "ĐVT": it.unit ?? "",
    "Đơn giá": fmtN(it.unitPrice ?? 0),
    "Số lượng": fmtN(it.quantity ?? 0),
    "Thành tiền": fmtN(it.amount),
  }));

  const paTrano = buildPaTranoAnnual(fin, loanAmt, repaymentIncome);

  return {
    "PA_CHIPHI_AGRI": paChiPhi,
    "PA_TRANO": paTrano,
    "HĐTD.Mô tả nguồn trả nợ": fin.repayment_narrative ?? "",
    "HĐTD.Tổng chi phí nông nghiệp": fmtN(fin.agriculture_total_cost ?? 0),
    "HĐTD.Tổng thu nhập nông nghiệp": fmtN(fin.agriculture_total_revenue ?? 0),
    "HĐTD.Lợi nhuận nông nghiệp": fmtN(profit),
    "HĐTD.Chi phí sinh hoạt/năm": fmtN(living),
    "HĐTD.Thu nhập trả nợ/năm": fmtN(repaymentIncome),
  };
}

/** Business: bang 5 cot, khong PA_TRANO (tra deu hang thang) */
export function buildBusinessIncomeData(fin: LoanPlanFinancialsExtended, loanAmt: number) {
  const rows = fin.business_rows ?? [];
  const grossProfit = Number(fin.business_gross_profit_annual ?? 0);
  const otherCosts = Number(fin.business_other_costs_annual ?? 0);
  const livingMonthly = Number(fin.business_living_expenses_monthly ?? 0);
  const monthlyIncome = Math.round((grossProfit - otherCosts) / 12);
  const monthlyRepaymentCap = monthlyIncome - livingMonthly;

  const paChiPhi = rows.map(r => ({
    "STT": r.order ?? "",
    "Nhóm Hàng": r.name,
    "Số lượng": fmtN(r.quantity ?? 0),
    "Giá trị nhập hàng": fmtN(r.importValue ?? 0),
    "Doanh thu dự kiến": fmtN(r.revenue ?? 0),
  }));

  const principalPerMonth = Math.round(loanAmt / (Number(fin.term_months) || 1));

  return {
    "PA_CHIPHI_BIZ": paChiPhi,
    "HĐTD.Mô tả nguồn trả nợ": fin.repayment_narrative ?? "",
    "HĐTD.Tổng giá trị nhập": fmtN(fin.business_total_import ?? 0),
    "HĐTD.Tổng doanh thu": fmtN(fin.business_total_revenue ?? 0),
    "HĐTD.Lợi nhuận kinh doanh/năm": fmtN(grossProfit),
    "HĐTD.Chi phí khác/năm": fmtN(otherCosts),
    "HĐTD.Thu nhập bình quân/tháng": fmtN(monthlyIncome),
    "HĐTD.Chi phí sinh hoạt/tháng": fmtN(livingMonthly),
    "HĐTD.Thu nhập trả nợ/tháng": fmtN(monthlyRepaymentCap),
    "HĐTD.Số gốc trả/tháng": fmtN(principalPerMonth),
  };
}

/** Salary: giu logic earner hien tai — export de builder goi */
export function buildSalaryIncomeData(fin: LoanPlanFinancialsExtended) {
  // ...existing logic tu builder hien tai...
}

function buildPaTranoAnnual(fin, loanAmt, annualIncome) {
  const termMonths = Number(fin.term_months) || 0;
  if (termMonths <= 12 || loanAmt <= 0) return [];
  const rows = calcRepaymentSchedule({
    loanAmount: loanAmt,
    termMonths,
    standardRate: Number(fin.interestRate) || 0,
    preferentialRate: fin.preferential_rate,
    annualIncome,
  });
  return rows.map(r => ({
    "Năm": r.periodLabel,
    "Số tiền vay": fmtN(r.balance),
    "Gốc trả": fmtN(r.principal),
    "Lãi trả": fmtN(r.interest),
    "Thu nhập trả nợ": fmtN(r.income),
    "Thu nhập còn lại": fmtN(r.remaining),
  }));
}
```

### 2. Dispatch trong tieu dung builder

```typescript
// khcn-builder-loan-plan-tieu-dung.ts
import {
  buildAgricultureIncomeData,
  buildBusinessIncomeData,
  buildSalaryIncomeData,
} from "./khcn-builder-tieu-dung-income-helpers";

export function buildTieuDungLoanPlanData(args: {...}) {
  const { plan, loanAmt } = args;
  const fin = plan.financials as LoanPlanFinancialsExtended;
  const source = fin.income_source_type ?? "salary";

  const base = { /* common fields: customer, loan info... */ };

  if (source === "agriculture") {
    return { ...base, ...buildAgricultureIncomeData(fin, loanAmt) };
  }
  if (source === "business") {
    return { ...base, ...buildBusinessIncomeData(fin, loanAmt) };
  }
  // Default: salary (backward compat)
  return { ...base, ...buildSalaryIncomeData(fin) };
}
```

### 3. Refactor builder trung_dai (neu da inline PA_TRANO)

Ensure `buildPaTranoAnnual()` tu helper cung duoc trung_dai builder goi. Khong duplicate logic.

### 4. Narrative text

User nhap tay phan narrative ("a) Nguồn trả nợ: Từ lợi nhuận của hoạt động trồng Cát tường...") -> luu trong field `repayment_narrative` (optional). Builder set placeholder `HĐTD.Mô tả nguồn trả nợ = fin.repayment_narrative`.

Neu scope YAGNI, **skip** narrative field — user dung template co san text co dinh.

## Todo List
- [ ] Tao helper file voi 3 functions
- [ ] Viet `buildPaTranoAnnual()` util
- [ ] Refactor tieu dung builder dispatch 3-way
- [ ] Refactor trung_dai builder goi helper chung (no regression)
- [ ] Compile check
- [ ] Test generate DOCX voi 2 sample files

## Success Criteria
- Builder output agriculture: co loop `PA_CHIPHI_AGRI` + `PA_TRANO`
- Builder output business: co loop `PA_CHIPHI_BIZ`, khong PA_TRANO (hoac [])
- Builder output salary: identical voi truoc refactor
- Trung_dai builder van chay dung

## Risk Mitigation
- Neu salary helper chua extract, giu inline -> chi refactor khi co test backup

## Unresolved Questions
- Co can field `repayment_narrative` de user viet text mo ta nguon tra no khong? (De xuat: YES optional)
- Business tra goc hang thang -> co can hien `HĐTD.So goc tra BQ/thang` = loanAmt/termMonths?
