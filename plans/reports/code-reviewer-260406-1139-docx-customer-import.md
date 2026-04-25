# Code Review: DOCX Customer Import

## Scope
- `src/app/api/customers/import-docx/route.ts` (233 LOC, NEW)
- `src/components/customers/customer-docx-import-modal.tsx` (371 LOC, NEW)
- `src/components/customers/customer-list-view.tsx` (279 LOC, MODIFIED)
- Focus: security, bugs, edge cases

## Overall Assessment

Feature well-structured: auth-guarded API, multi-file merge, editable review step, duplicate CCCD check. Several **high-priority** issues need attention before merge.

---

## Critical Issues

### 1. No file size limit on upload (DoS vector)
**File:** `route.ts` L182-204

Users can upload arbitrarily large .docx files. `Buffer.from(await file.arrayBuffer())` loads entire file into memory. 5 files x 100MB = 500MB memory spike.

**Fix:**
```ts
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
for (const file of files) {
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { ok: false, error: `File "${file.name}" vuot qua 10MB.` },
      { status: 400 },
    );
  }
}
```

### 2. JSON.parse on AI output without validation (crash risk)
**File:** `route.ts` L121

`JSON.parse(text)` can throw if Gemini returns malformed JSON. The outer try-catch catches it, but returns a generic 500 error for ALL files -- partial results lost.

More importantly, the parsed result is cast `as ExtractionResult` without any runtime validation. If AI returns unexpected shape (e.g. `loans` as a string), downstream code will silently produce garbage data.

**Fix:** Wrap `JSON.parse` in its own try-catch per file, and add minimal shape validation:
```ts
let parsed: ExtractionResult;
try {
  parsed = JSON.parse(text);
} catch {
  // skip this file, continue with others
  console.warn(`[import-docx] Invalid JSON from file, skipping`);
  continue;
}
if (typeof parsed.customer !== 'object') parsed.customer = {};
```

---

## High Priority

### 3. Duplicate CCCD check fetches ALL customers client-side
**File:** `customer-docx-import-modal.tsx` L107-114

```ts
const checkRes = await fetch(`/api/customers?type=individual`);
```

This downloads the entire customer list to the browser just to check one CCCD. For large customer bases, this is a performance and data-exposure issue -- all customer data (names, addresses, phones) sent to client unnecessarily.

**Fix:** Add a dedicated API endpoint or query param like `/api/customers?cccd=XXXX` that returns only duplicate status, or do the check server-side in the import API route.

### 4. Loan/collateral creation errors silently ignored
**File:** `customer-docx-import-modal.tsx` L163-199

Loan and collateral `fetch` calls don't check response status. If loan creation fails (e.g. validation error), user sees success and gets redirected, but data is partially created. Customer exists, loans missing.

**Fix:**
```ts
const loanRes = await fetch("/api/loans", { ... });
const loanData = await loanRes.json();
if (!loanData.ok) {
  console.error(`Loan creation failed:`, loanData.error);
  // Either throw or collect warnings
}
```

### 5. File exceeds 200-line limit
- `customer-docx-import-modal.tsx`: 371 LOC
- `customer-list-view.tsx`: 279 LOC

Per project rules, consider extracting the upload step, review step, and field section into separate files.

---

## Medium Priority

### 6. File type validation only checks extension, not MIME type
**File:** `route.ts` L189-195

A renamed `.txt` file with `.docx` extension will pass validation and likely cause `extractParagraphs` to throw an unhandled error.

**Fix:** Also check `file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'` or wrap `extractParagraphs` in per-file try-catch.

### 7. No abort/cancel mechanism during AI processing
**File:** `customer-docx-import-modal.tsx` L281-287

Processing step shows a spinner but no cancel button. If user closes modal during processing, the API call continues but the state is reset -- potential stale state if modal reopens quickly.

**Fix:** Add an `AbortController` ref, pass its signal to `fetch`, and abort on close/reset.

### 8. Race condition: duplicate warning vs stale customer list
**File:** `customer-docx-import-modal.tsx` L107-114

If another user creates a customer with the same CCCD between the time the check runs and the submit, the duplicate warning is outdated. This is a minor UX issue; the real guard should be server-side (DB unique constraint on CCCD if applicable).

---

## Positive Observations
- Auth guard (`requireEditorOrAdmin`) applied correctly
- Multi-file merge logic handles dedup by contract_number and certificate_serial
- Editable review step lets user correct AI mistakes before commit
- Uses `BaseModal` for a11y compliance
- Error boundary in API with generic 500 handler
- `truncateText` prevents token overflow for very large documents

---

## Recommended Actions (priority order)
1. **[CRITICAL]** Add file size limit (10MB per file)
2. **[CRITICAL]** Add per-file JSON parse error handling
3. **[HIGH]** Check loan/collateral creation response status
4. **[HIGH]** Replace client-side full-list CCCD check with server-side check
5. **[MEDIUM]** Validate MIME type, not just extension
6. **[MEDIUM]** Split modal into sub-components (371 LOC)
7. **[LOW]** Add AbortController for cancellable processing

## Unresolved Questions
- Is CCCD meant to be unique per customer in DB? If yes, a unique constraint + server-side check is the proper guard. If no, the client-side warning is sufficient but should be documented.
- What is the expected max file count in practice? `MAX_FILES = 5` seems reasonable but should be aligned with Gemini rate limits.
