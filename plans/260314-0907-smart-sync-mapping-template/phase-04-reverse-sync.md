# Phase 4: Reverse Sync (Mapping → Template)

## Overview
- **Priority:** Medium
- **Effort:** Medium
- **Status:** ⬜ Not started

Trên mapping page, hiển thị badge cho biết field đang được template nào sử dụng. Warning khi xóa field đang dùng.

## Key Insights
- Template profiles lưu trong DB, mỗi profile có file DOCX chứa placeholders
- Cần API endpoint trả về mapping: `field_key → template_names[]`
- Hoặc: scan tất cả registered templates lấy placeholders → build reverse index

## Architecture
```
API: GET /api/report/templates/field-usage
  → { [field_key]: string[] }  (field → list template names using it)

Mapping page:
  - Fetch field usage on load
  - FieldRow: badge "Dùng trong 2 mẫu" + tooltip
  - Delete confirm: warning nếu field đang được template dùng
```

## Related Code Files
- **Create:** `src/app/api/report/templates/field-usage/route.ts` — API endpoint
- **Modify:** `src/app/report/mapping/components/FieldRow.tsx` — thêm usage badge
- **Modify:** `src/app/report/mapping/components/Modals/DeleteConfirmModal.tsx` — thêm warning

## Implementation Steps

1. Tạo API `GET /api/report/templates/field-usage`:
   - Query tất cả registered template profiles
   - Đọc DOCX files, extract placeholders
   - Build reverse index: `{ field_key: [template_name, ...] }`
   - Cache kết quả (template ít thay đổi)

2. Mapping page: fetch field usage data (store hoặc React Query)

3. `FieldRow.tsx`:
   - Hiển thị badge nhỏ: "📄 2" (dùng trong 2 templates)
   - Tooltip hover: danh sách tên templates

4. `DeleteConfirmModal.tsx`:
   - Check field có trong usage map không
   - Nếu có: warning "Field này đang được dùng trong: Template A, Template B"

## Todo
- [ ] Tạo field-usage API endpoint
- [ ] Fetch usage data trong mapping page
- [ ] Thêm usage badge vào FieldRow
- [ ] Thêm warning vào DeleteConfirmModal

## Success Criteria
- User biết field nào đang được template sử dụng
- Warning rõ ràng khi xóa field đang dùng
