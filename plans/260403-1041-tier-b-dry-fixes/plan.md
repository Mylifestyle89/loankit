# Tier B: DRY Fixes
## Phase 1: Text Utilities 
Fix B1: Create `src/lib/text/normalize.ts` and consolidate `normalizeText`, `tokenize`, `scoreTokenOverlap`.
Update callers:
- `src/services/ai-mapping-helpers.ts`
- `src/services/auto-tagging-ai-helpers.ts`
- `src/core/use-cases/reverse-template-matcher.ts`
- `src/core/use-cases/extraction/extraction-text-helpers.ts`

## Phase 2: JSON Aliases 
Fix B2: Remove `extractJsonObject` aliases.
Update callers:
- `src/services/ai-mapping-helpers.ts`
- `src/services/auto-tagging-ai-helpers.ts`

## Phase 3: Shared Types Consolidation
Fix B3: Import `GroupedTreeNode` from `src/core/use-cases/mapping-engine.ts`.
- `src/app/report/khdn/mapping/components/field-catalog-board.tsx`
- `src/app/report/khdn/mapping/components/field-catalog-group-section.tsx`
- `src/app/report/khdn/mapping/components/mapping-visual-section.tsx`

Fix B4 & B5: Create `src/app/report/invoices/types.ts` for `Invoice` and `Customer`.
Fix B6: Create `src/app/report/loans/types.ts` for `Loan`.

## Phase 4: Barrel Cleanup
Fix B7: Delete `src/components/financial-analysis-modal.tsx` and update `src/app/report/khdn/mapping/components/mapping-page-content.tsx` to point directly to `@/components/financial-analysis/financial-analysis-modal`.
