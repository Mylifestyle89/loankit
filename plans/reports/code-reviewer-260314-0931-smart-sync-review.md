# Code Review: Smart Sync (Mapping <-> Template)

## Scope
- 10 files (4 new, 6 modified)
- ~750 LOC net new
- Focus: correctness, edge cases, security

## Overall Assessment
Solid feature — clean separation of concerns with shared utils (`field-sync-utils.ts`), proper deduplication, and good UX (focus navigation, coverage badges). A few issues worth addressing.

---

## Critical Issues

### 1. Path Traversal in Placeholders API
**File:** `src/app/api/report/template/placeholders/route.ts` line 57

`extractPlaceholdersFromProfile` resolves `docxPath` from DB with `path.resolve(process.cwd(), docxPath)`. If `docx_path` in DB contains `../../etc/passwd` or similar, it reads arbitrary files. The regex filter on line 61 only filters placeholder *results*, not the file path.

**Fix:** Validate that resolved path stays within allowed directory:
```ts
const fullPath = path.resolve(process.cwd(), docxPath);
const allowedRoot = path.resolve(process.cwd(), "report_assets");
if (!fullPath.startsWith(allowedRoot)) {
  throw new Error("Invalid template path");
}
```

### 2. No Auth on Placeholders API
The `GET /api/report/template/placeholders` endpoint has no authentication check. If other API routes use auth middleware, this one should too. Exposes template structure to unauthenticated users.

---

## High Priority

### 3. `?all=true` Performance — Reads ALL DOCX Files Per Request
**File:** `route.ts` lines 24-34

Every call to `?all=true` reads and parses every registered DOCX template from disk. With 10+ templates this becomes slow. The mapping page calls this on every mount (`useEffect` in page.tsx line 334).

**Fix:** Cache result in memory or add `stale-while-revalidate` pattern. At minimum, add `loaded` guard in store (already present, good) but also consider server-side caching.

### 4. FieldRow Subscribes to Entire usageMap Object
**File:** `FieldRow.tsx` line 86

```ts
const templateUsage = useFieldUsageStore((s) => s.usageMap[field.field_key]);
```

This selector returns a new array reference each time the store updates (even for unrelated keys), defeating `memo`. Use shallow equality or return the array length + joined string for comparison.

**Fix:** Use `useShallow` or a stable selector:
```ts
const templateUsage = useFieldUsageStore(
  useCallback((s) => s.usageMap[field.field_key], [field.field_key])
);
```
Actually the current selector *does* return the same reference if the map hasn't changed, since Zustand uses `Object.is`. This is fine as long as `usageMap` itself isn't reconstructed. Since `fetchUsage` only sets once (`loaded` guard), this is acceptable. **Downgrade to medium.**

### 5. Focus Highlight Uses DOM Manipulation Instead of React State
**File:** `page.tsx` lines 337-353

Direct `classList.add/remove` bypasses React's rendering. If the component re-renders during the 3s highlight window, classes may be lost or stale. Also, no cleanup of the inner timeout on unmount.

**Fix:** Use React state for highlight:
```ts
const [focusedKey, setFocusedKey] = useState<string | null>(null);
// pass focusedKey to FieldRow, clear after 3s
```

---

## Medium Priority

### 6. `extractPlaceholderKeys` Regex May Not Match Docxtemplater Syntax
**File:** `field-sync-utils.ts` line 98

Uses `\[([^\[\]]+)\]` (square brackets), but Docxtemplater uses `{field_key}` (curly braces) by default. The API route uses `parseDocxPlaceholdersFromBuffer` (separate parser) for actual extraction. `extractPlaceholderKeys` seems unused — dead code?

**Action:** Verify if this function is called anywhere. If not, remove it.

### 7. Coverage Progress Bar Duplicated 3 Times
The exact same progress bar UI (color thresholds 80/50, emerald/amber/red) appears in:
- `MappingStatusBar.tsx` lines 74-85
- `build-export-tab.tsx` lines 162-188
- `field-coverage-panel.tsx` lines 101-113

**Fix:** Extract a `<CoverageProgressBar percent={n} />` component.

### 8. `effectiveValues` Computed Redundantly
`computeEffectiveValues` is called in:
- `useMappingComputed` (mapping page)
- `build-export-tab.tsx` line 68-71
- `field-coverage-panel.tsx` line 78-81

Each creates its own memoized copy. The mapping page already has it — consider exposing via store or context.

### 9. Delete Field Warning Uses `window.confirm`
**File:** `useFieldGroupActions.ts` line 175

`window.confirm` blocks the main thread and can't be styled. Consider using the existing `BaseModal` or `openModal` pattern already used for group deletion (line 231).

---

## Low Priority

### 10. Hardcoded Vietnamese Strings
- `field-coverage-panel.tsx`: "Chua dien", "Co du lieu", "Khong nhan dang"
- `build-export-tab.tsx`: "fields co du lieu"
- `useFieldGroupActions.ts`: "Field nay dang duoc dung trong..."

Should use `useLanguage()` / `t()` for i18n consistency.

### 11. `configured-templates-tab.tsx` Redefines `FieldCatalogItem` Type
Line 8 creates a local type instead of importing from `@/lib/report/config-schema`. Risk of type drift.

---

## Edge Cases Found

1. **Empty template (0 placeholders):** `FieldCoveragePanel` returns null — OK
2. **Template with only loop controls (`#items`, `/items`):** Properly filtered in `validateTemplateFields` line 75 — OK
3. **Field deleted while coverage panel open:** Panel uses live Zustand state, will update — OK
4. **`focus` param with special chars:** Uses `CSS.escape()` line 343 — OK
5. **Multiple rapid template switches:** `fetchPlaceholders` in `configured-templates-tab.tsx` has no abort controller — could show stale placeholders if responses arrive out of order

---

## Positive Observations
- Clean shared utility layer (`field-sync-utils.ts`) — good DRY
- Deduplication of placeholders in `validateTemplateFields`
- `loaded` guard in field usage store prevents redundant fetches
- `data-field-row` attribute enables cross-page navigation elegantly
- Delete field warning includes template usage — good UX safety net

---

## Recommended Actions (Priority Order)
1. **[Critical]** Add path traversal guard in placeholders API
2. **[Critical]** Add auth check to placeholders API (if other routes require auth)
3. **[High]** Add AbortController to `fetchPlaceholders` in configured-templates-tab
4. **[Medium]** Extract shared `CoverageProgressBar` component
5. **[Medium]** Verify `extractPlaceholderKeys` usage — remove if dead code
6. **[Low]** Move hardcoded Vietnamese strings to i18n

## Unresolved Questions
- Is `extractPlaceholderKeys` in `field-sync-utils.ts` used anywhere? Could be dead code.
- Are other `/api/report/*` routes authenticated? Need to verify auth pattern to confirm severity of issue #2.
