# Code Review: KHCN Template Management

**Date:** 2026-03-31 | **Reviewer:** code-reviewer | **Focus:** correctness, reuse, edge cases, UI consistency

## Scope

- `src/app/report/khcn/templates/page.tsx` (NEW, 60 LOC)
- `src/app/report/layout.tsx` (MODIFIED, nav link + active state fix)
- Dependencies scouted: `khcn-template-registry.ts`, `khcn-asset-template-registry.ts`, `template-file-actions.tsx`

## Overall Assessment

Clean, well-structured page. Good reuse of existing `TemplateFileActions` component and registry utilities. The `CATEGORY_ORDER` approach is pragmatic. Active-state fix in layout is correct. A few minor issues noted below.

## High Priority

### 1. `grouped` computed outside component -- stale on HMR but OK for static registry
`const grouped = groupByCategory(KHCN_TEMPLATES);` at module level (line 15) is fine since `KHCN_TEMPLATES` is a static array. No issue in production. Just noting this is intentional.

**Verdict:** Acceptable, no action needed.

### 2. `filePath` stripping assumes prefix always matches
```tsx
filePath={t.path.replace("report_assets/", "")}
```
`TemplateFileActions` reconstructs `fullPath = "report_assets/" + filePath`. The registry paths all start with `report_assets/KHCN templates/...` so the replace works. However, `replace()` only strips the **first** occurrence -- if a path ever contained `report_assets/` elsewhere, it would still work correctly since only the first match is replaced.

**Verdict:** Correct for current data. No action needed.

## Medium Priority

### 3. CATEGORY_ORDER missing asset categories
`CATEGORY_ORDER` lists 9 keys but `ASSET_CATEGORY_LABELS` adds `tai_san_qsd_dat_bv`, `tai_san_qsd_dat_bt3`, `tai_san_glvd_bv`, `tai_san_glvd_bt3`, `tai_san_ptgt_bv`, `tai_san_ptgt_bt3`. These are NOT in `CATEGORY_ORDER`, so they'll sort at the end (index 999) in arbitrary order relative to each other.

The page does include `tai_san` and `tai_san_qsd_dat` in CATEGORY_ORDER, but the asset registry uses more specific keys. Check if the 6 asset sub-categories appear in `grouped` output -- if they do, their relative order is undefined.

**Impact:** Asset sub-categories may appear in inconsistent order across page loads (JS object key order is insertion-based, so likely stable, but not guaranteed by the sort).

**Recommended fix:** Add all asset category keys to `CATEGORY_ORDER`, or import `ASSET_CATEGORY_KEYS` and append them:
```tsx
const CATEGORY_ORDER = [
  "danh_muc", "phap_ly", "hop_dong", "phuong_an",
  "bao_cao", "kiem_tra", "tai_san",
  "tai_san_qsd_dat_bv", "tai_san_qsd_dat_bt3",
  "tai_san_glvd_bv", "tai_san_glvd_bt3",
  "tai_san_ptgt_bv", "tai_san_ptgt_bt3",
  "giai_ngan",
];
```

### 4. Layout active state logic -- correct but dense
```tsx
const isActive = pathname.startsWith(link.href)
  && !links.some((other) => other.href !== link.href
    && other.href.startsWith(link.href)
    && pathname.startsWith(other.href));
```
This correctly prevents `/report/khcn` from being active when on `/report/khcn/templates` (since `/report/khcn/templates` starts with `/report/khcn` AND the pathname starts with `/report/khcn/templates`). Logic is sound.

**Verdict:** Correct. The "longest prefix match" approach handles the parent/child nav ambiguity well.

## Low Priority

### 5. No loading/empty state
If `KHCN_TEMPLATES` were ever empty (impossible with current static registry), the page would render just the header. Not a real concern since registry is static, but noting for completeness.

### 6. No-op `onRefresh` callback
```tsx
const onRefresh = useCallback(() => {}, []);
```
Correctly documented with comment. After upload, `TemplateFileActions` calls `onRefresh()` which does nothing -- appropriate since the file is replaced server-side and the registry listing is static (no client state to refresh).

## Edge Cases Scouted

1. **Active state with future nested routes:** If more routes are added under `/report/khcn/` (e.g., `/report/khcn/settings`), the longest-prefix logic will handle them correctly as long as each route has its own nav entry. Routes without nav entries will highlight the closest parent.

2. **Unicode in file paths:** Template paths contain Vietnamese characters (`Hồ sơ tài sản`, `Giấy tờ pháp lý`). The `encodeURIComponent` in `TemplateFileActions.handleUpload` handles this correctly for the API call.

3. **Concurrent uploads to same template:** `TemplateFileActions` has no mutex -- two rapid clicks could trigger parallel uploads. The `disabled={uploading}` state prevents this in practice since the button is disabled during upload.

## Positive Observations

- Excellent reuse: page is only 60 LOC by leveraging existing `TemplateFileActions`, `groupByCategory`, and registry
- Correct `editorAvailable={false}` -- no editor/register buttons shown per requirements
- Module-level `grouped` computation avoids re-computing on each render
- `CATEGORY_ORDER` fallback (999 for unknown) is defensive
- Layout active-state fix is a genuine improvement for nav UX

## Recommended Actions

1. **(Medium)** Add missing asset sub-category keys to `CATEGORY_ORDER` for deterministic sort order
2. No other blocking issues

## Metrics

- Type Coverage: Full (TypeScript strict, all props typed)
- LOC: 60 (well under 200-line limit)
- Linting Issues: 0 expected (standard patterns)
