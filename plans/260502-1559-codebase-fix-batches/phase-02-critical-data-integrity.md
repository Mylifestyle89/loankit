# Phase 02 — CRITICAL Data Integrity

## Context
- Report: `plans/reports/code-reviewer-260502-1559-architecture.md` (C1, C2, C3)
- Memory: `project_pii_migration_completed.md` — HMAC `customer_code_hash` is canonical unique key

## Overview
- **Priority:** P1 (CRITICAL)
- **Status:** pending
- **Description:** Wrap dual-write in transaction; switch customer lookup to hash; close migration race.

## Issues

### A-C1 — Non-atomic dual-write in `mapping.service.ts`
**File:** `src/services/report/mapping.service.ts` L92-100

**BEFORE:**
```ts
await prisma.fieldTemplateMaster.update({ where: {...}, data: {...} });
await prisma.mappingInstance.update({ where: { id: instanceId }, data: {...} });
```

**AFTER:**
```ts
await prisma.$transaction(async (tx) => {
  await tx.fieldTemplateMaster.update({ where: {...}, data: {...} });
  await tx.mappingInstance.update({ where: { id: instanceId }, data: {...} });
});
```
Pass `tx` to any helpers called inside.

### A-C2 — `saveFromDraft` lookups by `customer_name`
**File:** `src/services/report/customer-draft.service.ts` L109

**BEFORE:**
```ts
where: { customer_name: payload.customer_name },
```

**AFTER:**
```ts
import { hashCustomerCode } from "@/lib/crypto/customer-code-hash"; // confirm exact path
const codeHash = hashCustomerCode(payload.customer_code);
where: { customer_code_hash: codeHash },
```
Fallback: if `payload.customer_code` missing, throw `ValidationError("customer_code required")` instead of name lookup.

### A-C3 — `isMigrationChecked` race
**File:** `src/services/report/_migration-internals.ts` L35

**Approach (KISS):** Replace module-level boolean with DB-backed sentinel via `upsert` on a dedicated `MigrationLock` row, OR use `prisma.$transaction` with `SELECT ... FOR UPDATE` semantics.

**Simplest fix (SQLite-friendly):**
1. Wrap migration body in `prisma.$transaction(async (tx) => { ... }, { isolationLevel: 'Serializable' })`.
2. Inside: query for an existence sentinel (e.g., `MigrationState` table with `key="LEGACY_MIGRATION_VERSION"`). If row exists with version >= current, skip. Else insert + run migration.
3. Add unique constraint on `MigrationState.key` so concurrent inserts collide → second worker gets duplicate-key error → skip.

**Schema addition (in Phase 5 migration or here):**
```prisma
model MigrationState {
  key       String   @id
  version   Int
  appliedAt DateTime @default(now())
}
```
Set `isMigrationChecked` flag AFTER successful tx commit (still useful as in-process cache to skip DB read).

## Implementation Steps
1. Read `mapping.service.ts` L80-110 fully to identify all writes that must join the tx.
2. Apply A-C1 transaction wrap.
3. Read `customer-draft.service.ts` L100-120; locate `hashCustomerCode` helper path; apply A-C2.
4. Read `_migration-internals.ts` to map all branches that set `isMigrationChecked`.
5. Add `MigrationState` model to `prisma/schema.prisma` (defer migration to Phase 5 OR run now).
6. Refactor migration check to use DB sentinel + tx.
7. Test: simulate concurrent cold-start by spawning 2 parallel HTTP requests on fresh DB → only one master row created.

## Todo
- [x] Wrap mapping dual-write in `$transaction`
- [x] Switch `saveFromDraft` to `customer_code_hash` lookup
- [x] Add `MigrationState` model to schema
- [x] Replace `isMigrationChecked` boolean with DB sentinel + tx
- [ ] Add unit test: concurrent migration call → no duplicates
- [x] Run `npx prisma migrate deploy` with manual migration `20260502161700_add_migration_state`

## Success Criteria
- Mapping dual-write rollback verified by injecting failure on second update
- Two customers same name → `saveFromDraft` updates correct one
- Concurrent cold-start = single migration run

## Risk
- **R1:** `customer_code_hash` may be null for legacy rows pre-PII migration. Mitigation: skip rows with null hash, log + alert.
- **R2:** SQLite Serializable isolation can deadlock under load. Mitigation: limit migration to startup only, retry once on conflict.
