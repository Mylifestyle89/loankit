# Security Adversary Review: Template Upload + Placeholder Validation

**Reviewer:** code-reviewer (security adversary perspective)
**Date:** 2026-03-08
**Plan:** `plans/260308-2345-template-upload-validation/`
**Verdict:** BLOCKED — 2 Critical, 4 High, 3 Medium findings. Do not implement without addressing Critical and High items.

---

## Finding 1: No Authentication on Validate-Upload Endpoint

- **Severity:** Critical
- **Location:** Phase 1, section "Code Snippet" and "Security"
- **Flaw:** POST endpoint has zero auth checks. No middleware exists in project. Existing save-docx also lacks auth. Plan says "reuse same validation patterns as save-docx" but save-docx has no auth either.
- **Failure scenario:** Unauthenticated user POSTs arbitrary 20MB files consuming CPU/memory. Attacker enumerates field templates via response (leaks `field_key`, `label_vi`, `group`). Unauthenticated info disclosure + DoS vector.
- **Evidence:** Phase 1 code: no session/auth check. Security section only mentions "No file persistence" and "Same size limits as save-docx."
- **Suggested fix:** Add auth guard (NextAuth `getServerSession` or equivalent) to both new and existing endpoints. Make this a prerequisite step in plan.

## Finding 2: Zip Bomb / Decompression Bomb via JSZip

- **Severity:** Critical
- **Location:** Phase 1, "Implementation Steps" step 2, "Risk Assessment"
- **Flaw:** Plan validates compressed `file.size` at 20MB, then `JSZip.loadAsync(buffer)` decompresses in memory without ratio checks. A crafted 5MB DOCX can decompress to gigabytes.
- **Failure scenario:** Attacker uploads zip bomb DOCX. JSZip allocates decompressed data. Node.js OOM-kills. Trivially repeatable with no auth.
- **Evidence:** Risk Assessment: "20MB cap, JSZip is efficient." No mention of decompression ratio. `parseDocxPlaceholdersFromBuffer` calls `zip.file(part)?.async("string")` without size checks.
- **Suggested fix:** After JSZip.loadAsync, check total uncompressed size of entries. Set hard limit (e.g., 100MB uncompressed). Abort if exceeded.

## Finding 3: DOCX Content-Type Not Validated (Extension Only)

- **Severity:** High
- **Location:** Phase 1, "Implementation Steps" step 2
- **Flaw:** Only checks `file.name.toLowerCase().endsWith(".docx")`. File name is client-controlled. Any file named `.docx` passes to JSZip.
- **Failure scenario:** Attacker uploads polyglot/non-DOCX ZIP named `exploit.docx`. JSZip parses it, enumerating internal entries. Any valid ZIP passes and gets processed.
- **Evidence:** Phase 1: `if (!file || !file.name.toLowerCase().endsWith(".docx"))`. No MIME check, no magic byte validation.
- **Suggested fix:** Validate first 4 bytes are `PK\x03\x04`. After JSZip load, verify `[Content_Types].xml` exists with OOXML content types.

## Finding 4: field_template_id Not Validated — Silent Failure

- **Severity:** High
- **Location:** Phase 1, "Code Snippet" lines 122-124, "Risk Assessment"
- **Flaw:** Invalid `field_template_id` silently falls through: `template = undefined`, `catalog = []`, all placeholders reported as "unknown."
- **Failure scenario:** (1) Attacker enumerates valid template IDs by observing "valid" vs "all unknown" responses. (2) User typos template ID, gets misleading all-unknown report, cancels believing template is bad.
- **Evidence:** Risk Assessment: "Return empty catalog, still show placeholders as 'all unknown'" presented as acceptable.
- **Suggested fix:** Return 404 with explicit error when fieldTemplateId matches no template.

## Finding 5: Client Holds Raw File Buffer in React State

