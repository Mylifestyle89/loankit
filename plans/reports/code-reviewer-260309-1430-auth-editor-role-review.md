# Code Review: Auth Editor Role, Ownership & Profile Management

**Date:** 2026-03-09
**Reviewer:** code-reviewer
**Build:** 0 TypeScript errors

## Scope
- Files: 14 changed (2 new, 12 modified)
- Focus: Security (RBAC correctness), auth guards, ownership checks, profile self-service
- LOC reviewed: ~700 lines of changed/new code

## Overall Assessment

Solid implementation. Auth guard architecture is clean and composable. Ownership model (editor owns, admin bypasses) is correctly applied. Two security issues found -- one critical, one high.

---

## Critical Issues

### C1. No password length validation on admin-manage endpoint
**File:** `src/app/api/user/admin-manage/route.ts` line 36
**Impact:** Admin can set 1-character passwords, bypassing the 8-char minimum enforced on the client.
**Detail:** `body.newPassword` is used directly without server-side length check. The `minLength={8}` in `edit-user-dialog.tsx` is client-only and trivially bypassed.

```typescript
// Fix: Add validation before hashing
if (body.newPassword) {
  if (body.newPassword.length < 8) {
    return NextResponse.json({ ok: false, error: "Password must be at least 8 characters" }, { status: 400 });
  }
  const { hashPassword } = await import("better-auth/crypto");
  // ...
}
```

### C2. GET routes for customers and loans lack auth guards
**Files:**
- `src/app/api/customers/route.ts` GET (line 22) -- no `requireSession()`
- `src/app/api/customers/[id]/route.ts` GET (line 23) -- no `requireSession()`
- `src/app/api/loans/route.ts` GET (line 21) -- no `requireSession()`

**Impact:** Unauthenticated users can read all customer data and loan details. This is sensitive financial data (customer names, loan amounts, contract numbers).
**Note:** POST/PATCH/DELETE on these routes DO have `requireAdmin()`, so only reads are exposed. Still critical for a financial app.

---

## High Priority

### H1. Email validation missing on admin-manage endpoint
**File:** `src/app/api/user/admin-manage/route.ts` line 27
**Detail:** `body.email` is accepted without format validation. Invalid email strings will be stored in DB. Consider adding `z.string().email()` or a basic regex check.

### H2. Non-atomic email + password update
**File:** `src/app/api/user/admin-manage/route.ts` lines 27-43
**Detail:** Email update and password update are separate DB calls. If email succeeds but password hashing fails, you get a partial update. Wrap in `prisma.$transaction()`.

### H3. Self-service email change uses `authClient.changeEmail` but no re-verification
**File:** `src/app/report/account/page.tsx` line 85
**Detail:** The message says "Re-login may be required" but Better Auth's `changeEmail` may require email verification depending on config. If email verification is disabled in `auth.ts`, users can change to any email (including non-owned ones) without proof of ownership. Verify Better Auth config enforces verification.

### H4. `requireOwnerOrAdmin` returns 403 for viewers even on their own resources
**File:** `src/lib/auth-guard.ts` line 52
**Detail:** The function only allows `admin` or `editor` roles. A viewer who somehow created a resource (e.g., before role was downgraded) cannot access it. This is probably intentional but worth documenting explicitly.

### H5. Role cycle includes admin -> editor transition with single click
**File:** `src/app/report/admin/users/page.tsx` line 107
**Detail:** The role cycle is `admin -> editor -> viewer -> admin`. An admin can accidentally demote another admin with one click (no confirmation dialog). Consider adding a confirmation for admin role changes, especially demotions.

---

## Medium Priority

### M1. `users/page.tsx` exceeds 200-line guideline (220 lines)
Split `CreateUserForm` into its own file (like `edit-user-dialog.tsx` was already extracted).

### M2. Hardcoded English strings in account page and users page
- "Updated!", "Password changed!", "Error", "Create User", "Cancel", "Name", "Email", "Password" etc.
- Should use `t()` translations for vi/en consistency.

### M3. `Msg` component uses string matching for error detection
**File:** `src/app/report/account/page.tsx` line 179
```typescript
const isError = !text.includes("Updated") && !text.includes("changed");
```
Fragile -- if success message text changes, error styling breaks. Pass an `isError` boolean prop instead.

