# Code Review: Auth/RBAC Implementation

**Date:** 2026-03-09
**Scope:** Auth system with Better Auth, RBAC (admin/viewer), middleware, admin UI
**Files reviewed:** 8 new, 8 modified
**Build status:** Passes, 0 TypeScript errors

---

## Overall Assessment

Solid implementation. Better Auth is well-integrated with Prisma adapter, role system is clean, middleware provides appropriate cookie-based gate, and API routes correctly use `requireAdmin()` for write operations. A few security issues need attention, one critical.

---

## Critical Issues

### 1. Open Redirect via `callbackUrl` (OWASP A10)

**File:** `src/app/login/page.tsx` line 13

```ts
const callbackUrl = searchParams.get("callbackUrl") || "/report/mapping";
router.push(callbackUrl);
```

An attacker can craft `https://yoursite.com/login?callbackUrl=https://evil.com` -- after login, user is redirected to a phishing site. This is a classic open redirect.

**Fix:** Validate that callbackUrl is a relative path:
```ts
const raw = searchParams.get("callbackUrl") || "/report/mapping";
const callbackUrl = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/report/mapping";
```

### 2. No `BETTER_AUTH_SECRET` configured in `auth.ts`

**File:** `src/lib/auth.ts`

Better Auth requires a `secret` option for signing session tokens. Without explicit `secret`, Better Auth falls back to `BETTER_AUTH_SECRET` env var. If neither is set, it uses an insecure default in development and may fail in production.

**Action:** Verify `.env.local` contains `BETTER_AUTH_SECRET=<random-32-char-string>`. If relying on env var, this is OK but should be documented. Add to `.env.example` as well.

---

## High Priority

### 3. Public signup endpoint still open

**File:** `src/lib/auth.ts` line 10-12

`emailAndPassword: { enabled: true }` enables both sign-in AND sign-up via Better Auth's `/api/auth/sign-up/email` endpoint. For an invite-only system, public signup must be disabled.

**Fix:**
```ts
emailAndPassword: {
  enabled: true,
  disableSignUp: true, // Only admin can create users via admin plugin
},
```

This is the single most important security finding -- any visitor can self-register.

### 4. Many write API routes lack `requireAdmin()`

Only 4 routes have auth guards. These mutating endpoints are unprotected (middleware only checks cookie presence, not role):

| Route | Methods missing guard |
|---|---|
| `api/disbursements/[id]` | PATCH, DELETE |
| `api/disbursements/[id]/invoices` | POST |
| `api/beneficiaries/[id]` | PATCH, DELETE |
| `api/loans/[id]` | PATCH, DELETE |
| `api/loans/[id]/disbursements` | POST |
| `api/loans/[id]/beneficiaries` | POST |
| `api/loans/[id]/beneficiaries/import` | POST |
| `api/invoices/[id]` | PATCH, DELETE |
| `api/notifications/[id]/read` | PATCH |
| `api/notifications/mark-all-read` | POST |
| `api/report/field-templates` | POST, PATCH, PUT |
| `api/report/template/*` | POST, PUT, DELETE, PATCH |
| `api/report/catalog` | PUT |
| `api/report/build` | POST |
| `api/report/export` | POST |
| `api/report/export-data` | POST |
| `api/report/validate` | POST |
| `api/report/mapping` | POST |
| `api/report/mapping-instances/[id]` | PUT, PATCH, DELETE |
| `api/report/master-templates` | PUT |
| `api/report/master-templates/[id]` | DELETE |
| `api/report/import*` | POST |
| `api/report/auto-process/*` | POST |
| `api/report/auto-tagging/*` | POST |
| `api/report/financial-analysis/*` | POST |
| `api/report/mapping/ocr-process` | POST |
| `api/report/mapping/docx-process` | POST |
| `api/customers/to-draft`, `api/customers/from-draft` | POST |

**Recommendation:** For viewer-read/admin-write model, add `requireAdmin()` to all POST/PATCH/PUT/DELETE handlers. Or add `requireSession()` minimum to enforce authenticated access at the handler level (defense in depth beyond middleware cookie check).

### 5. Admin page protection is client-side only

**File:** `src/app/report/admin/users/page.tsx`