- **Severity:** High
- **Location:** Phase 2, "Implementation Steps" step 1, "Security"
- **Flaw:** `fileBuffer` stored as `ArrayBuffer` in React state. Persists in memory for modal lifetime and potentially longer. No cleanup on unmount.
- **Failure scenario:** 20MB buffer accessible via DevTools. Multiple upload attempts accumulate buffers if `reset()` not called. Memory leak on navigation without Cancel.
- **Evidence:** Hook: `const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null)`. Security: "File buffer held in memory only during modal lifetime." No unmount cleanup.
- **Suggested fix:** `useEffect` cleanup to null buffer on unmount. Store File reference instead of buffer; read at save time.

## Finding 6: Save Path Traversal Beyond report_assets/

- **Severity:** High
- **Location:** Phase 2, "Implementation Steps" step 5
- **Flaw:** save-docx only blocks `..` and absolute paths. Does not validate path is under `report_assets/`. Plan delegates path safety entirely to this insufficient check.
- **Failure scenario:** Attacker sets savePath to `src/app/api/report/template/save-docx/route.ts` — relative, no `..`, not absolute. Check passes. Attacker overwrites server source code with DOCX.
- **Evidence:** `save-docx/route.ts` line 16: `if (!relPath || relPath.includes("..") || path.isAbsolute(relPath))`. Phase 2: "Save path validated by existing save-docx endpoint."
- **Suggested fix:** Validate resolved path starts with expected base directory. Use `path.resolve()` + prefix check. Flag as prerequisite fix in plan.

## Finding 7: No Rate Limiting

- **Severity:** Medium
- **Location:** Phase 1, "Non-Functional" and "Security"
- **Flaw:** CPU-intensive endpoint (JSZip + regex) with no rate limiting. Combined with no auth = amplified DoS.
- **Failure scenario:** 100 concurrent 20MB POSTs exhaust server memory/CPU.
- **Evidence:** No mention of concurrency limits or rate limiting anywhere in plan.
- **Suggested fix:** Add rate limiting middleware. Limit concurrent validation requests.

## Finding 8: Supply Chain Risk — fastest-levenshtein

- **Severity:** Medium
- **Location:** Phase 3, "Dependencies" and "Risk Assessment"
- **Flaw:** New npm dep added without audit. Runs on server and client (max blast radius). Plan acknowledges "algorithm is trivial, can inline" but still installs package.
- **Failure scenario:** Package compromised via post-install script or prototype pollution.
- **Evidence:** Risk table: "Package not maintained | Minimal | Algorithm is trivial, can inline if needed." No audit step.
- **Suggested fix:** Inline the ~20-line Levenshtein function. Eliminates supply chain risk entirely.

## Finding 9: TOCTOU — Validate and Save Are Decoupled

- **Severity:** Medium
- **Location:** Phase 1 "Data Flow" vs Phase 2 "State Flow" step 7
- **Flaw:** Validate and save are two separate HTTP requests. File buffer held client-side between them. Nothing prevents swapping the buffer between validation and save.
- **Failure scenario:** Attacker validates clean DOCX (all green), swaps buffer via DevTools, saves malicious DOCX. Save-docx has no validation. User sees "all valid" but saved file contains different content.
- **Evidence:** Two separate requests with no server-side correlation token or re-validation.
- **Suggested fix:** Either store file server-side with token (save accepts token only), or re-run validation in save-docx and reject mismatches.

---

## Summary

| Severity | Count | Findings |
|----------|-------|----------|
| Critical | 2 | #1 (No Auth), #2 (Zip Bomb) |
| High | 4 | #3 (Extension-only check), #4 (Silent field_template_id failure), #5 (Buffer in React state), #6 (Path traversal) |
| Medium | 3 | #7 (No rate limit), #8 (Supply chain), #9 (TOCTOU validate/save) |

**Recommendation:** Do not proceed to implementation until Critical and High findings are addressed in the plan. Finding #6 (path traversal in save-docx) is a pre-existing vulnerability that should be fixed regardless of this feature.
