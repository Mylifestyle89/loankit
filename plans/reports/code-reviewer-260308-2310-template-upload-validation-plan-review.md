# Plan Review: Template Upload + Placeholder Validation

**Reviewer:** code-reviewer (hostile/assumption-destroyer)
**Date:** 2026-03-08
**Plan:** `plans/260308-2345-template-upload-validation/`

---

## Finding 1: `reportService.listFieldTemplates()` returns wrong shape -- plan code will crash

- **Severity:** Critical
- **Location:** Phase 1, section "Code Snippet" (lines 122-125)
- **Flaw:** The plan imports `reportService` and calls `reportService.listFieldTemplates({})`, then does `templates.find(t => t.id === fieldTemplateId)` and accesses `template?.field_catalog`. But `listFieldTemplates()` in `template.service.ts` does NOT live on `reportService` -- it lives on `templateService`. The plan's import `import { reportService } from "@/services/report.service"` will compile but `reportService.listFieldTemplates` may not exist or may be a pass-through with different behavior. More critically, when DB mode is enabled (`isDbTemplateModeEnabled()`), `listFieldTemplates` calls `ensureMasterInstanceMigration()` and hits Prisma -- but the return shape from the DB path is `MasterTemplateSummary` which has `field_catalog` parsed from JSON. The plan assumes a flat array return with `.field_catalog` on each item, but never validates which code path (DB vs fs-store) is active.
- **Failure scenario:** If the project uses `reportService` as a facade that delegates to `templateService`, the plan's `templates.find()` may work. But if the DB migration path is active, the `field_catalog` items will have the parsed schema shape from `fieldCatalogItemSchema`, and the plan never verifies that `field_key`, `label_vi`, `group` properties exist on catalog items. A schema mismatch silently produces empty valid/unknown/missing arrays.
- **Evidence:** Plan line 122: `const templates = await reportService.listFieldTemplates({});` -- but actual service is `templateService.listFieldTemplates()` in `template.service.ts`. The `reportService` facade in `report.service.ts` was searched and does not contain `listFieldTemplates`.
- **Suggested fix:** Verify the actual import path. Use `templateService` directly or confirm `reportService` re-exports it. Add a runtime check: if `!template` return 404 with clear error, not silently empty catalog.

## Finding 2: No authentication or authorization on the new endpoint

- **Severity:** Critical
- **Location:** Phase 1, section "Security"
- **Flaw:** The plan's security section says "No path traversal risk (no filesystem writes)" and "FormData parsing via standard Web API" but never mentions authentication. The existing `save-docx` endpoint also lacks auth, but that endpoint writes files. This new endpoint reads uploaded DOCX content and returns the full field catalog structure (field keys, Vietnamese labels, group names). Any unauthenticated user can probe the field catalog by uploading arbitrary files.
- **Failure scenario:** In a deployed environment (the branch is `Deploy-test`), anyone with the URL can enumerate all field template IDs and their complete field catalogs by calling POST with a dummy DOCX. This leaks business logic metadata.
- **Evidence:** Phase 1, Security section lists 4 bullet points, none mention auth. The plan.md Architecture section shows no auth middleware.
- **Suggested fix:** Either add auth middleware consistent with other endpoints, or explicitly document this as an accepted risk for internal-only deployment.

## Finding 3: `parseDocxPlaceholdersFromBuffer` joins ALL `<w:t>` fragments before matching -- false positives inevitable

- **Severity:** High
- **Location:** Phase 1, section "Key Insights" -- "already handles split `<w:t>` fragments"
- **Flaw:** The plan treats `parseDocxPlaceholdersFromBuffer()` as reliable, but the actual implementation (template-parser.ts lines 70-76) joins ALL `<w:t>` text fragments into one giant string, then regex-matches `[placeholder]`. This means if a document has text `... end of sentence] [start of next ...`, the parser will find a placeholder `end of sentence] [start of next` (up to 200 chars). More dangerously, any `[text in brackets]` anywhere in the document -- section headers, comments, table labels like `[Nguon: BCTC]` -- will be detected as "placeholders".
- **Failure scenario:** A real financial report template with Vietnamese text like `[Ghi chu]`, `[Nguon: BCTC 2024]`, or `[xem trang 5]` will produce dozens of false "unknown placeholders" in the validation report, overwhelming the user with noise and making the validation useless.
- **Evidence:** `template-parser.ts` line 70: `const textContent = [...xmlText.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => decodeXmlEntities(m[1] ?? "")).join("");` -- note the `.join("")` with no separator, concatenating all text fragments.
- **Suggested fix:** The plan should acknowledge this limitation and either (a) add a heuristic filter (e.g., placeholders must match `[a-z_0-9.]+` pattern, no spaces/Vietnamese chars), or (b) document it as a known issue for Phase 2's UI to handle via user dismissal.

