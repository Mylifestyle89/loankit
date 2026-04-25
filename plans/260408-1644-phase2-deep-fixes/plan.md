---
title: "Phase 2 — Deep fixes (PII model + DOCX parsers + builders + error handling)"
description: "Sửa các lỗi critical/important còn lại từ code review 2026-04-08 sau Phase 1"
status: in_progress
priority: P1
effort: 12h
branch: main
tags: [pii, encryption, docx, parser, loan-plan, error-handling, refactor]
created: 2026-04-08
---

# Phase 2 — Deep Fixes

## Context
Code review 2026-04-08 (3 reports) phát hiện 5 critical + nhiều important. Phase 1 đã xử C2 (auth guards) + C3 (interest formula) + I10 (zero tests) trong commits `1aef44c`, `c465915`, `63bb7aa`.

## Reports
- `plans/reports/code-reviewer-260408-1556-backend.md`
- `plans/reports/code-reviewer-260408-1556-core.md`
- `plans/reports/code-reviewer-260408-1556-frontend.md`
- `plans/260408-1611-phase1-critical-fixes/plan.md` (Phase 1 — done)

## Phases
| # | File | Effort | Risk | Status | Commits |
|---|---|---|---|---|---|
| 01 | [phase-01-pii-encryption-model.md](./phase-01-pii-encryption-model.md) | 5h | HIGH | pending | — |
| 02 | _(phase file removed — done)_ | 3h | MED | ✅ done | `56ea60f`, `2a8cf34`, `2ca37a2` |
| 03 | _(phase file removed — done)_ | 2h | MED | ✅ done | `6d2a8dc`, `f1bc5fc` |
| 04 | _(phase file removed — done)_ | 2h | LOW | ✅ done | `bbce893`, `e75dcfd`, `e51a04e` |

## Remaining Work
**Phase 01 — PII encryption model** (to run tonight):
- Add HMAC-SHA256 deterministic `customer_code_hash` column for lookup/uniqueness.
- Extend `PII_*_FIELDS` to CoBorrower, RelatedPerson, and remaining Customer PII fields.
- Migration + backfill existing rows + rollback script.
- Needs a migration window (~5 min downtime).

## Out of Scope (Phase 3+)
- Frontend C2 — zod at fetch boundary.
- Frontend I3 — refactor loan-plan editor to useReducer.
- Frontend I1+I2 — a11y sweep (BaseModal migration).
- Modularize files >200 LOC.
- N-level nice-to-haves.
