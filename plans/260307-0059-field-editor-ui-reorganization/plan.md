# Plan: Field Editor UI Reorganization

**Date:** 2026-03-07
**Branch:** Disbursement-Invoice-tracking-implement
**Status:** Draft
**Priority:** High

## Problem Statement

The "Trinh chinh field" (Field Editor) tab has a cluttered, disorganized UI:
- **Toolbar overload**: 7+ elements crammed in one bar (search, filter, add field, financial analysis, backup, OCR drop zone, OCR badge)
- **Sidebar bloat**: 800+ line component mixing 3 unrelated concerns (context selection, utilities, import/export)
- **No clear hierarchy**: Primary actions (Save, Add) compete visually with secondary (Backup, Merge DOCX)
- **Mixed concerns**: DOCX merge tool doesn't belong in field editor sidebar
- **Duplicate actions**: "Add field" appears in both toolbar and per-subgroup
- **FAB confusion**: Floating button for sidebar feels disconnected from the editor

## Design Principles (from BigTech SaaS Research)

1. **Toolbar = View controls only** (search, filter, view toggles)
2. **Right sidebar = Context & settings** (customer, template, import/export)
3. **Canvas = Primary workspace** (field editing)
4. **Progressive disclosure** (basic visible, advanced collapsed)
5. **Contextual actions** (appear where/when relevant, not always)
6. **Consistent action zones** (primary actions top-right, secondary in menus)

## Proposed Layout

```
+------------------------------------------------------------------+
| HEADER BAR                                                        |
| [Logo area]  Title + context info      [Undo] [Functions] [Save] |
+------------------------------------------------------------------+
| TOOLBAR (slim)                                                    |
| [Search...] [x Unmapped] [Tech keys]  |  [+ Add Field] [Sidebar] |
+------------------------------------------------------------------+
| CANVAS (two-panel)                      | SIDEBAR (collapsible)   |
| +--LEFT--+  +-----RIGHT-----------+    | Section 1: Context      |
| | Group  |  | Field Editor        |    |   Customer dropdown     |
| | Nav    |  |                     |    |   Template picker       |
| | chips  |  | [SubgroupHeader]    |    |   Template actions      |
| |        |  | FieldRow            |    |                         |
| |        |  | FieldRow            |    | Section 2: Data I/O     |
| |        |  | ...                 |    |   Import (CSV/XLSX)     |
| |        |  |                     |    |   Export (CSV/XLSX)     |
| +--------+  +---------------------+    |                         |
|                                         | Section 3: Tools        |
| EDITING BANNER (conditional)            |   OCR upload            |
| [Template name] [Save] [Stop] [Del]    |   Financial analysis    |
|                                         |   Backup/Restore        |
+------------------------------------------------------------------+
| BOTTOM BAR (sticky)                                               |
| Undo (0/5) | OCR: N pending | Mapping status                    |
+------------------------------------------------------------------+
```

## Key Changes Summary

| Current | Proposed | Rationale |
|---------|----------|-----------|
| 7 items in toolbar | 4 items (search, filter, toggle, add) | Reduce cognitive load |
| FAB button opens sidebar | Sidebar toggle in toolbar | Consistent placement |
| DOCX merge in sidebar | Move to "Tools" section or separate tab | Not core to field editing |
| OCR drop zone in toolbar | Move to sidebar "Tools" section | Secondary action |
| Financial analysis in toolbar | Move to sidebar "Tools" section | Secondary action |
| Backup in toolbar | Move to sidebar "Tools" section | Secondary action |
| Undo in header | Move to bottom bar | Follow Figma pattern |
| Function list in header | Keep but style as icon-only | Reduce header noise |
| Editing banner between toolbar & canvas | Keep position, simplify | Already good placement |

## Red Team Findings (Applied)

3 critical issues identified and resolved:
1. **Phase 1+2 merged**: Toolbar slim + Sidebar reorg are now atomic to avoid broken intermediate state
2. **Sidebar state → use-ui-store.ts**: `sidebarOpen: boolean` added to existing UI store
3. **OCR drag-over fallback**: Keep thin drop zone on canvas area, full OCR UI in sidebar

Other accepted changes:
- DOCX merge becomes modal (not cramped in sidebar Tools section)
- Keep 72px collapsed sidebar mode
- Add Ctrl+Z keyboard shortcut for undo
- Sub-components read from Zustand stores directly (not prop drilling)
- Keep first-use tooltip on sidebar toggle button

## Phases (Revised)

| Phase | File | Status | Effort |
|-------|------|--------|--------|
| 1 | [phase-01-toolbar-and-sidebar-reorg.md](phase-01-toolbar-and-sidebar-reorg.md) | Done | High |
| 2 | [phase-03-bottom-status-bar.md](phase-03-bottom-status-bar.md) | Done | Low |
| 3 | [phase-04-header-cleanup.md](phase-04-header-cleanup.md) | Done | Low |
| 4 | [phase-05-polish-consistency.md](phase-05-polish-consistency.md) | Done | Medium |

Note: Original Phase 1 + Phase 2 merged into single atomic Phase 1.

## Reports

- [BigTech SaaS Field Editor UX Research](../reports/researcher-260307-0059-bigtech-saas-field-editor-ux.md)
- [Current Layout Scout Report](../reports/scout-260307-0059-field-editor-current-layout.md)
- [Red Team Review](../reports/red-team-260307-0059-field-editor-ui-plan.md)

## Risk Assessment

- **Medium risk**: Sidebar restructure touches 800+ line component → split into smaller modules
- **Mitigated**: Phase 1 is atomic (toolbar+sidebar together), no broken intermediate states
- **Low risk**: Toolbar slimming is mostly moving props/buttons
- **Mitigation**: Sub-components read from stores directly, OCR drag-over fallback preserved

## Success Criteria

- [ ] Toolbar has max 4-5 elements
- [ ] Sidebar organized into logical sections with progressive disclosure
- [ ] No duplicate actions between toolbar and sidebar
- [ ] Primary actions visually distinguished from secondary
- [ ] All existing functionality preserved
- [ ] TypeScript compilation passes
- [ ] Consistent with violet/fuchsia design system
