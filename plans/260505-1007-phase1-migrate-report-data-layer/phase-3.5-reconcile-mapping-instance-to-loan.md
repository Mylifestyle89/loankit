# Phase 3.5 — Architecture Reconciliation: MappingInstance ↔ Loan

## Context Links

- Plan overview: [plan.md](plan.md)
- Brainstorm gốc: `plans/reports/brainstorm-260505-1007-report-module-data-model.md` § 2-3 (storage chồng chéo, schema đề xuất), § 9 (final decisions — `MappingInstance` to drop Phase 5)
- Phase 3 done: [phase-03-create-values-service.md](phase-03-create-values-service.md) — `valuesService` scope = `loanId` (`getCustomerProfile(customerId)`, `getDossierValues(loanId)`, `getMergedValuesForExport(loanId)`)
- Phase 4 reduced: [phase-04-remove-dual-write.md](phase-04-remove-dual-write.md) — service swap **defer**, lý do: architecture mismatch khi `fieldValuesService` + `runReportExport` + API routes operate trên `mappingInstanceId`, không có cách deterministic derive `loanId` (1 customer N loan).
- Memory: `feedback_prisma_select_new_columns.md` (must `db:migrate:turso` mỗi schema change), `project_pii_migration_completed.md` (Turso deploy pattern), `project_dual_devdb_location.md` (target `prisma/dev.db`).

## Overview

- **Priority**: P1 (block Phase 4 full)
- **Status**: pending
- **Effort**: 2-3 ngày
- **Goal**: Add `MappingInstance.loanId` FK + backfill heuristic + propagate `loanId` qua các consumer chính (`fieldValuesService`, `runReportExport`, 2 API routes). Sau Phase 3.5 → Phase 4/5 mới swap services đến `valuesService.*` an toàn.

## Key Insights — Decisions chốt (đề xuất, chờ user confirm)

1. **`loanId` nullable trong Phase 3.5 → NOT NULL Phase 5 cuối**. Lý do: orphans (no loan active) và ambiguous attribution (multi-loan) cần human review trước khi enforce. NOT NULL ngay sẽ block migration.
2. **`onDelete: SetNull`** cho `Loan` FK. Lý do: `MappingInstance` là config tái dùng (mapping/alias customize), không nên cascade-delete khi xóa loan. Mất link OK — re-attach manually nếu cần.
3. **Scope swap consumer Phase 3.5 = MUST minimum**: chỉ 3 surface — `fieldValuesService.resolveScopedStorage`, `runReportExport`, 2 API routes (`/api/report/values`, `/api/report/snapshots`). Defer `build-bank-export`, `build-data-transform`, `snapshot.service` đến Phase 4 full. Lý do: KISS + giảm scope creep + giữ Phase 3.5 ship trong 2-3d.
4. **Multi-loan ambiguity**: pick newest by `createdAt DESC` (giống Phase 2 pattern), log "ambiguous attribution" vào orphans. Không build UI cho user chọn — defer Phase 5 nếu cần. Heuristic + log đủ cho 80% case.
5. **Migration deploy Turso**: tái dùng pattern Phase 2 — `turso db shell .dump` backup → dry-run script local → `prisma migrate deploy` qua `db:migrate:turso` script → commit `--yes` sau verify count.
6. **Phase 3.5 + Phase 5 ship cùng release cycle**: thêm column "tạm" sẽ drop ở Phase 5, accepted vì 2 phase cùng cycle (không deploy riêng), cost migration = 1 ALTER cheap trên Turso.

## Requirements

**Functional**

- `MappingInstance.loanId` FK nullable (Phase 3.5) → NOT NULL Phase 5
- Backfill script idempotent, dry-run default, log orphans + ambiguous
- ≥80% `MappingInstance` rows có `loanId !== null` sau backfill
- `fieldValuesService.resolveScopedStorage` accept optional `loanId`, fallback resolve qua `MappingInstance.loanId` lookup
- `runReportExport(input)` đọc `loanId` từ `mappingInstance.loanId` 1 query mới khi input không có
- 2 API routes pass `loanId` qua khi route nhận `mappingInstanceId`

**Non-functional**

