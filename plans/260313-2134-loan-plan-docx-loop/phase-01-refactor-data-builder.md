# Phase 1: Refactor Data Builder

## Overview
- **Priority:** P1
- **Status:** Pending
- **Effort:** 1h

Bỏ costNameMap hardcode, thay bằng PA_CHIPHI/PA_DOANHTHU loop arrays + cập nhật flat PA.* fields.

## Related Code Files

- **Modify:** `src/services/khcn-report-data-builders.ts` — hàm `buildLoanPlanExtendedData`
- **Modify:** `src/services/khcn-report.service.ts` — hàm `buildKhcnReportData` (PA fields block)

## Implementation Steps

### 1. Refactor `buildLoanPlanExtendedData` trong `khcn-report-data-builders.ts`

Bỏ toàn bộ costNameMap block (line ~487-503). Thay bằng:

```ts
// Cost items loop — universal cho mọi category
const costItems: CostItem[] = JSON.parse(plan.cost_items_json || "[]");
data["PA_CHIPHI"] = costItems.map((c, i) => ({
  STT: i + 1,
  "Hạng mục": c.name,
  "ĐVT": c.unit,
  "Số lượng": c.qty,
  "Đơn giá": c.unitPrice,
  "Thành tiền": c.amount,
}));

// Revenue items loop
const revenueItems: RevenueItem[] = JSON.parse(plan.revenue_items_json || "[]");
data["PA_DOANHTHU"] = revenueItems.map((r, i) => ({
  STT: i + 1,
  "Mô tả": r.description,
  "Số lượng": r.qty,
  "Đơn giá": r.unitPrice,
  "Thành tiền": r.amount,
}));
```

### 2. Cập nhật flat PA.* fields

Đảm bảo các flat fields sau vẫn được populate (đã có sẵn, verify):
- `PA.Tên phương án`
- `PA.Tổng chi phí trực tiếp` = sum of cost items
- `PA.Tổng doanh thu dự kiến` = sum of revenue items
- `PA.Số tiền vay`, `PA.Vốn đối ứng`, `PA.Lợi nhuận dự kiến`
- `PA.Lãi vay NH` = interest
- `PA.Vòng quay vốn`, `PA.Nhu cầu vốn vay`
- Bằng chữ variants

Thêm các flat fields mới từ financials nếu chưa có:
```ts
data["PA.Tổng chi phí trực tiếp"] = financials.totalDirectCost ?? "";
data["PA.Tổng chi phí gián tiếp"] = financials.totalIndirectCost ?? "";
data["PA.Tổng chi phí"] = financials.totalCost ?? "";
data["PA.Lãi vay"] = financials.interest ?? "";
data["PA.Thuế"] = financials.tax ?? "";
data["PA.Nhu cầu vốn vay"] = financials.loanNeed ?? "";
data["PA.Vòng quay vốn"] = financials.turnoverCycles ?? "";
data["PA.Tỷ lệ vốn tự có"] = financials.loanNeed
  ? ((financials.counterpartCapital / financials.loanNeed) * 100).toFixed(1) + "%"
  : "";
```

### 3. Update function signature

Thêm `revenue_items_json` vào type parameter của `buildLoanPlanExtendedData`:

```ts
export function buildLoanPlanExtendedData(
  plan: {
    name: string;
    financials_json: string;
    cost_items_json: string;
    revenue_items_json: string; // NEW
  } | null,
  data: Data,
)
```

### 4. Verify `buildKhcnReportData` trong `khcn-report.service.ts`

Block line 172-186 đã có PA.* flat fields. Verify không duplicate với data builder. Nếu duplicate, consolidate vào `buildLoanPlanExtendedData` (single source of truth).

## Todo List

- [ ] Bỏ costNameMap block trong buildLoanPlanExtendedData
- [ ] Thêm PA_CHIPHI loop array
- [ ] Thêm PA_DOANHTHU loop array
- [ ] Cập nhật flat PA.* fields đầy đủ
- [ ] Update function signature thêm revenue_items_json
- [ ] Consolidate PA.* fields (bỏ duplicate giữa service và builder)
- [ ] Compile check: `npx tsc --noEmit`

## Success Criteria

- `buildLoanPlanExtendedData` không còn costNameMap
- data dict chứa `PA_CHIPHI` array và `PA_DOANHTHU` array
- Flat PA.* fields đầy đủ cho cả 2 template (PA + BCĐX)
- No TypeScript errors
