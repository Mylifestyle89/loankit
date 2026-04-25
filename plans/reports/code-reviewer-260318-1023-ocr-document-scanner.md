# Code Review: OCR Document Scanner Feature

**Date:** 2026-03-18 | **Reviewer:** code-reviewer | **Focus:** Security, Error Handling, Code Quality

## Scope
- `src/services/ocr-document-prompts.ts` (87 LOC, new)
- `src/services/ocr.service.ts` (extractDocumentFields method, ~48 LOC added)
- `src/app/api/ocr/extract-document/route.ts` (47 LOC, new)
- `src/app/report/customers/[id]/components/document-scanner-dialog.tsx` (161 LOC, new)
- `src/app/report/customers/[id]/page.tsx` (532 LOC, modified)
- `src/app/report/customers/[id]/components/customer-collateral-section.tsx` (116 LOC, modified)

## Overall Assessment

Solid implementation. Clean separation of concerns (prompts, service, API, UI). Good auth guard on API. A few security and robustness issues below.

## Critical Issues

### 1. No MIME type validation on API route
**File:** `route.ts` line 37 -- `file.type` is passed directly from client without server-side validation. The `ensureSupportedMime` check is in the service layer, but the error message leaks supported types. More importantly, a malicious client can set `file.type` to anything; the service validates it, but the buffer is already in memory.

**Fix:** Validate MIME type in the route handler BEFORE reading the full buffer:
```ts
const ALLOWED_MIMES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];
if (!ALLOWED_MIMES.includes(file.type.toLowerCase())) {
  return NextResponse.json({ ok: false, error: "Unsupported file type" }, { status: 400 });
}
```

### 2. No file magic-byte validation
Client-supplied `file.type` can be spoofed. Consider validating the first bytes (magic bytes) of the buffer to confirm the actual file type. Lower priority but important for defense-in-depth.

## High Priority

### 3. Memory leak: object URL not revoked
**File:** `document-scanner-dialog.tsx` line 55 -- `URL.createObjectURL(f)` is called but never `URL.revokeObjectURL()`. Over multiple scans this leaks blob URLs.

**Fix:** Add cleanup in `reset()`:
```ts
function reset() {
  if (preview) URL.revokeObjectURL(preview);
  setStep("upload"); setFile(null); setPreview(null);
  // ...
}
```

### 4. page.tsx exceeds 200-line limit (532 LOC)
Already known issue per memory. Scanner integration adds more state (`scannerOpen`). No new action needed beyond existing modularization backlog.

### 5. Collateral fetch lacks try-catch
**File:** `customer-collateral-section.tsx` line 52-57 -- `load()` has no error handling. Network failures silently leave `loading=true` forever or crash.

**Fix:** Wrap in try-catch with error state, consistent with other sections.

## Medium Priority

### 6. Dialog missing a11y attributes
**File:** `document-scanner-dialog.tsx` -- uses raw `div` without `role="dialog"`, `aria-modal="true"`, or focus trapping. Should use `BaseModal` per project convention.

### 7. Confidence value from LLM is untrusted
**File:** `ocr.service.ts` line 139 -- confidence comes from AI response JSON. It should be clamped to [0, 1]:
```ts
const confidence = Math.max(0, Math.min(1, typeof parsed.confidence === "number" ? parsed.confidence : 0.7));
```

### 8. JSON.parse without safe fallback
**File:** `ocr.service.ts` line 136 -- if Gemini returns malformed JSON, `JSON.parse` throws and gets caught by the generic catch. The error message "Document field extraction failed" is vague. Consider catching parse errors separately with a clearer message.

## Low Priority

### 9. FIELD_LABELS duplication
`document-scanner-dialog.tsx` defines field labels that partially overlap with `ocr-document-prompts.ts` field definitions. Consider co-locating labels in the prompts file.

### 10. Emoji in source code
Lines 110, 338, 78 use emoji (`📷`) directly. Minor style concern -- consider using an icon component for consistency.

## Positive Observations

- Auth guard (`requireEditorOrAdmin`) correctly applied on API
- File size limit (10MB) enforced server-side
- Document type validated with type guard before processing
- Template-based prompt system is extensible and clean
- Review step lets users edit extracted fields before confirming
- `toHttpError` provides consistent error response format
- Collateral OCR-to-form mapping is well-structured with clear type mapping

## Recommended Actions (Priority Order)

1. **Add MIME validation in route handler** before buffer allocation
2. **Fix object URL memory leak** in scanner dialog
3. **Add try-catch to collateral load()** function
4. **Clamp confidence** to [0, 1] range
5. **Use BaseModal** for scanner dialog (a11y)
6. **Co-locate FIELD_LABELS** with prompt templates

## Metrics
- Type Coverage: Good -- types defined for DocumentType, extraction results, props
- Linting Issues: 0 critical (emoji usage is stylistic)
- File Size: 5/6 files under 200 LOC; page.tsx is 532 (pre-existing issue)
