# Phase 2: Reorganize Sidebar

**Priority:** High | **Effort:** High | **Status:** Pending

## Overview

Restructure MappingSidebar (800+ lines) into logical sections following progressive disclosure pattern. Split into smaller sub-components for maintainability.

## Current State

3 accordion sections in sidebar, but content is poorly organized:
- Section 1 "Ngu canh lam viec": Customer dropdown + Template picker + 3 action buttons
- Section 2 "Cac tien ich": Tech keys checkbox + Merge groups + DOCX merge tool (28 lines of form)
- Section 3 "Thao tac he thong": Import (mode + file + name dialog) + Export (scope + template + CSV/XLSX buttons)

Problems:
- Tech keys checkbox = view toggle, not utility → move to toolbar
- DOCX merge = file utility, not field editing concern
- Import/Export mixed with unrelated actions
- 800+ lines in single component

## Target State

3 reorganized sections:
- **Section 1: "Ngu canh" (Context)** - Customer + Template (unchanged, works well)
- **Section 2: "Du lieu" (Data I/O)** - Import + Export (consolidated)
- **Section 3: "Cong cu" (Tools)** - OCR, Financial analysis, Backup, DOCX merge, Merge groups

## Implementation Steps

### Step 1: Create sub-components

Split MappingSidebar into focused modules:

```
src/app/report/mapping/components/sidebar/
  sidebar-context-section.tsx    (~100 lines) - Customer + Template picker
  sidebar-data-io-section.tsx    (~120 lines) - Import + Export
  sidebar-tools-section.tsx      (~100 lines) - OCR, Analysis, Backup, Merge
  sidebar-docx-merge-section.tsx (~80 lines)  - DOCX merge tool
```

### Step 2: Move actions from toolbar to sidebar

Add to sidebar-tools-section.tsx:
- OCR file upload (from MappingVisualToolbar)
- Financial analysis trigger (from MappingVisualToolbar)
- Backup/Restore trigger (from MappingVisualToolbar)

### Step 3: Remove Tech keys toggle from sidebar

Already moved to toolbar in Phase 1.

### Step 4: Reorganize section order

1. Context (customer + template) - always expanded by default
2. Data I/O (import/export) - collapsed by default
3. Tools (OCR, analysis, backup, merge) - collapsed by default

### Step 5: Simplify MappingSidebar.tsx

MappingSidebar becomes a thin shell (~150 lines):
- FAB removed (Phase 1)
- Sidebar panel container
- Header with collapse/close
- Renders 3 sub-components
- Import name dialog (keep here, it's a portal)

## Files to Create

- `src/app/report/mapping/components/sidebar/sidebar-context-section.tsx`
- `src/app/report/mapping/components/sidebar/sidebar-data-io-section.tsx`
- `src/app/report/mapping/components/sidebar/sidebar-tools-section.tsx`
- `src/app/report/mapping/components/sidebar/sidebar-docx-merge-section.tsx`

## Files to Modify

- `src/app/report/mapping/components/MappingSidebar.tsx` - major refactor (800 → ~150 lines)

## Success Criteria

- [ ] MappingSidebar.tsx under 200 lines
- [ ] Each sub-component under 150 lines
- [ ] OCR, Financial analysis, Backup accessible from sidebar
- [ ] Progressive disclosure: Section 1 open, 2-3 collapsed by default
- [ ] No functionality lost
