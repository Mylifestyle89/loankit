---
title: "Phase 6 — Drop MappingInstance + Migrate Mapping/Alias/Formulas to MasterTemplate"
description: "Move per-customer mapping/alias/formulas config từ MappingInstance + FS files sang MasterTemplate (per-template). Drop MappingInstance table + legacy FS code path entirely."
status: pending
priority: P1
effort: 3-5d
branch: main
tags: [report, khdn, prisma, refactor, cleanup]
created: 2026-05-06
---

# Phase 6 — Drop MappingInstance, Master-centric Config

## Context Links

- Brainstorm: `plans/reports/brainstorm-260505-1007-report-module-data-model.md` (§ 9 — master-centric proposal)
- Phase 5b done: snapshot retired, manual-values shim deleted, FS values gone
- Memory: `feedback_prisma_select_new_columns.md`, `project_dual_devdb_location.md`, `project_pii_migration_completed.md` (deploy sequence pattern)
- Predecessor phases: 01–5b (all done/closed)

## Overview

- **Priority**: P1
- **Status**: Not started
- **Effort**: 3–5d (6a 1d · 6b 2d · 6c 0.5d · 6d 0.5–1d · 6e 0.5d)
- **Branch**: main
- **Auto mode**: defaults applied (xem Key Insights). Không có Unresolved Questions.

Migrate mapping config + alias map + field formulas khỏi `MappingInstance` (per-customer) và FS files (`field_formulas.json`, `versions/`) → `MasterTemplate` (per-template, DB-only). Sau migration drop `MappingInstance` table + xóa toàn bộ legacy FS code (fs-store, fs-store-helpers, file-lock, migration-runner, _migration-internals).

## Key Insights (auto-picked defaults)

1. **Per-template, không per-customer** — `MasterTemplate.defaultMappingJson` + `defaultAliasJson` + `formulasJson`. Rationale: per-customer override chưa từng dùng thực sự (mapping/alias dạng technical config, không phải user data); đơn giản hóa model + giảm duplicate state.
2. **Heuristic newest-by-createdAt** — khi nhiều `MappingInstance` link tới cùng master, pick newest. Conflicts log ra `migration-conflicts.json` để review thủ công, KHÔNG block migration.
3. **field_formulas.json global → applied to all masters** — file FS hiện tại là global; migration copy vào mọi MasterTemplate. Per-instance override (nếu có trong `versions/`) → chọn newest, log conflict.
4. **API replace `mappingInstanceId` → `masterTemplateId`** — không backward compat, MappingInstance gone hoàn toàn. Loan đã có `masterTemplateId` (từ Phase 1) → resolve trực tiếp.
5. **Migration script idempotent + dry-run default** — pattern Phase 2/3.5; backup zip `report_assets/config/` + dump SQLite trước run.
6. **Compile-fail catch trước drop** — refactor services + UI consumers TRƯỚC, drop schema CUỐI (sub-phase 6e). Bất kỳ caller sót nào sẽ fail TS compile.
7. **Không UI multi-loan resolve** — giữ heuristic Phase 3.5 (newest active loan). Defer UI selector tới phase khác.

## Requirements

### Functional

- MasterTemplate self-contained: chứa mapping + alias + formulas
- Migration backfill từ MappingInstance + FS → MasterTemplate, idempotent
- API + UI dùng `masterTemplateId` thay `mappingInstanceId`
- Export DOCX hoạt động không thay đổi behavior (smoke test 1 KH/1 loan)
- 0 reference legacy entities trong code sau khi xong

### Non-functional

- Migration dry-run mặc định, log conflicts
- Backup retention 90d (zip config dir + sqlite dump)
- Vercel + Turso deploy sequence không downtime (manual SQL trước, code deploy sau)

## Architecture

### Trước (hiện tại)

```
Customer ─┬─< MappingInstance ─{mappingJson, aliasJson}
          │         │
          │         └─ loanId (Phase 3.5)
          │
Loan ─────┴─< MappingInstance (loanId FK)

FS:
  report_assets/config/field_formulas.json  (global)
  report_assets/.../versions/<id>/...        (per-instance overrides)
```

### Sau (Phase 6)

```
MasterTemplate {
  defaultMappingJson  // technical mapping per template
  defaultAliasJson    // alias map per template
  formulasJson        // field formulas per template
  ...existing fields
}

Loan ──masterTemplateId──> MasterTemplate
Customer (mapping/alias không còn liên quan trực tiếp)

FS: gone (config nằm DB)
```

