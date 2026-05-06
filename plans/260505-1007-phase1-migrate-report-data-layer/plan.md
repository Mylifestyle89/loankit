---
title: "Phase 1 — Migrate report data layer to DB-first"
description: "Schema KHDN report module v2: thêm field, backfill từ MappingInstance + manual_values.json, bỏ dual-write, dual-read 1 tuần rồi cleanup"
status: pending
priority: P1
effort: 3-5d
branch: main
tags: [report, khdn, prisma, migration, refactor]
created: 2026-05-05
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
| 01 | [phase-01-add-new-schema-fields.md](phase-01-add-new-schema-fields.md) — Prisma schema v2 (rename + add fields + LoanReportExport) | [ ] Not started | 0.5d |
| 02 | [phase-02-write-migration-script.md](phase-02-write-migration-script.md) — `scripts/migrate-report-data.ts` idempotent backfill | [ ] Not started | 1d |
| 03 | [phase-03-create-values-service.md](phase-03-create-values-service.md) — `values.service.ts` CRUD profile/dossier | [x] Done | 0.5d |
| 3.5 | [phase-3.5-reconcile-mapping-instance-to-loan.md](phase-3.5-reconcile-mapping-instance-to-loan.md) — add `MappingInstance.loanId` FK + backfill, propagate loanId qua 3 consumer (unblock Phase 4 full) | [ ] Not started | 2-3d |
| 04 | [phase-04-remove-dual-write.md](phase-04-remove-dual-write.md) — bỏ FS write + swap consumers (REDUCED: chỉ flag helper + shim deprecation; full swap defer sau Phase 3.5) | [~] Reduced (done partial) | 1d |
| 05 | [phase-05-dual-read-cleanup.md](phase-05-dual-read-cleanup.md) — dual-read 1 tuần, drop `MappingInstance`+legacy files | [~] Done partial (5a closed: flag removed) | 1d |
| 5b | [phase-5b-snapshot-refactor.md](phase-5b-snapshot-refactor.md) — drop snapshot service + retire manual-values shim + FS legacy cleanup (Option B) | [x] Done | 2-3h |
| 06 | [phase-06-drop-mapping-instance.md](phase-06-drop-mapping-instance.md) — migrate mapping/alias/formulas to MasterTemplate, drop MappingInstance + FS legacy (6a→6e) | [ ] Not started | 3-5d |

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
