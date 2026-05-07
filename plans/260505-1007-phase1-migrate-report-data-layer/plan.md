---
title: "Phase 1 — Migrate report data layer to DB-first"
description: "Schema KHDN report module v2: thêm field, backfill từ MappingInstance + manual_values.json, bỏ dual-write, dual-read 1 tuần rồi cleanup"
status: completed
priority: P1
effort: 3-5d
branch: main
tags: [report, khdn, prisma, migration, refactor]
created: 2026-05-05
completed: 2026-05-07
---

# Phase 1 — Migrate Report Data Layer

## Context

- Brainstorm (gốc, đọc trước): `plans/reports/brainstorm-260505-1007-report-module-data-model.md`
- Module: `src/services/report/*`, `src/lib/report/*`, `src/app/report/khdn/*`
- Deploy: Vercel + VPS offline, DB = source of truth (Prisma + SQLite dev / Turso prod)
- Memory liên quan: `feedback_prisma_select_new_columns.md` (phải `db:migrate:turso` sau mỗi schema change)

## Goal

Đưa data layer module báo cáo KHDN từ "DB + nhiều file FS chồng chéo" về "DB-first, 1 source of truth", **không break code đang chạy** trong suốt Phase 1.

## Strategy — non-breaking, dual-read

1. Add fields/table mới (Phase 1) — code cũ chạy bình thường
2. Backfill idempotent (Phase 2) — populate field mới từ legacy
3. Service layer mới (Phase 3) — đọc/ghi DB, mới + cũ song song
4. Bỏ dual-write FS (Phase 4) — chỉ ghi DB, vẫn đọc fallback FS
5. Drop legacy (Phase 5) — sau 1 tuần dual-read ổn định

## Phases

| # | File | Status | Effort |
|---|---|---|---|
| 01 | [phase-01-add-new-schema-fields.md](phase-01-add-new-schema-fields.md) — Prisma schema v2 (rename + add fields + LoanReportExport) | [x] Done | 0.5d |
| 02 | [phase-02-write-migration-script.md](phase-02-write-migration-script.md) — `scripts/migrate-report-data.ts` idempotent backfill | [x] Done | 1d |
| 03 | [phase-03-create-values-service.md](phase-03-create-values-service.md) — `values.service.ts` CRUD profile/dossier | [x] Done | 0.5d |
| 3.5 | [phase-3.5-reconcile-mapping-instance-to-loan.md](phase-3.5-reconcile-mapping-instance-to-loan.md) — add `MappingInstance.loanId` FK + backfill, propagate loanId qua 3 consumer (unblock Phase 4 full) | [x] Done | 2-3d |
| 04 | [phase-04-remove-dual-write.md](phase-04-remove-dual-write.md) — bỏ FS write + swap consumers (REDUCED: chỉ flag helper + shim deprecation; full swap defer sau Phase 3.5) | [x] Done | 1d |
| 05 | [phase-05-dual-read-cleanup.md](phase-05-dual-read-cleanup.md) — dual-read 1 tuần, drop `MappingInstance`+legacy files | [x] Done | 1d |
| 5b | [phase-5b-snapshot-refactor.md](phase-5b-snapshot-refactor.md) — drop snapshot service + retire manual-values shim + FS legacy cleanup (Option B) | [x] Done | 2-3h |
| 06 | [phase-06-drop-mapping-instance.md](phase-06-drop-mapping-instance.md) — migrate mapping/alias/formulas to MasterTemplate, drop MappingInstance + FS legacy (6a→6i + 6e minimal) | [x] Done (2026-05-07) | 3-5d |

## Completion summary (2026-05-07)

Big plan goal achieved: **DB-first, 1 source of truth**. MappingInstance table dropped, master-centric resolvers shipped, UI hooks/store master-centric, deleted ~2000 LOC of legacy services + FS overlay code, 197/197 tests pass.

Final cascade chain (Phase 6): `e8f8ba1 → 2217974 → 27c17bb → a4cd957 → fe36444 → d2fb9e9 → 5594a8b → 2736c15 → 80f148c → 0fe318a → 8e6540f → 21f9584 → 6b8d6e9 → 2760f0f → 0ad175a → a9709c2`

**Pending operational** (not blocking):
- Apply Phase 6i `DROP TABLE mapping_instances` migration on dev DB (dev server lock blocked auto-apply) and Turso prod (SQL-first deploy sequence)

**Out-of-scope from original plan** — separate roadmap, not blocking:
- Phase 7 (FS-store retirement, TemplateProfile + FrameworkState → DB) — plan in `plans/260506-1713-phase7-fs-store-to-db/`, deferred (P2, no user-facing value)
- Auto-save UI debounce 500ms — defer
- Build in-memory + port Python pipeline — defer (= Phase 7d)
- Validation coverage realtime — defer
- Builder polish UI mapping editor — defer

## Out of scope (Phase 2+ riêng)

- Auto-save UI debounce 500ms → Phase 2 brainstorm
- Build in-memory + port Python pipeline → Phase 3
- Validation coverage realtime → Phase 4
- Builder polish UI → Phase 5

## Dependencies

- Prisma migration deploy được Turso (precedent OK)
- Backup `report_assets/` + dump SQLite trước chạy migration
- Feature flag `REPORT_LEGACY_FALLBACK` (default `true` cho Phase 1-4)

## Risks (top-level)

- `manual_values.json` global → backfill orphan keys, mitigate bằng dry-run + log + UI review
- Dual-read code phức tạp → giới hạn 1 tuần, có flag tắt
- Vercel: Turso migration sequence — chạy `db:migrate:turso` trước deploy code

## Success criteria

- Schema mới deploy Vercel + VPS không break
- Migration script idempotent (chạy 2 lần ra cùng kết quả)
- Tất cả Customer + Loan active có values populated
- 0 FS write từ service layer (trừ DOCX export — Phase 3)
- Drop `MappingInstance` không lỗi runtime
