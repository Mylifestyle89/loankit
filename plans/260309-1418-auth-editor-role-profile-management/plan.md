---
title: "Auth: Editor Role, Ownership & Profile Management"
description: "Add editor role with template ownership, email/password management for admin+self-service"
status: complete
priority: P1
effort: 6h
branch: Deploy-test
tags: [auth, rbac, editor, profile, admin]
created: 2026-03-09
completed: 2026-03-09
---

# Auth: Editor Role, Ownership & Profile Management

## Overview

Three connected features: (1) new "editor" role with ownership-based template access, (2) template API route protection, (3) email/password management for admin and self-service.

## Current State

- **Auth**: Better Auth v1.5.4, Prisma adapter, admin plugin. Roles: admin, viewer.
- **Guards**: `requireSession()`, `requireAdmin()` in `src/lib/auth-guard.ts`
- **Template APIs**: Most routes have NO auth checks. Only `POST /mapping-instances` uses `requireAdmin`.
- **Models**: `MappingInstance` has `createdBy` field; `FieldTemplateMaster` does NOT.
- **Admin panel**: `src/app/report/admin/users/page.tsx` - user CRUD, role toggle (admin/viewer only)

## Phases

| # | Phase | Status | Effort | File |
|---|-------|--------|--------|------|
| 1 | Editor role + Prisma schema | complete | 30m | [phase-01](phase-01-editor-role-schema.md) |
| 2 | Auth guard enhancements | complete | 45m | [phase-02](phase-02-auth-guard-enhancements.md) |
| 3 | Template API route protection | complete | 1.5h | [phase-03](phase-03-template-api-protection.md) |
| 4 | Email/password change API + profile page | complete | 2h | [phase-04](phase-04-email-password-profile.md) |
| 5 | Admin panel enhancements | complete | 1h | [phase-05](phase-05-admin-panel-enhancements.md) |

## Key Dependencies

- Phase 2 depends on Phase 1 (role definition)
- Phase 3 depends on Phase 2 (guard functions)
- Phase 4-5 can proceed in parallel after Phase 1
