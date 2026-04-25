# Phase 2: Template Field Validation UI

## Overview
- **Priority:** High
- **Effort:** Medium
- **Status:** ⬜ Not started

Scan placeholders trong DOCX template, highlight field nào có data / thiếu data / data rỗng.

## Key Insights
- API `validate-upload` đã trả `valid[]`, `unknown[]`, `missing[]` — nhưng chỉ validate placeholder vs catalog, KHÔNG check giá trị
- Cần extend validation: check placeholder vs `effectiveValues` (có data hay không)
- Placeholder format: `[field_key]` → regex: `/\[([^\[\]]+)\]/g`
- `useTemplateUploadValidation` hook đã có → extend thêm value check

## Architecture
```
src/lib/report/field-sync-utils.ts (EXTEND from Phase 1)
  └── validateTemplateFields(placeholders[], catalog, effectiveValues)
        → { withData[], noData[], emptyData[], unknownPlaceholders[] }

Template page: new component FieldCoveragePanel
```

## Related Code Files
- **Extend:** `src/lib/report/field-sync-utils.ts` — thêm `validateTemplateFields`
- **Create:** `src/app/report/template/_components/field-coverage-panel.tsx` — panel hiển thị validation
- **Modify:** `src/app/report/template/_components/configured-templates-tab.tsx` — integrate panel

## Implementation Steps

1. Thêm `validateTemplateFields` vào `field-sync-utils.ts`:
   - Input: placeholders từ template, field catalog, effective values
   - Phân loại: 🟢 có data, 🔴 thiếu trong catalog, 🟡 có trong catalog nhưng chưa điền

2. Tạo `field-coverage-panel.tsx`:
   - Compact panel hiển thị bên cạnh template editor
   - 3 sections: ✅ Có data | ⚠️ Chưa điền | ❌ Không nhận dạng
   - Mỗi field item clickable (cho Phase 3)
   - Collapsible sections

3. Integrate vào `configured-templates-tab.tsx`:
   - Khi user mở template để edit, fetch placeholders + values
   - Render `FieldCoveragePanel` bên cạnh editor

## Todo
- [ ] Implement `validateTemplateFields` trong field-sync-utils
- [ ] Tạo FieldCoveragePanel component
- [ ] Integrate vào configured-templates-tab
- [ ] Handle edge cases: repeater placeholders `[#...]...[/...]`

## Success Criteria
- User thấy ngay field nào trong template thiếu data
- Validation chính xác với cả regular và repeater placeholders