### Data flow values resolve (đã làm Phase 3 + 4)

```
build.service → valuesService(loan)
   → loan.masterTemplateId → MasterTemplate.{defaultMappingJson, defaultAliasJson, formulasJson}
   → resolve placeholders → DOCX
```

## Related Code Files

### 6a — Schema + migration script

**Modify**:
- `prisma/schema.prisma` — extend MasterTemplate
- `prisma/migrations/<ts>_add_mapping_alias_formulas_to_master/migration.sql` (manual SQL)

**Create**:
- `scripts/migrate-mapping-config.ts` — backfill MappingInstance → MasterTemplate
- `scripts/backup-config-pre-phase6.ts` (or shell) — zip + sqlite dump

### 6b — Services refactor

**Modify**:
- `src/services/report/mapping.service.ts` — read/write MasterTemplate fields
- `src/services/report/master-template.service.ts` — add CRUD cho mapping/alias/formulas
- `src/services/report/field-values.service.ts` — drop mappingInstanceId scope, dùng masterTemplateId
- `src/services/report/build.service.ts` — drop legacy resolve path nếu còn

**Delete**:
- `src/services/report/mapping-instance.service.ts`
- `src/services/report/_migration-internals.ts`
- `src/services/report/migration-runner.ts`
- `src/services/report/migration-state.ts`

### 6c — API routes

**Modify**:
- `src/app/api/report/mapping/route.ts`
- `src/app/api/report/mapping/template-fields/route.ts`
- `src/app/api/report/values/route.ts` (audit)
- `src/app/api/report/template/**/route.ts` (audit)

**Delete**:
- `src/app/api/report/mapping-instances/**` (entire dir)

### 6d — UI updates

**Modify** (~17 consumers từ Phase 4 grep):
- `src/app/report/khdn/**/use-mapping-page-logic.ts`
- Zustand mapping store(s) — replace `mappingInstanceId` → `masterTemplateId`
- Components reference mappingInstanceId
- Hooks fetching `/api/report/mapping-instances/*`

### 6e — Drop schema + FS cleanup

**Modify**:
- `prisma/schema.prisma` — remove MappingInstance model + relations từ Customer/Loan/MasterTemplate
- `prisma/migrations/<ts>_drop_mapping_instance/migration.sql`
- `src/services/report/constants.ts` — remove FS-related constants
- Type files — cleanup orphan types

**Delete**:
- `src/services/report/fs-store.ts`
- `src/services/report/fs-store-helpers.ts`
- `src/services/report/field-formulas.ts`
- `src/lib/file-lock.service.ts`
- `report_assets/config/field_formulas.json` (after backup)
- `report_assets/**/versions/` (after backup)

## Implementation Steps

### Sub-phase 6a — Schema + migration (1d)

1. Backup: zip `report_assets/config/` + `report_assets/**/versions/` + sqlite dump (`prisma/dev.db` + root `dev.db`) → `backups/phase6-pre/`
2. Edit `prisma/schema.prisma`: add `defaultMappingJson String @default("{}")`, `defaultAliasJson String @default("{}")`, `formulasJson String @default("{}")` vào `MasterTemplate`
3. Tạo migration SQL manual (`ALTER TABLE master_template ADD COLUMN ... DEFAULT '{}'`) — apply local + ghi note Turso
4. `npx prisma generate`
5. Viết `scripts/migrate-mapping-config.ts`:
   - Iterate MasterTemplate, find newest MappingInstance referencing nó (qua loan.masterTemplateId hoặc relation hiện có)
   - Extract mappingJson, aliasJson → set lên master
   - Read global `field_formulas.json` → apply lên mọi master nếu master chưa có
   - Walk `versions/<id>/` per-instance overrides → pick newest → conflict log
   - Dry-run default; flag `--apply`; `--out conflicts.json`
6. Run dry-run trên dev DB, review conflicts file
7. Run `--apply` trên dev DB; verify sample master có data đúng

### Sub-phase 6b — Refactor services (2d)

