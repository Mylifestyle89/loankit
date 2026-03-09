# Phase 3: Header Cleanup

**Priority:** Low | **Effort:** Low | **Status:** Done

## Overview

Simplify MappingHeader to show only essential info: title, context breadcrumb, and primary action (Save).

## Current State

Header contains:
- Title "Trinh chinh field"
- Customer name + template name (context)
- Undo button (moved to bottom bar in Phase 3)
- "Danh sach ham" button
- Save Draft button (gradient)
- MappingSidebar component embedded

## Target State

Header contains:
- Left: Title + context breadcrumb (customer > template)
- Right: Function list (icon-only button) + Save Draft button

MappingSidebar component no longer embedded in header - it's now a standalone panel controlled by toolbar toggle.

## Implementation Steps

### Step 1: Remove MappingSidebar from MappingHeader

The sidebar is now opened via toolbar toggle (Phase 1).
Remove MappingSidebar component and all its props from MappingHeader.

### Step 2: Simplify MappingHeader props

Reduce to:
- `saving: boolean`
- `saveDraft: () => Promise<void>`

Context info (customer name, template name) read directly from stores.

### Step 3: Style function list button as icon-only

Change from text button "Danh sach ham" to icon-only `BookOpen` with tooltip.
Saves horizontal space.

### Step 4: Add gradient header style

Match other tabs' gradient header pattern:
```
bg-gradient-to-br from-violet-50 via-white to-fuchsia-50
dark:from-violet-950/30 dark:via-[#141414] dark:to-fuchsia-950/20
```

## Files to Modify

- `src/app/report/mapping/components/MappingHeader.tsx` - simplify
- `src/app/report/mapping/page.tsx` - move MappingSidebar to page level

## Success Criteria

- [x] Header has max 3-4 elements
- [x] MappingSidebar not embedded in header
- [x] Function list is icon-only with tooltip
- [x] Header matches gradient design system
