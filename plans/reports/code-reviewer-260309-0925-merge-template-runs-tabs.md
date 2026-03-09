# Code Review: Merge Template + Runs into 3-Tab Page

**Date:** 2026-03-09
**Files:** 5 files, ~812 LOC total
**Focus:** Tab merge, URL sync, type safety, regressions, edge cases

## Overall Assessment

Clean extraction. Runs page correctly becomes a redirect. Layout removes the "Runs" nav entry. URL sync with `useSearchParams` + Suspense boundary is correct for Next.js App Router. Good separation of concerns between tabs.

## Critical Issues

None found.

## High Priority

### H1. `TemplateProfile` type mismatch between page and BuildExportTab

- `page.tsx` line 20: `TemplateProfile` has `placeholder_inventory_path: string`
- `build-export-tab.tsx` line 11: `TemplateProfile` **missing** `placeholder_inventory_path`
- Currently harmless since BuildExportTab doesn't use it, but passing the full array means TS won't catch if a future consumer needs it.
- **Fix:** Extract shared `TemplateProfile` type into a shared types file (e.g., `_components/types.ts`) or at minimum keep them in sync.

### H2. `build-export-tab.tsx` at 227 lines -- exceeds 200-line limit

- Contains types, `flushZustandDraft` helper, component, and all fetch logic inline.
- **Fix:** Extract `flushZustandDraft` to a shared utility (it's pure Zustand + fetch, not component-specific). Extract type definitions to shared file. Should bring component under 180 lines.

### H3. `page.tsx` at 278 lines -- exceeds 200-line limit

- Still holds all editor helpers, template CRUD, validation handlers, and two modals.
- **Fix:** Extract editor-related helpers (lines 87-134) into a custom hook like `useTemplateEditor`. Extract CRUD handlers (lines 137-171) into `useTemplateCrud`. This would bring the page to ~150 lines.

### H4. No try-catch on `loadRuns` and `loadFreshness` fetch calls

- `build-export-tab.tsx` lines 71-83: Both `loadRuns` and `loadFreshness` call `fetch()` and `res.json()` without try-catch.
- Network failure = unhandled promise rejection.
- **Fix:** Wrap in try-catch, call `onError()` on failure.

```ts
const loadRuns = useCallback(async () => {
  setLoading(true);
  try {
    const res = await fetch("/api/report/runs", { cache: "no-store" });
    const data = (await res.json()) as { ok: boolean; error?: string; run_logs?: RunLog[] };
    if (!data.ok) { onError(data.error ?? t("runs.err.load")); return; }
    setRuns(data.run_logs ?? []);
  } catch { onError(t("runs.err.load")); }
  finally { setLoading(false); }
}, [t, onError]);
```

### H5. `flushZustandDraft` fetch has no error handling for non-ok response

- Line 51-56: The PUT to `/api/report/values` doesn't check `res.ok`. Server 500 is silently ignored even though the outer catch is `/* best-effort */`.
- Acceptable if truly best-effort, but should at least log to console for debugging.

## Medium Priority

### M1. Hardcoded Vietnamese strings in BuildExportTab

- Lines 118-119, 122, 146, 161, 166, 177, 181, 216: Many strings are hardcoded Vietnamese instead of using `t()`.
- Same issue in `configured-templates-tab.tsx` lines 68-69, 72-73.
- Breaks i18n for English locale.
- **Fix:** Add translation keys for these strings.

### M2. `ConfiguredTemplatesTab` returns `null` when templates empty

- Line 45: `if (templates.length === 0) return null;`
- User sees a blank tab with no guidance. Should show empty state message like "Chua co mau nao. Hay them mau tu tab Duyet folder."
- **Fix:** Return an empty-state UI instead of null.

### M3. `FieldInjectionProps` type duplicated

- `configured-templates-tab.tsx` lines 6-23: Duplicates `FieldCatalogItem` and `FieldInjectionProps` types that likely already exist in `use-field-injection.ts`.
- **Fix:** Export types from the hook file and import them.

### M4. `buildResult` typed as `unknown`

- `build-export-tab.tsx` line 65: `useState<unknown>(null)` -- renders as raw JSON in `<pre>`.
- Not a bug but reduces type safety. Consider a proper type or at minimum `Record<string, unknown>`.

### M5. `onError` in `loadRuns` callback dependency

- `build-export-tab.tsx` line 77: `useCallback` depends on `onError` (a prop). If parent re-renders with new `setError` reference, `loadRuns` will be recreated and `useEffect` will re-fire.
- In practice `setError` from `useState` is stable, so no issue. But `onMessage`/`onError` aren't guaranteed stable by the type system.
- **Fix:** Document the contract or use `useRef` for callbacks.

## Low Priority

### L1. `setTimeout(0)` pattern in both page.tsx and build-export-tab.tsx

- Lines 76 (page.tsx) and 86 (build-export-tab.tsx): Purpose unclear. Likely to avoid React strict mode double-fire or hydration mismatch.
- Not a bug but should have a comment explaining why.

### L2. Tab switch doesn't preserve BuildExportTab state

- Switching away from "export" tab unmounts `BuildExportTab`, losing run logs, freshness data, and build results. User switching back triggers a full re-fetch.
- Acceptable UX tradeoff for simplicity. Could use CSS display:none instead of conditional rendering if preservation is desired.

### L3. Runs redirect is server-side

- `runs/page.tsx` uses `redirect()` from `next/navigation` (server component). This is correct and returns 307. Good.

## Positive Observations

1. Suspense boundary for `useSearchParams` -- correct Next.js App Router pattern
2. Clean redirect for backward compatibility with `/report/runs` URL
3. BuildExportTab is self-contained with its own OnlyOffice modal -- good separation
4. URL sync via `?tab=` allows deep linking and browser back/forward
5. `VALID_TABS` const array with type narrowing -- good type safety pattern
6. Layout correctly removed "Runs" nav entry, no stale references found

## Recommended Actions (Priority Order)

1. **[H4]** Add try-catch to `loadRuns` and `loadFreshness`
2. **[M1]** Replace hardcoded Vietnamese strings with `t()` calls
3. **[M2]** Add empty-state UI for configured templates tab
4. **[H2/H3]** Extract shared types, `flushZustandDraft`, and editor hooks to reduce file sizes
5. **[M3]** DRY up duplicated type definitions

## Metrics

| Metric | Value |
|--------|-------|
| Files reviewed | 5 |
| Total LOC | 812 |
| Files exceeding 200-line limit | 2 (page.tsx: 278, build-export-tab.tsx: 227) |
| Hardcoded i18n strings | ~10 |
| Missing error handling | 2 fetch calls |
| Type duplications | 2 (TemplateProfile, FieldCatalogItem) |

## Unresolved Questions

1. Is the `setTimeout(0)` pattern intentional for hydration? If so, a comment would help future maintainers.
2. Should tab state (especially build results) persist across tab switches, or is re-fetch acceptable?
