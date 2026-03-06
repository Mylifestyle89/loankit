---
phase: 3
status: complete
priority: high
effort: M
completed: 2026-03-07
---

# Phase 3: Template Picker Modal

## Overview
Extract template picker tu sidebar-context-section thanh standalone modal. Cho phep chon/tao/sua mau du lieu.

## Context Links
- Sidebar context: `src/app/report/mapping/components/sidebar/sidebar-context-section.tsx` (186 lines)
- Template picker dropdown: `src/app/report/mapping/components/sidebar/sidebar-template-picker-dropdown.tsx`
- Store: `src/app/report/mapping/stores/use-field-template-store.ts`
- Template actions hook: `src/app/report/mapping/hooks/useTemplateActions.ts`

## Related Code Files

### Create
- `src/app/report/mapping/components/Modals/TemplatePickerModal.tsx`

### Modify
- `src/app/report/mapping/page.tsx` — wire modal

## Requirements

### TemplatePickerModal (~170 lines)

Props:
```tsx
type TemplatePickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
  onCreateNew: () => void;          // mo CreateMasterTemplateModal
  onEditTemplate: () => void;       // mo EditFieldTemplatePicker
  onAttachTemplate: () => void;     // assign template to KH
};
```

UI Layout:
```
+------------------------------------------+
| Chon mau du lieu                     [X] |
+------------------------------------------+
| [Search...]                              |
| --- Mau cua khach hang ---               |
| | Template A (assigned)   [v]          | |
| | Template B              [ ]          | |
| --- Mau chung ---                        |
| | Master Template 1       [ ]          | |
| | Master Template 2       [ ]          | |
+------------------------------------------+
| [Tao mau moi] [Ap dung mau] [Chinh sua] |
+------------------------------------------+
```

Behavior:
1. Doc tu useFieldTemplateStore: fieldTemplates (customer), allFieldTemplates (master)
2. Search filter
3. Click row -> onSelect(templateId) + onClose
4. Action buttons: Tao moi, Ap dung, Chinh sua ten
5. Hien thi selected template voi highlight

### page.tsx Wiring
```tsx
const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

// Toolbar:
onOpenTemplatePicker={() => setTemplatePickerOpen(true)}

// Modal:
<TemplatePickerModal
  isOpen={templatePickerOpen}
  onClose={() => setTemplatePickerOpen(false)}
  onSelect={(id) => { applySelectedFieldTemplate(id); setTemplatePickerOpen(false); }}
  onCreateNew={() => { setTemplatePickerOpen(false); openCreateMasterTemplateModal(); }}
  onEditTemplate={() => { setTemplatePickerOpen(false); openEditFieldTemplatePicker(); }}
  onAttachTemplate={() => { setTemplatePickerOpen(false); assignSelectedFieldTemplate(); }}
/>
```

## Implementation Steps

1. Tao TemplatePickerModal.tsx:
   - Reuse logic tu sidebar-context-section (search, filter, select)
   - Portal + AnimatePresence
   - 2 sections: Customer templates + Master templates
   - Action buttons phia duoi
2. Wire vao page.tsx

## Todo
- [x] Create TemplatePickerModal.tsx
- [x] Wire into page.tsx
- [x] Test: chon template
- [x] Test: action buttons (tao/ap dung/chinh sua)
- [x] Compile check

## Success Criteria
- Modal hien thi 2 section (customer + master)
- Search filter hoat dong
- Select template -> apply + close
- 3 action buttons hoat dong dung
- Dark mode
