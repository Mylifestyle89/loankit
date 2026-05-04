# API Security Review — 2026-05-02

## Scope
- 108 route files in `src/app/api/`
- `src/lib/auth.ts`, `auth-guard.ts`, `auth-utils.ts`
- `src/proxy.ts` (middleware replacement)
- `src/core/errors/app-error.ts`

## Overall Assessment
Auth infrastructure is solid: `requireSession / requireEditorOrAdmin / requireAdmin` guards are applied consistently across all ~108 routes. Prisma ORM eliminates SQL injection risk. Path traversal is guarded via `validatePathUnderBase`. The main risks are error message leakage, a few missing ownership checks, and in-memory rate limiting unsuitability for multi-instance deploy.

---

## CRITICAL Issues

### C-1: Error message leakage — raw `Error.message` returned to client
**Files (representative, not exhaustive):**
- `src/app/api/report/export/route.ts` lines 87–97: `detailsStr = error.message` → returned in response `details`
- `src/app/api/report/snapshots/restore/route.ts` line 30: `error instanceof Error ? error.message : "..."` → returned as `error`
- `src/app/api/loans/[id]/route.ts` line 101: same pattern in PATCH catch (no `handleAuthError`)
- `src/app/api/loan-plans/[id]/ai-analyze/route.ts` line 102: `message = error instanceof Error ? error.message : ...` → returned
- `src/app/api/loan-plans/[id]/ai-credit-assessment/route.ts` line 91: same
- `src/app/api/customers/import-docx/route.ts` line 84: `error instanceof Error ? error.message : ...` → returned
- `src/app/api/report/import/bk/route.ts` line 31: `"Server error: " + message` → includes Error.message
- `src/app/api/report/import/apc/route.ts`: likely same pattern

**Impact:** Internal paths, Prisma query errors, stack frames, or AI key configuration details can leak to browser/client.

**Fix:** Replace with `toHttpError(error, "safe fallback message").message` — this already sanitizes `Error.message` server-side (see `app-error.ts` lines 63–67). Apply this pattern in ALL catch blocks.

```ts
// BAD
return NextResponse.json({ error: error instanceof Error ? error.message : "..." }, { status: 500 });

// GOOD
const httpError = toHttpError(error, "Operation failed");
return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
```

---

### C-2: Missing ownership check — notifications PATCH/POST cross-user access (IDOR)
**Files:**
- `src/app/api/notifications/[id]/read/route.ts` lines 15–16
- `src/app/api/notifications/mark-all-read/route.ts` line 12

`PATCH /notifications/{id}/read` calls `notificationService.markRead(id)` with no check that `id` belongs to `session.user.id`. Any authenticated user can mark another user's notification as read by guessing/iterating IDs.

`POST /notifications/mark-all-read` calls `markAllRead()` with no `userId` scope — may mark ALL users' notifications as read if the service doesn't filter internally.

**Fix:**
```ts
// /notifications/[id]/read
const session = await requireSession();
const notification = await notificationService.getById(id);
if (notification.userId !== session.user.id && session.user.role !== "admin") {
  return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
}
await notificationService.markRead(id);

// mark-all-read
await notificationService.markAllRead({ userId: session.user.id });
```
Verify `notificationService.markAllRead()` implementation applies userId filter.

---

### C-3: Missing auth guard — `handleAuthError` not called in loans PATCH catch block
**File:** `src/app/api/loans/[id]/route.ts` lines 92–97 (PATCH handler)

```ts
} catch (error) {
  if (error instanceof z.ZodError) { ... }
  const httpError = toHttpError(error, "Failed to update loan.");  // ← no handleAuthError!
  return NextResponse.json(...);
}
```

`AuthError` thrown by `requireEditorOrAdmin()` (called on line 81) would be caught here and converted to a generic 500 instead of 401/403. `handleAuthError` is missing in this catch block.

**Fix:** Add `const authResponse = handleAuthError(error); if (authResponse) return authResponse;` before the `toHttpError` call.

---

## IMPORTANT Issues

### I-1: Cron secret exposed via query string
**File:** `src/app/api/cron/invoice-deadlines/route.ts` line 21

