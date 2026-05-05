---
title: "Phase 2 — Migration Script (idempotent backfill)"
description: "scripts/migrate-report-data.ts: backfill Loan.masterTemplateId từ MappingInstance, force-orphan toàn bộ manual_values.json keys"
status: pending
priority: P1
effort: 6h
branch: main
tags: [migration, prisma, turso, report-module]
created: 2026-05-05
---

# Phase 02 — Migration Script (idempotent backfill)

## Context Links

- Plan: [plan.md](plan.md)
- Phase 01 (DONE — schema mới đã ship): [phase-01-add-new-schema-fields.md](phase-01-add-new-schema-fields.md)
- Brainstorm: `c:\Users\Quan\cong-cu-tao-bcdxcv\plans\reports\brainstorm-260505-1007-report-module-data-model.md` § 5
- Legacy data sources: `report_assets/manual_values.json`, table `MappingInstance`
- Schema mới đã có: `MasterTemplate`, `Customer.customerProfileValuesJson`, `Loan.masterTemplateId|dossierValuesJson|exportedDocxBlobRef`, `LoanReportExport`

## Overview

- **Priority**: P1
- **Status**: Not started
- **Effort**: ~6h (script ~150-250 LOC + dry-run test local + prod execution)
- Single-file standalone script `scripts/migrate-report-data.ts`. Idempotent, dry-run default, force-orphan strategy cho manual_values.

## Key Insights (4 decisions đã chốt với user)

| # | Decision | Lý do |
|---|---|---|
| 1 | **deepEqual viết tay 10 dòng** trong script (codebase chưa có sẵn — đã grep) | YAGNI/KISS, tránh thêm lodash dep |
| 2 | **Force-orphan TOÀN BỘ keys** từ `manual_values.json` (không heuristic-attribute kể cả single-customer case) | Global file không gắn customer/loan → user review thủ công qua UI sau migration. Chính xác > tự động sai |
| 3 | **Run local với `DATABASE_URL=<turso-prod-url>` lần đầu** (kiểm soát kỹ); chuyển GitHub Actions sau nếu ổn định | Migration prod là one-shot, cần human-in-loop |
| 4 | **Manual `turso db shell .dump > backup-{ts}.sql` TRƯỚC commit**; PITR là layer 2 | Backup là tự bảo vệ, không phụ thuộc Turso retention |

## Requirements

**Functional**:
- CLI flags:
  - `--dry-run` (DEFAULT TRUE) — log diff, không write
  - `--commit` — execute thật (override dry-run)
  - `--verbose` — log chi tiết từng record
- Pre-flight:
  - Detect target: `DATABASE_URL` prefix `file:` (local) vs `libsql://` (Turso)
  - Nếu prod prefix → print URL + require interactive `yes` confirm (skip nếu có `--yes`)
  - Verify Prisma client có model mới: `prisma.loanReportExport.count()` không throw
  - Nếu `--commit` mode: require env `MIGRATION_BACKUP_PATH` set + file tồn tại → ABORT nếu không
- Print rõ banner: `=== DRY RUN MODE — no changes ===` hoặc `=== COMMIT MODE — writing to {target} ===`
- Output files (root cwd):
  - `migration-orphans.json` — orphan records `{ key, value, reason, sourceFile }`
  - `migration-summary.json` — stats `{ instancesScanned, loansUpdated, loansSkipped, orphansCount, mode, timestamp }`
  - `migration-completed.json` — marker file (chỉ tạo ở `--commit` success)

**Non-functional**:
- Single file ~150-250 LOC OK (script độc lập, không cần modular hóa)
- Windows + Linux compat (đường dẫn qua `path.resolve`)
- Exit code: `0` success, `1` abort/error
- Idempotent: chạy 2 lần ra cùng kết quả

## Architecture

```
                  scripts/migrate-report-data.ts
                              │
       ┌──────────────────────┼──────────────────────┐
       ▼                      ▼                      ▼
   PRE-FLIGHT            STEP A:                STEP B:
   - parse flags         MappingInstance        manual_values.json
   - detect target       → Loan.masterTemplate  → ALL keys → orphans
   - confirm prod          (idempotent guard:     (per decision 2)
   - check backup          masterTemplateId
   - check Prisma model    !== null → skip)
                              │                      │
                              └──────────┬───────────┘
                                         ▼
                                    OUTPUT
                                  - orphans.json
                                  - summary.json
                                  - completed.json (commit only)
```

**Idempotent strategy**:
- Step A: skip Loan có `masterTemplateId !== null` (đã migrate)
- Toàn script: nếu `migration-completed.json` tồn tại → skip toàn bộ trừ khi có `--force`

**deepEqual** (chỉ dùng để LOG awareness, không drive logic vì decision đã bỏ Loan-level override):
```ts
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== 'object') return false;
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(k => deepEqual((a as any)[k], (b as any)[k]));
}
```

