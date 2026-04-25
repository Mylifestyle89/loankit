# Phase 5: Testing + Manual Verification

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 0.5h
- **Depends on:** Phase 2, 3, 4

Verify end-to-end: tao ho so tieu dung voi nguon tra no = nong nghiep -> nhap data -> generate DOCX -> open file kiem tra placeholders va bang tra no.

## Test Cases

### TC1: Regression — Tieu dung + salary (default)
- Tao plan method `tieu_dung`, income_source = salary
- Nhap earner1 info, luong 15M/thang
- Generate DOCX -> verify:
  - `HĐTD.Tổng thu nhập từ lương` = 180,000,000 (15M × 12)
  - Khong co PA_TRANO (term <= 12)
  - Output identical voi truoc refactor

### TC2: Happy path — Tieu dung + agriculture
- Tao plan method `tieu_dung`, income_source = agriculture
- Nhap: 10 sao, 270M/sao, 8 nam khau hao, term 60 thang, lai 9%/nam, preferential 7.5% nam 1
- Cost items (phan bon, giong, cong): ~200M
- Revenue (sản lượng 5000kg × 50k/kg): ~250M
- Generate DOCX -> verify:
  - `PA.Khấu hao nhà kính` = 337,500,000 (270M × 10 / 8)
  - `PA.Số sào đất` = 10
  - `PA_TRANO` loop co 5 hang
  - Lai nam 1 dung 7.5%, nam 2+ dung 9%
  - `HĐTD.Tổng thu nhập từ nông nghiệp` > 0

### TC3: Edge — Switch salary <-> agriculture
- Start salary -> nhap earner -> save
- Switch sang agriculture -> nhap du data -> save
- Reload -> verify: agriculture fields load, earner fields van persist trong JSON (an khoi UI)
- Switch ve salary -> earner fields reappear voi data goc

### TC4: Edge — Short term agriculture (< 12 months)
- Agriculture + term_months = 6
- Verify: PA_TRANO = [] (no loop rows), no crash

### TC5: Validator
- Load template BCDX 2268.02A (chua update file .docx)
- Verify: builder khong crash, placeholder nong nghiep tra ve de nguyen trong file (warning log)

### TC6: Trung_dai regression
- Tao plan method `trung_dai` (greenhouse) voi data cu
- Verify output DOCX = identical to pre-refactor (helper extraction khong break)

## Related Code Files

### Tests to update/add (optional)
- src/lib/loan-plan/__tests__/loan-plan-calculator.test.ts (neu da co)
- src/services/__tests__/khcn-builder-loan-plan-tieu-dung.test.ts (create neu chua co)

## Implementation Steps

### 1. Manual smoke test
- Run `npm run dev`
- Navigate: Customer -> Loan Plans -> New -> tieu_dung + agriculture
- Nhap sample data tu TC2
- Click "Xuat DOCX" -> open file -> screenshot placeholders

### 2. Unit test (optional, neu da co test infra)
```typescript
describe("buildTieuDungLoanPlanData - agriculture", () => {
  it("reuses PA_TRANO + depreciation helpers", () => {
    const fin: LoanPlanFinancialsExtended = {
      income_source_type: "agriculture",
      depreciation_years: 8,
      asset_unit_price: 270_000_000,
      land_area_sau: 10,
      term_months: 60,
      interestRate: 0.09,
      preferential_rate: 0.075,
      // ... other required
    };
    const data = buildTieuDungLoanPlanData({ plan: { financials: fin, method: "tieu_dung" } });
    expect(data["PA.Khấu hao nhà kính"]).toBe("337.500.000");
    expect(data["PA_TRANO"]).toHaveLength(5);
  });
});
```

### 3. Regression test
- Chay `npm run build` + `npm run lint` -> no error
- Open 1 plan trung_dai cu trong DB -> regenerate DOCX -> diff byte-by-byte voi ban cu (uu tien)

## Todo List
- [ ] TC1 manual
- [ ] TC2 manual (capture DOCX)
- [ ] TC3 manual
- [ ] TC4 manual
- [ ] TC5 manual
- [ ] TC6 regression
- [ ] Unit test (optional)
- [ ] Build + lint pass

## Success Criteria
- 6 test cases pass
- Khong regression o tieu dung salary + trung_dai
- DOCX output hop le, placeholder replace dung

## Known Limitations Post-Ship
- File template .docx BCDX 2268.02A phai duoc user update thu cong -> instruction co san trong phase 4
- Neu user chua update template, placeholders nong nghiep hien duoi dang `{...}` trong output (thay vi gia tri) — can explicit warning

## Unresolved Questions
- Co can automated test DOCX content (docx-parser) khong, hay manual visual check la du?
