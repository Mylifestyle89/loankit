# Tester Memory

## Test Infrastructure
- Project uses **Vitest** (v3.2.4) for testing
- Test files use pattern: `__tests__/{name}.test.ts`
- Coverage reporting via `npm run test:coverage`
- All test suites in `src/` subdirectories with `__tests__` folders

## Code Quality Standards
- TypeScript strict mode enforced
- All imports must resolve correctly
- Pre-existing test failure in formula-processor (not a blocker for merges)
- Build environment: Next.js 16.1.6 with Turbopack

## Multi-Asset DOCX Cloning Feature (2026-03-14)
**Status:** ✅ Implementation verified & tested

### Files Modified/Created:
1. `src/lib/docx-section-cloner.ts` (NEW) — Clones DOCX body sections with indexed prefixes
2. `src/lib/docx-engine.ts` (MODIFIED) — Added preProcessZip hook option
3. `src/services/khcn-report-data-builders.ts` (MODIFIED) — Indexed field emission (PREFIX_1.*, PREFIX_2.*)
4. `src/services/khcn-report.service.ts` (MODIFIED) — Asset template detection & cloner invocation
5. Test files: `src/lib/__tests__/docx-section-cloner.test.ts` (NEW)
6. Test files: `src/services/__tests__/khcn-report-data-builders.test.ts` (NEW)

### Test Results:
- 133/134 tests passing (1 pre-existing failure unrelated to feature)
- 21 new tests written for cloning logic
- TypeScript: ✅ No compilation errors
- Coverage: All critical paths tested

### Key Implementation Details:
- Prefix mappings: SĐ (land), ĐS (movable), TK (savings), TSK (other assets)
- Collateral type filtering: qsd_dat → SĐ, dong_san → ĐS, etc.
- XML-aware regex for handling prefix split across DOCX runs
- Backward compatibility: Flat SĐ.* fields maintained alongside indexed SĐ_1.*, SĐ_2.*...

## Import/Schema Incident (2026-04-01)
**Issue:** `.bk` import failed at `POST /api/customers/from-draft` with:
- `UNIQUE constraint failed: loans.contractNumber`
- then `LoanWhereUniqueInput` error from invalid `tx.loan.upsert({ where: { contractNumber } })`

**Root Causes:**
- Business requirement allows duplicate/temporary `contractNumber`, but DB/index history still enforced uniqueness.
- Fix attempt used Prisma `upsert` with non-unique `where` key (`contractNumber`) which is invalid for `LoanWhereUniqueInput`.

**Permanent Rule (Do/Don't):**
- **Do not** treat `contractNumber` as technical unique identity.
- **Do** use `loan.id` for unique updates/deletes.
- **Do** keep only non-unique indexes for search performance on `contractNumber`.
- **Do** verify real DB indexes after migration (`PRAGMA index_list(loans)`), not schema file only.

**Applied Fix Pattern:**
- Remove unique constraints for contract number indexes in migrations.
- Keep non-unique indexes: `loans_contractNumber_idx`, `loans_customerId_contractNumber_idx`.
- In draft import flow, avoid `upsert` by non-unique field; use create/update by `id` logic only.
