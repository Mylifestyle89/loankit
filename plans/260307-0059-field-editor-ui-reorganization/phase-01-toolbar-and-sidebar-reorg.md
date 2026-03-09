# Phase 1: Toolbar Slim + Sidebar Reorganization (Atomic)

**Priority:** High | **Effort:** High | **Status:** Done

## Why Atomic

Red team identified critical issue: removing actions from toolbar BEFORE sidebar can receive them creates broken intermediate state. This phase does both simultaneously.

## Overview

1. Slim toolbar to 5 elements (search, filter, tech keys, add field, sidebar toggle)
2. Restructure sidebar into 3 logical sections with sub-components
3. Move secondary actions (OCR, Financial Analysis, Backup) from toolbar to sidebar
4. Keep OCR drag-over fallback on canvas area
5. Add sidebar state to use-ui-store.ts

## Part A: Sidebar State Management

### Step A1: Add sidebar state to use-ui-store.ts

Add to existing UI store:
```ts
sidebarOpen: boolean;
setSidebarOpen: (open: boolean) => void;
toggleSidebar: () => void;
```

This replaces internal `useState` in MappingSidebar.tsx.

## Part B: Slim Toolbar

### Step B1: Update MappingVisualToolbar props

Remove:
- `onOpenFinancialAnalysis`
- `onOpenSnapshotRestore`
- `ocrProcessing`, `onOcrFileSelected`
- `sidebar` (OCR badge slot)

Add:
- `showTechnicalKeys: boolean`
- `setShowTechnicalKeys: (v: boolean) => void`
- `onToggleSidebar: () => void`

### Step B2: Simplify toolbar JSX

Keep: Search input, "Chua mapping" checkbox
Add: Tech keys checkbox (from sidebar), Sidebar toggle (PanelRightOpen icon)
Keep: "+ Them truong du lieu" button
Remove: Financial analysis, Backup, OCR drop zone, OCR badge

### Step B3: Add first-use tooltip on sidebar toggle

Small tooltip "Dieu phoi du lieu" on hover/first-time for discoverability (replaces FAB hint).

## Part C: Reorganize Sidebar

### Step C1: Create sidebar sub-components

```
src/app/report/mapping/components/sidebar/
  sidebar-context-section.tsx    (~100 lines)
  sidebar-data-io-section.tsx    (~120 lines)
  sidebar-tools-section.tsx      (~80 lines)
```

**Important:** Sub-components read from Zustand stores directly (useCustomerStore, useFieldTemplateStore, useUiStore). No prop drilling through shell.

### Step C2: sidebar-context-section.tsx

Contents (from current Section 1):
- Customer dropdown (reads useCustomerStore)
- Template picker with search (reads useFieldTemplateStore)
- Template action buttons (Create, Apply, Edit name)

### Step C3: sidebar-data-io-section.tsx

Contents (from current Section 3):
- Import mode selector + file picker + name dialog trigger
- Export scope selector + template selector + CSV/XLSX buttons

### Step C4: sidebar-tools-section.tsx

Contents (NEW - actions moved from toolbar + current Section 2):
- OCR file upload button (moved from toolbar)
- Financial Analysis button (moved from toolbar)
- Backup/Restore button (moved from toolbar)
- Merge Groups button (from current Section 2)
- DOCX Merge trigger button (opens DOCX merge as MODAL, not inline form)

### Step C5: Create DocxMergeModal

Extract DOCX merge form from sidebar into standalone modal:
- File: `src/app/report/mapping/components/Modals/DocxMergeModal.tsx`
- Contains: file picker, output name, page break checkbox, merge button, status
- `useReducer` state stays inside the modal
- Triggered by button in sidebar-tools-section

### Step C6: Refactor MappingSidebar.tsx shell

MappingSidebar becomes thin shell (~150 lines):
- Remove FAB button + hint tooltip
- Remove all section content (moved to sub-components)
- Keep: Panel container, header, collapse/close, animation
- Keep: Import name dialog (portal)
- Render 3 sub-components
- Read `sidebarOpen` from use-ui-store.ts

### Step C7: Keep OCR drag-over fallback

Add thin drag-over indicator on FieldCatalogBoard or canvas wrapper:
- On dragover with file: show subtle violet border + "Drop OCR/DOCX file" text
- On drop: trigger same `onOcrFileSelected` handler
- Purpose: Power users can still drag files without opening sidebar

## Part D: Wire in page.tsx

### Step D1: Update page.tsx

- Remove toolbar props for moved actions
- Add sidebar toggle wiring from use-ui-store
- Render MappingSidebar at page level (not inside MappingHeader)
- Wire OCR drag-over handler on canvas wrapper

## Files to Create

- `src/app/report/mapping/components/sidebar/sidebar-context-section.tsx`
- `src/app/report/mapping/components/sidebar/sidebar-data-io-section.tsx`
- `src/app/report/mapping/components/sidebar/sidebar-tools-section.tsx`
- `src/app/report/mapping/components/Modals/DocxMergeModal.tsx`

## Files to Modify

- `src/app/report/mapping/stores/use-ui-store.ts` - add sidebar state
- `src/app/report/mapping/components/MappingVisualToolbar.tsx` - slim down
- `src/app/report/mapping/components/MappingSidebar.tsx` - major refactor
- `src/app/report/mapping/components/MappingCanvas.tsx` or `page.tsx` - rewire
- `src/app/report/mapping/components/FieldCatalogBoard.tsx` - add drag-over fallback

## Success Criteria

- [x] Toolbar has max 5 elements
- [x] Sidebar split into 3 sub-components, each <150 lines
- [x] MappingSidebar.tsx shell <200 lines
- [x] OCR/Financial/Backup accessible from sidebar Tools section
- [x] OCR drag-over still works on canvas area
- [x] DOCX merge is now a modal
- [x] No functionality lost
- [x] Sidebar state in use-ui-store.ts
- [x] TypeScript compilation passes