### M4. `roleBadgeClass` duplicated in 2 files
- `src/app/report/account/page.tsx` lines 23-28
- `src/app/report/admin/users/page.tsx` lines 119-124
Extract to shared utility or component.

### M5. Missing `try-catch` around `authClient.admin.setRole` and `authClient.admin.removeUser`
**File:** `src/app/report/admin/users/page.tsx` lines 106-116
If these calls fail, there is no error handling -- the UI silently does nothing.

### M6. `EditUserDialog` rendered as `<tr>` inside table but not using BaseModal
Inline editing is fine UX-wise, but lacks keyboard escape handling. Not a BaseModal candidate since it's a table row, but consider adding `onKeyDown` for Escape.

---

## Low Priority

### L1. `as "admin"` type assertion in role-related calls
**Files:** `page.tsx` lines 109, 181
Better Auth client types expect specific role literals. The assertion `as "admin"` is a workaround. Acceptable but document why.

### L2. `created_by` field naming inconsistency
Prisma schema uses `createdBy` (camelCase) but some service files map to `created_by` (snake_case). Existing pattern, not introduced by this PR.

---

## Edge Cases Found by Scout

1. **Race condition in ownership check:** `mapping-instances/[id]/route.ts` fetches instance, then checks ownership. Between fetch and update, the resource could be deleted or ownership transferred. Low risk in practice (single-user edits).

2. **Admin self-demotion:** An admin can change their own role via direct API call to Better Auth admin endpoint (not through the UI, which hides self-actions). If `authClient.admin.setRole` doesn't prevent self-demotion, the last admin could lock themselves out.

3. **`createdBy` default values:** `FieldTemplateMaster.createdBy` defaults to `"system"`, `MappingInstance.createdBy` defaults to `"web-user"`. Pre-existing records have these placeholder values. `requireOwnerOrAdmin("system")` or `requireOwnerOrAdmin("web-user")` will always fail for editors, effectively making pre-migration resources admin-only. This is probably correct but may confuse editors.

4. **Field template PATCH/PUT lack ownership check:** `field-templates/route.ts` PUT and PATCH use `requireEditorOrAdmin()` but no ownership check. Any editor can modify any field template, not just their own. Compare with `mapping-instances/[id]/route.ts` which does check ownership.

5. **Master template DELETE lacks ownership check:** `master-templates/[id]/route.ts` DELETE uses `requireEditorOrAdmin()` without ownership verification. Any editor can delete any master template.

---

## Positive Observations

- `auth-guard.ts` is well-structured: composable guards, clean error handling
- Ownership pattern in `mapping-instances/[id]` is exemplary -- fetch resource, check owner, then proceed
- `handleAuthError` utility prevents leaking stack traces
- `createdBy` properly set from `session.user.id` in POST handlers
- Password hashing delegates to Better Auth's `hashPassword` (good, no custom crypto)
- Admin manage endpoint correctly checks email uniqueness before update

---

## Recommended Actions (Priority Order)

1. **[CRITICAL]** Add `requireSession()` to GET handlers in `customers/route.ts`, `customers/[id]/route.ts`, `loans/route.ts`
2. **[CRITICAL]** Add server-side password length validation in `admin-manage/route.ts`
3. **[HIGH]** Add email format validation in `admin-manage/route.ts`
4. **[HIGH]** Add ownership checks to `field-templates` PUT/PATCH and `master-templates` DELETE (consistent with mapping-instances pattern)
5. **[HIGH]** Wrap email+password update in `prisma.$transaction()`
6. **[MEDIUM]** Extract `CreateUserForm` to keep `page.tsx` under 200 lines
7. **[MEDIUM]** Replace hardcoded English strings with `t()` calls
8. **[MEDIUM]** Fix `Msg` component to use boolean `isError` prop
9. **[LOW]** Add confirmation dialog for admin role changes

## Metrics
- Type Coverage: Good (explicit types on API bodies, session returns)
- Test Coverage: No auth-specific tests observed
- Linting Issues: 0 (build passes clean)

## Unresolved Questions

1. Is Better Auth configured to require email verification on `changeEmail`? If not, users can claim any email.
2. Is there a safeguard against the last admin demoting themselves via direct API?
3. Should editors be able to modify field templates and master templates they did not create? (Current: yes, unlike mapping instances which have ownership checks)
