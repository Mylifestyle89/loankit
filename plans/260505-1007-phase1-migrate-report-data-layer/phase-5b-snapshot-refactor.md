---
title: "Phase 5b — Drop snapshot service + retire shim + delete FS legacy"
description: "Recommend Option B: xoá snapshot.service + API + UI restore modal; auto-save per-loan defer Phase 2. Cleanup manual-values shim, manual_values.json, versions/ filesystem."
status: pending
priority: P2
effort: 2-3h
branch: main
tags: [report, refactor, cleanup, snapshot]
created: 2026-05-06
---

# Phase 5b — Snapshot Refactor + FS Legacy Cleanup

## Context Links

- Brainstorm: `plans/reports/brainstorm-260505-1007-report-module-data-model.md`
- Plan overview: `plans/260505-1007-phase1-migrate-report-data-layer/plan.md`
- Phase 5a closed: commit `965a617` (flag REPORT_LEGACY_FALLBACK removed)
- Files in scope:
  - `src/services/report/snapshot.service.ts` (~143 LOC)
  - `src/app/api/report/snapshots/route.ts`
  - `src/app/api/report/snapshots/restore/route.ts`
  - `src/app/report/khdn/mapping/hooks/useAutoSaveSnapshot.ts`
  - `src/app/report/khdn/mapping/components/modals/snapshot-restore-modal.tsx`
  - `src/lib/report/manual-values.ts` (shim)
  - `report_assets/config/manual_values.json`
  - `report_assets/config/versions/` (74 files)
  - `report_assets/backups/editor-snapshots/` (120 files)

## Overview

- **Priority**: P2 (cleanup, không block user)
- **Status**: pending
- **Effort**: ~2-3h (Option B)
- **Goal**: Xoá snapshot infrastructure + shim + FS legacy đã bị orphan sau Phase 5a. Đóng Phase 1.

## Key Insights — Recommend Option B (drop hoàn toàn)

### So sánh

| Option | Effort | Pros | Cons |
|---|---|---|---|
| A. Per-loan snapshot table | 5-7h | Aligned per-loan model | Schema migration; FS migrate; trùng feature với auto-save Phase 2 |
| **B. Drop hoàn toàn** | **2-3h** | **Simplest, KISS+YAGNI**; nhường recovery cho Phase 2 auto-save | User mất feature snapshot UI tạm thời |
| C. Global DB snapshot | 3-4h | Minimal semantic change | Vẫn global anti-pattern; trùng auto-save |

### Rationale chọn B

1. **Snapshot data đã chết sau Phase 5a**. Snapshot capture `manualValues + formulas + mappingText + aliasText`. Sau Phase 5a:
   - `manualValues` không còn ghi (consumers swap sang DB) → snapshot ghi field rỗng
   - `mappingText/aliasText` canonical trong `MasterTemplate.defaultMappingJson/defaultAliasJson` → undo qua DB
   - `formulas` vẫn dùng `field_formulas.json` nhưng nằm ngoài scope module này
2. **Phase 2 (Auto-save UI debounce 500ms)** — brainstorm đã chốt — sẽ cover use case "không mất data nhập tay" theo per-loan, đúng model. Không cần xây snapshot trung gian.
3. **YAGNI**: 197/197 tests pass, không có test fail nào yêu cầu snapshot. User hiện không có report mất data sau Phase 5a.
4. **120 file FS snapshots cũ**: backup zip sang `report_assets/_archive/` rồi xoá. Không migrate semantic vì format không gắn loan/customer.
5. **Brainstorm Phase 0 final decisions** đã list `manual_values.json` + `versions/` ở cột "XOÁ" — Phase 5b chỉ thực thi.

## Requirements

### Functional

- F1: GET/POST `/api/report/snapshots` + POST `/api/report/snapshots/restore` → return 410 Gone hoặc xoá route hẳn (chọn xoá)
- F2: UI mapping page → bỏ button "Khôi phục snapshot" + bỏ auto-save hook
- F3: `manual-values.ts` shim → xoá file, xoá tất cả import còn lại
- F4: FS files: backup zip rồi xoá `manual_values.json`, `versions/`, `editor-snapshots/`

### Non-functional

- NF1: 0 import broken sau xoá (tsc + vitest pass)
- NF2: Backup zip lưu vào `report_assets/_archive/phase-5b-{date}.zip` với README ghi rationale
- NF3: Không break VPS deploy đang chạy (FS không còn được đọc → silent OK)

