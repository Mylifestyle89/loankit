# Planner Report: Auth, RBAC & Invite-Only Registration

**Date:** 2026-03-09 | **Status:** Plan complete

## Summary
Created 7-phase implementation plan for adding Better Auth with email/password login, RBAC (admin/viewer roles), and invite-only user management.

## Plan Location
`plans/260309-1032-auth-rbac-implementation/`

## Phases (total effort: ~10h)

| # | Phase | Effort | Depends on |
|---|-------|--------|------------|
| 1 | DB Schema & Better Auth Setup | 1.5h | — |
| 2 | Login Page & Auth Flow | 1.5h | Phase 1 |
| 3 | Middleware & Page Protection | 1h | Phase 1 |
| 4 | API Route Protection (70+ routes) | 2h | Phase 1, 3 |
| 5 | Admin User Management Panel | 2h | Phase 1-4 |
| 6 | Sidebar Integration & UX | 1h | Phase 1-3 |
| 7 | Migration & Seed Data | 1h | Phase 1 |

## Key Decisions
- **Better Auth** with Prisma adapter (provider: "sqlite"), admin plugin for RBAC
- **Cookie-based sessions** with compact cookie caching (reduce Turso latency)
- **Middleware** does cookie-only check (fast); API routes do full session validation
- **DRY auth helpers:** `requireSession()` and `requireAdmin()` in `src/lib/auth-guard.ts`
- **No public signup** — admin creates users via admin panel
- **Roles:** admin (full access + user mgmt), viewer (read-only). Manager deferred.

## New Files Created
- `src/lib/auth.ts` — Better Auth server config
- `src/lib/auth-client.ts` — Client hooks
- `src/lib/auth-guard.ts` — API route protection helpers
- `src/app/api/auth/[...all]/route.ts` — Auth API handler
- `src/app/login/page.tsx` — Login page
- `src/app/report/admin/users/page.tsx` — Admin user management
- `middleware.ts` — Route protection
- `prisma/seed-admin.ts` — Initial admin seed

## Files Modified
- `prisma/schema.prisma` — 4 new models (User, Session, Account, Verification)
- `src/app/report/layout.tsx` — User info, logout, admin link in sidebar
- `package.json` — Add better-auth dep, seed script
- All 70+ API route files — Add auth guards
- MappingInstance-related services — createdBy to real user ID

## Risks
1. **SQLite on Vercel:** Must use Turso for production (sessions in DB)
2. **70+ routes to update:** Large scope, batch carefully
3. **OnlyOffice callback:** Server-to-server route needs session exemption
4. **Breaking change:** All external API consumers will need auth

## Recommended Execution Order
Phases 1 -> 7 -> 2 -> 3 -> 4 -> 6 -> 5
(Seed admin early so login can be tested immediately)
