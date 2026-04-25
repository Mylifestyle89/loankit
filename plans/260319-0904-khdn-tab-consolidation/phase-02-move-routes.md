# Phase 2: Move Mapping + Template Routes

## Overview
- Priority: High
- Status: ✅ Complete
- Effort: M

## Description
Move `src/app/report/mapping/` và `src/app/report/template/` vào `src/app/report/khdn/`.

## Implementation Steps

1. Move mapping page & components
   - `src/app/report/mapping/page.tsx` → `src/app/report/khdn/mapping/page.tsx`
   - `src/app/report/mapping/components/` → `src/app/report/khdn/mapping/components/`
   - `src/app/report/mapping/hooks/` → `src/app/report/khdn/mapping/hooks/`
   - `src/app/report/mapping/stores/` → `src/app/report/khdn/mapping/stores/`
   - `src/app/report/mapping/types.ts` → `src/app/report/khdn/mapping/types.ts`
   - `src/app/report/mapping/helpers.ts` → `src/app/report/khdn/mapping/helpers.ts`
   - `src/app/report/mapping/__tests__/` → `src/app/report/khdn/mapping/__tests__/`

2. Move template page & components
   - `src/app/report/template/page.tsx` → `src/app/report/khdn/template/page.tsx`
   - `src/app/report/template/_components/` → `src/app/report/khdn/template/_components/`

3. Tạo AI Suggest tab page
   - `src/app/report/khdn/ai-suggest/page.tsx`
   - Render `AiMappingModal` as inline component (không phải modal)
   - Hoặc đơn giản: wrapper mở AiMappingModal auto khi vào tab

4. **KHÔNG move** API routes — giữ nguyên:
   - `src/app/api/report/mapping/*`
   - `src/app/api/report/template/*`

## Related Files
- Move: toàn bộ `src/app/report/mapping/` (60+ files)
- Move: toàn bộ `src/app/report/template/` (11 files)
- Keep: `src/app/api/report/mapping/*`, `src/app/api/report/template/*`

## Risks
- Internal relative imports giữa mapping components sẽ tự work (cùng move)
- Cross-module imports (services, lib) dùng `@/` alias → không bị ảnh hưởng
- `GlobalModalProvider` import từ `./mapping/components/` trong layout.tsx → cần update path

## Success Criteria
- [x] `/report/khdn/mapping` renders MappingPage
- [x] `/report/khdn/template` renders TemplatePage
- [x] `/report/khdn/ai-suggest` renders AI suggestion UI
- [x] Tất cả internal imports resolve đúng
