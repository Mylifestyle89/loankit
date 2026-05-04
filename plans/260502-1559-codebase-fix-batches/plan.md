---
title: "Codebase Review Fix Batches — 2026-05-02"
description: "Fix 8 CRITICAL + 19 IMPORTANT issues from full codebase scan, batched by impact then area"
status: pending
priority: P1
effort: ~14h
branch: main
tags: [security, architecture, frontend, refactor, bugfix]
created: 2026-05-02
---

## Source of Truth (Reports)
- Summary: `plans/reports/code-reviewer-260502-1559-codebase-scan-summary.md`
- API Security: `plans/reports/code-reviewer-260502-1559-api-security.md`
- Architecture: `plans/reports/code-reviewer-260502-1559-architecture.md`
- Frontend Quality: `plans/reports/code-reviewer-260502-1559-frontend-quality.md`

## Phase Index

| # | File | Priority | Status | Effort | Scope |
|---|------|----------|--------|--------|-------|
| 1 | [phase-01-critical-security.md](./phase-01-critical-security.md) | P1 | pending | 2h | S-C1, S-C2, S-C3 — error leaks, IDOR, missing handleAuthError |
| 2 | [phase-02-critical-data-integrity.md](./phase-02-critical-data-integrity.md) | P1 | pending | 1.5h | A-C1, A-C2, A-C3 — atomic dual-write, customer lookup, migration race |
| 3 | [phase-03-critical-frontend.md](./phase-03-critical-frontend.md) | P1 | pending | 1h | F-C1, F-C2 — silent data loss, stale closures |
| 4 | [phase-04-important-security.md](./phase-04-important-security.md) | P2 | pending | 2h | S-I1..S-I5 |
| 5 | [phase-05-important-architecture.md](./phase-05-important-architecture.md) | P2 | pending | 4h | A-I1..A-I9 + Prisma migration |
| 6 | [phase-06-important-frontend.md](./phase-06-important-frontend.md) | P2 | pending | 3h | F-I1..F-I5 + edge cases |

## Dependencies
- Phases independently deployable.
- Phase 5 includes `npx prisma migrate dev --name add_branch_verification_indexes` → run on staging first.
- Phase 1 affects 8+ route files but each change is local (no shared refactor blocker).

## Tech Stack
Next.js 14 App Router · TypeScript · Prisma · better-auth · Zustand · Zod

## Principles
YAGNI · KISS · DRY · No mocks/fake fixes · Real implementations only

## Definition of Done
- All 8 CRITICAL issues resolved + verified by code review
- All 19 IMPORTANT issues resolved
- No regression in existing tests
- DB migration applied successfully on dev + staging
- Docs updated (`docs/project-changelog.md`) per phase completion
