# Phase 1: Field Coverage Indicator

## Overview
- **Priority:** High
- **Effort:** Low
- **Status:** ⬜ Not started

Hiển thị "X/Y fields có data" trên cả Mapping page và Template page.

## Key Insights
- `effectiveValues` trong `use-mapping-data-store` đã chứa tất cả giá trị field
- `fieldCatalog` chứa danh sách tất cả fields
- `MappingStatusBar.tsx` đã có UI hiển thị field count → mở rộng thêm coverage

## Architecture
```
src/lib/report/field-sync-utils.ts (NEW)
  └── computeFieldCoverage(catalog, effectiveValues)
        → { total, filled, empty, coveragePercent, emptyKeys[] }
```

## Related Code Files
- **Modify:** `src/app/report/mapping/components/MappingStatusBar.tsx` — thêm coverage bar
- **Modify:** `src/app/report/template/_components/build-export-tab.tsx` — thêm coverage bar trước build
- **Create:** `src/lib/report/field-sync-utils.ts` — shared coverage logic

## Implementation Steps

1. Tạo `field-sync-utils.ts`:
   - `computeFieldCoverage(catalog: FieldCatalogItem[], values: Record<string, string>)`:
     - Đếm fields có value không rỗng
     - Return `{ total, filled, empty, coveragePercent, emptyKeys[] }`

2. Mở rộng `MappingStatusBar.tsx`:
   - Import `computeFieldCoverage`
   - Lấy `fieldCatalog` + `effectiveValues` từ store
   - Render progress bar: `"12/15 fields (80%)"` với color coding (green >80%, yellow 50-80%, red <50%)

3. Thêm coverage indicator vào `build-export-tab.tsx`:
   - Fetch field catalog + values từ API hoặc store
   - Hiển thị coverage summary trước nút Build
   - Warning nếu coverage < 100%

## Todo
- [ ] Tạo `field-sync-utils.ts` với `computeFieldCoverage`
- [ ] Thêm coverage bar vào MappingStatusBar
- [ ] Thêm coverage indicator vào build-export-tab
- [ ] Test coverage calculation

## Success Criteria
- User thấy ngay bao nhiêu field đã điền trên cả 2 trang
- Coverage % chính xác so với field catalog
