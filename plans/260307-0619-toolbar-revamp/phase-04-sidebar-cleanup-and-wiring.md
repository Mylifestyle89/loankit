---
phase: 4
status: complete
priority: medium
effort: M
completed: 2026-03-07
---

# Phase 4: Sidebar Cleanup + Final Wiring

## Overview
Don dep sidebar: bo cac section da move ra toolbar. Cap nhat MappingSidebar props.

## Context Links
- Sidebar: `src/app/report/mapping/components/MappingSidebar.tsx`
- Context section: `src/app/report/mapping/components/sidebar/sidebar-context-section.tsx`
- Tools section: `src/app/report/mapping/components/sidebar/sidebar-tools-section.tsx`
- Data IO section: `src/app/report/mapping/components/sidebar/sidebar-data-io-section.tsx`

## Related Code Files

### Modify
- `src/app/report/mapping/components/MappingSidebar.tsx` — simplify props
- `src/app/report/mapping/components/sidebar/sidebar-context-section.tsx` — XOA FILE (da move ra modal)
- `src/app/report/mapping/components/sidebar/sidebar-template-picker-dropdown.tsx` — XOA FILE (da move ra modal)
- `src/app/report/mapping/components/sidebar/sidebar-tools-section.tsx` — bo OCR upload + Financial analysis
- `src/app/report/mapping/page.tsx` — simplify MappingSidebar props

## Implementation Steps

### 1. Xoa sidebar-context-section.tsx + sidebar-template-picker-dropdown.tsx
- Da duoc thay the boi CustomerPickerModal + TemplatePickerModal

### 2. Don dep sidebar-tools-section.tsx
Remove:
- `onOpenFinancialAnalysis` prop + button (da o toolbar)
- `onOcrFileSelected` prop + OCR upload button + input ref (da o toolbar)
- `ocrProcessing` prop

Giu lai:
- Merge groups
- Backup / Khoi phuc
- Noi DOCX

New props:
```tsx
type SidebarToolsSectionProps = {
  openMergeGroupsModal: () => void;
  onOpenDocxMerge: () => void;
  onOpenSnapshotRestore: () => void;
  onCloseSidebar: () => void;
};
```

### 3. Simplify MappingSidebar.tsx
Remove props:
- `applySelectedFieldTemplate` (da o TemplatePickerModal)
- `openCreateFieldTemplateModal` (da o TemplatePickerModal)
- `openAttachFieldTemplateModal` (da o TemplatePickerModal)
- `openEditFieldTemplatePicker` (da o TemplatePickerModal)
- `onOcrFileSelected` (da o toolbar)
- `ocrProcessing` (da o toolbar)
- `onOpenFinancialAnalysis` (da o toolbar)

Keep props:
- `openMergeGroupsModal`
- `handleImportFieldFile`
- `onOpenSnapshotRestore`

Remove SidebarContextSection import + render.

### 4. Update page.tsx
Simplify MappingSidebar call to match new props.

## Todo
- [x] Delete sidebar-context-section.tsx
- [x] Delete sidebar-template-picker-dropdown.tsx
- [x] Cleanup sidebar-tools-section.tsx
- [x] Simplify MappingSidebar.tsx props
- [x] Update page.tsx MappingSidebar call
- [x] Compile check
- [x] Verify sidebar voi cac section con lai

## Success Criteria
- Sidebar chi hien 2 sections: Tien ich (Merge, DOCX, Backup) + Thao tac he thong (Import/Export)
- Khong con duplicate chuc nang giua toolbar va sidebar
- No TypeScript errors
- Sidebar animation van smooth
