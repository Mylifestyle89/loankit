---
title: "Fix All Codebase Review Issues"
description: "Address all critical, important, and minor issues from 3 code review reports"
status: pending
priority: P1
effort: 16h
branch: KHCN-implement
tags: [security, quality, refactoring]
created: 2026-03-14
---

# Fix Codebase Review Issues

Based on 3 review reports covering backend APIs, core libs, and frontend components.

## Phases

| # | Phase | Priority | Effort | Status | Deps |
|---|-------|----------|--------|--------|------|
| 1 | [Security & Auth Guards](phase-01-critical-security.md) | CRITICAL | 3h | pending | - |
| 2 | [Critical Frontend Fixes](phase-02-critical-frontend.md) | CRITICAL | 2h | pending | - |
| 3 | [Backend Pagination & Validation](phase-03-backend-improvements.md) | IMPORTANT | 3h | pending | P1 |
| 4 | [Frontend DRY & A11y](phase-04-frontend-improvements.md) | IMPORTANT | 3h | pending | P2 |
| 5 | [Core Lib Splitting & Fixes](phase-05-core-lib-fixes.md) | IMPORTANT | 3h | pending | P1 |
| 6 | [Minor Cleanups](phase-06-minor-fixes.md) | MINOR | 2h | pending | P3,P4,P5 |

## Execution Order

```
P1 (security) ──┬──> P3 (backend) ──┐
                 ├──> P5 (core)     ├──> P6 (minor)
P2 (frontend) ──┴──> P4 (frontend) ┘
```

## Sources

- [Backend Review](../reports/code-reviewer-260314-0837-backend-api-services.md)
- [Core Lib Review](../reports/code-reviewer-260314-0838-core-lib-review.md)
- [Frontend Review](../reports/code-reviewer-260314-0838-frontend-components.md)
