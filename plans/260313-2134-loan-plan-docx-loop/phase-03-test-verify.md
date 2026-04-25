# Phase 3: Test & Verify

## Overview
- **Priority:** P1
- **Status:** Pending
- **Effort:** 1h
- **Depends on:** Phase 1, Phase 2

Test render DOCX với sample data, verify output đúng cho nhiều category.

## Related Code Files

- **Modify (optional):** `prisma/seed-loan-templates.ts` — thêm test data nếu cần

## Implementation Steps

### 1. Compile check

```bash
npx tsc --noEmit
```

### 2. Manual test qua UI

1. Mở app → Khách hàng → Phương án vay vốn
2. Tạo PA mới với data:
   - Category: nông nghiệp (có cost items: giống, phân, thuốc...)
   - Category: kinh doanh (cost items khác hoàn toàn)
3. Generate DOCX từ cả 2 PA → verify:
   - Bảng chi phí render đúng N rows
   - Tổng CPTT đúng
   - Flat fields (số tiền vay, lợi nhuận...) đúng
   - Số format vi-VN (1.000.000)

### 3. Edge cases

- PA không có cost items → bảng rỗng (loop ẩn)
- PA không có revenue items → bảng doanh thu ẩn
- PA có 1 cost item → 1 row
- PA có 20+ cost items → nhiều rows

### 4. Verify BCĐX template

Generate BCĐX từ khách hàng có PA → verify flat PA.* fields hiển thị đúng.

## Todo List

- [ ] Compile check pass
- [ ] Test render PA nông nghiệp → DOCX output đúng
- [ ] Test render PA kinh doanh → DOCX output đúng
- [ ] Test edge case: PA trống
- [ ] Test BCĐX template với PA data

## Success Criteria

- Mọi category PA đều render đúng vào DOCX
- Không regression trên existing flat PA.* fields
- No TypeScript errors
- DOCX output mở được trong Word/LibreOffice