8. `master-template.service.ts`: add `getMappingForTemplate(id)`, `setMappingForTemplate(id, json)`, alias counterparts, formulas counterparts. Wrap JSON parse/stringify + validation
9. `mapping.service.ts`: replace `MappingInstance.mappingJson` reads với `masterTemplate.defaultMappingJson`. Loan resolves master qua `loan.masterTemplateId`
10. `field-values.service.ts`: drop `mappingInstanceId` parameter, take `masterTemplateId` (or `loanId` resolve internal)
11. `build.service.ts`: audit, ensure dùng valuesService + master-centric resolve. Remove bất kỳ legacy branching
12. Delete `mapping-instance.service.ts`, `_migration-internals.ts`, `migration-runner.ts`, `migration-state.ts`
13. Compile (`npx tsc --noEmit`) — fix all errors trỏ tới callers còn dùng MappingInstance APIs cũ
14. Run vitest — fix failing tests; update mocks

### Sub-phase 6c — API routes (0.5d)

15. `/api/report/mapping/route.ts` (GET/PUT): take `masterTemplateId` query param, delegate master-template.service
16. `/api/report/mapping/template-fields/route.ts`: same
17. `/api/report/values/route.ts` + `/api/report/template/**`: audit + replace any mappingInstanceId
18. Delete `/api/report/mapping-instances/` dir hoàn toàn
19. Compile + run integration tests nếu có

### Sub-phase 6d — UI updates (0.5–1d)

20. Grep `mappingInstanceId` toàn `src/app/report/khdn` + `src/components/report` + Zustand stores
21. Replace với `masterTemplateId` per consumer; audit fetch URLs (mapping-instances → master-template/mapping)
22. `use-mapping-page-logic.ts`: refactor signature + state
23. Compile + run dev server + smoke test mapping page

### Sub-phase 6e — Drop schema + FS cleanup (0.5d)

24. Edit schema: remove `MappingInstance` model + relation fields từ Customer/Loan/MasterTemplate
25. Drop migration SQL: `DROP TABLE mapping_instance` (after final verify no reads)
26. `npx prisma generate` + apply migration local
27. Delete service files: `fs-store.ts`, `fs-store-helpers.ts`, `field-formulas.ts`, `file-lock.service.ts`
28. Delete `field_formulas.json` + `versions/` directories (already backed up step 1)
29. Update `constants.ts` — remove FS path constants
30. `npx tsc --noEmit` clean + `npm test` green
31. Smoke test export DOCX 1 KH/1 loan
32. Document deploy sequence Turso: backup prod → run migration SQL trên Turso (`db:migrate:turso`) → deploy code → verify

## Todo List

### 6a Schema + migration ✅ commit `e8f8ba1`
- [x] Schema +3 columns MasterTemplate (defaultMappingJson, defaultAliasJson, formulasJson)
- [x] Manual migration SQL local
- [x] Backfill script
- [ ] Backup config dir + sqlite dump (pre prod deploy)
- [ ] Apply on Turso (deploy step, not yet)

### 6b Services
- [x] master-template.service add CRUD methods (commit `2217974`)
- [x] mapping.service swap to master fields (commit `27c17bb` partial → `fe36444` complete master-only)
- [x] field-values.service drop mappingInstanceId (commit `fe36444`, formulas master-only)
- [x] build.service audit + remove legacy branches (commit `a4cd957`)
- [x] Compile clean + tests pass (197/197)
- [ ] Delete 4 legacy service files — DEFERRED (UI still depends on `mappingInstance.service` indirectly via `attachTemplateToCustomer`)

### 6c API ✅ partial
- [x] `/api/report/mapping` accepts `master_template_id` (commit `fe36444`)
- [x] `/api/report/values` accepts `loan_id` + `master_template_id` (commit `fe36444`)
- [x] `/api/report/{export,validate,freshness}` accepts `loan_id` (commit `a4cd957`)
- [ ] `/api/report/mapping/template-fields` swap (next session)
- [ ] Delete `/api/report/mapping-instances/**` (next session, after UI swap)

### 6d UI — NOT STARTED (next session)
- [ ] Grep `mappingInstanceId` consumers (~17 files identified)
- [ ] Refactor `use-mapping-page-logic` (selection state → masterTemplateId + loanId)
- [ ] Update Zustand mapping store (`selectedMappingInstanceId` → split)
- [ ] Update `useMappingApi`, `use-mapping-api-mutations`, `use-field-template-{apply,crud}`
- [ ] Smoke mapping page end-to-end

