# Auth, Security & API Edge Cases Review

**Date:** 2026-05-01
**Scope:** All API routes in `src/app/api/`, auth guards, rate limiting, file uploads, XSS
**Total API route files:** ~100

---

## 1. RBAC Escalation

**Status:** HANDLED
**Severity:** N/A (properly implemented)

**Evidence:**
- `src/lib/auth-guard.ts` defines 4 guard functions: `requireSession()`, `requireAdmin()`, `requireEditorOrAdmin()`, `requireOwnerOrAdmin()`
- Role check at line 29: `session.user.role !== "admin"` throws 403
- Editor/admin check at line 42: rejects viewer with 403
- Owner check at line 49-53: admin bypass + editor must match `resourceOwnerId`

All mutation endpoints (POST/PUT/PATCH/DELETE) use appropriate guards:
- DELETE on customers/loans/disbursements/invoices: `requireAdmin()`
- POST/PUT/PATCH: `requireEditorOrAdmin()`
- GET (read): `requireSession()` minimum
- Grants: `requireAdmin()` for both GET and POST

**One nuance:** `loan-products` GET (line 6, `src/app/api/loan-products/route.ts`) has NO auth guard on the GET handler, only POST. This is intentional (public catalog listing) but worth noting.

---

## 2. CRON_SECRET Default Value

**Status:** HANDLED
**Severity:** N/A (properly implemented)

**Evidence:** `src/app/api/cron/invoice-deadlines/route.ts`
- Line 18-26: If `CRON_SECRET` env var is unset, returns 500 "Server misconfigured" immediately
- Line 27: If secret doesn't match, returns 401
- Line 9-11: Uses `timingSafeEqual` for constant-time comparison, preventing timing attacks
- Line 10: Length check before `timingSafeEqual` (necessary since `timingSafeEqual` requires equal lengths)
- Supports 3 secret sources: Bearer token, x-cron-secret header, query param

**No issues found.** This is well-implemented.

---

## 3. Missing Auth Guards

**Status:** PARTIAL
**Severity:** High

**Unprotected routes (no `requireSession`/`requireAdmin`/`requireEditorOrAdmin`):**

| Route | Methods | Risk |
|-------|---------|------|
| `api/route.ts` | GET/HEAD/OPTIONS | Low - health check, acceptable |
| `api/auth/[...all]/route.ts` | GET/POST | N/A - auth handler itself |
| `api/report/auto-process/assets/route.ts` | GET | **HIGH** - lists server files |
| `api/report/auto-process/run/route.ts` | POST | **CRITICAL** - triggers batch processing |
| `api/report/auto-process/start/route.ts` | POST | **CRITICAL** - starts auto-process jobs |
| `api/report/auto-process/upload/route.ts` | POST | **CRITICAL** - writes files to server |
| `api/report/auto-process/jobs/[id]/route.ts` | GET | **HIGH** - reads job state |
| `api/report/auto-process/open-output/route.ts` | POST | **HIGH** - opens folders on server |
| `api/report/auto-tagging/analyze/route.ts` | POST | **HIGH** - AI call, file upload |
| `api/report/auto-tagging/reverse/route.ts` | POST | **HIGH** - file read from path |
| `api/report/export/route.ts` | POST | **HIGH** - triggers report export |
| `api/report/freshness/route.ts` | GET | Medium - read-only state |
| `api/report/guide/route.ts` | GET | Low - static content |
| `api/report/mapping/docx-process/route.ts` | POST | **HIGH** - file processing |
| `api/report/mapping/extract-process/route.ts` | POST | **HIGH** - AI extraction |
| `api/report/mapping/ocr-process/route.ts` | POST | **HIGH** - OCR processing |
| `api/report/mapping/suggest/route.ts` | POST | **HIGH** - AI mapping call |
| `api/report/mapping/template-fields/route.ts` | POST | Medium - template parsing |
| `api/report/runs/route.ts` | GET | Medium - read-only logs |
| `api/report/validate/route.ts` | POST | Medium - validation |
| `api/report/template/folder-files/route.ts` | GET | Medium - lists files |
| `api/report/template/inventory/route.ts` | POST | Medium |
| `api/report/template/merge-docx/route.ts` | POST | **HIGH** - file processing |
| `api/report/template/open-backup-folder/route.ts` | POST | Medium - server-side |
| `api/report/template/placeholders/route.ts` | GET | Medium |
| `api/report/template/validate-upload/route.ts` | POST | Medium |
| `api/report/templates/khcn/route.ts` | GET | Low - static catalog |
| `api/report/templates/khcn/generate/route.ts` | POST | **HIGH** - generates docs with customer data |
| `api/report/templates/khcn/xlsx-samples/route.ts` | GET | Low - sample downloads |
| `api/report/templates/search-replace/route.ts` | POST | **CRITICAL** - modifies files on disk |
| `api/report/financial-analysis/analyze/route.ts` | POST | **HIGH** - AI call |
| `api/report/financial-analysis/extract/route.ts` | POST | Medium - file parsing |
| `api/loan-plans/templates/[id]/route.ts` | GET | Medium - template data |

