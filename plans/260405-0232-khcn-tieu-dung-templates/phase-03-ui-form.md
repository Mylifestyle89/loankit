# Phase 3: UI Form

**Priority:** Medium | **Status:** TODO | **Effort:** S

## Overview

Thêm dropdown `income_source_type` vào loan plan form khi `loan_method === "tieu_dung"`.

## Files to Modify

- `src/components/loan-plan/` — form component cho loan plan (tìm component chứa METHOD_OPTIONS)
- `src/app/api/loan-plans/` — API route đã dùng createPlanSchema, tự động nhận field mới

## Implementation Steps

### 3.1 Tìm và sửa loan plan form

Thêm dropdown "Nguồn trả nợ" hiển thị khi chọn `tieu_dung`:

```tsx
{loanMethod === "tieu_dung" && (
  <select value={incomeSourceType} onChange={...}>
    <option value="">-- Chọn nguồn trả nợ --</option>
    {INCOME_SOURCE_OPTIONS.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
)}
```

### 3.2 Thêm fields narrative (salary/rental)

Khi `income_source_type` = "salary" hoặc "rental":
- Thu nhập hàng tháng (number)
- Nơi công tác / Địa chỉ cho thuê (text)

Khi `income_source_type` = "agriculture" hoặc "business":
- Reuse bảng chi phí/doanh thu hiện có (đã có trong form SXKD)

### 3.3 Persist vào financials_json

```ts
// Thêm vào submit handler
financials.income_source_type = incomeSourceType;
financials.monthly_salary = monthlySalary;
financials.annual_salary = monthlySalary * 12;
// ... etc
```

## Success Criteria

- [ ] Dropdown nguồn trả nợ hiển thị khi chọn "Tiêu dùng"
- [ ] Fields narrative/tabular toggle đúng
- [ ] Save/load round-trip OK
