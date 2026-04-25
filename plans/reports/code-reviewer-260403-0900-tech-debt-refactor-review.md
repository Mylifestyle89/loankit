# Tech Debt Refactor Review

**Branch:** `refactor/tech-debt-cleanup` vs `main`
**Date:** 2026-04-03
**Grade:** B+

## Build Status

| Check | Result |
|-------|--------|
| `tsc --noEmit` | PASS |
| `next build` | PASS |
| Broken imports | None found |

## Scope

- ~47 new files (sub-modules extracted from large files)
- ~20 renames (PascalCase -> kebab-case)
- ~10 deleted files (moved/consolidated into shared components)
- Areas: KHDN mapping (components, hooks, modals), invoices, loans, services, lib/ai, lib/xlsx, financial-analysis

## Issues Found

### Medium: Incomplete Naming Cleanup

1. **`Modals/` directory still PascalCase in git** -- `src/app/report/khdn/mapping/components/Modals/` should be `modals/`. Windows is case-insensitive so it works locally but will break on Linux CI or case-sensitive macOS. Fix with `git mv`.

2. **`FinancialAnalysisModal.tsx` still PascalCase** in `src/components/financial-analysis/`. All siblings are kebab-case. Should rename to `financial-analysis-modal.tsx`.

3. **Old camelCase hooks not renamed** -- 8 files like `useFieldGroupActions.ts`, `useFieldTemplates.ts` etc. still exist as camelCase facades. These are now thin wrappers delegating to new kebab-case sub-hooks. Acceptable as backward-compat but should be renamed in a follow-up to complete the migration.

### Low: Slightly Over 200-Line Limit

- `field-catalog-board.tsx` -- 240 lines (JSX-heavy, acceptable for a composite view)
- `invoice-queries.service.ts` -- 209 lines (marginally over)

Neither is urgent; both are close to the limit and logically cohesive.

### Low: `Modals/` Subdirectory Convention

The `Modals/` folder name (even if renamed to `modals/`) is a PascalCase convention leftover. All other directories use kebab-case. Consider renaming to `modals/` (lowercase) and updating all imports.

## Positive Observations

- **Clean facade pattern**: Old hooks become thin composites of new sub-hooks, preserving API surface
- **Backward-compat re-exports**: `financial-analysis-modal.tsx` shim, `lib/ai/index.ts` barrel -- prevents import breakage
- **New sub-modules are well-named**: `use-field-template-crud.ts`, `use-mapping-api-mutations.ts`, `ai-provider-resolver.ts` -- descriptive kebab-case
- **No circular deps detected**: Build passes cleanly, no import cycles
- **Financial analysis components properly consolidated**: Moved from KHDN-specific Modals/ to shared `src/components/financial-analysis/`

## Recommended Actions

1. **Fix now**: Rename `Modals/` to `modals/` in git (case-sensitivity issue on Linux/CI)
2. **Fix now**: Rename `FinancialAnalysisModal.tsx` to `financial-analysis-modal.tsx`
3. **Follow-up**: Rename remaining camelCase hook facades to kebab-case
4. **Optional**: Split `field-catalog-board.tsx` if it grows further

## Summary

Solid structural refactoring. Compilation clean, no broken imports, no circular deps. The facade pattern for backward compat is well-executed. Main gap: incomplete kebab-case migration for the `Modals/` directory and a few remaining PascalCase files. The `Modals/` case issue is the only one that could cause problems in a case-sensitive environment (CI/Linux).
