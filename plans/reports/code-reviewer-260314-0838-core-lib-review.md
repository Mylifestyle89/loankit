# Core Logic & Library Review

**Date:** 2026-03-14 | **Reviewer:** code-reviewer | **Branch:** KHCN-implement
**Scope:** `src/core/` (21 files), `src/lib/` (48 files), 5 test files

## Critical Issues (must fix)

### 1. Command injection in pipeline-client.ts
`src/lib/report/pipeline-client.ts:14` — `spawn("python", [script, ...args])` passes args directly. If `runBuildAndValidate` is ever called with user-supplied args (currently hardcoded empty), this is a shell injection vector. The `script` param has no validation either.
- **Fix:** Validate script path against allowlist, never pass user input to args.

### 2. Unsafe `as unknown as` casts in loan-plan-calculator.ts
`src/lib/loan-plan/loan-plan-calculator.ts:57-66` — `calcCategoryRevenue` casts `Record<string, number>` to specific revenue types via `as unknown as`. Missing properties silently become `undefined`, producing `NaN` in calculations with no error.
- **Fix:** Use Zod schemas or runtime validation before calculations.

### 3. docx-engine.ts lacks path validation for templatePath
`src/lib/docx-engine.ts:52-53` — `resolveWorkspacePath` accepts absolute paths and joins relative paths with `process.cwd()`. While `isSafeDocxPath` exists for `saveDocxWithBackup`, `generateDocx` and `generateDocxBuffer` perform NO path validation, allowing read of arbitrary files.
- **Fix:** Apply `validatePathUnderBase` before `fs.readFile` in generate methods.

### 4. BK importer exposes raw error messages
`src/lib/import/bk-importer.ts:170` — `error.message` from `JSON.parse` failure is returned directly in `BkMultiImportResult.message`. Could leak internal info to client.
- **Fix:** Return generic error, log original.

## Important Issues (should fix)

### 5. field-calc.ts exceeds 200-line limit (739 lines)
Multiple concerns in one file: number parsing, expression evaluation, date arithmetic, Vietnamese number-to-words. Should split into: `field-calc-expression.ts`, `field-calc-date.ts`, `field-calc-docso.ts`.

### 6. bctc-extractor.ts exceeds 200-line limit (605 lines)
Should split: sheet parser, ratio computation, sub-table parser.

### 7. fs-store.ts exceeds 200-line limit (432 lines)
Should split: state persistence, mapping draft CRUD, template management.

### 8. docx-engine.ts exceeds 200-line limit (387 lines)
DRY violation: `generateDocx` and `generateDocxBuffer` share ~80% identical code. Extract shared template-loading + rendering logic.

### 9. Formula processor 2-pass may miss deep dependencies
`src/core/use-cases/formula-processor.ts:85` — Only 2 passes for dependency resolution. A chain of 3+ dependent formulas will produce incorrect results silently.
- **Fix:** Either topological sort or iterate until stable (with cycle detection).

### 10. toNumber treats single dot as thousands separator
`src/lib/report/field-calc.ts:13` — `"12.5"` becomes `125` because dots are stripped first. This is intentional for VN format but surprising for non-VN numbers. Test confirms this behavior but worth documenting prominently.

### 11. Rate limiter key collision risk
`src/lib/rate-limiter.ts:63` — When `TRUSTED_PROXY !== "true"`, ALL requests share key `"global"`, meaning one user's requests count against all users. Effectively a global throttle, not per-user.
- **Impact:** A single heavy user blocks everyone.

### 12. No test coverage for critical modules
Missing tests: `bctc-extractor.ts`, `bk-importer.ts`, `docx-engine.ts`, `pipeline-client.ts`, `fs-store.ts`, `rate-limiter.ts`, all extraction modules. Only `field-calc` and `path-validation` have tests.

## Minor Issues (nice to fix)

### 13. mapping-engine.ts has redundant normalizeGroupPath
`normalizeGroupPath` in `mapping-engine.ts:26` duplicates similar logic in `reverse-template-matcher.ts:35`. Extract to shared util.

### 14. bk-normalizer regex uses stateful flags
`src/lib/import/bk-normalizer.ts:16` — `BK_NORMALIZATION_RULES.datePatterns.ddmmyyyy` is a module-level RegExp. If used with `.exec()` repeatedly, stateful lastIndex may cause bugs. Currently safe because `exec` is called once per invocation.

### 15. Dead code: normalizer field in FieldCatalogItem
`normalizer` field is set to empty string in `mapping-engine.ts:225` for imports, but `inferType` in `fs-store.ts:58` reads it. Unclear if it's used anywhere else meaningfully.

### 16. bk-mapping.ts is 304 lines
Pure data file, acceptable for mapping tables. No logic issues.

### 17. Inconsistent error message language
Mix of Vietnamese ("Thiếu cấu hình...") and English ("Invalid client: missing...") across error messages. Pick one.

## Positive Patterns

1. **Path validation** (`path-validation.ts`) — OS-agnostic traversal prevention using `path.relative`, well-tested.
2. **Error hierarchy** (`app-error.ts`) — Clean AppError subclasses with HTTP status codes. `toHttpError` properly scrubs internal errors from client responses.
3. **Security scrubbing** — PII scrubbing applied consistently in extraction pipeline before AI mapping.
4. **Auth guard** — Clean RBAC with `requireSession/requireAdmin/requireEditorOrAdmin/requireOwnerOrAdmin`.
5. **File lock service** — Proper advisory locking with stale lock detection and timeout.
6. **Pure functions** — Core use-cases (`applyAiSuggestion`, `groupDataByField`, `computeEffectiveValues`) are pure and testable.
7. **Dual persistence** — `fs-store.ts` writes to both DB and filesystem, graceful fallback for Vercel read-only FS.
8. **Rate limiter** — Proper cleanup interval prevents memory leak; trusted proxy awareness for IP extraction.

## Summary Stats

| Metric | Value |
|--------|-------|
| Files reviewed | 55 |
| Files >200 lines | 4 (`field-calc`, `bctc-extractor`, `fs-store`, `docx-engine`) |
| Critical issues | 4 |
| Important issues | 8 |
| Minor issues | 5 |
| Test files | 5 (core: 3, lib: 2) |
| Test coverage estimate | ~15% of reviewed code |
| Security issues | 2 (command injection risk, path traversal in docx-engine) |
