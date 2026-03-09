---
title: "Template Folder Browser - Edit DOCX from report_assets"
description: "Add folder tree browser to template management UI, enabling editing any DOCX in report_assets"
status: pending
priority: P1
effort: 3h
branch: Deploy-test
tags: [template, ui, api, docx, folder-browser]
created: 2026-03-08
---

# Template Folder Browser

## Problem
Template page only shows 2 hardcoded template_profiles from `framework_state.json`. Users cannot browse/edit the many DOCX templates stored in `report_assets/` subfolders. The "Chon mau tu folder" button uses client-side file picker (no server-side access, no save-back).

## Solution
1. API to list DOCX files from `report_assets/` recursively
2. UI folder tree browser component to replace/augment the file picker button
3. Reuse existing editor + save-docx infrastructure (already supports any relPath)

## Architecture
```
[Folder Tree Browser UI] --GET--> [/api/report/template/folder-files] --fs.readdir--> [report_assets/]
       |
       v (select file)
[Set activeFolderFile path] --> openEditor/openOnlyoffice (reuse existing logic with path override)
       |
       v (save)
[PUT /api/report/template/save-docx?path=...] (already works with any relPath)
```

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [API: folder-files endpoint](./phase-01-api-folder-files.md) | pending | 45min |
| 2 | [UI: folder browser component + page integration](./phase-02-ui-folder-browser.md) | pending | 2h |

## Key Decisions
- No new database tables needed - pure filesystem listing
- Exclude non-template folders: backups/, config/, exports/, generated/, pdf/, uploads/, .locks/
- Exclude temp files: report_preview_*, *.bak, ~$*
- Reuse existing save-docx API (already accepts any relPath)
- Page modularization: extract folder browser into separate component (~200 line limit)
- Keep template_profiles dropdown for backward compat, add folder browser as second tab/section

## Dependencies
- Existing: `save-docx` API, `getSignedFileUrl()`, `OnlyOfficeEditorModal`, `DocxTemplateEditorModal`
- No external packages needed