- Migration deploy Turso không break runtime (nullable column, backward compat)
- Backfill script idempotent: chạy 2 lần ra cùng kết quả
- Compile clean qua `npm run build`
- Existing tests pass + new tests cho backfill (1-customer / multi-loan / orphan)
- Zero data loss khi backfill (chỉ INSERT/UPDATE, không DELETE)

## Architecture

**Trước Phase 3.5**

```
MappingInstance ── customerId ──> Customer ──< Loan (1:N)
                                                  │
                          (no link)               │
valuesService.* ─────────────────── needs ──> loanId
fieldValuesService ──────────── operates on ── mappingInstanceId
runReportExport ────────────── operates on ── mappingInstanceId
                              ↓
              Architecture mismatch — không derive loanId từ instance
```

**Sau Phase 3.5**

```
MappingInstance ── customerId ──> Customer ──< Loan (1:N)
       │                                          ↑
       └── loanId? (FK SetNull) ──────────────────┘
                                  └─ backfilled by heuristic (newest active loan)
                                  └─ orphans logged for review

fieldValuesService(mappingInstanceId, loanId?) ─── resolves loanId via instance
runReportExport(input) ─── reads loanId via instance.loanId
API routes ─── pass loanId thru
                              ↓
              valuesService.* ready để swap Phase 4 full
```

**ERD diff**

```prisma
model MappingInstance {
  id           String  @id
  customerId   String                                            // KEEP backward compat
  loanId       String?                                           // NEW Phase 3.5
  loan         Loan?   @relation(fields: [loanId], references: [id], onDelete: SetNull)  // NEW
  // ... existing fields
  @@index([loanId])                                              // NEW
}

model Loan {
  // ... existing
  mappingInstances MappingInstance[]                             // NEW reverse relation
}
```

## Related Code Files

**Modify**

- `prisma/schema.prisma` — add `loanId` + `loan` relation + index trên `MappingInstance`, add reverse `mappingInstances` trên `Loan`
- `src/services/report/_migration-internals.ts` — type updates nếu reference `MappingInstance` shape
- `src/services/report/field-values.service.ts` — `resolveScopedStorage` accept optional `loanId`
- `src/services/report/build.service.ts` (hoặc file chứa `runReportExport`) — read `mappingInstance.loanId`
- `src/app/api/report/values/route.ts` — pass `loanId` thru
- `src/app/api/report/snapshots/route.ts` — pass `loanId` thru

**Create**

- `prisma/migrations/{timestamp}_mapping_instance_loanid/migration.sql` — `ALTER TABLE MappingInstance ADD COLUMN loanId TEXT REFERENCES Loan(id) ON DELETE SET NULL; CREATE INDEX idx_mapping_instance_loanid ON MappingInstance(loanId);`
- `scripts/backfill-mapping-instance-loanId.ts` — idempotent, dry-run, log orphans + ambiguous
- `scripts/__tests__/backfill-mapping-instance-loanId.test.ts` — Vitest, 4 cases (1-loan, multi-loan, no-loan, idempotent re-run)

**Read-only audit**

- `src/services/report/build-service-bank-export.ts` — defer Phase 4 full
- `src/services/report/build-service-data-transform.ts` — defer Phase 4 full
- `src/services/report/snapshot.service.ts` — defer Phase 4 full

## Implementation Steps

1. **Backup**: `turso db shell {prod} .dump > backup-pre-3.5-{date}.sql`. Local: `cp prisma/dev.db prisma/dev.db.bak-3.5`.
2. **Schema edit**: add `loanId String?` + `loan Loan? @relation(...) onDelete: SetNull` + `@@index([loanId])` vào `MappingInstance`. Add reverse `mappingInstances MappingInstance[]` vào `Loan`.
3. **Generate migration**: `npx prisma migrate dev --name mapping_instance_loanid --create-only`. Inspect generated SQL — verify ADD COLUMN nullable + FK + INDEX. Edit nếu cần đảm bảo `ON DELETE SET NULL`.
4. **Apply local**: `npx prisma migrate dev`. Verify schema qua `npx prisma studio` — `MappingInstance.loanId` exists, nullable.
5. **Write backfill script** `scripts/backfill-mapping-instance-loanId.ts`:
   - Imports: `prisma` client, `fs/promises` cho orphan log
   - CLI flags: `--dry-run` (default true), `--commit`, `--limit N`
   - Logic: SELECT all `MappingInstance WHERE loanId IS NULL`; for each → SELECT loans by `customerId WHERE status = 'active' ORDER BY createdAt DESC`; if 1 → assign; if N>1 → assign newest + log "ambiguous"; if 0 → log "no_loan"
   - Idempotent: skip rows where `loanId IS NOT NULL`
   - Outputs: `migration-loanid-backfill-orphans.json` (no_loan + ambiguous), `migration-loanid-backfill-summary.json` (counts: assigned, ambiguous, orphan, skipped)
   - Pattern parallel với `scripts/migrate-report-data.ts`
