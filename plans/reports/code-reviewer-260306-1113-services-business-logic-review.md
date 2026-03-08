# Services & Business Logic Review

**Reviewer:** code-reviewer
**Date:** 2026-03-06
**Scope:** 26 service files + 15 core use-case files (src/services/ + src/core/)
**Total files reviewed:** 41
**Total LOC:** ~4,800

---

## Critical Issues (must fix)

| # | File | Line | Issue | Recommendation |
|---|------|------|-------|----------------|
| C1 | `disbursement.service.ts` | 283-286 | **Cascading delete race condition.** `fullUpdate` deletes beneficiary lines then direct invoices in separate queries. If invoice FK cascade is not configured in Prisma schema for DisbursementBeneficiary->Invoice, orphaned invoices may survive when beneficiary lines are deleted, leaving dangling `disbursementBeneficiaryId` references. | Verify Prisma schema has `onDelete: Cascade` on Invoice->DisbursementBeneficiary FK. If not, delete invoices tied to beneficiary lines BEFORE deleting the lines, or wrap both deletes with explicit `deleteMany` covering all invoices for that disbursement first. |
| C2 | `document-extraction.service.ts` | 203 | **Unprotected JSON.parse on AI response.** If OpenAI returns malformed JSON despite structured output mode (e.g., partial response due to token limit), `JSON.parse(content)` throws unhandled. The outer catch at L301 silently swallows this, returning `[]` without logging in production. | Wrap in try-catch with explicit logging. The silent `[]` return hides extraction failures from users. Add production-level logging, not just dev. |
| C3 | `auto-tagging.service.ts` | 493-513 | **Path traversal in saveTemplate.** `outputName` is sanitized for OS-level chars but not for directory traversal. An attacker passing `outputName: "../../../etc/malicious.docx"` gets the `..` stripped by the char filter but `"etcmalicious.docx"` still writes to the exports dir. However, `path.join(dir, fileName)` with a crafted name like `"foo/bar.docx"` with forward slashes could escape. Forward slash `/` is NOT in the filter regex `[<>:"/\\|?*\x00-\x1f]` -- wait, `"` and `\` are filtered but `/` is NOT. | Add `/` to the sanitization regex: `.replace(/[<>:"\/\\|?*\x00-\x1f]/g, "_")`. Also validate that `path.resolve(dir, fileName)` starts with `dir`. |
| C4 | `ocr.service.ts` | 61-66 | **PDFParse usage incorrect.** `pdf-parse` default export is a function, not a constructor class. `new PDFParse({ data: buffer })` and `parser.getText()` is not the standard API. This will throw at runtime if `pdf-parse` follows its documented API: `pdfParse(buffer).then(data => data.text)`. | Verify actual `pdf-parse` version and API. Likely should be: `const result = await pdfParse(buffer); return result.text;`. If using a custom fork, document it. |

## Important Issues (should fix)

| # | File | Line | Issue | Recommendation |
|---|------|------|-------|----------------|
| H1 | `invoice.service.ts` | 221-265 | **N+1 performance: `getCustomerSummary` loads ALL customers with ALL loans, disbursements, and invoices.** For a production DB with thousands of customers, this fetches the entire invoice graph into memory. No pagination. | Replace with Prisma aggregate queries: `prisma.invoice.groupBy({ by: ['disbursementId'], _sum: { amount: true }, _count: true })` joined with customer info. Or use raw SQL with `GROUP BY`. |
| H2 | `disbursement.service.ts` | 202-235 | **Sequential N+1 in create.** Beneficiary lines and their invoices are created in a serial `for` loop inside a transaction. For large beneficiary lists, this means N sequential `create` + `createMany` + `update` calls. | Consider batching: collect all beneficiary data, use `createManyAndReturn` (Prisma 5.14+) or at minimum restructure to reduce round-trips. |
| H3 | `auto-process.service.ts` | 63 | **In-memory job store.** `const jobs = new Map()` stores all job data (including `rows` arrays which can be large) in process memory. Jobs are never evicted. Server restart loses all jobs. | Add TTL-based eviction (e.g., delete jobs older than 1h). For data persistence, consider SQLite/DB storage. At minimum, clear `rows` from completed jobs to free memory. |
| H4 | `disbursement-report.service.ts` | 189-199 | **Temp file cleanup race.** `generateSingleDocx` writes to a temp file, reads it back, then unlinks. If the process crashes between write and unlink, orphaned files accumulate in `report_assets/generated/`. The `.catch(() => {})` silently swallows unlink failures. | Use `os.tmpdir()` instead of a project subdirectory. Or implement periodic cleanup of old generated files. |
| H5 | `financial-analysis.service.ts` | 267-302 | **No timeout on OpenAI call.** Unlike `document-extraction.service` which has 28s timeout, `callOpenAI` here has no timeout. A hung API call blocks the request indefinitely. | Add `AbortController` or `withTimeout` wrapper matching other services. |
| H6 | `snapshot.service.ts` | 77-93 | **listSnapshots reads ALL snapshot files sequentially.** With MAX_SNAPSHOTS=120, this reads and JSON.parses 120 files on every list call. | Cache the metadata index in memory, or only read filenames and extract timestamp from filename pattern without parsing full JSON. |
| H7 | `disbursement.service.ts` | 352-365 | **getSurplusDeficit uses `d.invoices` (direct invoices) but create/fullUpdate attach invoices via beneficiaryLines.** The surplus/deficit calculation may exclude invoices attached to beneficiary lines since the query only includes `{ invoices: { select: { amount: true } } }` and doesn't include `beneficiaryLines.invoices`. | Either include `beneficiaryLines: { include: { invoices: true } }` and aggregate both, or clarify the business rule for which invoices count toward surplus/deficit. |
| H8 | `customer.service.ts` | 46 | **`toNumber` replaces ALL dots then commas.** `"1.234.567,89"` becomes `"123456789"` (loses decimal), then `Number("123456789")` = 123456789 instead of 1234567.89. The regex `replace(/\./g, "")` removes all dots including the one that should become decimal. | The logic should detect VN format: if there's a comma, treat dots as thousand separators and comma as decimal. Current implementation loses decimal precision. Fix: after removing dots, replace comma with dot: `cleaned.replace(/\./g, "").replace(",", ".")` -- actually this IS the code at L46. Re-reading: it does `.replace(/\./g, "").replace(",", ".")`. So "1.234.567,89" -> "1234567,89" -> "1234567.89" -> 1234567.89. This is correct. **FALSE ALARM - withdrawn.** |
| H9 | `_migration-internals.ts` | 35 | **Module-level `isMigrationChecked` flag.** In serverless environments (Vercel Edge, Lambda), each cold start resets this flag, causing migration check on every first request. Not a bug but a performance concern. | Document that migration check runs once per cold start. Consider persisting the flag to DB or filesystem. |
| H10 | `build.service.ts` | 382-497 | **`processBankReportExport` no timeout or cancellation.** For large datasets, this can run for minutes generating hundreds of DOCX files. No way for the client to cancel. | Add progress streaming or move to background job with status polling (like auto-process.service pattern). |

## Minor Issues (nice to fix)

| # | File | Line | Issue | Recommendation |
|---|------|------|-------|----------------|
| M1 | `security.service.ts` | 32 | **CCCD regex too aggressive.** `\d{9,12}` matches many non-ID numeric strings (invoice amounts, loan amounts formatted without separators). False positive rate is high for financial documents. | Add contextual hints: only mask if preceded by keywords like "CMND", "CCCD", "Số CMND". Or use negative lookbehind for currency indicators. |
| M2 | `ai-mapping.service.ts` + `auto-tagging.service.ts` + `document-extraction.service.ts` | multiple | **DRY violation: `extractJsonObject` function duplicated 3 times** with minor variations across services. | Extract to shared utility in `src/lib/json-utils.ts`. |
| M3 | `auto-process.service.ts` + `_shared.ts` | 116-130, 76-93 | **`resolveParentFromGroupedRecord` duplicated** in both files with identical logic. | Remove from `auto-process.service.ts`, import from `_shared.ts`. |
| M4 | `loan.service.ts` | 61-62 | **No validation that `endDate > startDate`.** User can create a loan where end date precedes start date. | Add: `if (endDate <= startDate) throw new ValidationError("endDate must be after startDate.")` |
| M5 | `disbursement.service.ts` | 160 | **No validation that `amount <= 0` covers NaN.** `input.amount <= 0` is false when amount is NaN. | Add: `if (!Number.isFinite(input.amount) || input.amount <= 0)` |
| M6 | `notification.service.ts` | 27 | **`metadata` stored as `JSON.stringify` string.** When read back, requires parsing. Consider using Prisma's JSON field type if DB supports it (SQLite does via text). | Low priority, current approach works. Consider `JsonValue` type for better DX. |
| M7 | `mapping-engine.ts` | 92-110 | **`parseXlsxImportRows` uses unsafe type assertions.** `row["Ten field"] as string` will be undefined if header doesn't match, resulting in empty strings. | Add explicit null checks or use optional chaining with fallback. |
| M8 | `beneficiary.service.ts` | 68 | **`createMany` does not return created records.** `bulkCreate` returns count but not the created IDs. If caller needs IDs for subsequent operations, a second query is needed. | Acceptable for import use case. Document the limitation. |
| M9 | `invoice.service.ts` | 189-192 | **Invoice update recalc uses `existing.disbursementBeneficiaryId` not the potentially new one.** If an invoice is moved to a different beneficiary line via update (which the current `UpdateInvoiceInput` doesn't support, but could in future), the old line wouldn't be recalculated. | Add `disbursementBeneficiaryId` to `UpdateInvoiceInput` if needed. If not, add a comment documenting that invoice re-parenting is not supported. |
| M10 | `formula-processor.ts` | 85 | **2-pass formula evaluation is fragile.** If formulas have 3+ levels of dependency, 2 passes won't resolve them. | Document the 2-pass limitation. Consider topological sort for N-level dependency resolution if needed. |

---

## Positive Patterns

- **Consistent error hierarchy:** `AppError` → `ValidationError`/`NotFoundError`/`SystemError` with HTTP status mapping via `toHttpError`. Clean and well-structured.
- **Transaction usage:** Financial operations (disbursement create/fullUpdate, customer saveFromDraft) correctly use `prisma.$transaction`.
- **Input validation:** All create/update endpoints validate required fields, date parsing, and amount constraints.
- **Security scrubbing:** PII masking applied to AI-extracted text before sending to external APIs. Override keys whitelisted per template.
- **AI provider fallback:** Consistent pattern across all AI services: explicit provider > env detection > fuzzy fallback. Graceful degradation.
- **Modular extraction pipeline:** DOCX extraction cleanly split into 6 dedicated modules under `extraction/`, each with single responsibility.
- **Zod validation:** Extracted values validated against field types with confidence adjustment. Good use of Zod schemas.
- **Cursor-based batching:** `customerBatches` generator avoids loading all customers into memory during export/migration.
- **Snapshot service:** Auto-save with configurable retention and manual restore. Good data recovery story.
- **Path normalization:** `normalizeRelAssetPath` rejects `..` traversal in auto-process service.

---

## Summary

- **Total files reviewed:** 41
- **Critical:** 4 | **Important:** 9 | **Minor:** 10
- **Overall assessment:** Codebase is well-structured with good separation of concerns. Service layer follows consistent patterns. Main concerns: (1) potential path traversal in `saveTemplate`, (2) N+1 query in `getCustomerSummary`, (3) in-memory job store without eviction, (4) code duplication in JSON extraction utilities.

### Recommended Actions (priority order)
1. Fix `saveTemplate` path traversal (C3) -- security
2. Verify `PDFParse` API usage (C4) -- runtime correctness
3. Verify cascade delete behavior for invoice orphaning (C1) -- data integrity
4. Fix `getSurplusDeficit` to include beneficiary line invoices (H7) -- business logic correctness
5. Replace `getCustomerSummary` with aggregate query (H1) -- performance
6. Add timeout to `financial-analysis` OpenAI call (H5)
7. Add TTL eviction to auto-process job map (H3)
8. Extract shared `extractJsonObject` utility (M2)
9. Remove `resolveParentFromGroupedRecord` duplication (M3)

### Metrics
- Type Coverage: ~95% (minimal `any` usage, only in Gemini SDK schema cast)
- Test Coverage: Tests exist for `formula-processor`, `grouping-engine`, `apply-ai-suggestion`, `app-error`
- Linting Issues: 1 explicit `eslint-disable` for `@typescript-eslint/no-explicit-any` (justified -- SDK type mismatch)

---

## Unresolved Questions

1. Is the Prisma schema configured with `onDelete: Cascade` on the Invoice -> DisbursementBeneficiary relation? (affects C1)
2. Which `pdf-parse` package/fork is being used? The API usage at `ocr.service.ts:61` doesn't match the standard `pdf-parse` npm package. (affects C4)
3. Is `getSurplusDeficit` intended to only count direct invoices, or should it include beneficiary-line invoices? (affects H7)
4. Is there a plan to move auto-process jobs to persistent storage? Current in-memory store loses data on restart.