`?secret=` query param support means the cron secret appears in server access logs, CDN logs, and browser history.

**Fix:** Remove the `query` fallback, keep only `Authorization: Bearer` (Vercel standard) and `x-cron-secret` header.

```ts
const secret = bearer || custom; // remove: || query
```

---

### I-2: In-memory rate limiter not suitable for multi-instance / serverless
**File:** `src/lib/rate-limiter.ts`

Comment in file acknowledges "suitable for single-instance Node.js runtime". If deployed on Vercel (multiple serverless instances) each instance has its own Map → effective rate limit is `limit × instance_count`. Rate limiting on AI endpoints (10 req/min) becomes meaningless.

**Fix:** Use Redis-backed rate limiter (e.g. `@upstash/ratelimit`) for Vercel, OR document clearly that this is only valid for a single-machine deploy (which appears to be the design intent given the offline-workstation context). If offline-only, acceptable. Add a startup warning if `VERCEL` env is detected.

---

### I-3: `disbursements/[id]` PATCH — no ownership check for non-admin editors
**File:** `src/app/api/disbursements/[id]/route.ts` lines 43–53

PATCH calls `requireEditorOrAdmin()` but does NOT check `customerService.checkDisbursementAccess(id, session.user.id)` before mutating, unlike GET (lines 26–28) which does check. An editor can modify any disbursement regardless of ownership.

**Fix:** Add the same access check to PATCH as GET:
```ts
if (session.user.role !== "admin") {
  const ok = await customerService.checkDisbursementAccess(id, session.user.id);
  if (!ok) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
}
```

---

### I-4: `report/export` error handler leaks internal state via `details` field
**File:** `src/app/api/report/export/route.ts` lines 87–100

The catch block extracts `error.message` and `error.details`, then returns them in the response body as `details`. This bypasses the `toHttpError` sanitization specifically designed to prevent this. Also uses `any` cast.

**Fix:** Remove the manual `detailsStr` extraction and extra `console.error` lines. Rely solely on `toHttpError`:
```ts
const httpError = toHttpError(error, "Export failed.");
return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
```
Keep verbose logging server-side only (not in response).

---

### I-5: `branches/route.ts` and `config/branch-staff/route.ts` — raw `Error.message` in 500 responses + missing `handleAuthError`
**Files:**
- `src/app/api/branches/route.ts` lines 14, 46: `e instanceof Error ? e.message : "Unknown error"` returned directly
- `src/app/api/config/branch-staff/route.ts` lines 27, 71: same pattern; also missing `handleAuthError` in GET

**Fix:** Use `toHttpError` + `handleAuthError` pattern like other routes. Particularly: if `requireEditorOrAdmin` throws an `AuthError` in `PUT /config/branch-staff`, it returns 500 "Unknown error" instead of 403.

---

### I-6: `report/template/validate-upload` — only `requireSession` (viewer can analyze templates)
**File:** `src/app/api/report/template/validate-upload/route.ts` line 23

This endpoint parses DOCX content and reveals placeholder structure. Viewer role should arguably not access this. However this is a design judgment — if this is intentionally read-only for all roles, it's acceptable.

**Recommendation:** Upgrade to `requireEditorOrAdmin` to be consistent with other template endpoints.

---

### I-7: `disbursement/report` — raw error detail leaked in 500 response
**File:** `src/app/api/loans/[id]/disbursements/[disbursementId]/report/route.ts` line 39

```ts
const detail = error instanceof Error ? error.message : String(error);
return NextResponse.json({ ok: false, error: httpError.message, detail }, ...);
```

`detail` field bypasses `toHttpError` sanitization — internal Prisma/filesystem errors leak.

**Fix:** Remove the `detail` field from the error response.

---

### I-8: `proxy.ts` — cookie-only auth check, no session validation
**File:** `src/proxy.ts` lines 36–47

Middleware only checks for cookie existence (`getSessionCookie`), not validity. Expired or tampered cookies pass the middleware check. This is mitigated because each route calls `requireSession()` which does DB validation via `auth.api.getSession()`. However, the proxy gives a false sense of security for page-level protection (UI pages load, then 401 from API calls).

