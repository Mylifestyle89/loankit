# Phase 1: Reuse Audit + Data Model Decision

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 1h

Audit infrastructure hien co (cost/revenue items, calculator, placeholder registry, PA_TRANO loop) va chot data model cho 2 bang agriculture/business voi column khac nhau.

## Key Insights

- `LoanPlanFinancials.revenue` va `totalDirectCost` hien scalar — phai them `costItems[]` + `revenueItems[]` hierarchy de render table
- `CostItem` + `RevenueItem` types da co — CAN them `isGroupHeader: boolean` + `groupRomanNumeral?: string` cho nested
- `calcRepaymentSchedule()` da support cho agriculture (theo nam). Business tra hang thang -> dung `repayment_frequency = 1` da co
- `CategoryRevenue` voi category `nong_nghiep` va `kinh_doanh` da co NHUNG flat (1 dong input) — khong du cho hierarchy cua 2 file mau

## Data Model Decision

### Shape chung (generic)
```typescript
export type CostRevenueItem = {
  order?: string;             // "I", "1", "-" (display label)
  name: string;
  unit?: string;              // Don vi tinh (kg, m2, cong...)
  unitPrice?: number;         // Don gia
  quantity?: number;          // So luong
  amount: number;             // Thanh tien (da tinh hoac user nhap)
  isGroupHeader?: boolean;    // True cho dong "I.TONG CHI PHI", "II.THU NHAP"
  parentOrder?: string;       // Link sub-item -> group ("1" -> "I")
};
```

### Business-specific row
```typescript
export type BusinessRevenueRow = {
  order?: string;
  name: string;              // Ten nhom hang
  quantity?: number;         // So luong hang du kien
  importValue?: number;      // Gia tri nhap hang
  revenue?: number;          // Doanh thu du kien
  isGroupHeader?: boolean;
};
```

**Rationale:** 2 types rieng vi cot khac. Luu trong `financials_json` duoi keys `agriculture_items[]` va `business_rows[]`.

### Business-specific flat fields
```typescript
// Them vao LoanPlanFinancialsExtended:
business_rows?: BusinessRevenueRow[];
business_total_import?: number;      // Gia tri nhap tong
business_total_revenue?: number;     // Doanh thu tong
business_other_costs_annual?: number; // Chi phi mat bang, nhan cong, thue
// (hien tai khong co field nay — se them)

agriculture_items?: CostRevenueItem[]; // Rows cho bang A
// (totalDirectCost, revenue da co — reuse)
```

## Reuse Surface

| Artifact | File | Reuse Status |
|----------|------|--------------|
| `LoanPlanFinancialsExtended` | loan-plan-types.ts | Extend |
| `calcRepaymentSchedule()` | loan-plan-calculator.ts | AS-IS (da support frequency) |
| `EXTENDED_FINANCIAL_KEYS` whitelist | loan-plan.service.ts | Them keys moi |
| PA_TRANO loop builder | khcn-builder-loan-plan.ts | Extract -> helper chung |
| `INCOME_SOURCE_OPTIONS` | loan-plan-constants.ts | AS-IS |

## Gating Decision

```typescript
// helper
export function requiresIncomeTable(fin: LoanPlanFinancialsExtended, method: LoanMethod): boolean {
  if (method !== "tieu_dung") return false;
  return fin.income_source_type === "agriculture" || fin.income_source_type === "business";
}
```

## Related Code Files

### Read (audit only)
- src/lib/loan-plan/loan-plan-types.ts
- src/lib/loan-plan/loan-plan-calculator.ts
- src/services/khcn-builder-loan-plan.ts (xem PA_TRANO inline hay da extract)
- src/lib/report/khcn-placeholder-registry.ts

### Modify
- src/lib/loan-plan/loan-plan-calculator.ts — them helper `requiresIncomeTable()`, extract `buildPaTranoRows()` neu inline

## Implementation Steps

### 1. Audit PA_TRANO extraction need
Doc `khcn-builder-loan-plan.ts` — neu PA_TRANO loop dang inline, extract thanh `buildPaTranoRows(fin, loanAmt, annualIncome): Row[]` trong calculator hoac helper moi.

### 2. Viet helper `requiresIncomeTable()` + `isAgricultureTieuDung()` + `isBusinessTieuDung()`
Put in loan-plan-calculator.ts hoac util rieng.

### 3. Audit placeholder registry
Doc cac group hien tai, decide vi tri them:
- `PA_CHIPHI_AGRI` (loop bang agriculture)
- `PA_CHIPHI_BIZ` (loop bang business)
- `HDTD.Tổng thu nhập từ nông nghiệp` (flat)
- `HDTD.Tổng thu nhập từ kinh doanh` (flat — da co `...từ SXKD`, co the reuse)

### 4. Document decision
Ghi lai trong report audit hoac inline comment.

## Todo List
- [ ] Doc PA_TRANO extraction status
- [ ] Viet 3 helper functions
- [ ] Audit placeholder registry
- [ ] Decide BusinessRevenueRow vs extend CostRevenueItem (chon 2 types rieng)
- [ ] Compile check

## Success Criteria
- Ham `requiresIncomeTable()` callable tu UI va builder
- PA_TRANO extracted thanh helper reusable
- Data model documented (2 types: CostRevenueItem, BusinessRevenueRow)

## Unresolved Questions
- Agriculture table co phai luc nao cung co sub-items, hay co case "TONG CHI PHI" flat (1 dong)?
- Business co always >1 nhom lon khong, hay 1 nhom la du?
