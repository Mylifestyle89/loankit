# Phase 5: Update Customers List Page (Export/Import UI)

## Priority: MEDIUM | Status: pending | Depends on: Phase 3, 4

## Overview

Cập nhật trang danh sách khách hàng `/report/customers` để sử dụng export/import mới với đầy đủ dữ liệu và hỗ trợ cả JSON + XLSX.

## Related Code Files

### Modify
- `src/app/report/customers/page.tsx` — Update export/import UI

## Implementation Steps

### Step 1: Update Export Modal

- Thêm format selector: JSON / XLSX
- Checkbox "Bao gồm dữ liệu đầy đủ (khoản vay, giải ngân, hoá đơn)"
- Preview: show estimated data size

### Step 2: Update Import Handler

- Accept both `.json` and `.xlsx` files
- Auto-detect format from file extension
- Show import preview before confirming
- Display detailed result: count per entity type

### Step 3: UI Polish

- Loading states during export/import
- Error handling with user-friendly messages
- Success toast with import summary

## Success Criteria

- [ ] Export modal allows format selection
- [ ] Import accepts JSON and XLSX
- [ ] Import shows detailed result summary
- [ ] Error states handled gracefully
