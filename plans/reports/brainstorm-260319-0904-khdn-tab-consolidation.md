# Brainstorm: Gộp Mapping + Template + AI vào Tab KHDN

## Problem Statement
- Mapping page, Template page, AI Mapping suggestion hiện phục vụ KHDN nhưng nằm rải rác 3 menu items trong navbar
- KHCN nằm trong Customers → user KHCN thấy UI không liên quan (Mapping, Template)
- Navbar 5 items → muốn giảm clutter, tách biệt KHDN vs KHCN

## Approach: Gộp route `/report/khdn/*`

### Thay đổi Navbar
```
Trước: Customers | Loans | Mapping | Template | System Ops | [Bot AI]
Sau:   Customers | Loans | KHDN    | System Ops
```

### Cấu trúc route mới
```
/report/khdn/           → redirect to /report/khdn/mapping
/report/khdn/mapping     → MappingPage hiện tại
/report/khdn/template    → TemplatePage hiện tại
/report/khdn/ai-suggest  → AiMappingModal → chuyển thành full page/tab
```

### Layout mới: `/report/khdn/layout.tsx`
- Sub-tab navigation: [Mapping] [Mẫu báo cáo] [AI Gợi ý]
- Wrap children với shared context nếu cần
- Giữ nguyên component bên trong, chỉ đổi routing

### Implementation Steps
1. Tạo `src/app/report/khdn/layout.tsx` với sub-tabs
2. Move `src/app/report/mapping/*` → `src/app/report/khdn/mapping/`
3. Move `src/app/report/template/*` → `src/app/report/khdn/template/`
4. Tạo `src/app/report/khdn/ai-suggest/page.tsx` (extract từ AiMappingModal)
5. Update navbar trong `src/app/report/layout.tsx`: bỏ Mapping + Template, thêm KHDN
6. Di chuyển nút Bot AI từ navbar vào KHDN layout
7. Update tất cả internal links/redirects
8. Thêm redirects: `/report/mapping` → `/report/khdn/mapping` (backward compat)

### Risks
- **Import paths**: Nhiều file import từ `../mapping/` → cần update
- **Custom events**: `mapping:open-ai-suggestion` dispatch từ nhiều nơi
- **Stores**: useMappingDataStore, useFieldTemplateStore reference từ các components khác
- **GlobalModalProvider**: hiện wrap ở report layout level, cần giữ

### Không thay đổi
- KHCN giữ trong Customers page như hiện tại
- Component internals giữ nguyên, chỉ đổi file location
- Store logic không đổi

## Success Criteria
- Navbar giảm từ 5 → 4 items
- KHDN tools gộp dưới 1 tab với sub-navigation rõ ràng
- User switch nhanh giữa Mapping ↔ Template ↔ AI
- Không break existing functionality
- KHCN workflow không bị ảnh hưởng
