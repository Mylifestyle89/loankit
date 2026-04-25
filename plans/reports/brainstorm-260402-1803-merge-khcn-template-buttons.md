# Brainstorm: Merge nút "Mẫu KHCN" vào tab in mẫu biểu

**Date:** 2026-04-02
**Status:** Agreed

## Problem
- Nút "Mẫu KHCN" (trang `/report/khcn/templates`) trùng chức năng với nút "Tải mẫu gốc" trong tab in mẫu biểu
- Confusing UX: 2 nơi để download template

## Decision
Bỏ trang templates riêng. Merge download + replace vào tab in mẫu biểu.

## UI: Mỗi dòng template
```
[📄 Tạo báo cáo]  [⬇ Tải mẫu gốc]  [🔄 Thay mẫu]
```

## Changes
1. `khcn-doc-checklist.tsx` — thêm icon "Thay mẫu" (reuse TemplateFileActions logic)
2. Xóa `src/app/report/khcn/templates/page.tsx`
3. `customer-list-view.tsx` — bỏ nút "Mẫu KHCN"

## Risk: Low
TemplateFileActions component already handles upload/replace.
