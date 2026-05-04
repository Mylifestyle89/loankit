# Phase 05 — IMPORTANT Architecture + DB Migration

## Context
- Report: `plans/reports/code-reviewer-260502-1559-architecture.md` (I1..I9)
- Memory: `feedback_prisma_select_new_columns.md` — schema changes need migration; `project_dual_devdb_location.md` — target `prisma/dev.db`
- Memory: `project_pii_migration_completed.md` — Turso deploy sequence

## Overview
- **Priority:** P2
- **Status:** pending
- **Description:** Add pagination, kill console.log leak, modularize fat files, add missing indexes via Prisma migration.

## Issues

### A-I1 + A-I2 — Pagination + groupBy scan
**Files:**
- `src/services/report/master-template.service.ts` L18, L29
- `src/services/report/template-field-operations.service.ts` L28, L36

**Fix:** Add `page`, `limit` params (default `take: 100`). For `groupBy` usage count, use `_count` aggregate per master in single query OR add `where: { masterId: { not: null } }` and limit.

```ts
async function listMasterTemplates({ page = 1, limit = 100 } = {}) {
  const [data, total] = await prisma.$transaction([
    prisma.fieldTemplateMaster.findMany({ skip: (page-1)*limit, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.fieldTemplateMaster.count(),
  ]);
  return { data, total, page, limit };
}
```
Update API route + caller to handle `{ data, total }` envelope.

### A-I3 — `exportData` loads all customers
**File:** `src/services/report/data-io-export.service.ts` L91

Use existing `fullCustomerBatches` cursor generator (defined in same file) instead of single `findMany`.
```ts
const result = [];
for await (const batch of fullCustomerBatches({ batchSize: 50 })) {
  result.push(...batch);
}
return result;
```
If response shape requires single array, OK. If memory still tight for huge exports, stream NDJSON instead of JSON array (defer until needed — YAGNI).

### A-I4 — Sequential `for...of` in import
**File:** `src/services/report/data-io-import.service.ts` L250-284

Collect arrays per relation type, then one `tx.collateral.createMany({ data: [...] })`, etc. SQLite supports `createMany` — confirm Prisma version supports it for SQLite (Prisma 5+ does).

### A-I5 — `console.log` DB path in production
**File:** `src/lib/prisma.ts` L86

```ts
if (process.env.NODE_ENV !== "production") {
  console.log("[PRISMA] DB:", dbUrl);
}
```

### A-I6 — Files >200 LOC
**Targets (priority order):**
| File | LOC | Split strategy |
|------|-----|----------------|
| `data-io-import.service.ts` | 410 | Extract `import-prefetch.ts`, `import-customer-upsert.ts`, `import-relations-create.ts` |
| `financial-field-catalog.ts` | 471 | Extract per-domain catalog files: `catalog-credit.ts`, `catalog-collateral.ts`, etc. |
| `customer-xlsx-io.service.ts` | 314 | Extract `xlsx-export.ts`, `xlsx-import.ts` |
| `build.service.ts` | 275 | Extract `build-template-renderer.ts` |
| `template-field-operations.service.ts` | 280 | Extract `field-template-list.ts`, `field-template-mutate.ts` |
| `_migration-internals.ts` | 263 | Extract `migration-state.ts`, `migration-runner.ts` |
| `_shared.ts` | 241 | Split by concern (cursor utils vs. type guards) |
| `fs-store.ts` | 269 | Extract `fs-store-fallback.ts` |

Apply iteratively. Re-export from original path to avoid breaking imports.

### A-I7 — `as never` casts in import
**File:** `src/services/report/data-io-import.service.ts` L252-284

After A-I4 createMany refactor, define typed inputs:
```ts
const collateralData: Prisma.CollateralCreateManyInput[] = raw.collaterals.map(c => ({
  ...stripUndefined(c),
  id: undefined,
  customerId,
}));
await tx.collateral.createMany({ data: collateralData });
```
Validate import payload with Zod at top of `importData()`.

### A-I8 + A-I9 — Missing indexes (DB MIGRATION)
**File:** `prisma/schema.prisma`

Add to `Branch` model:
```prisma
@@index([name])
@@index([branch_code])
```
Add to `Verification` model:
```prisma
@@index([identifier])
@@index([expiresAt])
```

**Migration step:**
```bash
npx prisma migrate dev --name add_branch_verification_indexes
# Then for Turso (per memory project_pii_migration_completed.md):
npm run db:migrate:turso
```

## Implementation Steps
1. **DB MIGRATION FIRST** (independent, low risk): edit schema, run `npx prisma migrate dev --name add_branch_verification_indexes`, target `prisma/dev.db` (memory `project_dual_devdb_location.md`).
2. Fix A-I5 (`prisma.ts` console.log) — 1-line change.
3. Fix A-I3 (`exportData` use cursor batches).
4. Refactor A-I4 + A-I7 together (createMany + types) — these are coupled.
5. Add pagination A-I1/A-I2 + update callers.
6. Modularize A-I6 file by file (separate commits per file).
7. Run full test suite after each modularization.
8. Sync Turso prod DB with `db:migrate:turso`.

## Todo
- [ ] Add `MigrationState` model (from Phase 2 if not done)
- [ ] Add Branch indexes (`name`, `branch_code`)
- [ ] Add Verification indexes (`identifier`, `expiresAt`)
- [ ] Run `npx prisma migrate dev` on dev (target `prisma/dev.db`)
- [ ] Run `db:migrate:turso` on staging
- [ ] Gate `console.log("[PRISMA] DB:")` behind NODE_ENV check
- [ ] Switch `exportData` to cursor batches
- [ ] Refactor import to `createMany` + typed inputs (drop 6× `as never`)
- [ ] Add Zod schema to validate import payload
- [ ] Add pagination to `listMasterTemplates` + caller
- [ ] Add pagination to `listFieldTemplates` + caller
- [ ] Replace full-table `groupBy` with scoped query / `_count`
- [ ] Modularize `data-io-import.service.ts` (410 → <200)
- [ ] Modularize `financial-field-catalog.ts` (471 → <200)
- [ ] Modularize `customer-xlsx-io.service.ts`
- [ ] Modularize `build.service.ts`
- [ ] Modularize `template-field-operations.service.ts`
- [ ] Modularize `_migration-internals.ts`
- [ ] Modularize `_shared.ts`
- [ ] Modularize `fs-store.ts`

## Success Criteria
- `npx prisma migrate status` clean
- All target files <200 LOC
- No `as never` in `data-io-import.service.ts`
- `EXPLAIN QUERY PLAN` on Verification lookup uses index
- Export of 1k customers does not OOM Node process (manual benchmark)
- Tests pass

## Risk
- **R1:** Modularization can introduce circular imports. Mitigation: extract pure helpers first, then orchestrators.
- **R2:** `createMany` for SQLite — confirm Prisma version. If unsupported, fall back to single `Promise.all(...create...)` per type (still parallel = faster than sequential).
- **R3:** Pagination response shape change breaks UI callers — coordinate update.
- **R4:** Turso migration order — follow memory `project_pii_migration_completed.md` deploy sequence A→F.
