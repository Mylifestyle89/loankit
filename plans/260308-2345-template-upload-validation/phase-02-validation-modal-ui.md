# Phase 2: Validation Report Modal + UI Integration

## Context

- [Phase 1: API endpoint](./phase-01-validate-upload-api.md)
- [template-folder-browser.tsx](../../src/app/report/template/_components/template-folder-browser.tsx)
- [template-file-actions.tsx](../../src/app/report/template/_components/template-file-actions.tsx)
- [page.tsx](../../src/app/report/template/page.tsx)
- [use-field-injection.ts](../../src/app/report/template/_components/use-field-injection.ts)

## Overview

- **Priority:** High
- **Status:** Pending
- **Effort:** 2h
- Create ValidationReportModal component + "Upload & Validate" button in folder browser. Two-step flow: validate → show report → confirm save.

## Key Insights

- Folder browser tab already has `TemplateFolderBrowser` with per-file `TemplateFileActions` (download/upload/editor)
- Current upload in `TemplateFileActions` saves directly with `window.confirm()` — keep as quick-upload for known-good files
- New "Upload & Validate" = top-level button in folder browser, separate from per-file actions
- `useFieldInjection` hook provides `fieldTemplates`, `selectedFieldTemplateId`, `fieldCatalog` — pass to validation flow
- Validation report modal shows color-coded results, user decides to save or cancel

## Requirements

### Functional
- "Upload & Validate" button in folder browser section header
- File picker → select .docx → POST to validate-upload API
- Show validation report modal with 3 sections:
  - Green: valid placeholders (matched)
  - Yellow/amber: unknown placeholders (with suggestions)
  - Blue/gray: missing catalog fields (not in template)
- Summary stats: X valid, Y unknown, Z missing out of N total
- "Save to folder" button (choose destination path) or "Cancel"
- Save uses existing save-docx PUT endpoint

### Non-Functional
- Modal responsive on desktop (min 600px width)
- Loading spinner during validation
- Accessible: proper ARIA labels, keyboard navigation

## Architecture

### Component Tree

```
TemplateFolderBrowser (modified)
  └─ Header: + "Upload & Validate" button

page.tsx (modified)
  └─ <TemplateValidationFlow> (new wrapper)
       ├─ handles file selection + API call
       └─ <ValidationReportModal> (new)
            ├─ Summary stats bar
            ├─ Tabs/sections: Valid | Unknown | Missing
            ├─ Each unknown row: placeholder + suggestion chips
            └─ Footer: "Save to report_assets/" + "Cancel"
```

### State Flow

```
1. User clicks "Upload & Validate"
2. File picker opens → select .docx
3. Set loading=true
4. POST FormData { file, field_template_id } → /api/report/template/validate-upload
5. Receive ValidationReport
6. Set loading=false, show modal with report
7. User reviews:
   a. "Save" → PUT to save-docx with file buffer + chosen path → refresh folder
   b. "Cancel" → close modal
```

## Related Code Files

### Create
- `src/app/report/template/_components/template-validation-report-modal.tsx` — Modal showing validation results (~150 lines)
- `src/app/report/template/_components/use-template-upload-validation.ts` — Hook managing upload+validate flow (~80 lines)

### Modify
- `src/app/report/template/page.tsx` — Add validation flow to folder tab
- `src/app/report/template/_components/template-folder-browser.tsx` — Add "Upload & Validate" button in header

## Implementation Steps

### Step 1: Create `use-template-upload-validation.ts` hook

```typescript
// Manages: file selection, API call, validation report state, save flow
// [RT-5] Use useRef for file buffer to avoid memory leak on re-renders
export function useTemplateUploadValidation(fieldTemplateId: string) {
  const [validating, setValidating] = useState(false);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const fileBufferRef = useRef<ArrayBuffer | null>(null); // [RT-5] ref not state
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  // [RT-5] Clear buffer on unmount
  useEffect(() => () => { fileBufferRef.current = null; }, []);

  async function validateFile(file: File) { /* POST FormData to API, store buffer in ref */ }
  async function saveFile(savePath: string) { /* PUT to save-docx using fileBufferRef.current */ }
  function reset() { fileBufferRef.current = null; /* clear all state */ }

  return { validating, report, fileName, error, validateFile, saveFile, reset };
}
```

### Step 2: Create `template-validation-report-modal.tsx`

Layout:
- Header: "Validation Report" + file name
- Stats bar: `X valid · Y unknown · Z missing / N total placeholders`
- 3 collapsible sections:
  - **Valid** (green): table with placeholder, field_key, label_vi
  - **Unknown** (amber): table with placeholder, suggestion chips (clickable to copy)
  - **Missing** (blue): table with field_key, label_vi, group
- Footer: save path input (default: `report_assets/{fileName}`) + "Save" button + "Cancel"
- If 0 unknown → show "All placeholders valid!" success banner

### Step 3: Modify `template-folder-browser.tsx`

- Add optional `onUploadValidate?: () => void` prop
- Add "Upload & Validate" button next to "Làm mới" in header
- Style: violet gradient like the "Mở trình chỉnh sửa" button

### Step 4: Integrate in `page.tsx`

- Import `useTemplateUploadValidation` hook
- In folder tab section:
  - Pass `onUploadValidate` callback to `TemplateFolderBrowser`
  - Render `<TemplateValidationReportModal>` when report exists
  - On save success: refresh folder browser + show success message

### Step 5: Wire save flow

- "Save" in modal → construct save path: `report_assets/{user-chosen-subfolder}/{fileName}`
- PUT to `/api/report/template/save-docx?path={savePath}` with stored buffer
- On success: close modal, refresh folder, show toast
- On error: show error in modal

## Todo List

- [ ] Create `use-template-upload-validation.ts` hook
- [ ] Create `template-validation-report-modal.tsx` component
- [ ] Add "Upload & Validate" button to `template-folder-browser.tsx`
- [ ] Integrate validation flow in `page.tsx` folder tab
- [ ] Wire save flow (modal → save-docx → refresh)
- [ ] Add loading states and error handling
- [ ] Test with valid template (all green)
- [ ] Test with typo-laden template (unknown + suggestions)
- [ ] Test with empty template (all missing)

## Success Criteria

- Upload → validate → report modal shows in < 3 seconds
- Valid/unknown/missing categories correctly displayed
- Suggestions shown for unknown placeholders
- Save works and folder browser refreshes
- Cancel closes modal cleanly
- Error states handled (API failure, invalid file)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large validation report overwhelms modal | Low | Collapsible sections, scrollable lists, max-height |
| User wants to save to specific subfolder | Medium | Default path with editable input, dropdown of existing folders |
| File buffer lost after modal close | Low | Store in hook state, clear on reset |

## Security

- File buffer held in memory only during modal lifetime
- Save path validated by existing save-docx endpoint (path traversal prevention)
- No sensitive data exposed in validation report
