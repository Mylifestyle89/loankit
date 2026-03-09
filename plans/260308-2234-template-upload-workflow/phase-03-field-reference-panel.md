# Phase 03: Field Reference Panel

## Context
- [use-field-injection.ts](../../src/app/report/template/_components/use-field-injection.ts) (122 lines)
- [field-injection-toolbar.tsx](../../src/app/report/template/_components/field-injection-toolbar.tsx) (69 lines)
- [page.tsx](../../src/app/report/template/page.tsx) (221 lines)
- Depends on: Phase 02 (folder browser redesign)

## Overview
- **Priority:** P2
- **Status:** pending
- **Effort:** 1h

Create a standalone **Field Reference Panel** that shows all available `[field_key]` placeholders in a searchable, copyable table. Displayed alongside folder browser (not inside editor modal). User copies field keys and pastes into Word.

## Key Insights
- Current `FieldInjectionToolbar` uses 3 cascading dropdowns -- functional but not great for browsing all fields
- A table/list view with search is more useful when working outside the editor
- `useFieldInjection` hook already does all data loading + grouping -- reuse it
- Clipboard copy of `[field_key]` is the core action -- make it one-click per row

## Requirements

### Functional
1. Show all fields from selected field template in a grouped table
2. Each row: field_key (as `[field_key]`), label_vi, group, one-click copy button
3. Search/filter by field_key or label_vi
4. Collapsible groups
5. Field template selector at top (reuse existing dropdown)
6. Copy feedback: brief "Da sao chep!" toast

### Non-Functional
- Under 200 lines
- Reuse `useFieldInjection` hook data
- Vietnamese UI labels
- Works independently of editor -- always visible in folder tab

## Architecture

### Component Placement
```
TemplatePage
  -> Tab "Duyet folder mau"
    -> TemplateFolderBrowser (with download/upload)
    -> FieldReferencePanel (NEW) -- below folder browser
```

### Data Flow
```
useFieldInjection hook (existing)
  -> fieldTemplates, fieldsByGroup, groups, injectField
  -> FieldReferencePanel receives these as props
```

## Related Code Files

### Create
- `src/app/report/template/_components/field-reference-panel.tsx` (~120 lines)
  - Grouped table of all fields with copy buttons
  - Search input to filter fields
  - Collapsible group sections

### Modify
- `src/app/report/template/page.tsx`
  - Add `<FieldReferencePanel>` below `<TemplateFolderBrowser>` in folder tab
  - Pass field injection data from `useFieldInjection` hook

### No Changes
- `use-field-injection.ts` -- reuse as-is
- `field-injection-toolbar.tsx` -- keep for configured templates tab

## Implementation Steps

### 1. Create `field-reference-panel.tsx`

```typescript
type Props = {
  fieldTemplates: FieldTemplateItem[];
  selectedFieldTemplateId: string;
  onFieldTemplateChange: (id: string) => void;
  fieldsByGroup: Record<string, FieldCatalogItem[]>;
  groups: string[];
  onCopyField: (fieldKey: string) => void;
  copyFeedback: string | null;
};

export function FieldReferencePanel(props: Props) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Filter fields by search term across all groups
  // Render: template selector, search input, grouped field rows
  // Each row: [field_key] | label_vi | copy button
}
```

Structure:
- Top bar: field template dropdown + search input
- Body: grouped sections, each collapsible
- Each field row: `[field_key]` in monospace, label_vi, click-to-copy button
- Copy button calls `onCopyField(field_key)` which uses `injectField()` from hook

### 2. Update `page.tsx` folder tab section

```tsx
{activeTab === "folder" && (
  <>
    <TemplateFolderBrowser
      onOpenEditor={handleOpenEditor}
      editorAvailable={true}
    />
    <FieldReferencePanel
      fieldTemplates={fi.fieldTemplates}
      selectedFieldTemplateId={fi.selectedFieldTemplateId}
      onFieldTemplateChange={fi.setSelectedFieldTemplateId}
      fieldsByGroup={fi.fieldsByGroup}
      groups={fi.groups}
      onCopyField={fi.injectField}
      copyFeedback={fi.copyFeedback}
    />
  </>
)}
```

## UI Design

```
+--------------------------------------------------+
| Bang tham chieu Field                             |
| [Template dropdown v]  [Tim kiem field...      ]  |
+--------------------------------------------------+
| > Thong tin co ban                          (12)  |
|   [ho_ten]          Ho va ten          [Copy]     |
|   [ngay_sinh]       Ngay sinh          [Copy]     |
|   [cmnd]            So CMND/CCCD       [Copy]     |
|                                                   |
| > Thong tin vay von                         (8)   |
|   [so_tien_vay]     So tien vay        [Copy]     |
|   [lai_suat]        Lai suat           [Copy]     |
|   ...                                             |
+--------------------------------------------------+
```

## Todo List
- [ ] Create `field-reference-panel.tsx`
- [ ] Implement search/filter across field_key and label_vi
- [ ] Implement collapsible group sections
- [ ] One-click copy with feedback
- [ ] Add panel to page.tsx folder tab
- [ ] Test with multiple field templates
- [ ] Test search filtering
- [ ] Verify copy-to-clipboard works

## Success Criteria
- All fields visible in grouped table format
- Search filters fields across all groups
- One-click copy puts `[field_key]` on clipboard
- Copy feedback shown briefly
- Groups collapsible
- Component under 200 lines
- Works independently of any editor modal

## Risk Assessment
- **Very Low:** Pure UI component using existing data from `useFieldInjection`
- **Low:** Clipboard API (`navigator.clipboard.writeText`) already proven in existing toolbar

## Security Considerations
- No new API calls -- uses existing field template data
- Clipboard access is same as existing toolbar
