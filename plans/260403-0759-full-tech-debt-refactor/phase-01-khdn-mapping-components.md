---
phase: 1
title: "KHDN Mapping Components & Modals Split"
status: complete
effort: 4h
note: "Red Team #14: 15 splits in 3h unrealistic → 4h. Red Team #2: FinancialAnalysisModal removed (handled by 0C)"
---

# Phase 1: KHDN Mapping Components & Modals Split

## File Ownership

All files under:
- `src/app/report/khdn/mapping/components/*.tsx`
- `src/app/report/khdn/mapping/components/Modals/*.tsx`

NO other phase touches these paths.

## Files to Split

### 1. AiMappingModal.tsx (622 lines)

Already partially modularized (tabs extracted). Remaining: main shell with ~600 lines of state + handlers.

**Split strategy:**
- `ai-mapping-modal-state.ts` — all useState declarations, refs (~50 lines)
- `ai-mapping-modal-handlers.ts` — handler functions (suggest, batch, BK import callbacks) (~200 lines)
- `ai-mapping-modal-sections.tsx` — section renderer helpers (header, footer, tab bar) (~150 lines)
- `ai-mapping-modal.tsx` — main component shell, imports from above (~200 lines)

### ~~2. FinancialAnalysisModal.tsx~~ — REMOVED (Red Team #2)

**Deleted by Phase 0C** (merged into main component). Do NOT split this file.

### 3. ai-mapping-tab-bk-import.tsx (354 lines)

**Split strategy:**
- `ai-mapping-bk-import-table.tsx` — table/row rendering (~150 lines)
- `ai-mapping-tab-bk-import.tsx` — main tab component (~200 lines)

### 4. ai-mapping-tab-suggest.tsx (353 lines)

**Split strategy:**
- `ai-mapping-suggest-form.tsx` — form inputs + file upload section (~150 lines)
- `ai-mapping-tab-suggest.tsx` — main tab (~200 lines)

### 5. OcrReviewModal.tsx (341 lines)

**Split strategy:**
- `ocr-review-field-list.tsx` — field list rendering + edit rows (~150 lines)
- `ocr-review-modal.tsx` — main modal shell (~190 lines)

### 6. ai-mapping-tab-batch.tsx (320 lines)

**Split strategy:**
- `ai-mapping-batch-job-list.tsx` — job list + status cards (~120 lines)
- `ai-mapping-tab-batch.tsx` — main tab (~200 lines)

### 7. ai-suggest-review-table.tsx (279 lines)

**Split strategy:**
- `ai-suggest-review-row.tsx` — single row component (~80 lines)
- `ai-suggest-review-table.tsx` — table wrapper (~200 lines)

### 8. CustomerPickerModal.tsx (243 lines)

**Split strategy:**
- `customer-picker-list.tsx` — customer list + search (~100 lines)
- `customer-picker-modal.tsx` — modal shell (~143 lines)

### 9. DocxMergeModal.tsx (239 lines)

**Split strategy:**
- `docx-merge-preview.tsx` — preview/diff section (~100 lines)
- `docx-merge-modal.tsx` — modal shell (~139 lines)

### 10. SnapshotRestoreModal.tsx (238 lines)

**Split strategy:**
- `snapshot-restore-list.tsx` — snapshot list + comparison (~100 lines)
- `snapshot-restore-modal.tsx` — modal shell (~138 lines)

### 11. ai-mapping-tab-tagging.tsx (220 lines)

**Split strategy:**
- `ai-mapping-tagging-field-list.tsx` — field list rendering (~80 lines)
- `ai-mapping-tab-tagging.tsx` — main tab (~140 lines)

### 12. TemplatePickerModal.tsx (204 lines)

Marginal. Extract template list sub-component if clean boundary exists.

### 13. FieldRow.tsx (411 lines)

**Split strategy:**
- `field-row-controls.tsx` — inline edit controls, dropdown menus (~150 lines)
- `field-row-display.tsx` — value display, formula badge, usage indicator (~80 lines)
- `field-row.tsx` — main FieldRow component (~180 lines)

### 14. FieldCatalogBoard.tsx (395 lines)

**Split strategy:**
- `field-catalog-toolbar.tsx` — toolbar with search, filter, bulk actions (~100 lines)
- `field-catalog-group-section.tsx` — group header + collapsible section (~100 lines)
- `field-catalog-board.tsx` — main board component (~195 lines)

### 15. MappingModals.tsx (245 lines)

**Split strategy:**
- `mapping-modals-registry.tsx` — modal open/close logic registry (~80 lines)
- `mapping-modals.tsx` — main aggregator (~165 lines)

## Files Under 200 Lines (rename only in Phase 7)

MappingCanvas (185), MappingVisualSection (170), SystemLogCard (154), MappingVisualToolbar (130), MappingSidebar (122), ValidationResultPanel (94), EditingTemplateBanner (91), MappingStatusBar (86), MappingHeader (55), ModalRegistry (47), toolbar-action-button (41), AdvancedJsonPanel (30), MappingTabSwitch (26), GlobalModalProvider (18)

## Import Update Checklist

- After splitting AiMappingModal: update imports in MappingModals.tsx
- After splitting FieldRow: update imports in FieldCatalogBoard
- After splitting FieldCatalogBoard: update imports in MappingCanvas/page
- Barrel re-export from old filename for any external consumers

## Compile Verification

```bash
npx tsc --noEmit
```

## Todo

- [x] Split AiMappingModal (622 → 4 files)
- [x] ~~Split FinancialAnalysisModal/Modals~~ — handled by Phase 0C
- [x] Split ai-mapping-tab-bk-import (354 → 2 files)
- [x] Split ai-mapping-tab-suggest (353 → 2 files)
- [x] Split OcrReviewModal (341 → 2 files)
- [x] Split ai-mapping-tab-batch (320 → 2 files)
- [x] Split ai-suggest-review-table (279 → 2 files)
- [x] Split CustomerPickerModal (243 → 2 files)
- [x] Split DocxMergeModal (239 → 2 files)
- [x] Split SnapshotRestoreModal (238 → 2 files)
- [x] Split ai-mapping-tab-tagging (220 → 2 files)
- [x] Split FieldRow (411 → 3 files)
- [x] Split FieldCatalogBoard (395 → 3 files)
- [x] Split MappingModals (245 → 2 files)
- [x] Verify compile: `npx tsc --noEmit`
