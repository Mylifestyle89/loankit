# Phase 04 — IMPORTANT Security

## Context
- Report: `plans/reports/code-reviewer-260502-1559-api-security.md` (I-1..I-5)

## Overview
- **Priority:** P2
- **Status:** pending
- **Description:** Remove cron secret from query string, document/guard rate-limiter scope, add disbursement PATCH ownership check, stop leaks in `report/export` and `branches`.

## Issues

### S-I1 — Cron secret in query string
**File:** `src/app/api/cron/invoice-deadlines/route.ts` L21

**BEFORE:**
```ts
const secret = bearer || custom || query;
```
**AFTER:**
```ts
const secret = bearer || custom; // remove query fallback (logged in access logs)
```

### S-I2 — In-memory rate limiter on serverless
**File:** `src/lib/rate-limiter.ts`

**Decision needed (see Unresolved):** Project is offline máy trạm (single instance) per `project_2fa_requirements.md` memory → rate limiter is OK. Add startup guard:
```ts
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  console.warn("[rate-limiter] In-memory limiter detected on multi-instance host. Switch to Redis (@upstash/ratelimit).");
}
```
Add module top-level comment explaining single-instance assumption + link to memory.

### S-I3 — `disbursements/[id]` PATCH no ownership check
**File:** `src/app/api/disbursements/[id]/route.ts` L43-53

**Insert (mirror GET L26-28):**
```ts
const session = await requireEditorOrAdmin();
const { id } = await params;
if (session.user.role !== "admin") {
  const ok = await customerService.checkDisbursementAccess(id, session.user.id);
  if (!ok) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
}
```

### S-I4 — `report/export` `details` field leaks
**File:** `src/app/api/report/export/route.ts` L87-100

Already covered in Phase 1 S-C1 — verify done. If split: drop `details` field, use `toHttpError` only.

### S-I5 — `branches` + `config/branch-staff` raw error + missing handleAuthError
**Files:**
- `src/app/api/branches/route.ts` L14, L46
- `src/app/api/config/branch-staff/route.ts` L27, L71

Apply Phase 1 S-C1/S-C3 pattern: `handleAuthError(error)` first, then `toHttpError`.

Also (M-3 from API report): add Zod schema for `branches` POST body.
```ts
const createBranchSchema = z.object({
  name: z.string().min(1).max(200),
  branch_code: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  // ...other fields confirmed from existing usage
});
```

## Implementation Steps
1. Patch cron secret query removal.
2. Add rate-limiter startup warning + comment.
3. Patch disbursement PATCH ownership check; verify `customerService.checkDisbursementAccess` exists (mirror GET).
4. Confirm Phase 1 covered `report/export`; if not, fix.
5. Patch `branches` + `config/branch-staff` catch blocks; add Zod schema.
6. Manual test: cron without `Authorization` header → 401; editor PATCH another user's disbursement → 403.

## Todo
- [ ] Remove `?secret=` query fallback in cron route
- [ ] Add rate-limiter env warning + doc comment
- [ ] Add ownership check to disbursement PATCH
- [ ] Verify `report/export` cleaned
- [ ] Fix `branches` GET/POST error handling + Zod
- [ ] Fix `config/branch-staff` GET/PUT error handling
- [ ] Manual test cron auth + editor access

## Success Criteria
- No secret appears in query string anywhere
- Disbursement PATCH respects ownership like GET
- All catch blocks use `toHttpError` + `handleAuthError`

## Risk
- **R1:** External cron caller may be using query param — coordinate cutover (update Vercel cron config / shell script first).
- **R2:** Zod schema for `branches` may reject existing curl scripts — verify field list against current callers.
