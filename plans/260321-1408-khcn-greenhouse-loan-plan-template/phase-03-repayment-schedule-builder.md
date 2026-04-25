# Phase 3: PA_TRANO Loop + Placeholders trong Builder

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 1.5h
- **Depends on:** Phase 1

Them PA_TRANO loop array va cac placeholder moi vao `khcn-builder-loan-plan.ts` + dang ky trong placeholder registry.

## Related Code Files

### Modify
- `src/services/khcn-builder-loan-plan.ts` — them PA_TRANO loop + flat placeholders moi
- `src/lib/report/khcn-placeholder-registry.ts` — dang ky nhom "Bang tra no" + placeholders moi

## Implementation Steps

### 1. Them PA_TRANO loop vao buildLoanPlanExtendedData (khcn-builder-loan-plan.ts)

Sau block try/catch hien tai (line ~78), them:

```typescript
// ── Khau hao nha kinh ──
const depYears = Number(financials.depreciation_years) || 0;
const assetPrice = Number(financials.asset_unit_price) || 0;
const landSau = Number(financials.land_area_sau) || 0;
const depreciation = depYears > 0 ? Math.round(assetPrice * landSau / depYears) : 0;

data["PA.Khấu hao nhà kính"] = fmtN(depreciation);
data["PA.Số năm khấu hao"] = depYears || "";
data["PA.Đơn giá nhà kính/sào"] = fmtN(assetPrice);
data["PA.Số sào đất"] = fmtN(landSau) || financials.landArea || "";
data["PA.Số HĐ thi công"] = financials.construction_contract_no ?? "";
data["PA.Ngày HĐ thi công"] = financials.construction_contract_date ?? "";

// ── Bang tra no theo nam (PA_TRANO) ──
const termMonths = Number(financials.term_months || financials.loanTerm) || 0;
const stdRate = Number(financials.interestRate) || 0;
const prefRate = Number(financials.preferential_rate) || stdRate;
const annualIncome = profit + depreciation; // profit da tinh o tren

if (termMonths > 12 && loanAmt > 0) {
  const years = Math.ceil(termMonths / 12);
  const principalPerYear = Math.round(loanAmt / years);
  let balance = loanAmt;
  const rows = [];

  for (let y = 1; y <= years; y++) {
    const rate = (y === 1 && prefRate !== stdRate) ? prefRate : stdRate;
    const interest = Math.round(balance * rate);
    const principal = y === years ? balance : principalPerYear;
    const remaining = annualIncome - principal - interest;
    rows.push({
      "Năm": `Năm ${y}`,
      "Thu nhập trả nợ": fmtN(annualIncome),
      "Dư nợ": fmtN(balance),
      "Gốc trả": fmtN(principal),
      "Lãi trả": fmtN(interest),
      "TN còn lại": fmtN(remaining),
    });
    balance -= principal;
  }
  data["PA_TRANO"] = rows;
} else {
  data["PA_TRANO"] = [];
}
```

### 2. Dang ky placeholders moi (khcn-placeholder-registry.ts)

Them 2 groups:

```typescript
{
  label: "Khấu hao & Nhà kính",
  prefix: "PA",
  items: [
    "PA.Khấu hao nhà kính", "PA.Số năm khấu hao",
    "PA.Đơn giá nhà kính/sào", "PA.Số sào đất",
    "PA.Số HĐ thi công", "PA.Ngày HĐ thi công",
  ],
},
{
  label: "Bảng trả nợ theo năm",
  prefix: "PA_TRANO",
  loop: "PA_TRANO",
  items: [
    "PA_TRANO.Năm", "PA_TRANO.Thu nhập trả nợ",
    "PA_TRANO.Dư nợ", "PA_TRANO.Gốc trả",
    "PA_TRANO.Lãi trả", "PA_TRANO.TN còn lại",
  ],
},
```

### 3. Dat vi tri code trong builder

- Khau hao placeholders: ngay sau block `data["PA.Số HĐTD cũ"]` (line ~46)
- PA_TRANO loop: sau block cost/revenue try-catch (line ~173)
- Can dung `profit` va `loanAmt` da tinh trong block do → dat SAU block cost items

## Todo List
- [ ] Them khau hao flat placeholders
- [ ] Them PA_TRANO loop generation
- [ ] Dang ky 2 groups moi trong placeholder registry
- [ ] Verify compile
- [ ] Test voi sample data: 10 sao, 270tr/sao, 8 nam khau hao, vay 96 thang

## Success Criteria
- PA_TRANO co dung so hang = ceil(termMonths/12)
- Khau hao = 270,000,000 x 10 / 8 = 337,500,000
- Goc tra/nam = loanAmount / years
- Lai nam 1 dung preferential_rate, nam 2+ dung standard rate
- Placeholders hien trong reference panel
