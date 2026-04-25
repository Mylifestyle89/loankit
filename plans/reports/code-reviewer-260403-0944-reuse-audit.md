# Code Reuse Audit — refactor/tech-debt-cleanup

**Date:** 2026-04-03
**Branch:** refactor/tech-debt-cleanup (138 files, +8702/-6826)
**Focus:** New code only (lines starting with `+`)

---

## Summary

The refactor is predominantly **extract-to-submodule** work: splitting large files into smaller components/hooks, renaming PascalCase files to kebab-case, and consolidating duplicated AI utilities into `src/lib/ai/`. The code reuse posture is **generally good** -- the new `src/lib/ai/` shared module and the shared `FinancialAnalysisModal` are solid DRY wins. However, several duplication patterns slipped through.

---

## Findings

### HIGH severity

#### 1. `normalizeText` / `tokenize` / `scoreTokenOverlap` duplicated 3-4 times

| File | Functions |
|------|-----------|
| `src/services/ai-mapping-helpers.ts` (NEW) | `normalizeText`, `tokenize`, `scoreTokenOverlap` |
| `src/services/auto-tagging-ai-helpers.ts` | `normalizeText` (identical) |
| `src/core/use-cases/reverse-template-matcher.ts` | `normalizeText`, `scoreTokenOverlap` (identical) |
| `src/core/use-cases/extraction/extraction-text-helpers.ts` | All three (exported) |

**Impact:** 4 copies of the same NFD-strip + lowercase + tokenize logic. Bug fix in one won't propagate.
**Fix:** All files should import from `src/core/use-cases/extraction/extraction-text-helpers.ts` (or promote to `src/lib/text/`). The new `ai-mapping-helpers.ts` should not re-declare these.

#### 2. `extractJsonObject` alias duplicated in 2 new files

| File | Line |
|------|------|
| `src/services/ai-mapping-helpers.ts:47` | `export const extractJsonObject = extractJsonFromAiResponse;` |
| `src/services/auto-tagging-ai-helpers.ts:58` | `export const extractJsonObject = extractJsonFromAiResponse;` |

**Impact:** Two files create the same re-export alias. Callers import `extractJsonObject` from different paths but get the same function.
**Fix:** Remove both aliases. Callers should import `extractJsonFromAiResponse` directly from `@/lib/ai`. If the shorter name is strongly preferred, export it once from `@/lib/ai/index.ts`.

### MEDIUM severity

#### 3. `GroupedTreeNode` type declared 3 times in new files

| File |
|------|
| `src/app/report/khdn/mapping/components/field-catalog-board.tsx:13` |
| `src/app/report/khdn/mapping/components/field-catalog-group-section.tsx:10` |
| `src/app/report/khdn/mapping/components/mapping-visual-section.tsx:9` |

There is already an exported version at `src/core/use-cases/mapping-engine.ts:3`.

**Fix:** Import from `mapping-engine.ts` or create a local `types.ts` in the mapping components folder. Three inline copies will drift.

#### 4. `Invoice` type duplicated between page and new sub-component

| File |
|------|
| `src/app/report/invoices/page.tsx:29` |
| `src/app/report/invoices/components/invoice-grouped-view.tsx:15` |

**Fix:** Define `Invoice` once in a shared types file (e.g., `src/app/report/invoices/types.ts`) and import in both places.

#### 5. `Customer` type re-declared in `invoice-filters-bar.tsx`

`src/app/report/invoices/components/invoice-filters-bar.tsx:13` declares `type Customer = { id: string; customer_name: string; email?: string | null }`. This matches the shape used in the parent page.

**Fix:** Co-locate in `src/app/report/invoices/types.ts` alongside Invoice.

#### 6. `BaseModal` — new file at `base-modal.tsx` while old `BaseModal.tsx` was renamed

The diff shows `BaseModal.tsx` being deleted and a **new** `base-modal.tsx` created. Import paths were updated. However, the old file's content was not fully carried over -- the new implementation drops the `aria-label` prop and changes backdrop behavior. This is fine as a deliberate rewrite, but verify that all existing callers still work correctly with the new signature.

### LOW severity

#### 7. Interest rate regex repeated in `loan-plan-form-sections.tsx`

Lines 75 and 202: `/^\d+([,.]\d*)?$/.test(raw)` appears twice in two different input handlers within the same new file.
**Fix:** Extract a `isValidDecimalInput(raw: string): boolean` utility in `loan-plan-editor-utils.ts`.

#### 8. Backward-compat re-export barrel at `src/components/financial-analysis-modal.tsx`

This is a 5-line re-export file (`export { FinancialAnalysisModal } from "./financial-analysis/..."`). It's fine for migration but should be removed once all callers are updated to the new path. Currently used by:
- `src/app/report/khdn/mapping/components/mapping-page-content.tsx` -- imports from this barrel.

**Fix:** Update the one remaining caller to use `@/components/financial-analysis/financial-analysis-modal` directly, then delete the barrel.

---

## Clean Code -- Positive Observations

1. **`src/lib/ai/` shared module** -- correctly consolidates provider resolution and JSON extraction into a single source of truth. Named exports only (tree-shake safe). Well done.
2. **FinancialAnalysisModal** split into step-based sub-components (`upload-step`, `qualitative-step`) -- proper separation of concerns, each under 200 lines.
3. **FieldRow** decomposed into `field-row-display.tsx` + `field-row-controls.tsx` -- clean extraction with clear responsibilities.
4. **FieldCatalogBoard** split into `field-catalog-board.tsx`, `field-catalog-toolbar.tsx`, `field-catalog-group-section.tsx` -- the 395-line monolith is now 3 focused files.
5. **AiMappingModal** decomposed into `suggest-form`, `bk-import-table`, `batch-job-list` -- each < 200 lines.
6. **Kebab-case rename** across all KHDN mapping components is consistent and matches project conventions.
7. **New barrel files** (`index.ts`) are minimal, tree-shake safe, no wildcard re-exports.

---

## Recommended Actions (priority order)

1. **Consolidate `normalizeText` / `tokenize` / `scoreTokenOverlap`** into one canonical location (suggest `src/lib/text/normalize.ts` or keep in `extraction-text-helpers.ts`). Update all 4 call sites.
2. **Remove duplicate `extractJsonObject` aliases** in `ai-mapping-helpers.ts` and `auto-tagging-ai-helpers.ts`. Import `extractJsonFromAiResponse` directly.
3. **Extract `GroupedTreeNode` type** to a single shared file for the mapping module.
4. **Create `src/app/report/invoices/types.ts`** for `Invoice`, `Customer`, `GroupedDisbursement` types shared between page and sub-components.
5. **Delete backward-compat barrel** `src/components/financial-analysis-modal.tsx` after updating the one remaining import.

---

## Unresolved Questions

- The `BaseModal` rewrite at `src/components/ui/base-modal.tsx` no longer accepts an `aria-label` prop and disables backdrop-click-to-close. Was this intentional? If existing callers relied on backdrop close, this is a behavior change.
- `auto-tagging-ai-helpers.ts` also re-declares `normalizeText` -- was this file touched in this branch or is it pre-existing? If pre-existing, its cleanup should be a separate PR to keep scope bounded.
