# Phase Implementation Report

### Executed Phase
- Phase: auth-guard-31-routes (ad-hoc task, no plan file)
- Plan: none
- Status: completed

### Files Modified (31 files)

**CRITICAL — requireAdmin():**
- `src/app/api/report/templates/search-replace/route.ts`

**CRITICAL — requireEditorOrAdmin():**
- `src/app/api/report/auto-process/run/route.ts`
- `src/app/api/report/auto-process/start/route.ts`
- `src/app/api/report/auto-process/upload/route.ts`

**HIGH — requireEditorOrAdmin():**
- `src/app/api/report/auto-process/assets/route.ts`
- `src/app/api/report/auto-process/jobs/[id]/route.ts`
- `src/app/api/report/auto-process/open-output/route.ts`
- `src/app/api/report/auto-tagging/analyze/route.ts`
- `src/app/api/report/auto-tagging/reverse/route.ts`
- `src/app/api/report/export/route.ts`
- `src/app/api/report/mapping/docx-process/route.ts`
- `src/app/api/report/mapping/extract-process/route.ts`
- `src/app/api/report/mapping/ocr-process/route.ts`
- `src/app/api/report/mapping/suggest/route.ts`
- `src/app/api/report/templates/khcn/generate/route.ts`
- `src/app/api/report/financial-analysis/analyze/route.ts`

**MEDIUM — requireSession():**
- `src/app/api/report/freshness/route.ts`
- `src/app/api/report/guide/route.ts`
- `src/app/api/report/mapping/template-fields/route.ts`
- `src/app/api/report/runs/route.ts`
- `src/app/api/report/validate/route.ts`
- `src/app/api/report/template/folder-files/route.ts`
- `src/app/api/report/template/inventory/route.ts`
- `src/app/api/report/template/merge-docx/route.ts`
- `src/app/api/report/template/open-backup-folder/route.ts`
- `src/app/api/report/template/placeholders/route.ts`
- `src/app/api/report/template/validate-upload/route.ts`
- `src/app/api/report/templates/khcn/route.ts`
- `src/app/api/report/templates/khcn/xlsx-samples/route.ts`
- `src/app/api/report/financial-analysis/extract/route.ts`
- `src/app/api/loan-plans/templates/[id]/route.ts`

### Tasks Completed
- [x] Read all 31 route files before editing
- [x] Added import for appropriate guard + handleAuthError to each file
- [x] Added await requireXxx() at top of each handler's try block
- [x] Added handleAuthError(error) check in each catch block
- [x] Routes with no try/catch (guide, khcn GET, xlsx-samples GET) wrapped in try/catch
- [x] withRateLimit-wrapped handlers: guard inserted inside inner async function
- [x] Build verified: `npx next build` — compiled successfully, no TypeScript errors

### Tests Status
- Type check: pass (tsc runs as part of next build — no errors reported)
- Build: pass (Compiled successfully in 26.7s)
- Unit tests: not run (no test suite configured for these routes)

### Notes
- Linter (Prettier/ESLint) auto-reformatted some files during editing (docx-process, ocr-process, reverse routes) — linter changes were intentional and preserved
- guide, khcn GET, xlsx-samples GET had no existing try/catch so full wrapper was added
- Original task listed 33 routes but the numbered list had 31 items (1-31); all 31 were processed
