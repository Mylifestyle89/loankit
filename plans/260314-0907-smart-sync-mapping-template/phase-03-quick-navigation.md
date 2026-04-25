# Phase 3: Quick Navigation

## Overview
- **Priority:** Medium
- **Effort:** Low
- **Status:** ⬜ Not started

Click field thiếu trên template page → navigate tới mapping page với field đó được highlight.

## Architecture
```
Template page:  click field → router.push("/report/mapping?focus=field_key")
Mapping page:   read ?focus param → scroll to field + highlight animation
```

## Related Code Files
- **Modify:** `src/app/report/template/_components/field-coverage-panel.tsx` — thêm click handler navigate
- **Modify:** `src/app/report/mapping/page.tsx` — đọc `?focus` query param
- **Modify:** `src/app/report/mapping/components/FieldRow.tsx` — highlight animation khi focused

## Implementation Steps

1. `field-coverage-panel.tsx`: mỗi field item thiếu data → `<Link href="/report/mapping?focus={field_key}">`

2. `mapping/page.tsx`:
   - Đọc `searchParams.focus`
   - Truyền xuống component tree
   - Auto-expand group chứa field đó
   - Auto-scroll tới field

3. `FieldRow.tsx`:
   - Nhận prop `isFocused`
   - Nếu focused: ring animation + scroll into view via `useEffect` + `ref.scrollIntoView()`
   - Clear focus sau 3 giây

## Todo
- [ ] Thêm navigation links vào FieldCoveragePanel
- [ ] Đọc ?focus param trong mapping page
- [ ] Implement scroll + highlight animation trong FieldRow
- [ ] Clear focus state sau animation

## Success Criteria
- Click field thiếu → mapping page mở đúng field, auto-scroll, highlight rõ ràng
- User không cần tìm kiếm thủ công
