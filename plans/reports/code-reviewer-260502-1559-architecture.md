# Architecture & Data Layer Review — 2026-05-02

## Scope
- `prisma/schema.prisma`
- `src/lib/` (db, prisma, report/fs-store)
- `src/services/report/` (all sub-services)
- `src/app/api/report/` (route handlers)
- `src/core/use-cases/`

---

## CRITICAL Issues

### C1 — Non-atomic dual-write in `mapping.service.ts:saveMappingDraft` (lines 92–100)
When `fieldCatalog` is provided with an `instanceId`, the code does:
1. `await prisma.fieldTemplateMaster.update(...)` — updates master catalog
2. `await prisma.mappingInstance.update(...)` — updates instance catalog

These are two separate Prisma calls outside a `$transaction`. If step 2 fails, `fieldTemplateMaster` is already mutated → master and instance fall out of sync permanently.

**Fix:** Wrap both in `prisma.$transaction(async (tx) => { ... })`.

---

### C2 — `saveFromDraft` looks up customer by `customer_name` only (`customer-draft.service.ts:109`)
```ts
where: { customer_name: payload.customer_name },
```
`customer_name` has no UNIQUE constraint in schema. Two customers with the same name (common in Vietnamese banking) → wrong record updated. The correct unique key is `customer_code_hash`.

**Fix:** Look up by `customer_code_hash: hashCustomerCode(payload.customer_code)` instead of `customer_name`.

---

### C3 — `isMigrationChecked` module-level boolean is not safe under concurrent requests (`_migration-internals.ts:35`)
In serverless / Next.js multi-worker environments the flag is per-process. Under high concurrency, two simultaneous cold-start requests can both see `isMigrationChecked = false` and run the migration in parallel — causing duplicate `FieldTemplateMaster` rows and duplicate `MappingInstance` rows.

**Fix:** Use a DB-level advisory lock or an atomic `upsert` check-and-set pattern; alternatively gate on a `SELECT FOR UPDATE` inside `$transaction`.

---

## IMPORTANT Issues

### I1 — Missing pagination on `listMasterTemplates` / `listFieldTemplates` (`master-template.service.ts:18`, `template-field-operations.service.ts:28`)
Both call `prisma.fieldTemplateMaster.findMany()` with no `take`/`skip`. Hundreds of master templates → unbounded memory allocation and response size.

**Fix:** Add `take: 100` default, expose `page`/`limit` params, return `{ data, total }`.

---

### I2 — `mappingInstance.groupBy` loads all instances without limit (`master-template.service.ts:29`, `template-field-operations.service.ts:36`)
`prisma.mappingInstance.groupBy({ by: ["masterId", "customerId"] })` with no `where` clause fetches every instance row. On large datasets this is a full-table scan.

**Fix:** Add `where: { masterId: { not: null } }` and paginate if needed, or use `_count` aggregate per-master in a single query.

---

### I3 — `exportData` without `customerIds` loads ALL customers with full nested relations (`data-io-export.service.ts:91`)
```ts
const rawCustomers = await prisma.customer.findMany({ include: fullCustomerInclude });
```
No pagination, no limit. With many customers, each with loans → disbursements → beneficiaryLines → invoices, this can OOM the Node.js process.

**Fix:** Use cursor-based streaming (`fullCustomerBatches`) already defined in the same file instead of the single bulk `findMany`.

---

### I4 — Import uses sequential `for...of` with individual `create` calls inside loop (`data-io-import.service.ts:250–284`)
For each customer's collaterals/loan_plans/co_borrowers/etc., the code does:
```ts
for (const col of raw.collaterals) { await tx.collateral.create(...); }
```
This runs N sequential round-trips per customer. For 100 customers × 5 relation types × avg 3 items = 1500 sequential DB calls within one transaction → very slow and SQLite lock-timeout risk.

**Fix:** Collect all items per type into arrays, then `createMany` once per type per customer.

---

### I5 — `console.log("[PRISMA] DB:", dbUrl)` in production path (`prisma.ts:86`)
Leaks the full SQLite file path on every cold start in every environment including production.

**Fix:** Gate behind `if (process.env.NODE_ENV !== "production")`.

---