## Finding 4: File buffer held in React state -- memory leak on large files, lost on re-render

- **Severity:** High
- **Location:** Phase 2, section "Architecture > State Flow" and "Risk Assessment"
- **Flaw:** The plan stores the uploaded file's `ArrayBuffer` in React hook state (`useState<ArrayBuffer | null>`). For a 20MB file, this is 20MB held in React state. If the user uploads multiple files without completing save, each buffer accumulates. React state is also lost on component unmount (e.g., tab switch in the folder browser). The plan's risk table says "File buffer lost after modal close | Low" but this is actually a functional bug, not low risk -- the save flow depends on this buffer.
- **Failure scenario:** User uploads 15MB file, validation report shows, user switches to editor tab to check something, switches back -- component remounts, buffer is gone, "Save" button now sends null/empty buffer to save-docx endpoint, either crashing or saving a 0-byte file.
- **Evidence:** Phase 2, implementation step 1: `const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);`. Risk table: "File buffer lost after modal close | Low | Store in hook state, clear on reset".
- **Suggested fix:** Store buffer in a `useRef` to survive re-renders, or re-read from the File object on save. Better yet, store the File object itself and only read buffer at save time.

## Finding 5: Two-step flow creates race condition with concurrent users on same template folder

- **Severity:** High
- **Location:** Plan.md, Architecture section; Phase 2, "State Flow" step 7
- **Flaw:** The validate-then-save flow is: (1) upload file to validate endpoint (no persistence), (2) user reviews report, (3) user clicks save, (4) PUT to save-docx. Between steps 1 and 4, another user (or the same user in another tab) could upload a different file to the same path via the existing direct-upload in `TemplateFileActions`. The save-docx endpoint has no locking mechanism -- it just overwrites.
- **Failure scenario:** User A uploads template, sees validation report with 3 unknown placeholders, spends 2 minutes reviewing. User B uploads a corrected version to the same path via quick-upload. User A clicks "Save" -- overwrites User B's corrected version with the older file.
- **Evidence:** Phase 2 states: "Current upload in `TemplateFileActions` saves directly with `window.confirm()` -- keep as quick-upload for known-good files". Two upload paths to the same destination, no coordination.
- **Suggested fix:** Add an ETag or last-modified check in save-docx, or at minimum warn the user if the file was modified since validation started.

## Finding 6: `field_template_id` validation is silent failure, not error

- **Severity:** High
- **Location:** Phase 1, section "Code Snippet" (line 123-124) and "Risk Assessment"
- **Flaw:** When `field_template_id` doesn't match any template, the code does `const template = templates.find(t => t.id === fieldTemplateId); const catalog = template?.field_catalog ?? [];`. This silently treats all placeholders as "unknown" and returns 0 "valid" matches. The risk table says "Return empty catalog, still show placeholders as all unknown" and marks it "Low impact". But this is a data integrity issue -- the user gets a misleading report that says every placeholder is wrong.
- **Failure scenario:** User selects field template "A" in the UI dropdown, but the ID sent to the API is stale or malformed (common with cached state). Validation returns: 0 valid, 47 unknown. User thinks the template is garbage and cancels the upload of a perfectly valid file.
- **Evidence:** Phase 1, Risk Assessment: "Field template not found | Low | Return empty catalog, still show placeholders as 'all unknown'".
- **Suggested fix:** Return HTTP 404 with `error: "Field template not found"` when `field_template_id` doesn't match. This is not a graceful degradation case -- it's an input validation failure.

## Finding 7: Levenshtein normalization inconsistency -- dots stripped from placeholder but not from field keys

