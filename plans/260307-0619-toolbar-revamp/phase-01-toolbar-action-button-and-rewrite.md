---
phase: 1
status: complete
priority: high
effort: M
completed: 2026-03-07
---

# Phase 1: Toolbar Action Button + Rewrite MappingVisualToolbar

## Overview
Tao shared ToolbarActionButton component va rewrite MappingVisualToolbar thanh 5 icon buttons center-aligned voi 3 nhom separator. Search/filter tach row rieng.

## Context Links
- [Brainstorm report](../reports/brainstorm-260307-0609-toolbar-revamp.md)
- Current toolbar: `src/app/report/mapping/components/MappingVisualToolbar.tsx` (80 lines)
- Page: `src/app/report/mapping/page.tsx`

## Related Code Files

### Modify
- `src/app/report/mapping/components/MappingVisualToolbar.tsx` — complete rewrite
- `src/app/report/mapping/page.tsx` — update toolbar props

### Create
- `src/app/report/mapping/components/toolbar-action-button.tsx` — shared button component

## Requirements

### toolbar-action-button.tsx (~40 lines)
Shared icon button with tooltip, active state, disabled state.

```tsx
type ToolbarActionButtonProps = {
  icon: React.ReactNode;
  label: string;           // tooltip text
  onClick: () => void;
  active?: boolean;        // ring indicator khi da chon KH/mau
  disabled?: boolean;
  className?: string;
};
```

Styles:
- Base: `rounded-lg p-2.5 border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] transition-all duration-200`
- Hover: `hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400`
- Active: `bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 ring-2 ring-violet-500/30`
- Disabled: `opacity-40 cursor-not-allowed`
- Tooltip: native `title={label}`

### MappingVisualToolbar.tsx Rewrite (~100 lines)

New props:
```tsx
type MappingVisualToolbarProps = {
  // Action buttons
  onOpenCustomerPicker: () => void;
  onOpenTemplatePicker: () => void;
  onUploadDocument: () => void;
  onOpenFinancialAnalysis: () => void;
  onToggleSidebar: () => void;
  // Active states
  hasCustomer: boolean;     // selectedCustomerId !== ""
  hasTemplate: boolean;     // selectedFieldTemplateId !== ""
  sidebarOpen: boolean;
  // Search/filter (row rieng)
  t: (key: string) => string;
  hasContext: boolean;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  showUnmappedOnly: boolean;
  setShowUnmappedOnly: (v: boolean) => void;
  showTechnicalKeys: boolean;
  setShowTechnicalKeys: (v: boolean) => void;
};
```

Layout:
```
Row 1 (toolbar): center-aligned flex
  [Users][FileText] | [Upload][BarChart3] | [Settings]

Row 2 (search/filter): conditional on hasContext
  [Search input] [Chua mapping checkbox] [Technical keys checkbox]
```

Separator = `<div className="h-6 w-px bg-zinc-200 dark:bg-white/[0.08] mx-1" />`

BCTC disabled khi `!hasCustomer`. onClick voi guard:
```tsx
onOpenFinancialAnalysis  // parent se check hasCustomer va toast
```

### page.tsx Updates
- Remove: `onOpenAddFieldModal` prop
- Add: `onOpenCustomerPicker`, `onOpenTemplatePicker`, `onUploadDocument`, `onOpenFinancialAnalysis`
- Add: `hasCustomer`, `hasTemplate`
- Upload: reuse hidden input ref + `handleOcrFileSelected`
- BCTC: check `selectedCustomerId`, toast neu chua chon

## Implementation Steps

1. Tao `toolbar-action-button.tsx` voi ToolbarActionButton component
2. Rewrite `MappingVisualToolbar.tsx`:
   - 5 ToolbarActionButton trong flex center
   - 2 separator chia 3 nhom
   - Search/filter row rieng phia duoi
3. Update `page.tsx`:
   - Them state cho CustomerPickerModal (useState, Phase 2 se implement modal)
   - Them state cho TemplatePickerModal (useState, Phase 3 se implement modal)
   - Them hidden file input ref + handler cho Upload
   - Them guard logic cho BCTC (toast "Xin hay chon khach hang")
   - Pass new props to MappingVisualToolbar
   - Remove old props: `onOpenAddFieldModal`

## Todo
- [x] Create toolbar-action-button.tsx
- [x] Rewrite MappingVisualToolbar.tsx
- [x] Update page.tsx props and handlers
- [x] Verify dark mode
- [x] Compile check (npx tsc --noEmit)

## Success Criteria
- 5 icon buttons hien thi dung, center-aligned, 3 nhom
- Tooltip hien khi hover
- Active state cho KH va mau khi da chon
- BCTC disabled khi chua chon KH
- Search/filter van hoat dong o row rieng
- No TypeScript errors
