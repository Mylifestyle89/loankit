# Phase 04 — Remove Dual-Write + Swap Consumers

## Context Links

- Plan overview: [plan.md](plan.md)
- Brainstorm: `plans/reports/brainstorm-260505-1007-report-module-data-model.md` § 2 (storage chồng chéo), § 5 (dual-read window)
- Phase 03 done — `valuesService` shipped at `src/services/report/values.service.ts` (encrypted, atomic, opt-in optimistic lock)
- Shared schemas: `src/lib/report/values-schema.ts`
- Shim cần deprecate: `src/lib/report/manual-values.ts`
- Memory: `feedback_prisma_select_new_columns.md`, `project_pii_migration_completed.md`

## Overview

- **Priority**: P1
- **Status**: Not started
- **Effort**: 3-5d (split into 4a/4b/4c — see Decisions)
- Bỏ FS dual-write trong `mapping.service` + `build.service`, swap 17 consumers từ shim FS sang `valuesService` DB-backed, gate fallback bằng env flag, deprecate shim. Re-encrypt batch defer Phase 5.

## Key Insights — Decisions chốt (đề xuất, chờ user confirm)

1. **Feature flag**: env var `REPORT_LEGACY_FALLBACK` (default `true` Phase 4, flip `false` Phase 5). Đọc qua helper `src/lib/report/constants.ts` (1 nguồn truth, dễ mock test).
2. **Scope split**: chia 3 sub-phases liên tiếp trong 1 nhánh git để diff nhỏ, easier review:
   - **4a — Service layer (services/report/*.ts)**: `mapping`, `build`, `build-bank-export`, `build-data-transform`, `snapshot`, `field-values`, `financial-analysis`. Bỏ FS write trong mapping. ~1.5d.
   - **4b — API routes (`app/api/report/*`)**: `values/route.ts`, `snapshots/route.ts`. Pure DB. ~0.5-1d.
   - **4c — UI hooks/stores**: 6 file Zustand+hooks under `app/report/khdn/mapping/*`. **Defer to Phase 5 nếu** scope quá lớn — UI consume đã đi qua API routes (4b), có thể giữ nguyên client-side calls. Decision: 4c CHỈ touch hooks gọi trực tiếp shim, **không refactor store shape**. ~0.5-1d.
3. **Re-encrypt batch**: **defer Phase 5**. Lý do: Phase 2 backfill có thể đã ghi plaintext (no encrypt path). Phase 4 ưu tiên swap đường code, không trộn data ops. Phase 5 batch re-encrypt + audit.
4. **`manual-values.ts` lifecycle**: **option B — giữ shim với deprecation warnings**. Phase 4 export read-only API + `console.warn` mỗi call. Phase 5 xoá hẳn sau dual-read window đóng. An toàn rollback hơn xoá ngay.
5. **Re-encrypt logic clarify**: nếu Phase 5 detect plaintext → script `scripts/re-encrypt-values.ts` (idempotent, batch 100, `--dry-run`, `--limit N`).

## Requirements

**Functional**

- `mapping.service.ts`: bỏ FS write block (~L73-81), giữ DB update
- `build.service.ts`: source values qua `valuesService.getMergedValuesForExport(loanId)`, fallback `manual_values.json` chỉ khi flag bật + DB rỗng
- 17 consumers (xem danh sách Files): swap reads `loadManualValues()` → `valuesService.getCustomerProfile/getDossierValues/getMergedValuesForExport`, swap writes `saveManualValues()` → `valuesService.save*` / `patch*`
- API routes `/api/report/values`, `/api/report/snapshots`: pure DB read/write
- `manual-values.ts`: file-level `@deprecated` JSDoc + `console.warn` 1 lần / module load (tránh log spam) + per-function gate
- Add `REPORT_LEGACY_FALLBACK` flag (default `true`)
- Constants helper export `isLegacyFallbackEnabled()` cho consumers + tests mock

**Non-functional**

- Zero runtime regression khi flag bật
- Test coverage ≥ 80% mỗi consumer đã swap (mock `valuesService`)
- Compile clean qua `npm run build`
- Smoke test: 1 customer + 1 loan migrated export DOCX OK với flag `false`
- PII: mọi write đi qua `valuesService.save*` → encrypt path đã verify Phase 3

## Architecture

**Data flow trước (Phase 3 end)**

```
mapping.service.save()  → DB.update()  + fs.writeFile(mappingJsonPath)
build.service.run()     → loadManualValues() [FS] + fs.write(report_draft_flat.json)
17 consumers            → loadManualValues / saveManualValues (FS only)
```

**Data flow sau (Phase 4 end)**

```
mapping.service.save()  → DB.update()  ✗ no FS write
build.service.run()     → valuesService.getMergedValuesForExport(loanId)
                          └─ if {} && REPORT_LEGACY_FALLBACK=true
                             → loadManualValues() [FS] + console.warn
17 consumers            → valuesService.{getCustomerProfile,getDossierValues,save*,patch*}
                          └─ same fallback gate as above khi read returns {}
manual-values.ts        → @deprecated, read-only, warn-once at import
```

**Feature flag logic** (`src/lib/report/constants.ts`)

```ts
export const isLegacyFallbackEnabled = () =>
  process.env.REPORT_LEGACY_FALLBACK !== 'false'; // default true Phase 4
```

## Related Code Files

**Modify — services (4a)**

- `src/services/report/mapping.service.ts` — remove FS write block
- `src/services/report/build.service.ts` — swap data source, add fallback gate
- `src/services/report/build-service-bank-export.ts` — swap reads
- `src/services/report/build-service-data-transform.ts` — swap reads
- `src/services/report/snapshot.service.ts` — swap reads/writes
- `src/services/report/field-values.service.ts` — swap reads/writes
- `src/services/financial-analysis.service.ts` — swap reads
- `src/lib/report/constants.ts` — add flag helper

**Modify — API routes (4b)**

- `src/app/api/report/values/route.ts`
- `src/app/api/report/snapshots/route.ts`

**Modify — UI hooks (4c, scope-limited)**

- `src/app/report/khdn/mapping/hooks/useAutoSaveSnapshot.ts`
- `src/app/report/khdn/mapping/hooks/use-mapping-api-mutations.ts`
- `src/app/report/khdn/mapping/hooks/use-field-template-crud.ts`
- `src/app/report/khdn/mapping/hooks/use-field-template-apply.ts`
- `src/app/report/khdn/mapping/hooks/use-field-group-bulk-actions.ts`
- `src/app/report/khdn/mapping/components/modals/snapshot-restore-modal.tsx`
- `src/app/report/khdn/template/_components/build-export-tab.tsx`
- `src/app/report/khdn/mapping/stores/use-mapping-data-store.ts` — **read-only audit**, defer state-shape refactor Phase 5
- `src/app/report/khdn/mapping/types.ts` — type cleanup nếu cần

**Modify — config**

- `.env.example` — add `REPORT_LEGACY_FALLBACK=true`
- `src/lib/env.ts` (nếu có schema validation) — register optional flag

**Modify — shim**

- `src/lib/report/manual-values.ts` — `@deprecated`, warn-once, read-only

**Create — tests**

- `src/services/report/__tests__/build.service.test.ts` — fallback gate, DB path, FS path
- `src/services/report/__tests__/mapping.service.test.ts` — verify no FS write
- `src/services/report/__tests__/snapshot.service.test.ts`
- `src/services/report/__tests__/field-values.service.test.ts`
- `src/app/api/report/values/__tests__/route.test.ts`
- `src/app/api/report/snapshots/__tests__/route.test.ts`

**Defer to Phase 5**

- `scripts/re-encrypt-values.ts` (decision 3)
- Delete `manual-values.ts` (decision 4)
- Delete `file-lock.service.ts` nếu unused after shim removal

## Implementation Steps

1. **Audit FS writes + shim usage** — `Grep "fs\\.(promises\\.)?writeFile|writeFileSync" src/services/report/`, `Grep "manual_values\\.json|loadManualValues|saveManualValues" src/`. Snapshot list vào PR description.
2. **Add flag helper** — edit `src/lib/report/constants.ts`, export `isLegacyFallbackEnabled()`. Add `REPORT_LEGACY_FALLBACK=true` to `.env.example`. If `src/lib/env.ts` schema validates env, add optional boolean.
3. **Sub-phase 4a — services**:
   1. `mapping.service.ts`: remove FS write block (~L73-81), keep DB update + return type. Add inline comment `// Phase 4: FS write removed — see plan`.
   2. `build.service.ts`: replace `loadManualValues()` call với:
      ```ts
      let values = await valuesService.getMergedValuesForExport(loanId);
      if (Object.keys(values).length === 0 && isLegacyFallbackEnabled()) {
        values = await loadManualValuesLegacy();
        console.warn(`[report] Legacy FS fallback used for loan ${loanId}`);
      }
      ```
   3. Repeat pattern for `build-service-bank-export`, `build-service-data-transform`, `snapshot.service`, `field-values.service`, `financial-analysis.service`. Reads → `valuesService.get*`, writes → `valuesService.save*`/`patch*`.
   4. Compile check: `npm run build`. Fix type errors.
4. **Sub-phase 4a tests** — write `__tests__/*.test.ts` mocking `valuesService` + `isLegacyFallbackEnabled`. Test cases per service: (a) DB has data → DB path used; (b) DB empty + flag true → FS fallback called; (c) DB empty + flag false → returns empty/throws expected error; (d) save → encrypted via `valuesService`. Run `npm test`.
5. **Sub-phase 4b — API routes**:
   1. `app/api/report/values/route.ts`: GET → `valuesService.getCustomerProfile`/`getDossierValues` based on query param; POST/PUT → `save*`/`patch*`. Validate body via existing Zod from `values-schema.ts`.
   2. `app/api/report/snapshots/route.ts`: same pattern, route through `snapshotService` (which now goes through `valuesService`).
   3. Add route tests mocking `valuesService` + Next.js `Request`/`Response`.
6. **Sub-phase 4c — UI hooks (scope-limited)**:
   1. Audit each hook — confirm calls go through API routes (4b) ✓ no change needed, OR direct shim import → swap to API call.
   2. `useAutoSaveSnapshot.ts`, `use-mapping-api-mutations.ts`: ensure POST `/api/report/values` (already via 4b).
   3. `use-field-template-{crud,apply}.ts`, `use-field-group-bulk-actions.ts`: audit; if pure-client logic dùng shim type defs only → keep, no swap needed.
   4. `snapshot-restore-modal.tsx`, `build-export-tab.tsx`: audit imports, swap if direct shim use.
   5. **Stores `use-mapping-data-store.ts` + `types.ts`** — audit only, do NOT refactor state shape. Note state-shape mismatch trong follow-up nếu có.
7. **Deprecate `manual-values.ts`**:
   1. Add file-level JSDoc `@deprecated since 0.3.0 — use valuesService instead. Removed in Phase 5.`
   2. Add module-level `console.warn` in module init scope (1 lần / process), not per-call (avoid log spam).
   3. Remove exported writers (`saveManualValues`) — error compile any remaining caller (acts as guard).
   4. Keep readers `loadManualValues` + rename internal export → `loadManualValuesLegacy` for clarity in callers.
8. **Smoke test dev**:
   1. Reset 1 customer + 1 loan đã migrated.
   2. Open `/report/khdn/...` UI, edit field, save → verify DB write via Prisma Studio.
   3. Export DOCX → verify file matches expected values.
   4. Set `REPORT_LEGACY_FALLBACK=false` → repeat → verify zero `manual_values.json` reads (instrument console grep).
   5. Test fallback: clear `customerProfileValuesJson` from DB for 1 row, set flag `true`, export → verify FS fallback path triggered + warn logged.
9. **Re-grep verify** — same patterns as step 1, expect:
   - 0 `fs.writeFile` in `src/services/report/` (except DOCX export — known)
   - 0 direct `loadManualValues` import outside `build.service.ts` fallback path + shim
10. **Update docs** — `docs/system-architecture.md`: note FS dual-write removed, flag semantics. `docs/project-changelog.md`: entry "Phase 4: removed report dual-write, swapped 17 consumers to DB-first valuesService".
11. **Memory note** — save `feedback_legacy_fallback_flag.md`: flag default `true`, flip Phase 5, why warn-once.
12. **Open PR** — title `refactor(report): remove dual-write, swap consumers to valuesService [phase-4]`. PR body lists: audit grep snapshot, scope split 4a/4b/4c, decisions confirmed, test coverage delta.

## Todo List

### Setup
- [ ] FS write + shim audit grep snapshot
- [ ] Add `isLegacyFallbackEnabled()` to constants
- [ ] `.env.example` + env schema update

### 4a Services
- [ ] `mapping.service.ts` — remove FS write
- [ ] `build.service.ts` — swap + fallback gate
- [ ] `build-service-bank-export.ts` — swap
- [ ] `build-service-data-transform.ts` — swap
- [ ] `snapshot.service.ts` — swap
- [ ] `field-values.service.ts` — swap
- [ ] `financial-analysis.service.ts` — swap
- [ ] Tests for above (6 files)
- [ ] `npm run build` clean

### 4b API
- [ ] `api/report/values/route.ts` — swap
- [ ] `api/report/snapshots/route.ts` — swap
- [ ] Route tests (2 files)

### 4c UI (scope-limited)
- [ ] Audit `useAutoSaveSnapshot.ts`
- [ ] Audit `use-mapping-api-mutations.ts`
- [ ] Audit `use-field-template-crud.ts`
- [ ] Audit `use-field-template-apply.ts`
- [ ] Audit `use-field-group-bulk-actions.ts`
- [ ] Audit `snapshot-restore-modal.tsx`
- [ ] Audit `build-export-tab.tsx`
- [ ] Audit `use-mapping-data-store.ts` (read-only)

### Shim deprecation
- [ ] `manual-values.ts` `@deprecated` + warn-once
- [ ] Remove `saveManualValues` exports
- [ ] Rename reader → `loadManualValuesLegacy`

### Verification
- [ ] Smoke test export with flag `true`
- [ ] Smoke test export with flag `false`
- [ ] Smoke test fallback path (clear DB row)
- [ ] Re-grep verify 0 FS write
- [ ] Test coverage ≥ 80% per swapped consumer
- [ ] Update `docs/system-architecture.md` + `project-changelog.md`
- [ ] Memory note saved
- [ ] PR opened

## Success Criteria

- 0 `fs.writeFile` calls in `src/services/report/` (except known DOCX export)
- 0 direct shim imports outside `build.service.ts` fallback + shim file itself
- All 17 consumer reads/writes flow through `valuesService`
- Flag `false` → zero `manual_values.json` reads in smoke run (verified instrumented)
- Flag `true` + DB empty → fallback warns + reads FS (verified)
- Tests pass + ≥ 80% coverage per swapped consumer
- DOCX export end-to-end OK with DB-backed values
- `npm run build` clean

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| 17-consumer big-bang swap → silent regression | High | Sub-phase split 4a/4b/4c, tests per consumer mock `valuesService`, smoke test post each sub-phase |
| User edits `manual_values.json` during deploy window → lost | Medium | Announce maintenance window. Flag `true` keeps fallback live for 1 week |
| `valuesService.save*` write fails (Turso transient) — data lost | Medium | Existing `valuesService` has atomic updateMany + opt-in optimistic lock. Add try/catch + retry once in consumers. |
| Phase 2 backfill ghi plaintext, Phase 4 reads expecting encrypted → decrypt fail | Medium | `valuesService` already has plaintext fallback (Phase 3). Re-encrypt batch defer Phase 5. |
| UI Zustand store shape không match new flat record from `getMergedValuesForExport` | Medium | Phase 4c read-only audit, no shape refactor. Document mismatch as Phase 5 follow-up. |
| `.env` typo `REPORT_LEGACY_FALLBACK=False` (Python style) → still truthy | Low | Helper checks `!== 'false'` strict string. Document in `.env.example` comment. |
| Shim `console.warn` log spam | Low | Module-init warn-once, not per-call |
| Encrypt key missing in dev → save fail silently | Low | `valuesService` Phase 3 already throws if `ENCRYPTION_KEY` empty. Verified. |

## Security Considerations

- All writes via `valuesService.save*` → AES-256-GCM full-blob encrypt (Phase 3 verified)
- Fallback FS read does not write back to FS — pure read-only
- `console.warn` logs `loanId` only (non-PII per project policy)
- Flag `REPORT_LEGACY_FALLBACK` env-controlled, not user-controlled — no injection vector
- API routes 4b validate body via Zod from `values-schema.ts` — same as Phase 3
- Re-encrypt script (Phase 5) MUST run with `ENCRYPTION_KEY` set, idempotent, audit log

## Next Steps (Phase 5)

1. Monitor warn-log frequency 1 tuần. If 0 fallback hits → safe to flip flag `false`.
2. Re-encrypt batch script — quét plaintext rows, re-encrypt via `valuesService.saveCustomerProfile`. `--dry-run`, `--limit N`, batch 100.
3. Drop `MappingInstance` table (migration)
4. Delete `src/lib/report/manual-values.ts` + `file-lock.service.ts` if unused
5. Refactor Zustand store shape to match `getMergedValuesForExport` flat record
6. Remove `REPORT_LEGACY_FALLBACK` flag entirely

## Unresolved Questions

1. **Flag location**: env var `REPORT_LEGACY_FALLBACK` (proposed) vs constant in `src/lib/report/constants.ts` only? Env preferred for ops flip without redeploy — confirm?
2. **Scope split 4a/4b/4c**: chia 3 sub-phase trong 1 nhánh git OK? Hoặc user muốn 3 PR riêng để rollback granular?
3. **Re-encrypt batch defer Phase 5**: confirm OK? Hoặc user muốn ngay Phase 4 (cùng nhánh, +0.5-1d)?
4. **`manual-values.ts` shim option B (deprecate, xoá Phase 5)**: confirm? Hoặc user muốn xoá hẳn cuối Phase 4 (option A, riskier rollback)?
5. **UI 4c scope-limit**: confirm chỉ audit hooks + defer state-shape refactor sang Phase 5? Hoặc user muốn full refactor ngay?