**Impact:** Low for API (routes re-validate), medium for UI (pages render briefly before redirect). Acceptable tradeoff documented in code comment.

---

## MINOR Issues

### M-1: `ai/extract-text` — no text length limit
**File:** `src/app/api/ai/extract-text/route.ts` line 25

`text` field from body is not length-limited. A user could paste megabytes of text → large Gemini API cost.

**Fix:** Add `if (text.length > 50_000) return 400 "Text too long"`.

---

### M-2: `customers/import-docx` — no file count limit
**File:** `src/app/api/customers/import-docx/route.ts` lines 25–26

`files = formData.getAll("files")` — no maximum file count check. Could be used to trigger many parallel AI calls.

**Fix:** Add `if (files.length > 5) return 400`.

---

### M-3: `branches/route.ts` POST — no Zod schema, manual body access
**File:** `src/app/api/branches/route.ts` lines 23–42

Body fields taken directly from `body.name`, `body.address`, etc. without schema validation. While Prisma parameterizes queries, unexpected field types could cause runtime errors.

**Fix:** Add a Zod schema for branch creation.

---

### M-4: `config/branch-staff` PUT syncs ALL customers without confirmation
**File:** `src/app/api/config/branch-staff/route.ts` lines 55–65

A single PUT call triggers `prisma.customer.updateMany()` with no limit — modifies all customers' branch/staff. This is likely intentional but is a destructive bulk operation with no idempotency token or dry-run mode. Risk: accidental call clears all customer branch assignments.

**Recommendation:** Add a `?confirm=true` query guard or restrict to `requireAdmin`.

---

## Proxy / Middleware Notes

`proxy.ts` correctly:
- Skips `/api/auth/*` (better-auth handles its own CSRF)
- Skips `/api/cron/*` (secret-based)
- Returns 401 for unauthenticated API calls
- Uses `safeCallbackUrl` to prevent open-redirect

No CSRF issues found — better-auth handles CSRF for session mutations; read-only GETs don't require CSRF tokens; the app appears to be same-origin (no cross-origin POST from untrusted origins).

---

## Summary Table

| ID | Severity | File(s) | Issue |
|----|----------|---------|-------|
| C-1 | CRITICAL | 8+ route files | Raw `Error.message` returned to client |
| C-2 | CRITICAL | notifications/[id]/read, mark-all-read | IDOR — no ownership check |
| C-3 | CRITICAL | loans/[id]/route.ts PATCH | Missing `handleAuthError` — AuthError → 500 |
| I-1 | IMPORTANT | cron/invoice-deadlines | Secret in query string → logs |
| I-2 | IMPORTANT | lib/rate-limiter.ts | In-memory limiter bypassed on multi-instance |
| I-3 | IMPORTANT | disbursements/[id] PATCH | No ownership check for editor role |
| I-4 | IMPORTANT | report/export | Error details leaked via `details` field |
| I-5 | IMPORTANT | branches, config/branch-staff | Raw error + missing handleAuthError |
| I-6 | IMPORTANT | report/template/validate-upload | Viewer can access template analysis |
| I-7 | IMPORTANT | disbursements report | `detail` field leaks internal error |
| I-8 | IMPORTANT | proxy.ts | Cookie existence ≠ session validity (design tradeoff) |
| M-1 | MINOR | ai/extract-text | No text length limit |
| M-2 | MINOR | customers/import-docx | No file count limit |
| M-3 | MINOR | branches POST | No Zod validation |
| M-4 | MINOR | config/branch-staff PUT | Bulk update no guard |

---

## Unresolved Questions

1. Does `notificationService.markAllRead()` filter by `userId` internally? If yes, C-2 severity drops from CRITICAL to IMPORTANT for that specific endpoint.
2. Is the rate limiter only ever deployed on a single Node.js instance (offline workstation)? If yes, I-2 is not applicable.
3. Are `notifications` scoped per-user or system-wide (broadcast)? Affects whether C-2 is exploitable in practice.
