# Phase 1: Mo rong Types + Calculator

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 1h

Them cac fields moi vao `LoanPlanFinancials` type va them ham tinh khau hao + bang tra no trong calculator.

## Key Insights
- `financials_json` la JSON string trong Prisma — khong can migration
- Calculator hien tai chi co `calcFinancials()` tra ve `LoanPlanFinancials` — can them `calcDepreciation()` va `calcRepaymentSchedule()`
- `LoanMethod` da co `"trung_dai"` — khong can them

## Related Code Files

### Modify
- `src/lib/loan-plan/loan-plan-types.ts` — them fields moi vao `LoanPlanFinancials` + type `RepaymentRow`
- `src/lib/loan-plan/loan-plan-calculator.ts` — them `calcDepreciation()`, `calcRepaymentSchedule()`

## Implementation Steps

### 1. Them fields vao `LoanPlanFinancials` (loan-plan-types.ts)

```typescript
// Them vao LoanPlanFinancials:
depreciation_years?: number;         // So nam khau hao (e.g., 8)
asset_unit_price?: number;           // Don gia tai san/sao (e.g., 270,000,000)
land_area_sau?: number;              // So sao dat
construction_contract_no?: string;   // So HD thi cong
construction_contract_date?: string; // Ngay HD thi cong
preferential_rate?: number;          // Lai suat uu dai nam dau (e.g., 0.075)
term_months?: number;                // Thoi han vay (thang)
farmAddress?: string;                // Dia chi dat NN
```

### 2. Them type `RepaymentRow` (loan-plan-types.ts)

```typescript
export type RepaymentRow = {
  year: number;           // Nam thu
  income: number;         // Thu nhap tra no = profit + depreciation
  balance: number;        // Du no dau ky
  principal: number;      // Goc tra
  interest: number;       // Lai tra
  remaining: number;      // TN con lai = income - principal - interest
};
```

### 3. Them calculator functions (loan-plan-calculator.ts)

```typescript
/** Khau hao nha kinh = asset_unit_price x land_area_sau / depreciation_years */
export function calcDepreciation(assetUnitPrice: number, landArea: number, years: number): number {
  if (years <= 0) return 0;
  return Math.round(assetUnitPrice * landArea / years);
}

/** Bang tra no theo nam cho vay trung dai han */
export function calcRepaymentSchedule(params: {
  loanAmount: number;
  termMonths: number;
  standardRate: number;
  preferentialRate?: number;  // nam dau
  annualIncome: number;       // loi nhuan + khau hao
}): RepaymentRow[] {
  const years = Math.ceil(params.termMonths / 12);
  const principalPerYear = Math.round(params.loanAmount / years);
  const rows: RepaymentRow[] = [];
  let balance = params.loanAmount;

  for (let y = 1; y <= years; y++) {
    const rate = (y === 1 && params.preferentialRate) ? params.preferentialRate : params.standardRate;
    const interest = Math.round(balance * rate);
    const principal = y === years ? balance : principalPerYear; // nam cuoi tra het
    const remaining = params.annualIncome - principal - interest;
    rows.push({ year: y, income: params.annualIncome, balance, principal, interest, remaining });
    balance -= principal;
  }
  return rows;
}
```

## Todo List
- [ ] Them fields vao LoanPlanFinancials type
- [ ] Them RepaymentRow type
- [ ] Them calcDepreciation() function
- [ ] Them calcRepaymentSchedule() function
- [ ] Verify compile thanh cong

## Success Criteria
- Types compile khong loi
- calcRepaymentSchedule tra ve dung so hang = ceil(termMonths/12)
- calcDepreciation tra ve dung gia tri
