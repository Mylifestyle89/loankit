# Phase 1: Tạo KHDN Layout + Sub-tabs

## Overview
- Priority: High
- Status: ✅ Complete
- Effort: S

## Description
Tạo route group `/report/khdn/` với layout chứa sub-tab navigation (Mapping | Mẫu báo cáo | AI Gợi ý).

## Implementation Steps

1. Tạo `src/app/report/khdn/layout.tsx`
   - Client component với sub-tab bar
   - 3 tabs: Mapping (`/report/khdn/mapping`), Mẫu báo cáo (`/report/khdn/template`), AI Gợi ý (`/report/khdn/ai-suggest`)
   - Active tab highlight dựa trên `usePathname()`
   - Style consistent với system-operations page tabs
   - Render `{children}` below tabs

2. Tạo `src/app/report/khdn/page.tsx`
   - Redirect to `/report/khdn/mapping` (default tab)

## Related Files
- Reference: `src/app/report/system-operations/page.tsx` (tab pattern)
- Create: `src/app/report/khdn/layout.tsx`
- Create: `src/app/report/khdn/page.tsx`

## Success Criteria
- [x] `/report/khdn` redirects to `/report/khdn/mapping`
- [x] Sub-tab bar renders 3 tabs
- [x] Active tab highlights correctly
