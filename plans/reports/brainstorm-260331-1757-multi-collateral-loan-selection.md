# Brainstorm: Multi-Collateral Loan Selection

**Date:** 2026-03-31 | **Status:** Agreed

## Problem

KHCN cần generate bộ HĐ thế chấp cho khoản vay có nhiều sổ đỏ (nhiều tài sản). Hiện tại inject TẤT CẢ collaterals — cần cho user chọn tài sản nào đưa vào từng khoản vay.

## Requirements

1. **Collateral selection gắn với Loan** — save vào DB
2. **Profile card** thêm "Tổng TSBĐ" + "Tổng NVBĐ" (tính từ ALL collaterals, không filter theo loan)
3. **Generate template riêng lẻ** — bộ HĐ thường gồm: HĐTC, BB định giá, phiếu ĐKGDBĐ, danh mục TS, phiếu đề nghị hạch toán
4. **Backward compatible** — selectedCollateralIds rỗng → dùng tất cả

## Solution

### DB Change

Add `selectedCollateralIds` JSON field to Loan model (SQLite):
```prisma
model Loan {
  ...
  selectedCollateralIds String @default("[]") // JSON array of Collateral IDs
}
```
- No junction table — KISS, collateral list ít thay đổi
- No FK constraint needed — collaterals rarely deleted

### Profile Card

Add 2 stats to `khcn-profile-card.tsx`:
- "Tổng TSBĐ" = `SUM(customer.collaterals.total_value)`
- "Tổng NVBĐ" = `SUM(customer.collaterals.obligation)`

### UI: Collateral Selection

In loan detail page, add collateral picker:
- List all customer collaterals grouped by type
- Checkbox per collateral
- Show running total of selected (giá trị + nghĩa vụ)
- Save to `loan.selectedCollateralIds` via API

### Template Injection

Modify `khcn-report.service.ts`:
```
// Before (current)
collaterals = customer.collaterals

// After
selectedIds = JSON.parse(loan.selectedCollateralIds || "[]")
collaterals = selectedIds.length > 0
  ? customer.collaterals.filter(c => selectedIds.includes(c.id))
  : customer.collaterals  // backward compat
```

Cloner logic unchanged — N = filtered count.

## Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `selectedCollateralIds` to Loan |
| `src/app/report/customers/[id]/components/khcn-profile-card.tsx` | Add Tổng TSBĐ/NVBĐ stats |
| `src/services/khcn-report.service.ts` | Filter collaterals by selectedIds |
| `src/app/report/loans/[id]/page.tsx` (or similar) | Add collateral selection UI |
| API route for loan update | Accept selectedCollateralIds |

## Risk

- Low: JSON field vs junction table — no referential integrity, but collaterals rarely deleted
- Low: Backward compat via empty array fallback

## Next Steps

Create implementation plan with phases:
1. DB migration + API
2. Profile card stats
3. Collateral picker UI
4. Report service filter