### I6 — Module size violations (files > 200 LOC)
| File | LOC |
|------|-----|
| `src/services/report/build.service.ts` | 275 |
| `src/services/report/template-field-operations.service.ts` | 280 |
| `src/services/report/_shared.ts` | 241 |
| `src/services/report/_migration-internals.ts` | 263 |
| `src/lib/report/fs-store.ts` | 269 |
| `src/lib/report/financial-field-catalog.ts` | 471 |
| `src/services/report/data-io-import.service.ts` | 410 |
| `src/services/report/customer-xlsx-io.service.ts` | 314 |

All exceed the project's 200-line rule. `data-io-import.service.ts` at 410 lines is the worst offender mixing pre-fetch logic, per-entity upsert helpers, and field-template migration.

---

### I7 — `as never` type casts bypass Prisma type safety in import (`data-io-import.service.ts:252–284`)
```ts
await tx.collateral.create({ data: { ...col, id: undefined, customerId } as never });
```
Used 6× for different models. Masks schema mismatches between imported JSON and current Prisma types. A field renamed in the schema would silently fail or produce a runtime crash.

**Fix:** Define typed `CreateInput` objects per model and validate import payload with Zod before the transaction.

---

### I8 — Branch model has no indexes (`schema.prisma:617–638`)
`Branch` table is used as FK on `Customer.active_branch_id` (which has `@@index([active_branch_id])`), but `Branch` itself has no index on `name` or `branch_code` — both likely to be used in search/filter.

**Fix:** Add `@@index([name])` and `@@index([branch_code])` if search is needed.

---

### I9 — `Verification` model has no index on `identifier` or `expiresAt` (`schema.prisma:90–99`)
Better-Auth uses `Verification` for email OTP/magic links. Lookups by `identifier` + `value` + `expiresAt` with no index = full-table scan every auth verification attempt.

**Fix:** Add `@@index([identifier])` and `@@index([expiresAt])`.

---

## MINOR Issues

### M1 — Hardcoded magic numbers in `build.service.ts:184`
`const CONCURRENCY_LIMIT = 5;` is a local constant buried in the method body, not in a shared config. If tuning is needed, it must be found in source.

**Fix:** Move to a module-level constant or `src/lib/report/constants.ts`.

---

### M2 — Dead conditional branch in `listFieldTemplates` (`template-field-operations.service.ts:56–79`)
The legacy `state.field_templates` path is only reached if `hasDbMasterData = false && hasDbInstanceData = false`. After migration (`LEGACY_MIGRATION_VERSION = 1`), this branch is unreachable for any production installation that has run migration. Code adds cognitive load without value.

**Fix:** Document explicitly with `// Legacy fallback — only for fresh installs pre-migration` or remove after confirming all deployments migrated.

---

### M3 — `fs-store.ts` leaks `console.warn` on every DB save failure (line 155)
```ts
console.warn("[fs-store] DB save failed, falling back to file:", err);
```
This is appropriate during development but should use a structured logger in production.

---

## Positive Observations

- Import service correctly pre-fetches all existing entities (customers, loans, beneficiaries, invoices) via batch `findMany` before looping — avoiding classic N+1 anti-pattern.
- `customerBatches` cursor-based generator in `_shared.ts` is well-designed for large-scale streaming.
- `listCustomers` uses `groupBy` aggregates rather than per-customer queries for `latestLoans`/`latestCollaterals`/`latestPlans` — good.
- `prisma.ts` key-based singleton pattern avoids duplicate client creation on hot reloads.
- API routes are thin — business logic is properly delegated to service layer.
- Transaction usage in `importData` and `saveFromDraft` is correct at the outer scope.
- Schema indexes are generally well-placed; `contractNumber`, `customer_code_hash`, `dueDate`, `status` all indexed.

---

## Unresolved Questions

1. **C3 migration race**: Is the app deployed as a single Next.js instance or multi-worker? If multi-worker (e.g., PM2 cluster, Vercel concurrency), the `isMigrationChecked` flag needs a distributed lock — what's the deployment model?

2. **C2 name lookup**: Is `saveFromDraft` called only from the mapping pipeline (where customer_name is assumed unique per mapping context) or from general UI? Clarifying the call site would confirm risk severity.

3. **I3 export OOM**: What is the expected max customer count at target Agribank branch? This determines urgency of streaming fix.

4. **Branch/Verification indexes**: Are these tables actively queried in production? If auth rate is low, these are lower priority.