Protection is via `useEffect` redirect + conditional render (`return null`). A viewer can still access the page component and see a brief flash before redirect. More importantly, the Better Auth admin plugin endpoints (`/api/auth/admin/*`) do their own server-side role check, so data is safe -- but the UX leaks the admin route existence.

**Recommendation:** Consider a server component wrapper or middleware rule for `/report/admin/*` paths that checks role via session. Low urgency since the admin API itself is protected by Better Auth.

---

## Medium Priority

### 6. Admin page exceeds 200-line limit (280 lines)

**File:** `src/app/report/admin/users/page.tsx` -- 280 lines

Per project rules, split into:
- `admin-users-page.tsx` (main page)
- `admin-user-row.tsx` (UserRow component)
- `admin-create-user-form.tsx` (CreateUserForm component)

### 7. Hardcoded English strings in admin page

**File:** `src/app/report/admin/users/page.tsx`

Lines 77, 98-102, 170, 276: "Create User", "Cancel", "Name", "Email", "Role", "Created", "Actions", "Creating...", etc. are hardcoded English. Should use `t()` from `useLanguage()` for consistency with rest of app.

### 8. `toggleRole` and `removeUser` lack error handling

**File:** `src/app/report/admin/users/page.tsx` lines 133-143

Both functions call `authClient.admin.*` without try-catch or error result checking. If the API fails, user sees no feedback.

### 9. Layout file exceeds 200-line limit (283 lines)

**File:** `src/app/report/layout.tsx` -- 283 lines

The sidebar bottom controls section (auth buttons, theme toggle, language) could be extracted into a separate component.

### 10. Seed script default password

**File:** `prisma/seed-admin.ts` line 15

Default password `changeme123!` is weak. The seed script documents env var override which is good, but consider:
- Adding a console warning: "Using default password -- change immediately"
- Or requiring `SEED_ADMIN_PASSWORD` to be set (no default)

---

## Low Priority

### 11. Cookie cache TTL tradeoff

**File:** `src/lib/auth.ts` line 16

5-minute cookie cache means role changes (e.g., admin demotes a user) take up to 5 min to take effect. Acceptable for this app's scale, but worth documenting.

### 12. `role` type casting in admin page

**File:** `src/app/report/admin/users/page.tsx` lines 136, 203

`as "admin"` type cast is needed due to Better Auth client type limitations. Add a comment explaining this is intentional for custom "viewer" role.

---

## Positive Observations

1. **Clean guard pattern** -- `requireSession()` / `requireAdmin()` / `handleAuthError()` is well-designed, reusable, and ergonomic
2. **Idempotent seed** -- checks for existing admin before creating, handles legacy `createdBy` migration
3. **Proper cascade deletes** in Prisma schema for auth models
4. **Middleware structure** is clean -- public paths, cron/OnlyOffice exemptions, cookie check, appropriate 401 vs redirect
5. **`mapping-instances` POST** correctly uses `session.user.id` for `createdBy` instead of client-provided value
6. **Session cookie redirect** on `/login` prevents authenticated users from seeing login page
7. **Consistent error handling pattern** with `handleAuthError()` in catch blocks

---

## Recommended Actions (Priority Order)

1. **[CRITICAL]** Disable public signup: add `disableSignUp: true` to `emailAndPassword` config
2. **[CRITICAL]** Fix open redirect in callbackUrl validation
3. **[HIGH]** Verify `BETTER_AUTH_SECRET` is set in production env
4. **[HIGH]** Add `requireAdmin()` or `requireSession()` to remaining ~30 unprotected write endpoints
5. **[MEDIUM]** Split admin page into sub-components (<200 lines each)
6. **[MEDIUM]** i18n: replace hardcoded English strings in admin page
7. **[MEDIUM]** Add error handling to toggleRole/removeUser
8. **[LOW]** Document cookie cache TTL tradeoff

---

## Unresolved Questions

1. Should viewers be able to create/edit loans, disbursements, invoices? Current implementation only protects customers and loans POST routes. Need clarity on which operations are admin-only vs viewer-allowed.
2. Is `BETTER_AUTH_SECRET` properly set in `.env.local` and production environment? Could not verify without reading `.env.local` (privacy-protected).
3. Should the app rate-limit login attempts? Better Auth does not provide this out of the box.
