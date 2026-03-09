# API Routes & Security Review

**Date:** 2026-03-06
**Reviewer:** code-reviewer
**Scope:** All `src/app/api/` route files + supporting libs (`api-helpers.ts`, `rate-limiter.ts`, `security.service.ts`, `path-validation.ts`, `file-token.ts`, `app-error.ts`)

---

## Scope Summary

- **Total files reviewed:** 68 (route files) + 6 (supporting libs) = 74
- **Route groups:** customers (4), loans (7), disbursements (3), invoices (3), beneficiaries (1), notifications (3), onlyoffice (4), report (33+), root (1)
- **Focus:** Security, input validation, error handling, correctness

---

## Critical Issues (must fix)

| # | File | Line | Issue | Recommendation |
|---|------|------|-------|----------------|
| C1 | `report/template/save-docx/route.ts` | 9-12 | **No path validation on `relPath`**. The `PUT` handler reads `path` from query params and passes it directly to `reportService.saveTemplateDocx()` without calling `validatePathUnderBase()`. An attacker can write arbitrary DOCX files anywhere under cwd (or potentially anywhere if service doesn't validate). | Add `validatePathUnderBase(relPath, REPORT_ASSETS_BASE)` and `.docx` extension check before calling service, same pattern as in `onlyoffice/callback`. |
| C2 | `report/auto-process/start/route.ts` | 17-22 | **File paths from user input not validated.** `excel_path` and `template_path` are passed as-is from the request body to `autoProcessService` without any path validation. Could allow reading/processing files outside `report_assets`. | Apply `validatePathUnderBase()` to both `excelPath` and `templatePath` before passing to service. |
| C3 | `report/auto-process/open-output/route.ts` | 14-15 | **OS command injection via `openJobOutputFolder`**. The `job_id` is passed as a string to a service that likely opens a folder via OS shell command. If job_id is crafted maliciously, could lead to command injection. | Validate `job_id` with a strict UUID/alphanumeric pattern. Verify the service implementation sanitizes the path. |
| C4 | `customers/from-draft/route.ts` | 10-11 | **No input validation.** Body is cast with `as` keyword only -- no Zod validation. `values` is an unvalidated `Record<string, unknown>` passed directly to service. | Add Zod schema validation for the body. At minimum validate that `values` is a record of expected types. |
| C5 | `customers/to-draft/route.ts` | 10 | **No input validation.** Body is type-asserted only. `customer_id` and `customer_name` are passed to service without validation. | Add Zod schema with `customer_id` as optional string, `customer_name` as optional string. |
| C6 | `report/backups/restore/route.ts` | 9 | **Path traversal in backup restore.** The `file` query param is passed directly to `reportService.getStateBackupContent(file)` without any path validation. An attacker could read arbitrary JSON files. | Add `validatePathUnderBase()` or at minimum validate the filename contains no path separators and matches expected backup filename pattern. |
| C7 | `report/export/route.ts` | 83-94 | **Verbose error detail leak.** On non-AppError exceptions, the catch block extracts `error.message` and `error.details` and sends them to the client. This bypasses the security of `toHttpError()` which intentionally hides internal messages. | Remove the `detailsStr` extraction logic. Only return `httpError.message` and `httpError.details` (which are already safe via `toHttpError`). |

---

## Important Issues (should fix)

| # | File | Line | Issue | Recommendation |
|---|------|------|-------|----------------|
| H1 | `report/field-templates/route.ts` | 28-34 | **No Zod validation on POST/PATCH/PUT bodies.** Three mutation handlers use `as` type assertion. `name`, `field_catalog`, `customer_id`, `template_id` are unvalidated. | Add Zod schemas for POST, PATCH, and PUT bodies. Validate `name` min length, `template_id` format, etc. |
| H2 | `report/master-templates/route.ts` | 39-55 | **PUT handler has no Zod validation.** Body is type-asserted. `master_id`, `name`, `description`, `field_catalog`, `status` are unvalidated. Inconsistent with POST which uses `withValidatedBody`. | Add Zod schema for PUT, matching the same pattern as POST. |
| H3 | `report/mapping-instances/[id]/route.ts` | 24 | **PUT handler has no Zod validation.** `name` and `field_catalog` are unvalidated. | Add Zod schema. |
| H4 | `report/template/route.ts` | 27 | **PATCH handler has no Zod validation.** `template_id` is unvalidated. | Add Zod schema with `template_id` as string min(1). |
| H5 | `report/template/inventory/route.ts` | 10 | **POST handler has no Zod validation.** `template_id` is unvalidated. | Add Zod schema. |
| H6 | `report/auto-tagging/analyze/route.ts` | 52-57 | **Uploaded file saved to disk without size limit.** No `validateFileSize()` call before writing DOCX to `report_assets/uploads/tagging/`. Could be used for disk exhaustion. | Add `validateFileSize(file, "docx")` before processing. |
| H7 | `report/auto-tagging/reverse/route.ts` | 12-14 | **No Zod validation.** `excelRows` array items are unvalidated `Record<string, unknown>`. `threshold` is unvalidated number. | Use Zod schema. Validate `threshold` range (0-1 or similar). |
| H8 | `report/mapping/suggest/route.ts` | 17-18 | **No Zod validation.** Body is type-asserted. `excelHeaders` and `wordPlaceholders` rely on runtime Array.isArray checks but no schema. | Use Zod for consistent validation pattern. |
| H9 | `loans/[id]/beneficiaries/import/route.ts` | 30-32 | **JSON body items not validated.** When content-type is JSON, `body.items` is used without validating each item's shape. Empty names, non-string values could pass through. | Add Zod validation for each item in the array. |
| H10 | Multiple CRUD routes | - | **No security headers on CRUD routes.** The `api-helpers.ts` provides `applySecurityHeaders()` but only routes using `withErrorHandling`/`withRateLimit` get them. All manually-written routes (customers, loans, disbursements, invoices, beneficiaries, notifications) do not apply security headers. | Either use middleware to apply headers globally or wrap all route handlers with `withErrorHandling`. |
| H11 | `report/export-data/route.ts` | 22 | **POST body not validated with Zod.** `customerIds` and `templateIds` only check `Array.isArray` but don't validate individual items are strings. | Add Zod schema: `z.object({ customerIds: z.array(z.string()).optional(), templateIds: z.array(z.string()).optional() })`. |
| H12 | `api-helpers.ts` (rate limiter) | 78 | **Duplicate rate limiter implementation.** `api-helpers.ts` has its own in-memory rate limiter store (lines 78-144) that duplicates the one in `rate-limiter.ts`. The `api-helpers.ts` version is actually used by routes; `rate-limiter.ts` only exports `checkRateLimit` + `getClientIp`. | Consolidate: have `api-helpers.ts` use `checkRateLimit` from `rate-limiter.ts` instead of maintaining a separate store. |

---

## Minor Issues (nice to fix)

| # | File | Line | Issue | Recommendation |
|---|------|------|-------|----------------|
| M1 | `report/import/bk/route.ts` | 41-43 | **Error response format inconsistent.** Returns `{ error: "Server error: ..." }` instead of `{ ok: false, error: ... }` pattern used everywhere else. | Use `toHttpError()` and `{ ok: false, error: ... }` pattern. |
| M2 | `report/import/bk/route.ts` | - | **Missing `export const runtime = "nodejs"`** unlike all other route files. | Add `export const runtime = "nodejs"`. |
| M3 | `onlyoffice/health/route.ts` | 19 | **Leaks `ONLYOFFICE_URL` in response.** Health check returns the internal OnlyOffice URL to the client. Not critical for internal tool but unnecessary exposure. | Return `{ available: true/false }` only, omit `url`. |
| M4 | `report/auto-tagging/analyze/route.ts` | 64-66 | **Confidence score clamping after the fact.** `Math.max(0, Math.min(1, item.confidence))` suggests the service may return out-of-range values. Better to fix at source. | Fix in `analyzeDocument` service to ensure valid range. |
| M5 | `report/catalog/route.ts` | 26-29 | **Race condition on `loadState()` / `saveState()`.** PUT reads state, mutates it, then saves. Concurrent PUTs could lose writes. | Use a mutex/lock or atomic write pattern in `fs-store`. |
| M6 | `report/snapshots/restore/route.ts` | 15-16 | **Double read.** Calls `restoreSnapshot(filename)` then immediately `getSnapshot(filename)`. If restore already returns the data, the second call is redundant. | Check if `restoreSnapshot` can return the data directly. |
| M7 | Root `api/route.ts` | 3-4 | **Root route has no security headers.** GET/HEAD/OPTIONS return responses without security headers. | Apply `applySecurityHeaders()` or use middleware. |
| M8 | `report/auto-process/jobs/[id]/route.ts` | 11 | **Missing `await`.** `autoProcessService.getJob(id)` is called without `await`. If it becomes async in the future, this will silently return a Promise object. | Add `await` for safety, or mark the function signature explicitly. |

---

## Positive Patterns

1. **Consistent error handling framework.** `toHttpError()` properly hides internal error messages from clients, returning safe fallback messages. `AppError` subclasses provide structured error codes.
2. **Path traversal protection.** `validatePathUnderBase()` uses `path.relative()` for OS-agnostic containment -- correct approach for Windows+Unix.
3. **SSRF protection on OnlyOffice callback.** The callback handler validates the download URL origin against the configured OnlyOffice server, preventing SSRF.
4. **JWT/HMAC token-based file access.** File download endpoints require signed tokens with TTL, preventing unauthorized file access.
5. **Timing-safe comparison** in `verifyFileAccess()` prevents timing attacks on HMAC signatures.
6. **Rate limiting on AI-powered endpoints.** Suggest, extract, and auto-process routes use `withRateLimit()`.
7. **Zod validation on most CRUD routes.** Customer, loan, disbursement, invoice, beneficiary create/update endpoints have proper Zod schemas.
8. **Magic byte validation on uploads.** `auto-process/upload` validates file content matches declared extension.
9. **File size limits.** Upload routes use `validateFileSize()` to prevent oversized uploads.
10. **IP spoofing awareness.** `getClientIp()` only trusts forwarded headers when `TRUSTED_PROXY=true`.

---

## Summary

| Metric | Count |
|--------|-------|
| Total files reviewed | 74 |
| Critical issues | 7 |
| Important issues | 12 |
| Minor issues | 8 |

### Risk Assessment

The codebase has a solid security foundation (path validation, HMAC tokens, SSRF protection, structured errors). However, **several routes bypass these protections**:

1. **C1 (save-docx) is the most dangerous** -- it allows writing files with user-controlled paths without any validation, unlike the neighboring onlyoffice routes that properly validate.
2. **C2 (auto-process start)** passes user file paths to processing without validation.
3. **C6 (backup restore)** allows reading arbitrary files via the `file` query parameter.
4. **C7 (export error leak)** undermines the otherwise good `toHttpError()` pattern.

The important issues are mostly about **validation consistency** -- about 12 route handlers use `as` type assertion instead of Zod, creating a mixed validation posture.

### No Authentication/Authorization

There is **zero authentication or authorization** on any endpoint. All routes are completely open. This is acceptable for a local/internal desktop tool but would be critical if exposed to a network. The current rate limiter with `TRUSTED_PROXY` defaulting to `"global"` key confirms this is designed for local use.

---

## Unresolved Questions

1. Does `reportService.saveTemplateDocx()` perform its own path validation internally? If so, C1 severity drops from Critical to Important.
2. Does `autoProcessService.startUniversalAutoProcess()` validate paths internally? Same question for C2.
3. Does `reportService.getStateBackupContent()` restrict to a specific backup directory? Same question for C6.
4. Is this application intended to ever be network-accessible? If so, authentication becomes a blocking issue.
