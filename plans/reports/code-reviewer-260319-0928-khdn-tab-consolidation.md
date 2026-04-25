# Code Review: KHDN Tab Consolidation

**Date:** 2026-03-19
**Reviewer:** code-reviewer
**Branch:** KHCN-implement

## Scope
- New files: `khdn/layout.tsx`, `khdn/page.tsx`, `khdn/ai-suggest/page.tsx`
- Moved: `mapping/` and `template/` into `khdn/` subtree
- Modified: `report/layout.tsx`, `next.config.ts`, `translations.ts`, `login/page.tsx`, `page.tsx`
- Import updates across services and lib files

## Overall Assessment

Clean refactor. Route consolidation done correctly with backward-compat redirects. One broken link found, one minor i18n gap, and one UX concern with the AI tab approach.

## Critical Issues

None.

## High Priority

### 1. Broken link in field-coverage-panel.tsx (BUG)
**File:** `src/app/report/khdn/template/_components/field-coverage-panel.tsx:50`
```tsx
href={`/report/mapping?focus=${encodeURIComponent(f.fieldKey)}`}
```
Should be `/report/khdn/mapping?focus=...`. The next.config.ts redirect catches `/report/mapping` but:
- Adds an unnecessary 301 hop
- Query params *should* survive via `:path*` wildcard but the base `/report/mapping` redirect has no wildcard -- only exact match. **Query string `?focus=...` will be dropped** on the redirect.

**Fix:** Change to `/report/khdn/mapping?focus=...`

## Medium Priority

### 2. AI Suggest tab is a redirect-only page
`khdn/ai-suggest/page.tsx` renders briefly then redirects to mapping with `?openAiSuggestion=1`. This causes:
- Flash of "Dang chuyen huong..." text
- Tab highlight switches from AI to Mapping after redirect
- Users see Mapping tab active, not AI tab

**Suggestion:** Instead of a separate route, handle via query param on mapping page directly, or keep the AI tab active by checking `openAiSuggestion` in the layout's `isActive` logic.

### 3. Hardcoded Vietnamese string
`ai-suggest/page.tsx:20` has `"Dang chuyen huong..."` -- should use `t()` from i18n for consistency, though the text is transient.

## Low Priority

### 4. Unused imports in report/layout.tsx
`Bot`, `PenLine`, `FileText` are imported but `Bot` and `FileText` are no longer used as nav link icons (KHDN uses `PenLine`, sub-tabs moved to khdn/layout). Verify if `Bot` is used for the AI CTA button -- yes it is. `FileText` may be unused now.

### 5. Redirect permanence
`next.config.ts` uses `permanent: true` (301). This is correct for SEO but browsers cache 301s aggressively. If routes change again, users with cached 301s won't pick up new destinations without cache clear. Consider `permanent: false` (302) during development, switch to 301 for production release.

## Positive Observations

- Backward-compat redirects in next.config.ts -- good practice
- Clean layout component with proper active-tab detection via `pathname.startsWith()`
- i18n keys added for both vi and en
- Import paths in services/lib correctly updated to `@/app/report/khdn/mapping/`
- No broken TypeScript imports detected (worktree file is separate)
- Security headers unchanged, no regression

## Recommended Actions

1. **Fix** field-coverage-panel.tsx href to `/report/khdn/mapping?focus=...`
2. **Consider** redesigning AI tab to avoid redirect flash (medium effort)
3. **Verify** `FileText` import usage in report/layout.tsx -- remove if unused
4. **Consider** using 302 redirects during dev phase

## Metrics
- Type Coverage: N/A (no new types added)
- Linting Issues: 1 (potential unused import)
- Broken Links: 1 (field-coverage-panel)

## Unresolved Questions
- Should the AI suggest tab maintain its own page state or always redirect to mapping?
- Will the `permanent: true` redirects cause issues if routes change again in KHCN phase?
