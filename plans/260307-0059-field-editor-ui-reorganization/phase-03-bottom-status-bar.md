# Phase 2: Add Bottom Status Bar

**Priority:** Medium | **Effort:** Low | **Status:** Done

## Overview

Create a sticky bottom bar for secondary status info and undo, following Figma's bottom bar pattern.

## Current State

- Undo button sits in header (MappingHeader.tsx) - takes prime real estate
- OCR status (log count, pending count) crammed into toolbar
- No persistent status indicator for mapping progress

## Target State

Slim sticky bottom bar with:
- Left: Undo button + history count
- Center: OCR status (pending count badge, log count)
- Right: Mapping status (e.g. "42 fields mapped" or validation indicator)

## Implementation Steps

### Step 1: Create MappingStatusBar component

**File:** `src/app/report/mapping/components/MappingStatusBar.tsx` (~60 lines)

Props:
- `undoLastAction: () => void`
- `undoHistoryLength: number`
- `pendingOcrCount: number`
- `ocrLogCount: number`
- `onOpenOcrReview: () => void`
- `fieldCount: number`
- `mappedFieldCount: number`

Layout:
```
[Undo (0/5)]  |  [OCR: N pending] [Logs: M]  |  [42/56 fields mapped]
```

Style: Sticky bottom, thin (h-10), border-t, bg-white/80 backdrop-blur, z-10

### Step 2: Remove undo from MappingHeader

Remove `undoLastAction` and `undoHistoryLength` props from MappingHeader.
Remove undo button JSX.

### Step 3: Remove OCR status from toolbar

Remove OCR badge/status from MappingVisualToolbar sidebar slot (already done in Phase 1).

### Step 4: Wire in page.tsx

Add MappingStatusBar below canvas, pass props from stores.

## Files to Create

- `src/app/report/mapping/components/MappingStatusBar.tsx`

## Files to Modify

- `src/app/report/mapping/components/MappingHeader.tsx` - remove undo
- `src/app/report/mapping/page.tsx` - add status bar, rewire undo props

### Step 5: Add Ctrl+Z keyboard shortcut

In page.tsx or MappingStatusBar, add:
```ts
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undoLastAction();
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [undoLastAction]);
```

## Success Criteria

- [x] Bottom bar shows undo, OCR status, field count
- [x] Header is cleaner (only title + save)
- [x] All undo functionality preserved
- [x] Ctrl+Z / Cmd+Z triggers undo
