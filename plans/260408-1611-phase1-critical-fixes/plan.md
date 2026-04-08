---
title: "Phase 1 — Critical fixes (auth + interest formula + tests)"
description: "Cấp cứu 3 lỗi critical từ code review 2026-04-08: thiếu auth guard, sai công thức lãi vay, zero test loan-plan"
status: pending
priority: P1
effort: 3h
branch: main
tags: [security, auth, loan-plan, tests, critical]
created: 2026-04-08
---

# Phase 1 — Critical Fixes

## Context
Code review 2026-04-08 (3 reports) phát hiện 3 nhóm lỗi critical cần sửa ngay trước khi deploy lên Vercel public. App single-user (anh Quân) nên C2 chỉ là defense-in-depth, nhưng vẫn fix vì rẻ. C3 (sai công thức lãi) impact thật: UI hiển thị sai và `financials_json` persist sai khi term ≠ 12 tháng.

## Reports
- `plans/reports/code-reviewer-260408-1556-backend.md` (C2 — auth guards)
- `plans/reports/code-reviewer-260408-1556-core.md` (C3 — interest formula, I10 — no tests)
- `plans/reports/code-reviewer-260408-1556-frontend.md` (context only)

## Phases
| # | File | Effort | Status |
|---|---|---|---|
| 01 | [phase-01-backend-auth-guards.md](./phase-01-backend-auth-guards.md) | 1h | pending |
| 02 | [phase-02-loan-plan-interest-formula.md](./phase-02-loan-plan-interest-formula.md) | 45m | pending |
| 03 | [phase-03-loan-plan-calculator-tests.md](./phase-03-loan-plan-calculator-tests.md) | 1h | pending |

## Dependencies
- Phase 02 → Phase 03 (test viết để chặn hồi quy formula sau khi sửa).
- Phase 01 độc lập, có thể chạy song song với 02.

## Success Criteria
- 9 routes có explicit auth guard (Phase 01).
- `calcFinancials` nhận `termMonths`, `financials.interest` chính xác cho mọi term (Phase 02).
- Vitest pass toàn bộ test mới của `loan-plan-calculator` (Phase 03).
- `npm run lint` + `npm run build` không lỗi.

## Out of Scope (Phase 2+)
- C1 PII encryption / HMAC lookup column (cần migration).
- C4 indirect-cost gate by loan_method.
- C5 nested-table XML walker.
- I1 consolidate dual `withErrorHandling`.
- I2 require `FILE_ACCESS_SECRET` at boot + bind to session.
- Modularize >200 LOC files.
