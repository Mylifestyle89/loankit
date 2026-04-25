# Phase 4: Fix Cross-references + Imports

## Overview
- Priority: High
- Status: ✅ Complete
- Effort: M

## Description
Fix tất cả external imports pointing to old paths sau khi move.

## Affected Files (from Grep)

### Services importing from mapping stores/types
- `src/services/report/build-service-helpers.ts`
- `src/services/auto-process.service.ts`
- `src/services/report/template.service.ts`
- `src/services/report.service.ts`

### Lib files
- `src/lib/report/use-modal-store.ts`

### Core use-cases
- `src/core/use-cases/extraction/extraction-docx-repeater.ts`
- `src/core/use-cases/extract-fields-from-docx-report.ts`

### Template components importing from mapping
- `src/app/report/template/_components/field-coverage-panel.tsx`
- `src/app/report/template/_components/build-export-tab.tsx`

### API routes (keep at old path, update imports)
- `src/app/api/report/mapping/*` routes
- `src/app/api/report/template/*` routes
- `src/app/api/report/mapping-instances/[id]/route.ts`

## Implementation Steps

1. For each file above, update import paths:
   - `@/app/report/mapping/` → `@/app/report/khdn/mapping/`
   - `@/app/report/template/` → `@/app/report/khdn/template/`

2. Search for hardcoded route strings:
   - `"/report/mapping"` → `"/report/khdn/mapping"`
   - `"/report/template"` → `"/report/khdn/template"`
   - Check: router.push, Link href, redirect calls

3. Verify `next.config.ts` redirects (backward compat):
   - Add redirect `/report/mapping` → `/report/khdn/mapping`
   - Add redirect `/report/template` → `/report/khdn/template`

## Success Criteria
- [x] `npx tsc --noEmit` passes
- [x] No broken imports
- [x] Old URLs redirect to new ones
