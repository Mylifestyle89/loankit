# Phase 05 — Dual-Read Cleanup + Drop Legacy

## Context Links

- Plan: [plan.md](plan.md)
- Phase 04 phải chạy production ≥ 1 tuần stable
- Brainstorm § 5 (drop legacy)

## Overview

- **Priority**: P1
- **Status**: Not started
- **Effort**: 1d
- Sau 1 tuần dual-read không còn fallback hit → tắt flag, drop legacy code/DB/file.

## Key Insights

- **Pre-condition**: log fallback hits = 0 trong 7 ngày liên tiếp (cả Vercel + VPS)
- Drop có thứ tự để rollback được:
  1. Flag `false` (1 ngày soak) → 0 fallback path executed
  2. Remove fallback code path
  3. Drop `MappingInstance` table
  4. Delete legacy files
- DB drop là irreversible → backup trước

## Requirements

**Functional**:
- Tắt `REPORT_LEGACY_FALLBACK` (env = `false` everywhere)
- Remove fallback code branch trong `build.service.ts`
- Drop Prisma model `MappingInstance` + migration
- Delete `report_assets/manual_values.json`, `mapping_versions/`, `report_draft_flat.json` (if exists)
- Delete `src/lib/report/manual-values.ts`

**Non-functional**:
- Backup DB + report_assets/ trước drop
- Migration deploy được Turso

## Architecture

```
Pre-Phase 05 (steady state):
  Service → DB (only)
  Code có legacy code path (dead under normal flow)
  DB có MappingInstance (unused)
  FS có legacy files (read-only)

Post-Phase 05:
  Service → DB (only, no fallback branch)
  Schema slim — MappingInstance gone
  FS clean — legacy files removed
```

## Related Code Files

**Modify**:
- `src/services/report/build.service.ts` — remove fallback branch
- `prisma/schema.prisma` — drop `model MappingInstance`
- `.env.example` — remove or set `REPORT_LEGACY_FALLBACK=false`

**Delete**:
- `src/lib/report/manual-values.ts`
- `report_assets/manual_values.json`
- `report_assets/mapping_versions/` (entire folder)
- `report_assets/generated/report_draft_flat.json` (if exists)

**Create**:
- `prisma/migrations/{timestamp}_drop_mapping_instance/migration.sql`

## Implementation Steps

1. **Verify pre-condition**:
   - Grep logs (server + Vercel) `Falling back to manual_values.json` → expect 0 hits trong 7 ngày
   - Nếu có hit → STOP, investigate loan nào chưa migrated, re-run Phase 02 cho loan đó
2. **Set flag `false` production** → soak 24h → verify 0 errors
3. **Backup**:
   - DB dump (SQLite + Turso)
   - Zip `report_assets/` → archive folder ngoài repo
4. **Remove fallback code branch** trong `build.service.ts`:
   ```ts
   // BEFORE
   let values = await getMergedValuesForExport(loanId);
   if (Object.keys(values).length === 0 && process.env.REPORT_LEGACY_FALLBACK === 'true') {
     values = await readLegacyManualValues();
   }
   // AFTER
   const values = await getMergedValuesForExport(loanId);
   ```
5. **Delete `src/lib/report/manual-values.ts`** + remove imports (Grep)
6. **Drop Prisma model**:
   - Edit `schema.prisma` — remove `model MappingInstance` block + remove relation từ Customer
   - `npx prisma migrate dev --name drop_mapping_instance --create-only` review SQL
   - Confirm chỉ DROP TABLE, không touch khác
7. **Apply migration local** + test app
8. **Delete legacy files**:
   - `report_assets/manual_values.json`
   - `report_assets/mapping_versions/` recursive
   - `report_assets/generated/report_draft_flat.json`
9. **Remove env flag**:
   - Delete `REPORT_LEGACY_FALLBACK` từ `.env.example`
   - Remove validation entry
10. **Compile + smoke test**:
    - `npm run build`
    - Test export 3 loans khác nhau (mỗi loại customer type)
11. **Update docs**:
    - `docs/codebase-summary.md` (nếu có) — note module report v2 hoàn thành
    - Add changelog entry
12. **Deploy sequence**:
    - A: backup DB Turso
    - B: `npm run db:migrate:turso` (drop MappingInstance)
    - C: deploy Vercel code (no fallback)
    - D: monitor 24h

## Todo List

- [ ] Verify 0 fallback hits 7 ngày
- [ ] Set flag `false` prod + soak 24h
- [ ] DB backup + report_assets backup
- [ ] Remove fallback code branch
- [ ] Delete `manual-values.ts` + imports
- [ ] Drop Prisma model `MappingInstance`
- [ ] Review migration SQL
- [ ] Apply local + test
- [ ] Delete legacy FS files
- [ ] Remove env flag
- [ ] Compile + smoke test 3 loans
- [ ] Update docs/changelog
- [ ] Deploy sequence A→D

## Success Criteria

- 0 reference `manual_values.json`, `MappingInstance`, `mappingJsonPath` trong codebase
- DB schema slim — `MappingInstance` table gone
- Legacy files removed
- Vercel + VPS deploy không lỗi
- Export 3 loans khác customer type → tất cả OK

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Drop sớm → loan nào đó chưa migrated | Pre-condition 7 ngày 0 fallback hit |
| Migration rollback Turso khó | Backup DB trước; test SQL local kỹ |
| Sót import `manual-values` | Grep trước delete; build check |
| User VPS chưa pull code mới chạy bản cũ | Document upgrade path; bản cũ không hoạt động sau drop |

## Security Considerations

- Backup chứa PII → lưu offline encrypted, không commit
- Drop migration chứa table name nhạy cảm trong SQL — OK, public không nhạy

## Next Steps

- Phase 1 hoàn tất → tiếp tục Phase 2 (auto-save) per brainstorm roadmap
- Update `docs/development-roadmap.md` đánh dấu Phase 1 done
- Memory note: record final state schema + flag removed