- **Severity:** Medium
- **Location:** Phase 3, section "Implementation Steps", code snippet (lines 59, 63)
- **Flaw:** The proposed `suggestAliasForPlaceholder` strips dots from the placeholder (`replaceAll(/[\s_.]/g, "")` on line 59) but only strips spaces and underscores from field keys (`replaceAll(/[\s_]/g, "")` on line 63, no dot). This asymmetry means if a field key contains dots (e.g., `nhom_A.tong_thu_nhap`), the field key normalization preserves the dot while the placeholder normalization removes it. The Levenshtein distance will be inflated by the dot characters.
- **Failure scenario:** Placeholder `[nhom_A.tong_thu_nhap]` normalized to `nhomatongthunh ap` (dot removed). Field key `nhom_A.tong_thu_nhap` normalized to `nhoma.tongthunh ap` (dot kept). Edit distance = 1 (the dot), so it still matches -- but for longer keys with multiple dots, the distance accumulates and may exceed threshold 3, causing valid matches to be missed.
- **Evidence:** Phase 3 code: line 59 `const normalized = noPrefix.replaceAll(/[\s_.]/g, "");` vs line 63 `const key = field.toLowerCase().replaceAll(/[\s_]/g, "");`
- **Suggested fix:** Use identical normalization for both placeholder and field key. Add dots to the field key regex: `replaceAll(/[\s_.]/g, "")`.

## Finding 8: No error handling around `parseDocxPlaceholdersFromBuffer` -- corrupt DOCX crashes endpoint

- **Severity:** Medium
- **Location:** Phase 1, section "Code Snippet" (line 119)
- **Flaw:** The plan calls `parseDocxPlaceholdersFromBuffer(buffer)` without try-catch. If the uploaded file is a valid `.docx` extension but has corrupt ZIP structure (renamed .xlsx, password-protected DOCX, or truncated upload), JSZip will throw. The endpoint has no top-level error handler.
- **Failure scenario:** User renames an Excel file to `.docx` and uploads it. `JSZip.loadAsync()` throws `"End of central directory record signature not found"`. Unhandled exception returns 500 with stack trace potentially exposing server internals.
- **Evidence:** Phase 1 code snippet has no try-catch. Compare with save-docx endpoint which wraps everything in try-catch with `toHttpError()`.
- **Suggested fix:** Wrap the handler in try-catch like save-docx does. Return `{ ok: false, error: "Invalid or corrupt DOCX file" }` with status 400.

## Finding 9: Save flow in Phase 2 sends raw buffer to save-docx, but save-docx expects `req.arrayBuffer()` not FormData

- **Severity:** Medium
- **Location:** Phase 2, section "Implementation Steps > Step 5"
- **Flaw:** Phase 2 says: "PUT to `/api/report/template/save-docx?path={savePath}` with stored buffer". The existing save-docx endpoint reads the body as `const buffer = Buffer.from(await req.arrayBuffer())` -- it expects the raw binary body, not FormData. The plan never specifies how the client will send the buffer. If the hook uses `fetch` with `Content-Type: multipart/form-data` (matching the validate endpoint pattern), save-docx will receive FormData wrapper bytes instead of raw DOCX, producing a corrupt file.
- **Evidence:** save-docx/route.ts line 32: `const buffer = Buffer.from(await req.arrayBuffer());` -- reads raw body. Phase 2 says "PUT to save-docx with file buffer + chosen path" but no code snippet showing the fetch call.
- **Suggested fix:** Phase 2 should explicitly specify: `fetch(url, { method: "PUT", body: fileBuffer, headers: { "Content-Type": "application/octet-stream" } })`. Document this incompatibility with the validate endpoint's FormData approach.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 4 |
| Medium | 3 |

**Top blockers:**
1. Wrong service import (`reportService.listFieldTemplates` likely doesn't exist) -- plan code won't compile
2. No auth on an endpoint deployed to cloud
3. False positive placeholders from naive `<w:t>` join will make the feature unusable on real templates

**Unresolved Questions:**
- Does `reportService` re-export `templateService.listFieldTemplates`? Need to verify `report.service.ts` facade.
- Is this app intended to be publicly accessible, or internal-only? Determines auth severity.
- Are there existing templates with non-placeholder `[bracketed text]` in production? Determines false positive severity.