6. **Write tests** `scripts/__tests__/backfill-mapping-instance-loanId.test.ts`:
   - Setup: in-memory SQLite hoặc fixture DB
   - Case A: 1 customer / 1 loan active → assigned
   - Case B: 1 customer / 3 loans active → newest assigned, log ambiguous
   - Case C: 1 customer / 0 loans active → no_loan log, loanId stays null
   - Case D: re-run (instance đã có loanId) → skipped
7. **Dry-run local**: `tsx scripts/backfill-mapping-instance-loanId.ts --dry-run`. Inspect summary + orphans. Verify ≥80% assigned rate.
8. **Commit local**: `tsx scripts/backfill-mapping-instance-loanId.ts --commit`. Verify count via Prisma Studio.
9. **Consumer propagation — `fieldValuesService.resolveScopedStorage`**:
   - Add optional `loanId?: string` param. If absent + có `mappingInstanceId` → SELECT `MappingInstance.loanId` 1 query, attach.
   - Fallback: nếu `loanId` null sau lookup → giữ behavior cũ (customer scope), log warn 1 lần.
10. **Consumer propagation — `runReportExport`**:
    - Trong service file (likely `build.service.ts` hoặc tương đương), trước build pipeline: `const loanId = input.loanId ?? (await prisma.mappingInstance.findUnique({ where: { id: input.mappingInstanceId }, select: { loanId: true } }))?.loanId;`
    - Pass `loanId` xuống các bước downstream.
11. **API routes propagation**:
    - `app/api/report/values/route.ts`: nếu request body chỉ có `mappingInstanceId`, lookup `loanId` 1 query trước khi gọi service.
    - `app/api/report/snapshots/route.ts`: same pattern.
    - Validate body Zod cho phép cả `loanId` optional + `mappingInstanceId`.
12. **Compile check**: `npm run build`. Fix type errors (esp. `LoanId | null` từ findUnique).
13. **Test run**: `npm test`. Run new backfill tests + existing service tests. Fix failures.
14. **Smoke test dev**:
    - Reset 1 customer + 2 loan active → backfill commit → verify newest loan attached, ambiguous log present.
    - Edit field qua `/report/khdn/...` UI → verify save flow vẫn OK (`fieldValuesService` consume `loanId` qua lookup).
    - Export DOCX → verify `runReportExport` resolves `loanId` correctly.
15. **Deploy Turso**:
    - `npm run db:migrate:turso` (apply schema migration trước code).
    - Deploy code (Vercel push).
    - Run backfill remote: SSH/CLI `tsx scripts/backfill-mapping-instance-loanId.ts --dry-run` (đọc Turso) → verify counts → `--commit`.
    - Monitor 1h: error rate, slow query log.
16. **Update docs**:
    - `docs/system-architecture.md`: ERD update, note `MappingInstance.loanId` Phase 3.5 sẽ drop Phase 5.
    - `docs/project-changelog.md`: entry "Phase 3.5: reconcile MappingInstance ↔ Loan, backfill loanId, prep for Phase 4 full swap".
17. **Memory note**: save `project_phase_3_5_reconcile.md` — backfill heuristic, ambiguous policy, orphans count, deploy date.
18. **Open PR**: title `refactor(report): add MappingInstance.loanId + backfill [phase-3.5]`. Body: backfill summary counts, decisions confirmed, links Phase 4 unblock.

## Todo List

### Schema + Migration
- [ ] Backup Turso + local DB
- [ ] Edit `prisma/schema.prisma` add `loanId` + relation + index
- [ ] Generate migration `--create-only`, verify SQL
- [ ] Apply local `prisma migrate dev`

### Backfill
- [ ] Write `scripts/backfill-mapping-instance-loanId.ts`
- [ ] Write 4 unit tests (1-loan, multi-loan, no-loan, idempotent)
- [ ] Dry-run local + inspect summary/orphans
- [ ] Commit local + verify Prisma Studio

