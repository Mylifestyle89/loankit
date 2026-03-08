# Database, Lib & Configuration Review

**Reviewer:** code-reviewer | **Date:** 2026-03-06
**Branch:** Disbursement-Invoice-tracking-implement
**Scope:** prisma/schema.prisma, prisma/migrations/*, src/lib/**, src/types/**, config files

---

## Critical Issues (must fix)

| # | File | Line | Issue | Recommendation |
|---|------|------|-------|----------------|
| C1 | `src/lib/onlyoffice/config.ts` | 8-13 | **Module-level throw halts app** if `ONLYOFFICE_JWT_SECRET` not set. Any code that transitively imports this module crashes even when OnlyOffice is unused (e.g. report-only flows). | Defer secret check: export a lazy getter `getJwtSecret()` that throws on first call, or use `process.env.ONLYOFFICE_JWT_SECRET!` with a runtime guard in `signToken`/`verifyToken`. |
| C2 | `src/lib/api-helpers.ts` | 78 | **Duplicate rate limiter** in api-helpers.ts (lines 78-144) vs dedicated `rate-limiter.ts`. Two separate `Map` stores with identical logic. `api-helpers.withRateLimit` uses `getClientIp` from `rate-limiter.ts` but maintains its own state, so the same client could bypass the dedicated limiter's count. | Remove the rate-limit code from `api-helpers.ts`; create a thin `withRateLimit` wrapper that delegates to `checkRateLimit` from `rate-limiter.ts`. Single source of truth. |
| C3 | `src/lib/report/pipeline-client.ts` | 14 | **Unsanitized args passed to `spawn("python",...)`**. If `script` or `args` come from user input, this is a command injection vector. Even with internal-only use, `args` are never validated. | Use `execFile` instead of `spawn` for the Python binary, and validate that `script` only matches `[a-zA-Z0-9_.-]+\.py$`. Or hardcode the script path since only one is used (`run_pipeline.py`). |
| C4 | `next.config.ts` | 14 | **CSP allows `'unsafe-eval'`** in `script-src`. This defeats most XSS protection. | Remove `'unsafe-eval'` unless a specific dependency requires it. If Turbopack dev mode needs it, conditionally add only in `NODE_ENV=development`. |

## Important Issues (should fix)

| # | File | Line | Issue | Recommendation |
|---|------|------|-------|----------------|
| H1 | `prisma/schema.prisma` | 24,45,85,121 | **`Float` used for monetary amounts** (`loanAmount`, `amount`, `charter_capital`, etc.). IEEE 754 floating point causes rounding errors in financial calculations (e.g. `0.1 + 0.2 !== 0.3`). | Use `Decimal` type or store as integer cents (`Int` representing VND units). SQLite stores REAL either way, but Prisma `Decimal` returns `Decimal.js` objects that preserve precision in app code. |
| H2 | `prisma/schema.prisma` | 50 | **`disbursementCount` is `String?`** for what is logically a count (numeric). This forces parse/format on every access and prevents numeric queries. | Change to `Int?` unless there's a documented reason for string (e.g. "3 lan" text format). If mixed, add a separate `disbursementCountText` field. |
| H3 | `prisma/schema.prisma` | 148 | **Invoice uniqueness constraint `@@unique([invoiceNumber, supplierName])`** is fragile. Supplier names with slight spelling variations ("Cong ty A" vs "Cong Ty A") create duplicates. | Consider adding a normalized supplier key or matching by `invoiceNumber + disbursementId` instead, since invoices are scoped to a disbursement. |
| H4 | `src/lib/docx-engine.ts` | 56 | **`resolveWorkspacePath` uses `process.cwd()`** which can change at runtime. In serverless/edge runtimes, cwd may differ between requests. | Cache `process.cwd()` at module load time as a constant, or use `__dirname`-based resolution. |
| H5 | `src/lib/notifications/deadline-scheduler.ts` | 18 | **`setInterval` in module scope** runs indefinitely. No cleanup mechanism exists. If `startDeadlineScheduler` is called during ISR/SSG, it leaks an interval timer. | Return the interval ID from `startDeadlineScheduler` and provide a `stopDeadlineScheduler` function. Also guard against non-long-running contexts (check `typeof setInterval`). |
| H6 | `src/lib/notifications/deadline-scheduler.ts` | 27-54 | **N+1 query pattern**: For each `dueSoon` invoice, an individual `findFirst` query runs to check for recent notifications. With many invoices, this causes O(n) DB queries. | Batch: fetch all recent `invoice_due_soon` notifications in one query, build a Set of invoice IDs, then filter in JS. |
| H7 | `src/lib/report/file-token.ts` | 39 | **`timingSafeEqual` with variable-length buffers**: If `sig` and `expected` have different byte lengths, `timingSafeEqual` throws. Attacker can detect length mismatch vs wrong signature. | Check length equality first: `if (Buffer.from(sig).length !== Buffer.from(expected).length) throw new Error("Invalid signature")`. |
| H8 | `src/lib/report/fs-store.ts` | 83 | **Single lock key `"report_assets"` for all writes** creates a bottleneck. Concurrent API calls (save state, save formulas, save manual values) all contend on the same lock. | Use more granular lock keys: `"report_state"`, `"report_formulas"`, `"report_manual_values"`. |
| H9 | `src/lib/bctc-extractor.ts` | 605 | **File exceeds 200-line limit** (605 lines). Per project rules, files over 200 lines should be modularized. | Extract into 3 modules: `bctc-parser.ts` (sheet parsing), `bctc-ratios.ts` (CSTC computation), `bctc-types.ts` (type exports). |
| H10 | `src/lib/report/field-calc.ts` | 738 | **File exceeds 200-line limit** (738 lines). Contains expression parser, date arithmetic, number-to-words, and formula evaluation. | Split into: `expression-evaluator.ts`, `date-expression.ts`, `number-to-words-vi.ts`. |

## Minor Issues (nice to fix)

| # | File | Line | Issue | Recommendation |
|---|------|------|-------|----------------|
| M1 | `src/lib/number-to-vietnamese-words.ts` | vs `src/lib/report/field-calc.ts` | **Duplicate Vietnamese number-to-words implementations**: `numberToVietnameseWords` in standalone file and `docso`/`readIntegerVi` in field-calc.ts. Slight behavioral differences (e.g. "ty" vs "ti", group handling for numbers > 1 billion). | Consolidate to one canonical implementation and re-export. |
| M2 | `src/lib/number-to-vietnamese-words.ts` | 44 | `numberToVietnameseWords` returns `""` for negative numbers. No indication to caller. | Return `"Am " + result` for negatives (consistent with `docso` which returns `"am ..."`), or throw. |
| M3 | `src/lib/invoice-tracking-format-helpers.ts` | 32 | `fmtDateDisplay` calls `new Date(d)` on ISO string without timezone handling. In UTC+7 Vietnam, dates near midnight can shift day. | Use `toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })`. |
| M4 | `src/lib/report/constants.ts` | 3-11 | All constants use `process.cwd()` at import time. If module is imported from different working directories, paths are wrong. | Compute once at app startup and freeze, or use environment-based config. |
| M5 | `src/lib/import/bk-normalizer.ts` | 69 | **Regex instance shared across calls**: `BK_NORMALIZATION_RULES.datePatterns.ddmmyyyy` is a regex literal, but `exec()` is stateful on regex objects with `/g` flag. While this regex has no `/g`, future maintenance could add it, causing intermittent bugs. | Use `match()` instead of `exec()` for stateless matching, or clone the regex. |
| M6 | `prisma/schema.prisma` | 163 | `AppNotification.metadata` is `String? @default("{}")`. JSON stored as string lacks query capability and type safety. | Consider adding typed optional fields (`invoiceId String?`, etc.) alongside or instead of JSON string. |
| M7 | `src/lib/docx-merge.ts` | 32 | **Promise-wrapping callback** with no timeout. If `docx-merger` hangs, the promise never resolves. | Add a timeout (e.g. 30s) using `Promise.race` with a rejection timer. |
| M8 | `.gitignore` | -- | `report_assets/pdf/` appears in git status as untracked but no `.gitignore` rule excludes it. | Add `/report_assets/pdf/` to `.gitignore`. |
| M9 | `src/lib/report/use-modal-store.ts` | 58 | `data` typed as `ModalPayloadMap[ModalView] | null` loses type narrowing. Consumer must cast. | Use a discriminated union: `{ view: "aiMapping"; data: AiMappingPayload } | { view: "deleteGroupConfirm"; data: DeleteGroupPayload } | ...` |
| M10 | `src/lib/i18n/translations.ts` | -- | Translation file is 60KB+ (all inline). Hard to maintain. | Consider splitting by feature area or using a JSON-based format with lazy loading. |
| M11 | `vitest.config.ts` | 12-17 | Coverage only includes `src/core/**`, `src/lib/report/**`, `src/services/**`. Excludes `src/lib/` root files (rate-limiter, docx-engine, bctc-extractor, etc.) | Add `src/lib/*.ts` and `src/lib/import/**` to coverage includes. |
| M12 | `src/lib/report/financial-field-catalog.ts` | 472 | File is 472 lines but it's essentially static data (prompt strings). Per project rules: "When not to modularize: configuration files" -- borderline case. | Acceptable as-is since it's static config, but consider extracting prompts to a JSON file for non-dev editing. |

## Positive Patterns

- **Prisma singleton pattern** in `prisma.ts` is correctly implemented with `globalThis` caching for dev HMR
- **Path traversal protection** in `path-validation.ts` is thorough -- uses `path.relative()` for OS-agnostic checks, not string manipulation
- **File locking** with stale-lock detection and timeout in `file-lock.service.ts` is robust
- **HMAC file-access tokens** in `file-token.ts` use `timingSafeEqual`, have TTL, and use random-per-restart secret -- good security posture
- **Rate limiter** in `rate-limiter.ts` has proper `TRUSTED_PROXY` guard against header spoofing
- **Security headers** are consistently applied in both `next.config.ts` and `api-helpers.ts`
- **Zod validation** used extensively for all config schemas -- prevents corrupt state
- **Backup pruning** in `docx-engine.ts` and `fs-store.ts` prevents unbounded disk usage
- **SQLite adapter** with `better-sqlite3` is appropriate for a single-instance internal tool
- **Cascade delete rules** are properly set on all FK relationships
- **Compound indexes** (e.g. `[loanId, disbursementDate]`, `[customerId, masterId, status]`) show query-aware schema design
- **Expression parser** in `field-calc.ts` handles division-by-zero, Unicode identifiers, and nested function calls

## Summary

| Metric | Value |
|--------|-------|
| Total files reviewed | 40+ |
| Critical | 4 |
| Important | 10 |
| Minor | 12 |
| Lines of code (approx.) | ~4,500 |

**Overall Assessment:** Codebase quality is solid for an internal financial tool. Security fundamentals (path validation, HMAC tokens, rate limiting, CSP) are in place. Main concerns: (1) `unsafe-eval` in CSP weakens XSS protection, (2) monetary amounts use `Float` which causes precision errors, (3) duplicate rate-limiter code creates confusion, (4) several large files exceed the 200-line modularization threshold.

## Unresolved Questions

1. Is `'unsafe-eval'` in CSP required by a specific dependency (e.g. Turbopack dev mode, OnlyOffice SDK)? If only dev-mode, it should be conditional.
2. Is `disbursementCount` intentionally a String for mixed text/number content, or was it a migration oversight?
3. Are there plans to move from SQLite to PostgreSQL? If so, the `Float`->`Decimal` migration should happen before data accumulates.
4. Is the Python pipeline (`run_pipeline.py`) still actively used, or has the TypeScript pipeline fully replaced it?
