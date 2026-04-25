---
phase: 2
title: "KHDN Mapping Hooks Split"
status: complete
effort: 2h
---

# Phase 2: KHDN Mapping Hooks Split

## File Ownership

All files under: `src/app/report/khdn/mapping/hooks/*.ts`

## Files to Split

### 1. useMappingPageLogic.ts (462 lines) — CONDITIONAL (Red Team #10)

Already imports 12 sub-hooks. Adding more indirection may hurt readability.

**Decision rule:** After Phase 0AB reduces service sizes, re-check useMappingPageLogic LOC. If <300L → skip split. If >300L → proceed with split below.

**Split strategy (only if >300L):**
- `use-mapping-modal-state.ts` — modal open/close state + handlers (~80 lines)
- `use-mapping-toolbar-handlers.ts` — toolbar action handlers (~120 lines)
- `use-mapping-page-logic.ts` — main composition hook (~200 lines)

### 2. useFieldTemplates.ts (420 lines)

**Split strategy:**
- `use-field-template-crud.ts` — create/update/delete template operations (~150 lines)
- `use-field-template-sync.ts` — load, refresh, sync with server (~100 lines)
- `use-field-templates.ts` — main hook composing crud + sync (~170 lines)

### 3. useMappingApi.ts (351 lines)

**Split strategy:**
- `use-mapping-api-mutations.ts` — save, publish, import mutations (~150 lines)
- `use-mapping-api.ts` — queries + main hook (~200 lines)

### 4. useGroupManagement.ts (321 lines)

**Split strategy:**
- `use-group-management-actions.ts` — merge, split, reorder actions (~120 lines)
- `use-group-management.ts` — main hook (~200 lines)

### 5. useFieldGroupActions.ts (320 lines)

**Split strategy:**
- `use-field-group-bulk-actions.ts` — bulk move, bulk delete (~120 lines)
- `use-field-group-actions.ts` — main hook (~200 lines)

### 6. useTemplateActions.ts (319 lines)

**Split strategy:**
- `use-template-docx-actions.ts` — docx upload, download, preview (~120 lines)
- `use-template-actions.ts` — main hook (~200 lines)

### 7. useAiOcrActions.ts (292 lines)

**Split strategy:**
- `use-ai-ocr-handlers.ts` — OCR process + result handlers (~100 lines)
- `use-ai-ocr-actions.ts` — main hook (~192 lines)

### 8. useMappingComputed.ts (200 lines)

At boundary. Leave as-is unless split creates cleaner separation.

## Import Update Checklist

- useMappingPageLogic is imported by `mapping/page.tsx` (Phase 5 owns page, but Phase 2 owns the hook file — no conflict since we only update hook internals + hook's own imports)
- All sub-hooks only imported within hooks/ directory — no external consumers

## Compile Verification

```bash
npx tsc --noEmit
```

## Todo

- [x] Split useMappingPageLogic (462 → 3 files)
- [x] Split useFieldTemplates (420 → 3 files)
- [x] Split useMappingApi (351 → 2 files)
- [x] Split useGroupManagement (321 → 2 files)
- [x] Split useFieldGroupActions (320 → 2 files)
- [x] Split useTemplateActions (319 → 2 files)
- [x] Split useAiOcrActions (292 → 2 files)
- [x] Verify compile: `npx tsc --noEmit`