## Related Code Files

**Create**:
- `scripts/migrate-report-data.ts` — single-file script

**Modify**:
- `.gitignore` — add:
  ```
  migration-orphans.json
  migration-summary.json
  migration-completed.json
  backup-*.sql
  ```
- `package.json` scripts — add: `"migrate:report-data": "tsx scripts/migrate-report-data.ts"`

**Read-only**:
- `report_assets/manual_values.json`
- Prisma models: `MappingInstance`, `MasterTemplate`, `Loan`, `Customer`, `LoanReportExport`

**No files modified outside above** — script standalone.

## Implementation Steps

1. **Grep audit deepEqual** (verify codebase still missing → confirm self-write)
   ```bash
   grep -r "deepEqual\|isEqual\|deepCompare" src/lib src/utils
   ```
2. **Skeleton script** `scripts/migrate-report-data.ts`:
   - Parse `process.argv`: `--dry-run`, `--commit`, `--verbose`, `--yes`, `--force`
   - Default `dryRun = !args.includes('--commit')`
3. **Pre-flight checks** (in order, abort early on fail):
   - a. Read `DATABASE_URL` from env → detect kind (`file:` / `libsql://`) → log target
   - b. If `libsql://` and `--commit` → require `--yes` flag OR interactive confirm
   - c. If `--commit`: check `process.env.MIGRATION_BACKUP_PATH` exists + `fs.existsSync(path)` → abort with message if missing
   - d. Init `PrismaClient` → run `prisma.loanReportExport.count()` → catch + abort if model missing (Phase 1 not deployed)
   - e. Check `migration-completed.json` exists → if yes and no `--force` → exit 0 with "already migrated"
4. **Banner print** — DRY RUN vs COMMIT mode + target URL (mask token)
5. **Step A — Scan MappingInstance**:
   ```ts
   const instances = await prisma.mappingInstance.findMany({
     include: { master: true }
   });
   const stats = { instancesScanned: 0, loansUpdated: 0, loansSkipped: 0, mappingDiffs: 0 };
   const orphans: OrphanRecord[] = [];

   for (const inst of instances) {
     stats.instancesScanned++;
     // Awareness only: log if mapping differs (decision: bỏ override)
     if (inst.mappingJson && !deepEqual(inst.mappingJson, inst.master.fieldCatalogJson)) {
       stats.mappingDiffs++;
       if (verbose) console.log(`[diff] instance ${inst.id} mappingJson != master.fieldCatalogJson`);
     }
     // Find active loans for this customer
     const activeLoans = await prisma.loan.findMany({
       where: { customerId: inst.customerId, status: 'active' },
       orderBy: { createdAt: 'desc' }
     });
     if (activeLoans.length === 0) {
       orphans.push({ key: `mappingInstance:${inst.id}`, value: null,
         reason: 'no_active_loan_for_customer', sourceFile: 'MappingInstance' });
       continue;
     }
     const target = activeLoans[0]; // newest
     const skipped = activeLoans.slice(1);
     for (const sk of skipped) {
       orphans.push({ key: `loan:${sk.id}`, value: null,
         reason: 'multiple_active_loans_skipped_older', sourceFile: 'MappingInstance' });
     }
     // Idempotent guard
     if (target.masterTemplateId !== null) {
       stats.loansSkipped++;
       if (verbose) console.log(`[skip] loan ${target.id} already has masterTemplateId`);
       continue;
     }
     if (!dryRun) {
       await prisma.loan.update({
         where: { id: target.id },
         data: { masterTemplateId: inst.masterId }
       });
     }
     stats.loansUpdated++;
   }
   ```
6. **Step B — manual_values.json → ALL orphans** (decision 2):
   ```ts
   const mvPath = path.resolve('report_assets/manual_values.json');
   if (fs.existsSync(mvPath)) {
     const mv = JSON.parse(fs.readFileSync(mvPath, 'utf8'));
     for (const [key, value] of Object.entries(mv)) {
       orphans.push({
         key, value,
         reason: 'manual_values_global_no_attribution',
         sourceFile: 'manual_values.json'
       });
     }
   }
   ```
7. **Write outputs**:
   - `migration-orphans.json` (always — even dry-run, useful preview)
   - `migration-summary.json` (always)
   - `migration-completed.json` (ONLY if `!dryRun && noErrors`)
8. **Console summary** — print stats table + orphan count + file paths
9. **Exit codes** — `0` success/dry-run, `1` any abort
10. **Local test** (SQLite):
    ```powershell
    $env:DATABASE_URL="file:./prisma/dev.db"
    npx tsx scripts/migrate-report-data.ts --dry-run --verbose
    ```
    Verify: count records before/after → unchanged.
