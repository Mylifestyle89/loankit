# Phase 2: Data Builder

**Priority:** High | **Status:** TODO | **Effort:** M

## Overview

Extend data builder để emit placeholders cho BCĐX tiêu dùng. Template narrative dùng HĐTD.* fields (lương, thu nhập thuê, chi phí). Template tabular reuse PA.* fields hiện có.

## Context

### Placeholders BCĐX tiêu dùng (2268.02A) cần cover

Đã có trong builders hiện tại:
- `[Tên khách hàng]`, `[Địa chỉ]`, `[CMND]`, `[Ngày cấp]`, `[Nơi cấp]`, `[Năm sinh]` — customer aliases
- `[TV.*]` — co-borrower fields
- `[NLQ.*]` — related person fields  
- `[SĐ.*]` — land collateral fields
- `[HĐTD.Số tiền vay]`, `[HĐTD.Lãi suất vay]`, `[HĐTD.Thời hạn vay]` — loan fields
- `[HĐTD.Lãi suất quá hạn]`, `[HĐTD.Lãi suất chậm trả]` — constants

**Cần thêm mới (tiêu dùng specific):**
- `[HĐTD.Tổng nhu cầu vốn]` — tổng chi phí phương án
- `[HĐTD.Vốn đối ứng]`, `[HĐTD.Tr.đó: Vốn bằng tiền]` — vốn đối ứng
- `[HĐTD.Vốn vay TCTD khác]`, `[HĐTD.Vốn bằng tài sản khác]`
- `[HĐTD.Tỷ lệ vốn đối ứng]`, `[HĐTD.Tỷ lệ % bảo đảm]`
- `[HĐTD.Tiền lương hàng tháng]` — thu nhập từ lương
- `[HĐTD.Tổng thu nhập từ lương]` — tổng lương/năm
- `[HĐTD.Tổng thu nhập từ SXKD]` — thu nhập SXKD/thuê
- `[HĐTD.Thu nhập khác]`, `[HĐTD.Cụ thể về thu nhập khác]`
- `[HĐTD.Dư nợ tại Agribank]`, `[HĐTD.Dư nợ tại TCTD khác]`
- `[HĐTD.Dư nợ của KH và NLQ tại Agribank]`
- `[HĐTD.Nhóm nợ]`, `[HĐTD.Xếp hạng khách hàng]`, `[HĐTD.Kỳ chấm điểm]`
- `[HĐTD.Định kỳ trả gốc]`, `[HĐTD.Định kỳ trả lãi]`
- `[HĐTD.Phí trả nợ trước hạn]`
- `[HĐTD.Chương trình cho vay 1-4]`
- `[HĐTD.Bổ sung BCĐX cho vay]`
- `[HĐTD.Tài chính minh bạch, LM]`, `[HĐTD.Lý do đáp ứng/không đáp ứng TCMBLM]`

## Files to Modify

- `src/services/khcn-builder-loan-disbursement.ts` — extend `buildLoanExtendedData()` cho tiêu dùng fields
- `src/services/khcn-report-data-builder.ts` — route income_source_type, emit new fields từ financials_json

## Implementation Steps

### 2.1 Extend `buildLoanExtendedData()` 

Thêm tiêu dùng fields từ `loan` object (đã có trong DB):
```ts
// Các field từ loan record
data["HĐTD.Định kỳ trả gốc"] = loan.principalSchedule ?? "";
data["HĐTD.Định kỳ trả lãi"] = loan.interestSchedule ?? "";
data["HĐTD.Nhóm nợ"] = loan.debtGroup ?? "Nhóm 1";
```

### 2.2 Emit tiêu dùng fields từ financials_json

Trong `buildKhcnReportData()`, sau khi gọi `buildLoanPlanExtendedData()`:

```ts
// Nếu có financials_json.income_source_type
const incomeType = financials?.income_source_type;
if (incomeType === "salary" || incomeType === "rental") {
  // Narrative fields
  data["HĐTD.Tiền lương hàng tháng"] = fmtN(financials.monthly_salary);
  data["HĐTD.Tổng thu nhập từ lương"] = fmtN(financials.annual_salary);
  data["HĐTD.Tổng thu nhập từ SXKD"] = fmtN(financials.business_income);
  data["HĐTD.Thu nhập khác"] = fmtN(financials.other_income);
  data["HĐTD.Cụ thể về thu nhập khác"] = financials.other_income_detail ?? "";
}
// Tabular fields đã có từ buildLoanPlanExtendedData() (PA.*)
```

### 2.3 Emit vốn đối ứng fields

```ts
// Từ financials_json (đã có cho SXKD, cần map sang HĐTD.* prefix cho tiêu dùng)
data["HĐTD.Tổng nhu cầu vốn"] = fmtN(financials.totalCapitalNeed);
data["HĐTD.Vốn đối ứng"] = fmtN(financials.counterpartCapital);
data["HĐTD.Tr.đó: Vốn bằng tiền"] = fmtN(financials.counterpartCash);
data["HĐTD.Vốn vay TCTD khác"] = fmtN(financials.otherBankLoan ?? 0);
data["HĐTD.Tỷ lệ vốn đối ứng"] = financials.counterpartRatio 
  ? `${financials.counterpartRatio}%` : "";
```

## Success Criteria

- [ ] BCĐX tiêu dùng generate với đầy đủ placeholders
- [ ] PASDV tiêu dùng generate OK
- [ ] BCĐX tabular (SXKD) vẫn hoạt động bình thường
- [ ] `tsc --noEmit` pass
