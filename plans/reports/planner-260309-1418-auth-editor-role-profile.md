# Planner Report: Auth Editor Role & Profile Management

**Date:** 2026-03-09
**Plan:** `plans/260309-1418-auth-editor-role-profile-management/`

## Summary

Created 5-phase implementation plan for 3 features: editor role, template ownership enforcement, email/password management.

## Codebase Analysis

- Auth: Better Auth v1.5.4, admin plugin, SQLite/Prisma. Roles: admin/viewer
- Template APIs: 6 route files, most UNPROTECTED (only mapping-instances POST has requireAdmin)
- Admin panel: 281 lines — needs modularization
- MappingInstance has `createdBy`; FieldTemplateMaster does NOT

## Plan Structure (5 phases, ~6h total)

| Phase | What | Effort | Dependencies |
|-------|------|--------|-------------|
| 1 | Add editor role + createdBy to FieldTemplateMaster schema | 30m | none |
| 2 | New auth guards: requireEditorOrAdmin, requireOwnerOrAdmin | 45m | P1 |
| 3 | Protect all 6 template API route files with auth+ownership | 1.5h | P2 |
| 4 | Self-service profile page + email/password change | 2h | P1 |
| 5 | Admin panel: edit any user's email/password + modularize | 1h | P1, P4 |

## Key Decisions

1. **editor is NOT an adminRole** — Better Auth adminRoles stays `["admin"]`. Editor is a custom role string
2. **Ownership model**: editor can only modify resources where `createdBy === session.user.id`. Admin bypasses
3. **FieldTemplateMaster gets createdBy** with default "system" — safe migration for existing records
4. **No email verification** for email change — internal tool, not public-facing
5. **Admin password reset** doesn't require current password — intentional admin override
6. **Admin panel modularization** — extract 3 components to keep files under 200 lines

## Execution Order

P1 → P2 → P3 (sequential, dependencies)
P4 and P5 can start after P1 (parallel with P2/P3)

## Unresolved Questions

1. Better Auth `changeEmail` client API availability — need to verify at implementation; fallback is custom Prisma-based API
2. Better Auth admin `setPassword` API — need to verify exact signature; fallback is Prisma + bcrypt hash
3. Whether session needs refresh after email change — likely yes, handle in UI