## Architecture

### Trước Phase 5b

```
UI mapping page
  ├─ useAutoSaveSnapshot (60s) ──► POST /api/report/snapshots
  │                                   └─► snapshotService.createSnapshot
  │                                         └─► fs.writeFile editor-snapshots/*.json
  └─ SnapshotRestoreModal ──► GET /api/report/snapshots
                              POST /api/report/snapshots/restore
                                  └─► snapshotService.restoreSnapshot
                                        └─► saveManualValues (shim) ──► manual_values.json (read-only effect)
                                            saveFieldFormulas ──► field_formulas.json
```

### Sau Phase 5b

```
UI mapping page (no snapshot UI)
  └─ (Phase 2 will add: per-loan debounced auto-save → valuesService DB write)
```

## Related Code Files

### DELETE

- `src/services/report/snapshot.service.ts`
- `src/app/api/report/snapshots/route.ts`
- `src/app/api/report/snapshots/restore/route.ts`
- `src/app/report/khdn/mapping/hooks/useAutoSaveSnapshot.ts`
- `src/app/report/khdn/mapping/components/modals/snapshot-restore-modal.tsx`
- `src/lib/report/manual-values.ts`
- `report_assets/config/manual_values.json` (after backup)
- `report_assets/config/versions/` (after backup)
- `report_assets/backups/editor-snapshots/` (after backup)

### MODIFY

- `src/services/report.service.ts` — bỏ `listSnapshots`/`createSnapshot`/`restoreSnapshot`/`getSnapshot` re-exports
- `src/app/report/khdn/mapping/components/mapping-page-content.tsx` — bỏ `useAutoSaveSnapshot()` call + `<SnapshotRestoreModal>`
- `src/app/report/khdn/mapping/components/mapping-sidebar.tsx` — bỏ button "Khôi phục snapshot"
- `src/app/report/khdn/mapping/components/sidebar/sidebar-tools-section.tsx` — bỏ snapshot button
- `src/app/report/khdn/mapping/hooks/useMappingPageLogic.ts` — bỏ snapshot modal state + `takeManualSnapshot`
- `src/app/report/khdn/mapping/hooks/use-mapping-modal-state.ts` — bỏ snapshot modal field
- `src/app/report/khdn/mapping/hooks/use-field-template-sync.ts` — kiểm tra import snapshot (Grep)
- `src/app/report/khdn/mapping/hooks/use-field-group-bulk-actions.ts` — kiểm tra
- `src/app/report/khdn/mapping/hooks/useFieldGroupActions.ts` — kiểm tra
- `src/app/report/khdn/mapping/stores/use-undo-store.ts` — kiểm tra (undo store không phụ thuộc snapshot)
- `src/app/report/khdn/mapping/types.ts` — bỏ `SnapshotMeta`/`SnapshotData` types
- `src/lib/report/config-schema.ts` — kiểm tra reference

### CREATE

- `scripts/archive-report-fs-legacy.ts` — zip backup `report_assets/{config/manual_values.json,config/versions,backups/editor-snapshots}` → `report_assets/_archive/phase-5b-{YYYYMMDD}.zip`
- `report_assets/_archive/README.md` — ghi rationale archive

## Implementation Steps

1. **Backup script** — viết `scripts/archive-report-fs-legacy.ts` dùng `archiver` (đã có dep) hoặc `node:zlib + tar`. Chạy local + commit log. SHA256 hash của zip ghi vào README.
2. **Audit imports** — `Grep "snapshot" src/` + `Grep "manual-values" src/` lấy danh sách đầy đủ before delete.
3. **Delete API routes** — xoá 2 folder `src/app/api/report/snapshots/`.
4. **Delete service** — xoá `snapshot.service.ts`.
5. **Strip report.service.ts** — bỏ re-exports + interfaces.
6. **Delete hook + modal** — `useAutoSaveSnapshot.ts`, `snapshot-restore-modal.tsx`.
7. **Strip UI** — bỏ snapshot button + modal mount + state field. Run `next build` to catch broken imports.
8. **Delete shim** — xoá `manual-values.ts`. `Grep` confirm 0 import còn lại.
9. **Run tests** — `npm run test` (Vitest) + `tsc --noEmit`. Fix bất kỳ test nào reference snapshot.
10. **FS cleanup** — chạy backup script, verify zip mở được, xoá 3 path trên FS.
11. **Update plan.md** — mark Phase 5b done.
12. **Commit** — conventional: `refactor(report): drop snapshot service + manual-values shim + FS legacy (Phase 5b)`.