11. **Local commit test** (SQLite copy):
    ```powershell
    Copy-Item prisma/dev.db prisma/dev.db.backup
    $env:MIGRATION_BACKUP_PATH="./prisma/dev.db.backup"
    npx tsx scripts/migrate-report-data.ts --commit --verbose
    # Re-run → expect "already migrated" exit
    npx tsx scripts/migrate-report-data.ts --commit
    ```
12. **Prod backup**:
    ```powershell
    turso db shell bcdxcv-prod ".dump" > backup-260505-XXXX.sql
    ```
13. **Prod dry-run**:
    ```powershell
    $env:DATABASE_URL="libsql://..."
    $env:TURSO_AUTH_TOKEN="..."
    $env:MIGRATION_BACKUP_PATH="./backup-260505-XXXX.sql"
    npx tsx scripts/migrate-report-data.ts --dry-run
    ```
14. **Prod commit**:
    ```powershell
    npx tsx scripts/migrate-report-data.ts --commit --yes
    ```
15. **Verify post-migration** — query Turso: `SELECT COUNT(*) FROM Loan WHERE masterTemplateId IS NOT NULL` so với expected count từ summary.

## Todo List

- [ ] Grep audit deepEqual (confirm self-write)
- [ ] CLI skeleton + flag parser
- [ ] Pre-flight checks (5 substeps)
- [ ] Banner print logic
- [ ] Step A: MappingInstance scan + Loan update + idempotent guard
- [ ] Step B: manual_values.json → all orphans
- [ ] Output writers (orphans + summary + completed marker)
- [ ] .gitignore + package.json updates
- [ ] Local SQLite dry-run test
- [ ] Local SQLite commit test (incl. re-run idempotency)
- [ ] Prod Turso `.dump` backup
- [ ] Prod dry-run
- [ ] Prod commit
- [ ] Post-migration verification query

## Success Criteria

- ✅ Dry-run KHÔNG ghi DB (verify count trước/sau)
- ✅ Idempotent: chạy 2 lần thứ 2 exit "already migrated", 0 changes
- ✅ Mọi Loan active của customer có MappingInstance → `masterTemplateId` set HOẶC log orphan với reason
- ✅ 100% keys của `manual_values.json` xuất hiện trong `migration-orphans.json` với `reason: manual_values_global_no_attribution`
- ✅ Exit code 0 success, 1 abort
- ✅ Tự test pass local SQLite trước khi chạy prod
- ✅ Backup file tồn tại trước commit prod

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Chạy nhầm DB prod (gõ sai env) | Pre-flight print URL (mask token) + interactive confirm khi `libsql://` + `--commit` |
| Commit mà chưa backup | Hard abort if `MIGRATION_BACKUP_PATH` env unset hoặc file missing |
| Prisma client outdated (model mới chưa generate) | Pre-flight `prisma.loanReportExport.count()` → catch + abort với hint `npx prisma generate` |
| Concurrent runs → double-write | Idempotent guard: `Loan.masterTemplateId !== null` skip + `migration-completed.json` marker |
| Multi active loans cho 1 customer → attribute sai | Pick newest by `createdAt DESC` + log skipped older vào orphans (user review) |
| `migration-orphans.json` lộ PII (lưu trong repo) | gitignore + console warning về file location khi script kết thúc |
| Backup `.sql` accidentally commit | gitignore `backup-*.sql` |
| Re-run forgot `--force` flag → false alarm "already migrated" | Marker check có error message rõ + hint `--force` để override |

## Security Considerations

- **PII trong orphans**: `manual_values.json` có thể chứa CCCD/SĐT/địa chỉ → orphans file phải gitignore. Script print warning đường dẫn cuối run.
- **Backup `.sql`**: chứa toàn bộ DB → gitignore + lưu ngoài repo (vd `~/migration-backups/`) khuyến nghị.
- **`DATABASE_URL` + `TURSO_AUTH_TOKEN`**: chỉ qua env, không log full string (mask token khi print).
- **No hardcoded credentials** trong script.
- **Prod confirm gate**: interactive prompt mặc định khi commit Turso, `--yes` chỉ cho automation đã review trước.

## Next Steps

- Phase 03: `values.service.ts` — service layer đọc/ghi `customerProfileValuesJson` + `dossierValuesJson` (CRUD facade thay direct Prisma)
- Sau prod migration: build UI cho user review `migration-orphans.json` và gán manual về customer/loan tương ứng

## Unresolved Questions

- Có cần `--customer-id <id>` flag để migrate single-target không? (KHÔNG — toàn bộ là batch one-shot, đã bỏ vs plan cũ)
- Có cần zip `report_assets/` vào backup không? (KHÔNG — đã có git history + decision 4 chỉ require SQL dump)
- Sau khi Step A xong, có cần lock `MappingInstance` table khỏi ghi mới không? (Giả định không có write traffic vào table này nữa — verify với user trước prod commit)
