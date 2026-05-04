# Phase 01 — CRITICAL Security

## Context
- Reports: `plans/reports/code-reviewer-260502-1559-api-security.md` (C-1, C-2, C-3)
- Helper: `src/core/errors/app-error.ts` (`toHttpError` already sanitizes — line 57-68)
- Auth helper: `src/lib/auth-utils.ts` (`handleAuthError`)

## Overview
- **Priority:** P1 (CRITICAL)
- **Status:** pending
- **Description:** Sanitize raw `Error.message` leaks across 8+ API routes; close IDOR on notifications; restore proper 401/403 on `loans/[id]` PATCH.

## Issues

### S-C1 — Raw `Error.message` returned to client
**Files + lines:**
- `src/app/api/report/export/route.ts` L87-97 — `details: detailsStr` from `error.message`
- `src/app/api/report/snapshots/restore/route.ts` L30
- `src/app/api/loans/[id]/route.ts` L96-97 (PATCH catch — also missing `handleAuthError`, see S-C3)
- `src/app/api/loan-plans/[id]/ai-analyze/route.ts` L102
- `src/app/api/loan-plans/[id]/ai-credit-assessment/route.ts` L91
- `src/app/api/customers/import-docx/route.ts` L84
- `src/app/api/report/import/bk/route.ts` L31 — `"Server error: " + message`
- `src/app/api/report/import/apc/route.ts` (likely same — confirm via grep)
- `src/app/api/loans/[id]/disbursements/[disbursementId]/report/route.ts` L39 — `detail` field

**Pattern (BEFORE → AFTER):**
```ts
// BEFORE
return NextResponse.json({ error: error instanceof Error ? error.message : "..." }, { status: 500 });

// AFTER
const httpError = toHttpError(error, "Operation failed.");
return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
```
Drop any extra `details` / `detail` field that surfaces raw error text.

### S-C2 — IDOR on notifications endpoints
**Files:**
- `src/app/api/notifications/[id]/read/route.ts` L15-16
- `src/app/api/notifications/mark-all-read/route.ts` L12

**Fix `[id]/read`:** Fetch notification, compare `userId` to `session.user.id` (admin bypass).
```ts
const session = await requireSession();
const notification = await notificationService.getById(id);
if (!notification) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
if (notification.userId !== session.user.id && session.user.role !== "admin") {
  return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
}
await notificationService.markRead(id);
```

**Fix `mark-all-read`:** Pass `userId` scope.
```ts
await notificationService.markAllRead({ userId: session.user.id });
```
**Verify:** Read `src/services/notification.service.ts` to confirm `markAllRead()` filters by `userId`. If not, add the filter inside service.

### S-C3 — Missing `handleAuthError` in `loans/[id]` PATCH
**File:** `src/app/api/loans/[id]/route.ts` L91-98

**Fix:** Insert before `toHttpError`:
```ts
} catch (error) {
  const authResponse = handleAuthError(error);
  if (authResponse) return authResponse;
  if (error instanceof z.ZodError) { ... }
  const httpError = toHttpError(error, "Failed to update loan.");
  ...
}
```
Audit other PATCH/POST/DELETE handlers in `src/app/api/loans/`, `disbursements/`, `customers/` for same gap.

## Implementation Steps
1. Grep for offending pattern: `error instanceof Error ? error.message`. Capture full list of catch blocks.
2. Read `notification.service.ts` to confirm `markAllRead` signature.
3. Apply S-C1 fix to each file from the list — replace raw message with `toHttpError`.
4. Apply S-C2 — add ownership guard to `[id]/read`; pass userId to `mark-all-read`; patch service if needed.
5. Apply S-C3 — insert `handleAuthError(error)` first in PATCH catch; sweep adjacent route files for missing `handleAuthError` after `requireEditorOrAdmin`/`requireAdmin`.
6. Smoke test: hit `/api/notifications/{otherUserId}/read` from second account → expect 403; hit `/api/loans/{id}` PATCH unauthenticated → expect 401.

## Todo
- [ ] Grep + enumerate all `error.message` raw-return sites
- [ ] Fix `report/export` (drop `details` + `detailsStr`)
- [ ] Fix `report/snapshots/restore`
- [ ] Fix `loans/[id]` PATCH (S-C1 + S-C3)
- [ ] Fix `loan-plans/[id]/ai-analyze`
- [ ] Fix `loan-plans/[id]/ai-credit-assessment`
- [ ] Fix `customers/import-docx`
- [ ] Fix `report/import/bk` + `report/import/apc`
- [ ] Fix disbursement report `detail` field
- [ ] Fix notifications `[id]/read` ownership
- [ ] Fix notifications `mark-all-read` userId scope (verify service)
- [ ] Sweep other catch blocks for missing `handleAuthError`
- [ ] Manual test 401/403/200 paths

## Success Criteria
- No catch block returns `error.message` directly to client
- Cross-user notification PATCH → 403
- `loans/[id]` PATCH without auth → 401, not 500
- All existing tests pass

## Risk
- **R1:** Changing notification `markAllRead` signature may break callers — check all usages.
- **R2:** Stripping `details` from `report/export` may remove debugging info ops team relies on. Mitigation: keep verbose `console.error` server-side.