### Consumer Propagation (MUST scope)
- [ ] `fieldValuesService.resolveScopedStorage` — optional `loanId` param + lookup fallback
- [ ] `runReportExport` — read `mappingInstance.loanId`
- [ ] `api/report/values/route.ts` — pass `loanId` thru
- [ ] `api/report/snapshots/route.ts` — pass `loanId` thru

### Verification
- [ ] `npm run build` clean
- [ ] `npm test` pass (new + existing)
- [ ] Smoke test export DOCX 1 customer / 2 loan
- [ ] Deploy Turso migration
- [ ] Run backfill remote dry-run + commit
- [ ] Update `docs/system-architecture.md` + `project-changelog.md`
- [ ] Memory note saved
- [ ] PR opened

## Success Criteria

- ✅ Migration `mapping_instance_loanid` deployed Turso (verify column exists + FK constraint)
- ✅ Backfill script idempotent (re-run = same counts)
- ✅ Dry-run + commit modes work; orphans logged
- ✅ ≥80% `MappingInstance` rows có `loanId !== null` post-backfill
- ✅ `fieldValuesService` accepts `loanId` param, fallback lookup OK
- ✅ `runReportExport` resolves `loanId` qua `mappingInstance.loanId` lookup
- ✅ 2 API routes pass `loanId` thru
- ✅ Compile clean + tests pass
- ✅ Architecture mismatch closed → Phase 4 full unblocked

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Backfill gán sai loan (multi-loan customer) | High | Log "ambiguous", require user review trước commit; heuristic = newest matches Phase 2 |
| `MappingInstance` table sẽ drop Phase 5 — Phase 3.5 column "tạm" | Medium | Accepted: Phase 3.5 + 5 cùng release cycle, ALTER cheap |
| Migration deploy Turso fail | Medium | Pattern Phase 2: backup + dry-run + commit `--yes`; rollback = drop column |
| Existing instances không match loan nào (orphans) | Medium | Leave `loanId = null`, log; defer resolve Phase 5 |
| Breaking `fieldValuesService` consumers | Medium | Optional `loanId` param + fallback to customer scope; existing callers no-op |
| FK SetNull mất link khi xóa loan | Low | Acceptable — instance là config, mất link OK; Phase 5 drop instance anyway |
| `runReportExport` extra query slow path | Low | 1 query `findUnique` by PK = O(1), negligible |
| Multi-loan customer growing → ambiguous % tăng | Low | Phase 5 UI cho user chọn nếu cần (defer) |

## Security Considerations

- Backfill script không touch values data (chỉ FK column) → không PII concern
- FK constraint `SetNull` không leak data — chỉ orphan link
- Backfill log file `migration-loanid-backfill-orphans.json` chứa `customerId` + `instanceId` → treat as internal, không commit vào git (add `.gitignore` entry nếu cần)
- API routes lookup `loanId` không expose qua response — internal resolve only

## Next Steps

- **Phase 4 full**: swap remaining services (`build-bank-export`, `build-data-transform`, `snapshot.service`) đến `valuesService.*`. Unblocked sau Phase 3.5.
- **Phase 5**: drop `MappingInstance` table entirely; resolve orphan instances; flip `REPORT_LEGACY_FALLBACK=false`; re-encrypt batch.
- **Phase 5 (optional)**: UI cho user resolve ambiguous attribution nếu orphan rate > 10%.

## Unresolved Questions

1. **`loanId` nullable Phase 3.5 → NOT NULL Phase 5**: confirm sequence? Hoặc user muốn NOT NULL ngay (sẽ require resolve all orphans trước migration apply)?
2. **`onDelete: SetNull`**: confirm? Hoặc `Cascade` (xóa instance khi xóa loan — risk: mất config)?
3. **Scope MUST = 3 surface (`fieldValuesService` + `runReportExport` + 2 API routes)**: confirm? Hoặc full swap 5 services Phase 3.5 (+1d effort)?
4. **Multi-loan ambiguity = newest + log**: confirm? Hoặc cần UI Phase 3.5 cho user chọn (+1-2d effort)?
5. **Backfill log files commit hay gitignore?** Đề xuất gitignore (chứa internal IDs) — confirm?