**Summary:** 33 routes lack authentication. Of these:
- **3 CRITICAL**: auto-process start/run, search-replace (write files to disk without any auth)
- **11 HIGH**: AI calls, file uploads, report generation with customer PII
- Rest are Medium/Low

**Recommendation:** Add `requireSession()` (minimum) or `requireEditorOrAdmin()` to all `report/*` and `auto-process/*` routes. The `search-replace` endpoint is especially dangerous: unauthenticated users can modify DOCX templates on disk.

---

## 4. Error Response Inconsistency

**Status:** PARTIAL
**Severity:** Medium

Most routes follow `{ ok: true/false, data/error }` consistently. Exceptions found:

| Route | Issue |
|-------|-------|
| `api/auth/[...all]/route.ts:14` | Returns `{ error: String(err) }` without `ok` field |
| `api/loan-products/route.ts:18` | Returns `{ ok: false, error: msg }` with raw error message on 500 |
| `api/loan-products/[productId]/route.ts` | Same pattern as above |
| `api/report/templates/search-replace/route.ts:115` | Returns raw `error.message` without `toHttpError` wrapping |
| `api/report/templates/khcn/generate/route.ts:55` | Returns `{ ok: false, error: msg }` with raw error, no `toHttpError` |

**Recommendation:** Wrap all error responses through `toHttpError()` to ensure consistent status codes and prevent internal error message leakage in production.

---

## 5. Rate Limiter Coverage

**Status:** PARTIAL
**Severity:** High

**Rate-limited routes (7 total):**
1. `report/auto-process/run` - withRateLimit("auto-process-run")
2. `report/auto-process/start` - withRateLimit("auto-process-start")
3. `report/mapping/template-fields` - withRateLimit("suggest")
4. `report/mapping/suggest` - withRateLimit("suggest")
5. `report/mapping/extract-process` - withRateLimit("extract-process")
6. `report/financial-analysis/analyze` - withRateLimit("financial-analyze")
7. `report/auto-tagging/analyze` - withRateLimit("tagging-analyze")

**NOT rate-limited but should be:**

| Endpoint | Reason |
|----------|--------|
| `api/auth/[...all]` | **Login/signup** - critical for brute-force protection. better-auth may have built-in limits but should verify |
| `api/ai/extract-text` | AI call, costs money |
| `api/ocr/extract-document` | AI/OCR call, costs money |
| `api/loan-plans/[id]/ai-analyze` | AI call |
| `api/loan-plans/[id]/ai-credit-assessment` | AI call |
| `api/report/templates/khcn/generate` | Document generation, CPU-intensive |
| `api/report/auto-tagging/reverse` | AI processing |
| `api/report/mapping/docx-process` | File processing |
| `api/report/mapping/ocr-process` | OCR processing |
| `api/report/auto-process/upload` | File upload to disk |

**Additional issue:** `checkRateLimit` from `src/lib/rate-limiter.ts` is NEVER used directly in any route. Only `withRateLimit` from `src/lib/api-helpers.ts` (which wraps it) is used. The direct `checkRateLimit` export is dead code.

**IP detection concern:** When `TRUSTED_PROXY !== "true"`, `getClientIp` falls back to `x-real-ip` header (line 64) which is still spoofable. If no header found, all users share one global bucket.

---

## 6. File Upload Validation

**Status:** HANDLED (mostly)
**Severity:** Medium

**`src/lib/report/upload-limits.ts`:**
- 4 categories: ocr (20MB), docx (50MB), generic_data (50MB), generic_template (50MB)
- Both MIME type and file size validated
- `validateUploadFile()` checks both; `validateFileSize()` checks size only

