# Plan Review: Template Upload + Placeholder Validation

**Reviewer:** code-reviewer (Failure Mode Analyst)
**Date:** 2026-03-08
**Scope:** plan.md, phase-01, phase-02, phase-03

---

## Finding 1: API loads ALL field templates to find one -- N+1 data over-fetch

- **Severity:** High
- **Location:** Phase 1, "Implementation Steps" + code snippet, line 122-124
- **Flaw:** Code calls `reportService.listFieldTemplates({})` which queries ALL master templates from DB (including full `fieldCatalogJson` for each), then does `.find(t => t.id === fieldTemplateId)` in JS. If there are 50 templates each with 200+ field catalog entries, this deserializes and transfers all of them just to use one.
- **Failure scenario:** With growing template count, endpoint response time degrades linearly. On Turso (SQLite cloud), this means serializing/deserializing potentially megabytes of JSON across the wire for every single validation request. The plan states "Response time < 3s" but does nothing to ensure this under load.
- **Evidence:** `const templates = await reportService.listFieldTemplates({}); const template = templates.find(t => t.id === fieldTemplateId);`
- **Suggested fix:** Query single master template by ID directly via `prisma.fieldTemplateMaster.findUnique({ where: { id: fieldTemplateId } })` or add a `getFieldTemplateById()` service method. Avoid loading the entire list.

---

## Finding 2: No authentication/authorization check on the new endpoint

- **Severity:** Critical
- **Location:** Phase 1, "Security" section + code snippet
- **Flaw:** The endpoint has zero auth checks. The plan's security section claims "No path traversal risk" and "No file persistence" as if those are the only concerns. But an unauthenticated user can POST arbitrary DOCX files to the server, consuming CPU (JSZip parsing) and memory (20MB buffer).
- **Failure scenario:** Attacker sends repeated 20MB POST requests to `/api/report/template/validate-upload`. Each request allocates ~20MB buffer + JSZip decompression overhead. No rate limiting, no auth. Server runs out of memory or CPU. Denial of service.
- **Evidence:** Security section lists only: "No file persistence", "Same size limits", "No path traversal", "FormData parsing via standard Web API". No mention of auth.
- **Suggested fix:** Add same auth middleware used by other report API routes. Check if there's a session/auth wrapper (check `save-docx` or `template-fields` routes for pattern). Add explicit auth requirement to plan.

---

## Finding 3: No try-catch in the POST handler -- unhandled exceptions leak stack traces

- **Severity:** High
- **Location:** Phase 1, code snippet (entire POST function body)
- **Flaw:** Unlike `save-docx/route.ts` which wraps everything in try-catch with `toHttpError()`, the validate-upload handler has zero error handling. If `parseDocxPlaceholdersFromBuffer()` throws on a malformed DOCX (corrupt ZIP, missing XML), the raw error propagates to the client.
- **Failure scenario:** User uploads a renamed `.txt` file as `.docx`. JSZip fails to parse. Next.js returns a 500 with stack trace containing internal file paths. In production, this is an information leak; in dev, it's a confusing UX.
- **Evidence:** `save-docx/route.ts` uses `try { ... } catch (error) { const httpError = toHttpError(error, "Failed to save DOCX."); ... }`. The plan's code snippet has no equivalent.
- **Suggested fix:** Wrap handler body in try-catch, use `toHttpError()` pattern from save-docx. Add this to implementation steps explicitly.

---

## Finding 4: File buffer held in React state -- memory leak on large files

- **Severity:** High
- **Location:** Phase 2, "use-template-upload-validation.ts" hook + Risk Assessment
- **Flaw:** The hook stores `fileBuffer: ArrayBuffer | null` in React state. A 20MB ArrayBuffer persists in memory as long as the component is mounted. If the user validates multiple files without unmounting the component, old buffers are replaced but GC timing is unpredictable. The risk assessment says "File buffer lost after modal close" as a risk with "Store in hook state" as mitigation -- but the real risk is the opposite: the buffer NOT being freed.
- **Failure scenario:** User validates 5 files in sequence (e.g., trying different templates). Each validation stores a new 20MB ArrayBuffer. React state updates don't guarantee immediate GC of the previous buffer. On a low-memory device, tab crashes or becomes unresponsive.
- **Evidence:** `const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);` -- Risk table: "File buffer lost after modal close | Low | Store in hook state, clear on reset"
- **Suggested fix:** After successful save or cancel, explicitly call `reset()` which nulls the buffer. Consider not storing the buffer at all -- re-read from the File reference when saving. Or store only a File reference and read buffer on demand.

---

## Finding 5: Race condition between validate and save -- file could change

- **Severity:** Medium
- **Location:** Phase 2, "State Flow" section, steps 4-7
- **Flaw:** The flow is: validate file -> show report -> user reviews -> save. The file buffer validated in step 4 is the same buffer saved in step 7. But there's no guarantee the validation report is still accurate at save time if the field catalog changes between validate and save (e.g., another tab modifies the field template).
- **Failure scenario:** User A validates template at 10:00. User B updates the field catalog at 10:02 (adds new required fields). User A clicks "Save" at 10:05. The file is saved but now has missing placeholders that weren't in the original validation report. The validation report gave a false "all clear."
- **Evidence:** State flow shows validate and save as separate steps with user review time between them. No re-validation on save.
- **Suggested fix:** Either (a) accept this as a known limitation and document it, or (b) re-validate on save and show diff if results changed. Option (a) is pragmatic for a single-user app.

