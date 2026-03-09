---
title: "Template Upload/Download Workflow"
description: "Replace broken in-browser DOCX editors with reliable upload/download + field reference workflow"
status: pending
priority: P1
effort: 4h
branch: Deploy-test
tags: [template, upload, docx, ui-redesign]
created: 2026-03-08
---

# Template Upload/Download Workflow

## Problem
Two in-browser DOCX editors are broken:
- **Eigenpal**: Crashes on complex tables (`Invalid content for node tableRow`)
- **OnlyOffice Docker**: Error -4, requires Docker setup

Neither is necessary. The "field injection" feature only copies `[field_key]` to clipboard -- user pastes into their own Word/LibreOffice.

## Solution
Replace editor-centric UX with **upload/download + field reference panel**:
1. Download DOCX from server
2. Edit in MS Word / LibreOffice (100% compatible)
3. Upload edited DOCX back
4. Field Reference Panel for copying `[field_key]` placeholders

## Phases

| # | Phase | Status | Effort | File |
|---|-------|--------|--------|------|
| 1 | Upload/Download API | pending | 1.5h | [phase-01](./phase-01-upload-download-api.md) |
| 2 | Folder Browser Redesign | pending | 1.5h | [phase-02](./phase-02-folder-browser-redesign.md) |
| 3 | Field Reference Panel | pending | 1h | [phase-03](./phase-03-field-reference-panel.md) |

## Key Decisions
- Keep OnlyOffice/Eigenpal as **optional secondary** (don't remove, just deprioritize)
- Reuse existing `save-docx` API for upload (already accepts PUT with buffer)
- Reuse existing `getSignedFileUrl()` for download
- No new dependencies needed
- `docxtemplater` already in project for report generation -- no changes needed there

## Dependencies
- `report_assets/` folder structure (already exists)
- `/api/report/file/token` + `/api/report/file` endpoints (already exist for signed downloads)
- `/api/report/template/save-docx` endpoint (already exists, reuse for upload)

## Files to Modify
- `src/app/report/template/_components/template-folder-browser.tsx` -- add download/upload buttons
- `src/app/report/template/page.tsx` -- simplify, add field reference panel to folder tab

## Files to Create
- `src/app/report/template/_components/field-reference-panel.tsx` -- standalone field reference
- `src/app/report/template/_components/template-file-actions.tsx` -- download/upload action buttons

## Files to Keep (no changes)
- `src/app/report/template/_components/use-field-injection.ts` -- clipboard logic works fine
- `src/app/report/template/_components/field-injection-toolbar.tsx` -- keep for configured tab
- `src/components/docx-template-editor-modal.tsx` -- keep as optional
- `src/components/onlyoffice-editor-modal.tsx` -- keep as optional
- `src/app/api/report/template/save-docx/route.ts` -- reuse as-is for upload
- `src/app/api/report/template/folder-files/route.ts` -- reuse as-is
