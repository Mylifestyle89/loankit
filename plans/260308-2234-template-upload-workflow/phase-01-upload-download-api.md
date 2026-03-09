# Phase 01: Upload/Download API

## Context
- [save-docx route](../../src/app/api/report/template/save-docx/route.ts)
- [signed-file-url](../../src/lib/report/signed-file-url.ts)
- [template.service](../../src/services/report/template.service.ts)

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 1.5h

No new API endpoints needed. Existing infrastructure already supports both operations:
- **Download:** `getSignedFileUrl(path, true)` -> `/api/report/file?path=...&token=...` (already works)
- **Upload:** `PUT /api/report/template/save-docx?path=...` with `Content-Type: application/octet-stream` body (already works)

The main work is adding **path validation** and a small **upload helper** on the client side.

## Key Insights
- `save-docx` already accepts arbitrary `relPath` via query param -- perfect for uploading to any path in `report_assets/`
- `getSignedFileUrl()` already generates download URLs with HMAC tokens
- No multipart form needed -- existing octet-stream approach is simpler

## Requirements

### Functional
1. Upload DOCX file to specific path in `report_assets/` folder
2. Download DOCX file from `report_assets/` path
3. Path validation: prevent directory traversal (`../`, absolute paths)
4. File type validation: only accept `.docx` files
5. Size limit: reject files > 20MB

### Non-Functional
- No new API routes needed
- Reuse existing auth/token mechanisms

## Architecture

### Download Flow (already working)
```
User clicks "Tai ve"
  -> getSignedFileUrl(`report_assets/${filePath}`, true)
  -> GET /api/report/file?path=...&token=...&download=1
  -> Browser downloads file
```

### Upload Flow (reuse save-docx)
```
User selects file via <input type="file">
  -> Client reads file as ArrayBuffer
  -> PUT /api/report/template/save-docx?path=report_assets/{filePath}
  -> Server saves via reportService.saveTemplateDocx()
  -> Client refreshes folder tree
```

## Related Code Files

### Modify
- `src/app/api/report/template/save-docx/route.ts` -- add file size + type validation

### No Changes Needed
- `src/lib/report/signed-file-url.ts` -- download already works
- `src/services/report/template.service.ts` -- `saveTemplateDocx` already handles file write

## Implementation Steps

### 1. Add validation to save-docx route
In `src/app/api/report/template/save-docx/route.ts`:

```typescript
// Add at top of PUT handler:
const relPath = req.nextUrl.searchParams.get("path") ?? "";

// Path traversal check
if (relPath.includes("..") || path.isAbsolute(relPath)) {
  return NextResponse.json({ ok: false, error: "Invalid path" }, { status: 400 });
}

// File extension check
if (!relPath.toLowerCase().endsWith(".docx")) {
  return NextResponse.json({ ok: false, error: "Only .docx files allowed" }, { status: 400 });
}

// Size check (20MB)
const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
if (contentLength > 20 * 1024 * 1024) {
  return NextResponse.json({ ok: false, error: "File too large (max 20MB)" }, { status: 413 });
}
```

### 2. Create client-side upload helper
Create a small utility function (will be used in Phase 02):

```typescript
// In template-file-actions.tsx (Phase 02)
async function uploadDocx(file: File, targetPath: string): Promise<{ ok: boolean; error?: string }> {
  const buffer = await file.arrayBuffer();
  const res = await fetch(`/api/report/template/save-docx?path=${encodeURIComponent(targetPath)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: buffer,
  });
  return res.json();
}
```

## Todo List
- [ ] Add path traversal validation to save-docx route
- [ ] Add .docx extension validation
- [ ] Add file size limit (20MB)
- [ ] Test upload via existing save-docx endpoint
- [ ] Test download via getSignedFileUrl

## Success Criteria
- Upload a DOCX to `report_assets/` via save-docx endpoint works
- Download a DOCX from `report_assets/` via signed URL works
- Path traversal attempts rejected with 400
- Non-DOCX files rejected
- Files > 20MB rejected with 413

## Risk Assessment
- **Low:** save-docx route already works for saving -- just adding validation
- **Low:** download already works via signed URLs
- **Medium:** Path validation must be thorough to prevent security issues

## Security Considerations
- Path traversal prevention (reject `..`, absolute paths)
- File type validation (`.docx` extension check)
- Size limit to prevent abuse
- Existing HMAC token auth for downloads
