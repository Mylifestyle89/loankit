# Phase 1: Slim Down Toolbar

**Priority:** High | **Effort:** Medium | **Status:** Pending

## Overview

Reduce MappingVisualToolbar from 7+ elements to 4-5. Move secondary actions (OCR, Financial Analysis, Backup) to sidebar.

## Current State (MappingVisualToolbar.tsx)

7 elements crammed in one bar:
1. Search input
2. "Chua mapping" checkbox
3. "+ Them truong du lieu" button (gradient)
4. "Phan tich TC" button (emerald)
5. "Backup" button (slate)
6. OCR Drop Zone (drag/drop + file picker)
7. OCR badge/status (right side)

## Target State

4 elements in toolbar:
1. Search input (keep)
2. "Chua mapping" checkbox (keep)
3. "Tech keys" toggle (move FROM sidebar TO toolbar - it's a view control)
4. "+ Them truong du lieu" button (keep, primary action)
5. Sidebar toggle button (icon-only, replaces FAB)

## Implementation Steps

### Step 1: Remove secondary actions from toolbar props

**File:** `src/app/report/mapping/components/MappingVisualToolbar.tsx`

Remove these props:
- `onOpenFinancialAnalysis`
- `onOpenSnapshotRestore`
- `ocrProcessing`
- `onOcrFileSelected`
- `sidebar` (OCR badge/status)

Add new props:
- `showTechnicalKeys: boolean`
- `setShowTechnicalKeys: (v: boolean) => void`
- `onToggleSidebar: () => void`
- `isSidebarOpen: boolean`

### Step 2: Simplify toolbar JSX

Remove:
- Financial analysis button
- Backup button
- OCR drop zone
- OCR badge sidebar slot

Add:
- Technical keys checkbox (moved from sidebar)
- Sidebar toggle button (PanelRightOpen/Close icon)

### Step 3: Update parent (page.tsx or MappingCanvas.tsx)

- Remove props for moved actions
- Add new props for sidebar toggle
- Wire `showTechnicalKeys` from store

### Step 4: Remove FAB button from MappingSidebar

The floating action button (FAB) at bottom-right is replaced by toolbar toggle.
Remove the FAB button + hint tooltip from MappingSidebar.tsx.

## Files to Modify

- `src/app/report/mapping/components/MappingVisualToolbar.tsx` - slim down
- `src/app/report/mapping/components/MappingSidebar.tsx` - remove FAB
- `src/app/report/mapping/components/MappingCanvas.tsx` or `page.tsx` - update props

## Success Criteria

- [ ] Toolbar has max 5 elements
- [ ] No FAB button on screen
- [ ] Sidebar opens via toolbar toggle
- [ ] Tech keys toggle in toolbar
- [ ] All removed actions still accessible via sidebar
