---
status: complete
---

# Plan: KHCN Template Management (Download/Upload)

**Date:** 2026-03-31 | **Mode:** Fast | **Risk:** Low

## Context

- Brainstorm: `plans/reports/brainstorm-260331-0819-khcn-template-management.md`
- KHCN templates: 65+ mẫu trong `report_assets/KHCN templates/`, registry tại `khcn-template-registry.ts`
- KHDN đã có: download, upload, backup qua `save-docx` API + `TemplateFileActions` component
- Scope: Tab "Quản lý mẫu" trong KHCN, download + upload replace only

## Architecture

```
/report/khcn/templates (new page)
  └─ List KHCN templates grouped by category
     └─ Per template: Download + Upload (reuse TemplateFileActions)
        └─ Upload → PUT /api/report/template/save-docx?path=... (existing)
```

## Phases

| # | Phase | Priority | Effort | Status |
|---|-------|----------|--------|--------|
| 1 | [KHCN templates page](phase-01-khcn-templates-page.md) | High | M | ✅ Complete |
| 2 | [Navigation + routing](phase-02-navigation-routing.md) | High | S | ✅ Complete |

## Key Reuse

- `TemplateFileActions` component (download + upload buttons)
- `save-docx` API (backup + overwrite)
- `getSignedFileUrl` helper (download serving)
- `KHCN_TEMPLATES` + `DOC_CATEGORY_LABELS` from registry
