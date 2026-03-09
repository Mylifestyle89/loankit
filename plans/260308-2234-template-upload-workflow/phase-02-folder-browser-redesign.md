# Phase 02: Folder Browser Redesign

## Context
- [template-folder-browser.tsx](../../src/app/report/template/_components/template-folder-browser.tsx) (172 lines)
- [page.tsx](../../src/app/report/template/page.tsx) (221 lines)
- [signed-file-url.ts](../../src/lib/report/signed-file-url.ts)
- Depends on: Phase 01 (validation in save-docx route)

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 1.5h

Redesign folder browser to show **Download + Upload** buttons per file instead of just "Mo editor". Keep editor button as secondary option.

## Key Insights
- Current `openFile()` in folder browser fetches buffer then opens Eigenpal/OnlyOffice -- this becomes secondary
- Download: reuse `getSignedFileUrl()` to generate signed download URL
- Upload: reuse existing `save-docx` PUT endpoint
- File row needs 3 actions: Download (primary), Upload (primary), Open Editor (secondary/optional)

## Requirements

### Functional
1. Each file row shows: **"Tai ve"** (download) + **"Tai len"** (upload) buttons
2. "Mo editor" button kept but secondary (only visible on hover, smaller)
3. Upload replaces the file at same path -- confirm before overwrite
4. After upload, refresh folder tree to show updated file size/date
5. Upload feedback: success/error toast message
6. Download triggers browser download via signed URL

### Non-Functional
- Keep folder browser under 200 lines -- extract file action buttons to separate component
- Vietnamese UI text
- Consistent styling with existing codebase (violet gradient theme)

## Architecture

### Component Structure
```
TemplateFolderBrowser (existing, modified)
  -> FolderRow (existing, modified)
    -> TemplateFileActions (NEW) -- download/upload/editor buttons per file
```

### Upload Flow (in TemplateFileActions)
```
User clicks "Tai len" on file row
  -> Hidden <input type="file" accept=".docx"> triggered
  -> Confirm dialog: "Ghi de file {name}?"
  -> Read file as ArrayBuffer
  -> PUT /api/report/template/save-docx?path=report_assets/{filePath}
  -> On success: call onRefresh() to reload tree
  -> Show success/error message
```

### Download Flow (in TemplateFileActions)
```
User clicks "Tai ve"
  -> getSignedFileUrl(`report_assets/${filePath}`, true)
  -> window.open(signedUrl) or <a download> trick
```

## Related Code Files

### Create
- `src/app/report/template/_components/template-file-actions.tsx` (~80 lines)
  - Props: `{ filePath: string; fileName: string; onRefresh: () => void; onOpenEditor?: (path: string) => void; editorAvailable: boolean }`
  - Download button, Upload button, optional Editor button
  - Upload logic with file input + confirmation
  - Loading/error states

### Modify
- `src/app/report/template/_components/template-folder-browser.tsx`
  - Remove `openFile()` function (editor-specific logic)
  - Replace inline "Mo editor" button with `<TemplateFileActions>` component
  - Add `onRefresh` callback (use existing `fetchTree`)
  - Simplify props: remove `editorType`, `onlyofficeAvailable`, `onOpenOnlyoffice`, `onOpenEigenpal`
  - Add new props: `onOpenEditor?: (docxPath: string) => void` (optional, for editor fallback)

- `src/app/report/template/page.tsx`
  - Update `<TemplateFolderBrowser>` props to match new interface
  - Pass simplified editor callback (optional)

## Implementation Steps

### 1. Create `template-file-actions.tsx`

```typescript
// New component: per-file action buttons
type Props = {
  filePath: string;      // relative path within report_assets/
  fileName: string;
  onRefresh: () => void;
  onOpenEditor?: (path: string) => void;
  editorAvailable?: boolean;
};

export function TemplateFileActions({ filePath, fileName, onRefresh, onOpenEditor, editorAvailable }: Props) {
  // State: uploading, downloading, error, fileInputRef
  // downloadFile(): getSignedFileUrl -> window.open
  // uploadFile(e): confirm -> read file -> PUT save-docx -> onRefresh()
  // Render: Download btn + Upload btn + (optional) Editor btn
}
```

Key behaviors:
- Download: `getSignedFileUrl(`report_assets/${filePath}`, true)` -> create `<a>` element with download attribute, click programmatically
- Upload: hidden `<input type="file" accept=".docx">`, on change confirm overwrite, PUT to save-docx
- Editor: optional button, calls `onOpenEditor?.(`report_assets/${filePath}`)`
- Show spinner during upload/download
- Show error inline if operation fails

### 2. Modify `template-folder-browser.tsx`

Changes:
- Remove `openFile()` function entirely
- Remove props: `editorType`, `onlyofficeAvailable`, `onOpenOnlyoffice`, `onOpenEigenpal`
- Add props: `onOpenEditor?: (docxPath: string) => void`, `editorAvailable?: boolean`
- In `FolderRow` file rendering, replace inline "Mo editor" button with `<TemplateFileActions>`
- Pass `fetchTree` as `onRefresh` to TemplateFileActions
- Remove `openingFile` state (no longer needed -- actions handle their own state)

New Props type:
```typescript
type Props = {
  onOpenEditor?: (docxPath: string) => void;
  editorAvailable?: boolean;
};
```

### 3. Update `page.tsx`

- Simplify TemplateFolderBrowser usage:
```tsx
<TemplateFolderBrowser
  onOpenEditor={editorAvailable ? handleOpenEditor : undefined}
  editorAvailable={onlyofficeAvailable === true || true /* eigenpal always available */}
/>
```
- Create `handleOpenEditor(docxPath)` that opens OnlyOffice or Eigenpal based on current editorType
- This keeps editor as fallback option without cluttering the folder browser

## Todo List
- [ ] Create `template-file-actions.tsx` with download/upload/editor buttons
- [ ] Add download logic using `getSignedFileUrl`
- [ ] Add upload logic using save-docx PUT endpoint
- [ ] Add confirm dialog before overwrite
- [ ] Modify `template-folder-browser.tsx` -- replace "Mo editor" with `<TemplateFileActions>`
- [ ] Simplify folder browser props
- [ ] Update `page.tsx` to pass new props
- [ ] Test download flow
- [ ] Test upload flow with overwrite confirmation
- [ ] Verify folder tree refreshes after upload

## Success Criteria
- Each file in folder browser shows Download + Upload buttons
- Download triggers browser file download
- Upload replaces file on server, folder tree refreshes
- Confirm dialog before overwrite
- Editor button still available as secondary option
- All components under 200 lines

## Risk Assessment
- **Low:** Download via signed URLs already proven to work
- **Low:** Upload via save-docx already proven to work
- **Medium:** Confirm dialog UX -- use `window.confirm()` for simplicity (KISS)

## Security Considerations
- Upload goes through save-docx route which will have path traversal + type validation (Phase 01)
- Download uses existing HMAC-signed URLs
- No new auth surface