## Todo List

- [ ] Viết `scripts/archive-report-fs-legacy.ts` + dry-run
- [ ] Grep audit imports cho `snapshot` + `manual-values` + `manualValues` callers
- [ ] Xoá `src/app/api/report/snapshots/` (2 routes)
- [ ] Xoá `snapshot.service.ts`
- [ ] Strip `report.service.ts` re-exports
- [ ] Xoá `useAutoSaveSnapshot.ts` + `snapshot-restore-modal.tsx`
- [ ] Strip UI button + modal mount + state (5 files)
- [ ] Xoá `manual-values.ts` shim
- [ ] Strip `types.ts` SnapshotMeta/SnapshotData
- [ ] `tsc --noEmit` + `npm run test` pass
- [ ] Chạy backup script — verify zip
- [ ] Xoá 3 FS paths
- [ ] Update `plan.md` Phase 5b row → Done
- [ ] Commit + push

## Success Criteria

- 197+ tests pass (no regression vs Phase 5a)
- `tsc --noEmit` clean
- `next build` clean
- 0 file/folder snapshot/manual-values trong `src/`
- Backup zip tồn tại + README archive
- 0 reference đến `loadManualValues`/`saveManualValues`/`snapshotService` trong codebase
- Mapping UI render bình thường, không có button snapshot

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| User đang dựa vào snapshot UI restore data hôm trước | Med | Backup zip + thông báo trong commit message; Phase 2 auto-save sẽ thay thế |
| Hidden import snapshot từ test files | Low | tsc + vitest catch; Grep audit trước xoá |
| FS path còn được đọc bởi VPS instance đang chạy | Low | Read-then-fallback đã catch ENOENT; deploy lại sau xoá |
| `versions/` files có data mapping cũ chưa migrate | Low | Phase 5a đã chốt MasterTemplate.defaultMappingJson canonical; backup zip giữ làm forensic |
| `field-formulas.json` còn dùng (orthogonal) | None | KHÔNG xoá — ngoài scope (used by formula evaluator) |

## Security Considerations

- **PII trong snapshots cũ**: `editor-snapshots/*.json` có thể chứa giá trị nhập tay (CMND, địa chỉ, số tiền). Backup zip → encrypt-at-rest? Hiện workflow: zip lưu vào `report_assets/_archive/` (gitignored). KHÔNG commit zip vào git.
- **Audit log**: ghi commit message + zip SHA256 vào `report_assets/_archive/README.md` để traceability.
- **Vercel**: zip không deploy (read-only FS, file > limit). Chỉ tạo trên dev/VPS.

## Next Steps (Phase 6 — separate plan)

1. **MappingInstance retirement**: migrate `mappingJson/aliasJson/fieldCatalogJson` còn lại sang `MasterTemplate.defaultMappingJson/defaultAliasJson/fieldCatalogJson`, drop bảng. Effort ~3-5h.
2. **Auto-save per-loan UI** (Phase 2 brainstorm): debounced 500ms `valuesService.patch*` calls. Effort ~2-3d.
3. **Re-encrypt batch script** (deferred): rotate ENCRYPTION_KEY for `dossierValuesJson`/`customerProfileValuesJson`.
4. **Field-formulas refactor**: tách `field_formulas.json` ra DB nếu cần per-template formula.

## Unresolved Questions

1. **User dùng snapshot UI restore không?** Nếu có dữ liệu khôi phục đang pending → cần migrate trước xoá. Đề xuất: hỏi user trước commit.
2. **`field_formulas.json` giữ lại?** Hiện ngoài scope nhưng nằm cùng folder. Confirm để Phase 6 xử lý riêng.
3. **`versions/` files (74 file mapping/alias bootstrap+draft)**: có cần parse + extract giá trị nào vào `MasterTemplate.defaultMappingJson` không, hay đã backfill xong ở Phase 2 migration script?
4. **Backup zip retention**: keep forever in `_archive/` hay TTL 90 ngày rồi xoá?
5. **Commit strategy**: 1 commit gộp hay tách 3 commits (delete code → delete shim → delete FS)? Tách dễ revert nhưng chỉ 2-3h work nên gộp được.
