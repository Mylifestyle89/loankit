# Code Review: Deployment & Infrastructure (Vercel + Turso)

**Date:** 2026-03-08
**Branch:** Deploy-test
**Scope:** Deployment, database adapter, filesystem handling, migration scripts

## Scope

- Files: `prisma.ts`, `fs-store.ts`, `file-lock.service.ts`, `next.config.ts`, `package.json`, `schema.prisma`, `migrate-data-to-turso.js`, `push-turso-schema.js`, `.gitignore`
- Dependents: 21 files import prisma, 8 use file-lock, 15 use fs-store
- Focus: Security, correctness, edge cases, production readiness

## Overall Assessment

Solid dual-adapter setup (local better-sqlite3 / cloud Turso). Read-only FS handling is well-thought-out with graceful fallbacks. Migration scripts work but have security and robustness gaps that need addressing before production use.

---

## Critical Issues

### C1. SQL Injection in Migration Script (`migrate-data-to-turso.js:33,41`)

Table name and column names are interpolated directly into SQL:

```js
const rows = local.prepare(`SELECT * FROM ${tableName}`).all();
const sql = `INSERT OR REPLACE INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;
```

**Risk:** The `TABLES` array is hardcoded so current risk is low, but this pattern is dangerous if anyone extends the script or if column names contain SQL-special characters.

**Fix:** Quote identifiers with double quotes:
```js
const quotedCols = columns.map(c => `"${c}"`).join(", ");
const sql = `INSERT OR REPLACE INTO "${tableName}" (${quotedCols}) VALUES (${placeholders})`;
```

### C2. Prisma Schema Missing `url` in datasource (`schema.prisma:11-13`)

```prisma
datasource db {
  provider = "sqlite"
}
```

No `url` field. Prisma 7 with driver adapters may accept this, but:
- `prisma migrate dev` and `prisma db push` require `url` for local dev
- Some Prisma CLI commands will fail without it

**Verify:** Confirm that `prisma generate` and `prisma migrate dev` still work locally. If not, add:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

---

## High Priority

### H1. `ensureDirectories()` Swallows All Errors (`fs-store.ts:71-80`)

Catches ALL exceptions, not just read-only FS errors. A permissions error on a writable FS would be silently ignored.

**Fix:** Check for specific error codes:
```ts
async function ensureDirectories(): Promise<void> {
  try {
    await fs.mkdir(REPORT_CONFIG_DIR, { recursive: true });
    await fs.mkdir(REPORT_VERSIONS_DIR, { recursive: true });
    await fs.mkdir(REPORT_INVENTORY_DIR, { recursive: true });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "EROFS" && code !== "ENOENT" && code !== "EEXIST") {
      throw err;
    }
  }
}
```

### H2. File Lock `acquireLock` Silently Skips on Any mkdir Failure (`file-lock.service.ts:58-63`)

```ts
try {
  await fs.mkdir(LOCK_DIR, { recursive: true });
} catch {
  // Read-only filesystem (Vercel) — skip file locking
  return;
}
```

Any `mkdir` failure (network FS timeout, permissions, disk full) causes the lock to be skipped entirely. On a writable FS this means **concurrent writes without locking**.

**Fix:** Same pattern -- check for `EROFS` specifically:
```ts
} catch (err) {
  if ((err as NodeJS.ErrnoException).code === "EROFS") return;
  throw err;
}
```

### H3. `loadState()` Double-Catch Hides Bootstrap Errors (`fs-store.ts:204-221`)

Outer catch catches both "file not found" (expected) and "parse error" (bug). Inner catch then silently returns empty state on Vercel, but also hides any legitimate bootstrapping bugs on non-Vercel environments.

**Fix:** Add specific error discrimination:
```ts
} catch (readErr) {
  if (!isNotFoundError(readErr)) {
    console.error("Failed to read state file:", readErr);
  }
  try {
    const state = await bootstrapState();
    // ...
```

### H4. Turso Client Not Closed in Migration Script (`migrate-data-to-turso.js`)

`local.close()` is called (line 66) but the Turso client is never closed. Can leave open connections.

**Fix:** Add `turso.close?.()` or `await turso.close()` after migration.

---

## Medium Priority

### M1. `saveState` Only Catches `EROFS`/`ENOENT` (`fs-store.ts:252-257`)

On Vercel, `mkdir` with `{ recursive: true }` could throw `EPERM` or `EACCES` depending on the runtime. Consider adding those codes or using a broader "is read-only environment" check:

```ts
const READ_ONLY_CODES = new Set(["EROFS", "ENOENT", "EPERM", "EACCES"]);
if (READ_ONLY_CODES.has((err as NodeJS.ErrnoException).code ?? "")) return;
```

### M2. Migration Scripts Read `.env.local` Manually

Both scripts parse `.env.local` with regex instead of using `dotenv`. This is fragile:
- Fails if values contain `=` or are quoted
- Won't handle multi-line values or comments after values

**Fix:** Use `require("dotenv").config({ path: ".env.local" })` or at minimum trim quotes.

### M3. `push-turso-schema.js` Splits SQL on `;` Naively (line 28)

```js
const statements = sql.split(";").map(s => s.trim()).filter(s => s.length > 0);
```

Will break on semicolons inside string literals (e.g., default values containing `;`). Current schema doesn't have this issue, but it's a latent bug.

### M4. Race Condition: Stale Lock Removal (`file-lock.service.ts:88-98`)

Between checking `isStaleLock` and calling `unlink`, another process could have already removed the stale lock and acquired a new one. The `unlink` would then delete a valid lock.

**Impact:** Low for single-server deployments. On Vercel serverless, file locking is skipped anyway. Worth noting for future multi-process local scenarios.

### M5. `process.cwd()` in `LOCK_DIR` at Module Load Time (`file-lock.service.ts:4`)

```ts
const LOCK_DIR = path.join(process.cwd(), "report_assets", ".locks");
```

Computed at import time. If `cwd` changes after import (unlikely in Next.js but possible in tests), the lock directory will be wrong.

---

## Low Priority

### L1. Duplicate `.vercel` in `.gitignore` (lines 37, 73)

Minor -- no functional impact.

### L2. `db.ts` is Now Just a Re-export

```ts
export { prisma } from "@/lib/prisma";
```

21 files import from `@/lib/prisma` directly, some may still use `@/lib/db`. Consider consolidating to one import path.

### L3. No Batch Insert in Migration Script

`migrate-data-to-turso.js` inserts row-by-row. For large tables, use `turso.batch()` or transactions for better performance.

---

## Edge Cases Found by Scouting

1. **Vercel + loadState bootstrap path:** On first deploy with no state file AND read-only FS, `bootstrapState()` will fail (tries to write files), then falls through to empty state. The mapping page will show empty catalog with no fields. This is handled but should be documented.

2. **`saveState` lock + EROFS:** `acquireLock` skips on Vercel (mkdir fails), then `saveState` tries to write and catches EROFS. Lock release runs but is a no-op. Flow is correct but the lock acquire/release is wasted work on Vercel.

3. **`writeJsonFile` on Vercel:** Called by `createMappingDraft` and `bootstrapState`. Will throw on Vercel since it doesn't catch EROFS -- only `saveState` does. Any API route calling `createMappingDraft` on Vercel will get an unhandled error.

4. **Prisma adapter `require()` at runtime:** Using `require()` for dynamic imports works but bypasses tree-shaking. The `serverExternalPackages` config handles this correctly for bundling.

---

## Positive Observations

- Clean dual-adapter pattern in `prisma.ts` -- no unnecessary abstractions
- `globalForPrisma` pattern correctly prevents connection pool exhaustion in dev
- `serverExternalPackages` properly lists all native modules
- `postinstall` script ensures `prisma generate` runs on Vercel deploy
- `saveState` deduplication (skip if content unchanged) is a smart optimization
- Lock file includes PID and timestamp for debugging
- Stale lock detection with configurable timeout

---

## Recommended Actions (Priority Order)

1. **[Critical]** Fix `ensureDirectories` and `acquireLock` to only catch EROFS/EEXIST, not all errors
2. **[Critical]** Verify `prisma schema` works without `url` field for both local dev and Vercel deploy
3. **[High]** Add EROFS handling to `writeJsonFile` or document that mapping draft creation is not supported on Vercel
4. **[High]** Close Turso client in migration script
5. **[Medium]** Use `dotenv` in migration scripts instead of manual regex parsing
6. **[Medium]** Quote SQL identifiers in migration script
7. **[Low]** Remove duplicate `.vercel` from `.gitignore`
8. **[Low]** Consolidate `db.ts` re-export or remove it

## Metrics

- Type Coverage: N/A (migration scripts are JS, not TS)
- Linting Issues: 2 eslint-disable comments in prisma.ts (justified for dynamic require)
- Error Handling Gaps: 3 (ensureDirectories, acquireLock, writeJsonFile on Vercel)

## Unresolved Questions

1. Does `prisma generate` work without `url` in datasource? Need to verify on current Prisma 7.4.x version.
2. Is `createMappingDraft` expected to work on Vercel, or is mapping management local-only? If local-only, this should be documented and the API routes should return 501 on Vercel.
3. Will the `report_assets/` directory and its JSON files be deployed to Vercel (included in build output), or are they expected to be absent?
