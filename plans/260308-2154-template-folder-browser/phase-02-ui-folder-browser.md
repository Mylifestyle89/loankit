# Phase 2: UI - Folder Browser Component + Page Integration

## Context
- Plan: [plan.md](./plan.md)
- Depends on: [Phase 1](./phase-01-api-folder-files.md)
- Related: `src/app/report/template/page.tsx` (507 lines, needs modularization)

## Overview
- **Priority**: P1
- **Status**: pending
- **Description**: Create folder tree browser component, integrate into template page, wire up editor opening with selected file path

## Key Insights
- Page is 507 lines — must extract components to stay under 200 lines per file
- Existing editor logic (openEditor, openOnlyoffice) uses `docxPath` from selected template profile
- For folder files, we need to override `docxPath` with the selected file's relative path
- Save API already accepts any relPath — no changes needed
- OnlyOffice modal needs `docxPath` prop; Eigenpal modal needs `documentBuffer` + `docxPath`

## Architecture

### Component Structure
```
src/app/report/template/
├── page.tsx                              # Main page (simplified, ~120 lines)
├── _components/
│   ├── template-profile-editor.tsx       # Extracted: profile dropdown + editor buttons + field toolbar
│   └── template-folder-browser.tsx       # NEW: folder tree + file selection + editor trigger
```

### State Flow
```
page.tsx
  ├── Tab/Section: "Mau da cau hinh" → <TemplateProfileEditor />
  └── Tab/Section: "Duyet folder mau" → <TemplateFolderBrowser />

TemplateFolderBrowser:
  1. Fetch /api/report/template/folder-files on mount
  2. Display collapsible folder tree with DOCX file list
  3. Click file → set as active editing target (folderFilePath state)
  4. "Mo editor" button → open editor with selected file
  5. OnlyOffice: pass folderFilePath as docxPath
  6. Eigenpal: fetch file via getSignedFileUrl(folderFilePath), then open modal
  7. Save: PUT /api/report/template/save-docx?path={folderFilePath}
```

## Related Code Files

### Create
- `src/app/report/template/_components/template-folder-browser.tsx` — folder browser component
- `src/app/report/template/_components/template-profile-editor.tsx` — extracted from page.tsx

### Modify
- `src/app/report/template/page.tsx` — simplify: import components, add tab/section switching

## Implementation Steps

### Step 1: Extract TemplateProfileEditor component
Extract from `page.tsx` lines ~319-478 (template editor section) into `template-profile-editor.tsx`:
- Props: `templates`, `activeTemplateId`, `onTemplateChange`, `fieldTemplates`, `selectedFieldTemplateId`, `onFieldTemplateChange`, `editorType`, `onlyofficeAvailable`, `onEditorTypeChange`, `onOpenEditor`, `onOpenDocx`, `openingEditor`, `onOpenLocalFile`, `localDocxInputRef`
- Move field injection toolbar (group/field selects, inject button) into this component
- Keep editor modals in page.tsx (they're shared between both sections)

**Simplification**: Instead of many individual props, pass a context object or use the existing state from page.

### Step 2: Create TemplateFolderBrowser component
```typescript
// Props:
type TemplateFolderBrowserProps = {
  editorType: "onlyoffice" | "eigenpal";
  onlyofficeAvailable: boolean;
  fieldCatalog: FieldCatalogItem[];
  onOpenOnlyoffice: (docxPath: string) => void;
  onOpenEigenpal: (docxPath: string, buffer: ArrayBuffer) => void;
}

// Internal state:
// - tree: FolderNode[] (from API)
// - loading: boolean
// - expandedFolders: Set<string>
// - selectedFilePath: string | null
// - openingFile: boolean

// UI layout:
// - Left panel (or collapsible section): folder tree with expand/collapse
// - Clicking a folder expands it, shows files
// - Clicking a file selects it (highlighted)
// - Action bar: "Mo editor" button, file info (size, modified date)
// - File count badge per folder
```

### Step 3: Folder tree UI design
```
┌─────────────────────────────────────────────────┐
│ Duyet mau tu folder                    [Refresh] │
├─────────────────────────────────────────────────┤
│ ▼ report_assets/ (5 files)                       │
│   📄 2268.02A.PN BC de xuat...docx    [Mo editor]│
│   📄 2268_no_prefix_placeholders.docx [Mo editor]│
│   📄 Template.docx                    [Mo editor]│
│   ...                                            │
│ ▶ Disbursement templates/ (3 files)              │
│ ▶ Bo ho so vay von doanh nghiep/ (12 files)      │
│   ▶ Ho so phap ly/ (4 files)                     │
│   ▶ Ho so tai san/ (3 files)                     │
└─────────────────────────────────────────────────┘
```

- Each file row: name (truncated), size (KB/MB), "Mo editor" button
- Folder rows: expand/collapse toggle, name, file count
- Compact design, scrollable container with max-height

### Step 4: Wire editor opening
For folder file editing, reuse existing patterns:

**OnlyOffice path**:
```typescript
// OnlyOffice modal accepts docxPath and loads file via signed URL internally
onOpenOnlyoffice(selectedFilePath);
```

**Eigenpal path**:
```typescript
const signedUrl = await getSignedFileUrl(selectedFilePath, true);
const res = await fetch(signedUrl);
const buffer = await res.arrayBuffer();
onOpenEigenpal(selectedFilePath, buffer);
```

**Save path** (in page.tsx saveEditorDocx):
```typescript
// Current: saves to docxPath (from template profile)
// Change: accept explicit savePath parameter, default to docxPath
// When editing folder file: pass folderFilePath as savePath
```

### Step 5: Integrate into page.tsx
- Add state: `folderBrowserMode: boolean` or use a tab (SegmentedControl)
- Two sections: "Mau da cau hinh" (existing) | "Duyet folder mau" (new)
- Editor modals remain at page level, shared between both modes
- When opening from folder browser, set `editorSource` to "folder" with the path

### Step 6: Modify saveEditorDocx
Current `saveEditorDocx` saves to `docxPath` (from template profile). Need to support saving to folder file path:
```typescript
// Add state: activeSavePath: string (set when opening editor)
// saveEditorDocx checks activeSavePath first, falls back to docxPath
```

## Todo List
- [ ] Create `_components/` directory
- [ ] Extract `template-profile-editor.tsx` from page.tsx
- [ ] Create `template-folder-browser.tsx`
- [ ] Update `page.tsx` — import components, add section switching
- [ ] Wire OnlyOffice opening with folder file path
- [ ] Wire Eigenpal opening with folder file path
- [ ] Update save logic to use activeSavePath
- [ ] Verify editor open/save flow works for folder files
- [ ] Check file size: each component < 200 lines

## Success Criteria
- User can browse all DOCX files in report_assets folder tree
- User can open any DOCX in OnlyOffice or Eigenpal editor
- Edits are saved back to the original file path
- Existing template profile workflow still works unchanged
- Each file < 200 lines of code

## Risk Assessment
- **Medium**: Page refactoring could break existing editor flow → mitigated by keeping modals at page level, testing both paths
- **Low**: Large number of files making UI slow → mitigated by collapsible folders, lazy rendering
- **Low**: OnlyOffice modal may have assumptions about docxPath format → verify it works with subfolder paths like `Disbursement templates/2268.09...docx`

## Security Considerations
- File paths from API are relative to report_assets/ — no path traversal risk
- Read-only browsing; writes go through existing save-docx API with its own validation
