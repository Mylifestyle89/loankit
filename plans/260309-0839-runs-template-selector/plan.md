# Plan: Runs Page — Template Selector + Download/Open

## Overview
- **Priority:** Medium
- **Status:** Complete
- **Complexity:** Simple (single file change + minor API awareness)
- **Phases:** 1

## Summary

Điều chỉnh màn hình Run & Preview (`src/app/report/runs/page.tsx`) để:
1. Hiển thị dropdown chọn template DOCX từ danh sách `template_profiles` trước khi Run/Preview
2. Truyền `template_path` (docx_path của template đã chọn) vào API export
3. Thêm nút tải xuống DOCX đã tạo + nút mở lại file trong OnlyOffice

## Architecture

### Current Flow
```
RunsPage → POST /api/report/export { output_path, report_path }
         → Server uses active_template_id from framework_state.json
         → Returns { output_path }
         → Opens OnlyOffice preview
```

### New Flow
```
RunsPage → GET /api/report/template → load template_profiles
         → User picks template from dropdown
         → POST /api/report/export { output_path, report_path, template_path }
         → Server uses provided template_path (or fallback to active)
         → Returns { output_path }
         → Show: OnlyOffice preview + Download button + Re-open button
```

### Key Insight
Export API (`src/app/api/report/export/route.ts`) already accepts `template_path` in schema.
Build service (`build.service.ts:328`) falls back: `input.templatePath ?? activeTemplate.docx_path`.
**No backend changes needed.**

## Related Code Files

### Modify
- `src/app/report/runs/page.tsx` — Add template selector, download, re-open

### Read Only (no changes)
- `src/app/api/report/export/route.ts` — Already accepts `template_path`
- `src/app/api/report/template/route.ts` — GET returns template list
- `src/services/report/build.service.ts` — `runReportExport` uses `templatePath`

## Phase 1: UI Changes in RunsPage

### Steps

1. **Load templates on mount**
   - Fetch `GET /api/report/template` → `{ templates, active_template_id }`
   - Store in state: `templates[]`, `selectedTemplateId`
   - Default `selectedTemplateId` = `active_template_id`

2. **Template selector dropdown**
   - Add `<select>` before action buttons
   - Show template_name + "(active)" badge for active template
   - On change → update `selectedTemplateId`

3. **Pass template_path to export**
   - In `runExportPreview()`, find selected template's `docx_path`
   - Add `template_path: selectedDocxPath` to POST body
   - If no template selected, omit (server uses active)

4. **Download button improvements**
   - Always show download button when `onlyOfficePreviewPath` exists (already done)
   - Add "Mở lại trong OnlyOffice" button when preview path exists but modal closed
   - Track `previewClosed` state to distinguish "generated but closed" vs "not generated"

5. **Output file list enhancements**
   - Each run log's `output_paths` → add download icon button per path
   - Click → `getSignedFileUrl(path, true)` → window.open

### Success Criteria
- [x] Template dropdown loads and defaults to active template
- [x] Export uses selected template's docx_path
- [x] Download button works for generated file
- [x] "Mở lại" button re-opens OnlyOffice after closing
- [x] Run log output paths have download buttons

### Risk Assessment
- **Low risk**: No backend changes, only UI state management
- **Edge case**: If selected template is removed between load and export → server 404. Handle with error display.