**Usage in routes:**
- `auto-process/upload/route.ts`: Uses `validateFileSize()` + manual extension whitelist + **magic byte validation** (line 23-28) - well done
- `auto-tagging/analyze`: Extension check only, no `validateUploadFile()`
- `ocr/extract-document`: Uses `requireEditorOrAdmin()` + likely validates via service
- `customers/import-docx`: Uses `requireEditorOrAdmin()` + should check

**Gaps:**
- `report/template/merge-docx/route.ts`: Only checks `.docx` extension, no size limit, no magic byte check
- `report/template/validate-upload/route.ts`: Has 20MB limit but no magic byte check
- `report/financial-analysis/extract/route.ts`: Extension whitelist only (.xlsx/.xls), no size limit
- `report/mapping/template-fields/route.ts`: Has 10MB limit, no extension check (relies on JSZip to throw)
- The `application/octet-stream` fallback in docx/generic_template MIME rules is overly permissive - any file type can bypass MIME validation

**Path traversal:** `auto-process/upload/route.ts` writes to `report_assets/uploads/` using timestamp+sanitized filename. `sanitizeName` (line 30) removes dangerous chars. The path is constructed server-side, not from user input beyond filename. Acceptable.

---

## 7. XSS Risks

**Status:** HANDLED (via React)
**Severity:** Low

**`dangerouslySetInnerHTML` usage (2 instances):**
1. `src/app/layout.tsx:38` - Theme flash prevention script with hardcoded content. No user input. Safe.
2. `src/app/report/guide/page.tsx:75` - Uses `proseRef.current.innerHTML` to export rendered markdown. The markdown is loaded from a static server-side file (`docs/user-guide.md`), not user input. Safe.

**React auto-escaping:** All JSX rendering of user data (customer names, invoice descriptions) goes through React's built-in escaping. No instances of raw HTML injection from user content found.

**API responses:** Error messages sometimes include user-provided values (e.g., file extensions in validation errors), but these are consumed by the frontend via `JSON.parse`, not inserted into HTML directly.

---

## Summary Table

| # | Edge Case | Status | Severity |
|---|-----------|--------|----------|
| 1 | RBAC escalation | HANDLED | N/A |
| 2 | CRON_SECRET default | HANDLED | N/A |
| 3 | Missing auth guards | **PARTIAL** | **Critical** |
| 4 | Error response format | PARTIAL | Medium |
| 5 | Rate limiter coverage | **PARTIAL** | **High** |
| 6 | File upload validation | PARTIAL | Medium |
| 7 | XSS risks | HANDLED | Low |

---

## Priority Recommendations

### Critical (fix immediately)
1. **Add auth guards to 33 unprotected routes** in `src/app/api/report/` and `src/app/api/auto-process/`. At minimum:
   - `search-replace`: `requireAdmin()` (writes to disk)
   - `auto-process/*`: `requireEditorOrAdmin()` (triggers batch ops, file writes)
   - `khcn/generate`: `requireSession()` (accesses customer PII)

### High Priority
2. **Add rate limiting to all AI/OCR endpoints**: `ai/extract-text`, `ocr/extract-document`, `loan-plans/*/ai-*`, `report/auto-tagging/reverse`
3. **Rate limit auth routes** or verify better-auth has built-in rate limiting for login attempts

### Medium Priority
4. **Standardize error responses** through `toHttpError()` in all routes
5. **Add magic byte validation** to merge-docx, validate-upload, financial-analysis/extract routes
6. **Tighten `application/octet-stream`** MIME fallback - consider removing or requiring additional validation when this MIME type is used

### Low Priority
7. **Remove dead code**: `checkRateLimit` export in `rate-limiter.ts` is unused directly
8. **Document** the intentional lack of auth on `loan-products` GET, `khcn` GET, `guide` GET

---

## Positive Observations

- Auth guard system is well-designed with clear role hierarchy
- CRON_SECRET validation uses `timingSafeEqual` preventing timing attacks
- File upload has magic byte validation in the main upload route
- Path traversal protection exists via `validatePathUnderBase` and `sanitizeName`
- React auto-escaping prevents XSS for rendered user content
- `toHttpError` pattern provides consistent error handling where used
- `requireOwnerOrAdmin` enables fine-grained resource-level access control
