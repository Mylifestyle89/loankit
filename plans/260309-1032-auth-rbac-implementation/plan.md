---
title: "Auth, RBAC & Invite-Only Registration"
description: "Add Better Auth with email/password, RBAC (admin/viewer), invite-only user management to Next.js app"
status: complete
priority: P1
effort: 10h
branch: Deploy-test
tags: [auth, rbac, better-auth, security]
created: 2026-03-09
---

# Auth, RBAC & Invite-Only Registration

## Context
- **Scout report:** `plans/reports/scout-260309-1027-auth-rbac-codebase-analysis.md`
- **Brainstorm:** `plans/reports/brainstorm-260309-1032-auth-rbac-decisions.md`
- **Current state:** Zero auth. 70+ API routes, 13 pages all public.
- **Stack:** Next.js 16.1.6, Prisma 7, SQLite/Turso, Vercel serverless

## Tech Decision Summary

| Decision | Choice |
|----------|--------|
| Auth library | Better Auth (TS-first, admin plugin built-in) |
| Login method | Email/password only |
| Registration | Invite-only (admin creates users) |
| Sessions | Cookie-based with cookie caching (compact encoding) |
| DB | Keep SQLite/Turso (Better Auth Prisma adapter, provider: "sqlite") |
| Roles | admin, viewer (manager added later) |
| RBAC approach | Better Auth admin plugin (role field on User) |

## Architecture Overview

```
[Browser] --> [Next.js Middleware] --> [App Router Pages/API]
                |                          |
          cookie check              auth.api.getSession()
          (redirect to               (verify session)
           /login if no cookie)            |
                                    [Better Auth]
                                         |
                                    [Prisma/SQLite]
                                    (User, Session,
                                     Account, Verification)
```

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | DB Schema & Better Auth Setup | complete | 1.5h |
| 2 | Login Page & Auth Flow | complete | 1.5h |
| 3 | Middleware & Page Protection | complete | 1h |
| 4 | API Route Protection | complete | 2h |
| 5 | Admin User Management Panel | complete | 2h |
| 6 | Sidebar Integration & UX | complete | 1h |
| 7 | Migration & Seed Data | complete | 1h |

## Key Dependencies
- `better-auth` npm package
- Prisma schema changes (4 new models: User, Session, Account, Verification)
- Environment variables: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`

## Risk Assessment
- **SQLite on Vercel:** Sessions stored in DB. With Turso (remote SQLite), this works fine. Local SQLite won't persist on Vercel. Ensure Turso is configured for production.
- **70+ routes to protect:** Use middleware for pages + shared helper for API routes to avoid missing any.
- **Breaking change:** `MappingInstance.createdBy` currently hardcoded "web-user" — needs migration to real user IDs.