### 6e Cleanup — NOT STARTED
- [ ] Schema drop MappingInstance + migration SQL
- [ ] Delete `mapping-instance.service.ts`
- [ ] Delete `_migration-internals.ts`, `migration-runner.ts`, `migration-state.ts`
- [ ] Refactor `template-field-mutate.service` to drop MappingInstance writes
- [ ] Delete FS service files (`fs-store`, `fs-store-helpers`, `field-formulas`, `file-lock.service`)
- [ ] Delete FS legacy assets (field_formulas.json + versions/)
- [ ] constants.ts cleanup
- [ ] tsc + tests green
- [ ] Smoke export DOCX
- [ ] Document Turso deploy sequence

## Cascade progress log

| Commit | Hash | Scope |
|---|---|---|
| 6a foundation | `e8f8ba1` | Schema +3 cols + backfill |
| 6b foundation | `2217974` | master-template.service CRUD methods |
| 6b cascade #1 | `27c17bb` | mapping.service prefer master + dual-write |
| 6b cascade #2 | `a4cd957` | build flow master-centric resolver (build-source.ts + master-source.ts) |
| 6b cascade #3 | `fe36444` | mapping/field-values master-only writes, drop dual-write |
| 6b cascade #4 | (this) | orphan cleanup: drop `resolveMappingSource` + `MappingSource` + `relPathExists` + `sourceIdFromResolved` |

## Carry-over for next session

**Why deferred:** UI swap is the binding constraint. ~17 hook/store files still pass `mapping_instance_id`. Backend services + API routes accept that param via boundary translator (back-compat) so the app keeps working today. Removing `mapping-instance.service` + `_migration-internals` requires:
1. UI hooks switch to `master_template_id` + `loan_id`
2. `template-field-mutate.attachTemplateToCustomer` rewritten without `MappingInstance.create`
3. Schema drop + Turso migration

**Ordering for next session:** UI first (still works under current backend) → then services delete → then schema drop.

## Success Criteria

- 0 grep hit: `MappingInstance`, `mappingInstanceId`, `mapping-instance.service`, `fs-store`, `file-lock.service`, `field_formulas.json`, `versions/`, `_migration-internals`, `migration-runner`
- DB schema: `master_template` table có 3 cột mới populated; `mapping_instance` table dropped
- `npx tsc --noEmit` clean
- `npm test` 197+ tests pass (no regression)
- Smoke export DOCX 1 KH/1 loan: output identical (byte/diff acceptable nếu chỉ metadata)
- Migration script: chạy 2 lần idempotent (no duplicate writes, no errors)
- Backup zip + sqlite dump tồn tại trong `backups/phase6-pre/`

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| 17 UI consumers refactor lớn, dễ sót | High | Sub-phase 6d riêng; tsc compile-gate; smoke test mapping page |
| Nhiều MappingInstance map cùng master → pick wrong | High | Heuristic newest-createdAt + log conflicts JSON; manual review trước apply |
| Drop MappingInstance break runtime caller sót | High | Refactor + delete services TRƯỚC drop schema; tsc fail catch |
| Per-instance formula override mất khi flatten về master | Med | Migration log conflicts; review thủ công; rollback DB nếu critical |
| Vercel + Turso schema sequence | Med | Pattern Phase 1: SQL Turso trước, deploy code sau, verify |
| Hot-reload formula behavior mất khi xóa FS | Med | Sau migrate, formulas trong DB → editable qua API; document thay đổi |
| Backup file lớn (versions/ historical) | Low | Zip + retention 90d; cleanup script optional |

## Security Considerations

- Migration script chạy với DB write quyền → chỉ chạy local/CI có credential, không expose
- Backup chứa potential PII (config maps có thể tham chiếu field name) → store backup `backups/` (gitignored), không commit
- API routes audit auth: `/api/report/mapping` phải giữ session check như cũ
- No new PII surface; mapping/alias là technical config

## Next Steps (post-Phase 6)

- Phase 7 (optional): UI multi-loan selector cho customer có nhiều loan active (heuristic newest hiện tại đủ cho v1)
- Phase 8: Builder polish UI cho mapping editor (DB-backed CRUD trực tiếp qua master-template.service)
- Phase 9: Validation realtime coverage (brainstorm § 10)
- Sau 1-2 tuần ổn định: xóa folder `backups/phase6-pre/` nếu không issue

## Unresolved Questions

None — auto mode: defaults applied (xem Key Insights § 1–7).