---

## Finding 6: `listFieldTemplates` returns summary objects -- plan assumes `field_catalog` exists but code path is fragile

- **Severity:** High
- **Location:** Phase 1, code snippet line 124
- **Flaw:** The code does `const catalog = template?.field_catalog ?? [];`. While `mapMasterTemplateRecordToSummary` DOES include `field_catalog`, `listFieldTemplates` has TWO code paths: one via DB (returns `mapMasterTemplateRecordToSummary` which includes catalog), and one via legacy JSON state (line 171+). The legacy path returns objects from `state.field_templates` which may have different shapes. The plan doesn't acknowledge this dual-path behavior.
- **Failure scenario:** On a deployment that hasn't migrated to DB mode yet (legacy JSON state), the `field_templates` objects may have a different structure. The plan's code blindly accesses `.field_catalog` without verifying which code path was used. If legacy objects don't have `field_catalog`, validation returns "all unknown" for every placeholder.
- **Evidence:** `template.service.ts` line 142-169 (DB path) vs line 171+ (legacy path). Plan code: `const catalog = template?.field_catalog ?? [];`
- **Suggested fix:** As noted in Finding 1, don't use `listFieldTemplates` at all. Query the specific template by ID. If you must support legacy, add explicit check and document the assumption.

---

## Finding 7: Normalization asymmetry in Levenshtein comparison

- **Severity:** Medium
- **Location:** Phase 3, code snippet lines 59 vs 63
- **Flaw:** Placeholder normalization strips dots and underscores (`replaceAll(/[\s_.]/g, "")`), but field key normalization only strips spaces and underscores (`replaceAll(/[\s_]/g, "")`). Dots are removed from placeholders but NOT from field keys. This creates asymmetric comparison strings.
- **Failure scenario:** Field key `nhom_a.tong_tien` normalized to `nhomatongtien` (dot kept). Placeholder `nhom_a.tong_tien` normalized to `nhomatongtien` (dot removed... wait, the regex removes dots from placeholder but the field key regex doesn't). Actually: placeholder → `nhomatongtien`, field key → `nhom_a.tong_tien` → `nhoma.tongtien`. The dot inflates the Levenshtein distance by 1, potentially pushing a perfect match above the threshold.
- **Evidence:** `const normalized = noPrefix.replaceAll(/[\s_.]/g, "");` vs `const key = field.toLowerCase().replaceAll(/[\s_]/g, "");`
- **Suggested fix:** Use identical normalization for both sides. Add `.` to the field key regex: `replaceAll(/[\s_.]/g, "")`.

---

## Finding 8: No validation of `field_template_id` parameter -- silent empty results

- **Severity:** Medium
- **Location:** Phase 1, code snippet line 107 + Risk Assessment
- **Flaw:** If `field_template_id` is missing, empty, or invalid, the code proceeds with `template = undefined`, `catalog = []`, and every placeholder becomes "unknown". The risk table says "Return empty catalog, still show placeholders as all unknown" as if this is acceptable. But the user has no idea WHY everything is unknown -- they just see a scary yellow report.
- **Failure scenario:** Frontend has a bug where `selectedFieldTemplateId` is undefined. API receives no `field_template_id`. All placeholders flagged as unknown. User thinks template is badly authored. They spend 30 minutes "fixing" placeholders that are actually correct. Root cause: the dropdown wasn't selected.
- **Evidence:** Risk table: "Field template not found | Low | Return empty catalog, still show placeholders as 'all unknown'"
- **Suggested fix:** Return 400 error if `field_template_id` is missing or not found. Force the user to select a template first. Add client-side validation to disable the button when no template is selected.

---

## Finding 9: Save path in modal is user-editable text input -- path traversal reintroduced

- **Severity:** Medium
- **Location:** Phase 2, "Implementation Steps" Step 5 + footer layout description
- **Flaw:** The modal footer includes "save path input (default: `report_assets/{fileName}`)" where user can edit the path. This path is then sent to `save-docx` PUT endpoint. While save-docx has `..` and absolute path checks, the plan doesn't mention validating the path in the frontend before sending. A user could type any path.
- **Failure scenario:** Save-docx blocks `..` but what about paths like `report_assets/../../../../etc/passwd.docx`? The check is `relPath.includes("..")` which catches this. But what about symbolic directory names or Windows-specific paths? The plan delegates ALL security to save-docx without acknowledging this dependency explicitly.
- **Evidence:** "Footer: save path input (default: report_assets/{fileName}) + Save button" -- no mention of frontend path validation.
- **Suggested fix:** Restrict the input to a dropdown of existing folders rather than free-text. If free-text is needed, validate against a whitelist pattern (e.g., must start with `report_assets/`, no `..`). Save-docx is the last line of defense, not the only line.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 1 (no auth) |
| High | 4 (data over-fetch, no error handling, memory leak, fragile catalog access) |
| Medium | 4 (race condition, normalization bug, silent empty results, path input) |

The plan's core architecture (validate then save as two-step) is sound. The critical gap is security: no auth on a file-processing endpoint that accepts 20MB uploads. The high-priority issues are all implementation-level mistakes in the code snippet that will carry into the real code since the plan is essentially copy-paste ready.
