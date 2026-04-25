## Phase 5: KHCN DOCX Template Registration + Management

**Priority:** P2 | **Status:** done | **Effort:** 5h | **Depends:** Phase 2

### Context
- 25 DOCX templates in `report_assets/backups/Trồng hoa Cát tường/*.docx`
- Existing `template-folder.service.ts` scans `report_assets/` tree, excludes `backups/`
- Existing DOCX export uses docxtemplater with `{{placeholder}}` syntax
- Templates already tagged with placeholders

### Requirements
- Register 25 KHCN DOCX templates in "Quản lý mẫu" (template management UI)
- Group templates by category for easy browsing
- Allow opening templates with OnlyOffice/default system editor
- Map individual customer fields to template placeholders
- Export flow: select customer -> select template -> generate DOCX

### Implementation Steps

1. **Organize KHCN templates into report_assets/ (non-backup)**
   - Create folder structure under `report_assets/KHCN templates/`:
     ```
     report_assets/KHCN templates/
     ├── Hợp đồng tín dụng/      (2268.06E, 2268.06)
     ├── Báo cáo đề xuất/         (2268.02B variants, 2268.07)
     ├── Phương án sử dụng vốn/   (2268.01E)
     ├── Biên bản kiểm tra/       (2268.11A, 2268.11B)
     ├── Hồ sơ tài sản/           (2929.34 variants)
     ├── Danh mục hồ sơ/          (2899.01 variants)
     ├── Giấy tờ pháp lý/         (1255, 3333.02C, cam kết...)
     └── Chứng từ giải ngân/      (599 UNC, in UNC, biên bản giao nhận...)
     ```
   - Copy from `backups/Trồng hoa Cát tường/` → above structure
   - This makes them visible to `template-folder.service.ts` scanner

2. **Add "Open in editor" feature to template management UI**
   - Add API route to serve DOCX file path for system open
   - Frontend: "Mở bằng trình soạn thảo" button → triggers OS default app (OnlyOffice)
   - Use `window.open()` with file:// protocol or API download endpoint
   - Consider: expose `/api/report/templates/[path]/open` that returns file for editing

3. **Create KHCN field-to-placeholder mapping**
   - Map .bk ClientAttributes keys -> template placeholder names
   - Reuse existing docxtemplater infrastructure
   - Tag FieldTemplateMaster entries with `customer_type: "individual"`

4. **Register templates as FieldTemplateMaster entries**
   - One master per DOCX template (or group)
   - fieldCatalogJson describes expected fields
   - `category` field for grouping in UI

5. **Export API + UI**
   - Reuse existing export flow
   - Customer detail page: show only templates matching customer_type
   - Group templates by category folder in picker UI

### Related Files
- `src/services/report/template-folder.service.ts` — folder scanner (update EXCLUDED_FOLDERS if needed)
- `src/services/report/template.service.ts` — template CRUD
- `src/app/report/customers/[id]/components/customer-templates-section.tsx`
- `src/lib/docx-engine.ts` — DOCX generation

### Success Criteria
- 25 templates organized in grouped folders, visible in "Quản lý mẫu"
- Templates openable with OnlyOffice/default editor from UI
- KHCN customer data fills placeholders correctly
- Corporate customers don't see KHCN templates
- Category grouping makes templates easy to find
