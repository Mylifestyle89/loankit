# Phase 6: Testing + Manual DOCX Verification

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 1h
- **Depends on:** Phase 3, 4, 5

Verify end-to-end voi sample data tu 2 file mau (Ho Phuoc Da, Le Huu Duong) va regression tests.

## Sample Data

### TC2: Agriculture (Ho Phuoc Da file)
- income_source_type: agriculture
- agriculture_items:
  - I.TONG CHI PHI (group header)
  - 1. Xu ly dat / m2 / 16,000 / 7,000 / 112,000,000
  - 2. Cay giong / cay / 245,000 / 2,800 / 686,000,000
  - 3. Phan huu co / m3 / 105 / 1,500,000 / 157,500,000
  - 4. Phan vo co (group)
  - -. Dam / kg / 469 / 18,000 / 8,442,000
  - ... (9 cost rows total)
  - Cong C.PHI TRUC TIEP: 1,480,766,000
  - II.THU NHAP (group header) / 2,016,000,000
  - 1. San luong / kg / 28,000 / - / -
  - 2. Thu nhap / d / - / 72,000 / 2,016,000,000
  - III. LAI/LO: 535,234,000
- agriculture_living_expenses_annual: 120,000,000
- loan amount: 2,000,000,000
- term_months: 120 (10 nam)
- interestRate: 0.095, preferential_rate: 0.072
- Expected TN tra no/nam = 535,234,000 - 120,000,000 = 415,234,000

### TC3: Business (Le Huu Duong file)
- income_source_type: business
- business_rows:
  - I.Thuoc va San pham Dieu tri (group) / - / 2,095,220,000 / 2,933,308,000
  - 1. He Tim mach / 2,300 / 427,400,000 / 598,360,000
  - 2-9. (other items)
  - III.Hang Tieu dung (group) / - / 553,690,000 / 775,166,000
  - IV.My pham (group) / - / 508,170,000 / 711,438,000
  - V.Cac loai mat hang khac / - / 37,500,000 / 52,500,000
  - TONG CONG: 3,194,580,000 / 4,472,412,000
- business_gross_profit_annual: 1,277,832,000
- business_other_costs_annual: 300,000,000
- business_living_expenses_monthly: 20,000,000
- loan amount: 3,200,000,000
- term_months: 180
- interestRate: 0.10
- Expected TN BQ/thang = (1,277,832,000 - 300,000,000) / 12 = 81,486,000
- Expected TN tra no/thang = 81,486,000 - 20,000,000 = 61,486,000

## Test Cases

### TC1: Regression — Salary
- income_source = salary
- Verify output DOCX identical voi version truoc refactor

### TC2: Agriculture happy path
- Nhap data theo file Ho Phuoc Da
- Generate DOCX
- Verify:
  - `PA_CHIPHI_AGRI` co dung so row
  - Totals auto-compute dung
  - `PA_TRANO` 10 hang (termMonths/12)
  - Lai nam 1 = 2,000,000,000 * 0.072 = 144,000,000 (match file goc)

### TC3: Business happy path
- Nhap data theo file Le Huu Duong
- Generate DOCX
- Verify:
  - `PA_CHIPHI_BIZ` render dung
  - Tong doanh thu = 4,472,412,000
  - Thu nhap BQ/thang = 81,486,000

### TC4: Switch source states
- Agriculture -> save -> switch sang business -> nhap data -> save -> switch ve agriculture
- Verify: agriculture items van persist trong JSON, business rows cung persist

### TC5: Empty/edge
- Agriculture items = [] -> builder chay, PA_CHIPHI_AGRI = [], khong crash
- Business rows = [] -> tuong tu
- term_months = 12 voi agriculture -> PA_TRANO = [] (no multi-year)

### TC6: Validator + template file
- File salary goc chua edit -> builder chay, khong crash
- File agriculture moi (sau edit) -> generate thanh cong, render bang dung
- File business moi (sau edit) -> tuong tu

### TC7: Export step filter
- Mo DOCX export dialog cho plan income_source=agriculture -> chi hien template agriculture (khong hien salary, business)
- Mo export cho plan income_source=salary -> chi hien template salary

### TC8: Narrative persist
- Nhap `repayment_narrative` = "Tu loi nhuan hoat dong trong Cat tuong..."
- Save + reload -> narrative persist
- Generate DOCX -> placeholder `HĐTD.Mô tả nguồn trả nợ` co text

### TC9: Trung_dai regression
- Mo 1 plan trung_dai cu -> regenerate DOCX -> diff voi ban cu

## Implementation Steps

### 1. Manual smoke tests
- `npm run dev`
- Tao 2 plan voi data TC2 + TC3
- Click "Xuat DOCX" -> open file -> compare voi file mau goc

### 2. Build + lint
- `npm run build`
- `npm run lint`
- Compile error = stop, fix

### 3. Unit test (optional)
Neu test infra co:
```typescript
describe("buildBusinessIncomeData", () => {
  it("computes monthly repayment from annual gross profit", () => {
    const fin = { business_gross_profit_annual: 1_277_832_000, business_other_costs_annual: 300_000_000, business_living_expenses_monthly: 20_000_000 };
    const data = buildBusinessIncomeData(fin as any, 3_200_000_000);
    expect(data["HĐTD.Thu nhập bình quân/tháng"]).toBe("81.486.000");
    expect(data["HĐTD.Thu nhập trả nợ/tháng"]).toBe("61.486.000");
  });
});
```

## Todo List
- [ ] TC1 manual (regression salary)
- [ ] TC2 manual (agriculture) — verify so khop file mau Ho Phuoc Da
- [ ] TC3 manual (business) — verify so khop file mau Le Huu Duong
- [ ] TC4 manual (switch states)
- [ ] TC5 manual (empty edges)
- [ ] TC6 manual (3 file template work voi 3 source)
- [ ] TC7 manual (picker filter dung theo source)
- [ ] TC8 manual (narrative persist + render)
- [ ] TC9 regression trung_dai
- [ ] Unit tests (optional)
- [ ] Build + lint pass

## Success Criteria
- 7 test cases pass
- DOCX output khop so voi 2 file mau thuc
- Khong regression trung_dai + salary

## Known Limitations Post-Ship
- File template .docx BCDX 2268.02A phai user update thu cong truoc khi nguoi dung se duoc dau ra day du
- Neu template chua update, placeholder hien text raw

## Unresolved Questions
- Co can dump DOCX content tu test (docx-parser) de auto-verify khong?
- Co nen seed sample plans trong dev DB voi data 2 file mau de reproduce bug nhanh?
