# Code Review: Template Upload + Placeholder Validation

**Date:** 2026-03-08
**Reviewer:** code-reviewer
**Scope:** 6 files (1 modified, 5 new), ~530 LOC

## Overall Assessment

Solid feature implementation. Clean separation: API route handles validation, hook manages flow state, modal presents results. Good security baseline (file size limits, extension checks, zip bomb guard). Several medium-priority issues found, one high-priority security concern.

## Critical Issues

None.

## High Priority

### H1. Path traversal on save -- user-controlled `savePath` input

**File:** `src/app/report/template/_components/template-validation-report-modal.tsx` L15, L155-158

The `savePath` is initialized from `fileName` and editable via text input. It flows to `saveFile(savePath)` which calls:

```
/api/report/template/save-docx?path=${encodeURIComponent(savePath)}
```

The `save-docx` route does check for `..` and `isAbsolute`, so the backend is protected. However, the client allows any path -- users could save to unintended locations within the project root (e.g., `src/app/page.tsx`). Consider:
- Restricting savePath to `report_assets/` prefix on the backend
- Or add a client-side validation/warning if path doesn't start with `report_assets/`

**Severity:** High (mitigated by backend checks, but defense-in-depth needed)

### H2. Duplicate placeholder keys silently dropped

**File:** `src/app/api/report/template/validate-upload/route.ts` L66-75

`parseDocxPlaceholdersFromBuffer` returns deduplicated `Set<string>` results. If a template has the same placeholder used 10 times, the validation report shows it once. This is fine for the valid/unknown categorization, but the count `total_placeholders` could mislead users -- they might expect it to match the actual occurrence count in the document.

**Recommendation:** Either rename to `unique_placeholders` or document clearly.

### H3. Modal missing accessibility attributes

**File:** `src/app/report/template/_components/template-validation-report-modal.tsx` L46-47

Uses raw `div` overlay without `role="dialog"`, `aria-modal="true"`, or focus trapping. Consistent with existing pattern (noted in MEMORY.md as known gap), but this is new code -- should use `BaseModal` from `src/components/ui/BaseModal.tsx`.

**Recommendation:** Wrap with BaseModal or add aria attributes + Escape key handler.

## Medium Priority

### M1. No path sanitization on `savePath` client-side

**File:** `template-validation-report-modal.tsx` L15

```ts
const [savePath, setSavePath] = useState(`report_assets/${fileName}`);
```

`fileName` comes directly from `File.name` which browsers provide. Usually safe, but could contain special characters. Consider sanitizing (strip `/`, `\`, `..` from fileName before constructing default path).

### M2. `field_catalog` may be undefined

**File:** `validate-upload/route.ts` L59

```ts
const catalog = template.field_catalog ?? [];
```

The `??` fallback is good, but if `listFieldTemplates` returns templates without `field_catalog` populated (lazy loading), this silently produces an empty valid/missing report. Should either:
- Explicitly fetch the full template with catalog
- Or return an error if catalog is empty/missing

### M3. File exceeds 200-line guideline

**File:** `template-validation-report-modal.tsx` -- 232 lines
**File:** `template/page.tsx` -- 287 lines

Both exceed the 200-line limit per project standards. The modal has natural sub-components already extracted (StatBadge, CollapsibleSection, SuggestionChip) but they're in the same file. Consider moving them to a shared sub-components file.

### M4. Levenshtein on large catalogs -- O(n) per placeholder

**File:** `placeholder-utils.ts` L15-28

`suggestAliasForPlaceholder` iterates all field keys for each unknown placeholder. With large catalogs (500+ fields) and many unknowns (50+), this becomes 25K+ Levenshtein computations. Not critical for current scale but worth noting.

**Recommendation:** For now acceptable. If perf becomes an issue, pre-filter by first-char or length proximity.

### M5. Buffer stored in both ref AND FormData

**File:** `use-template-upload-validation.ts` L44-49

The file is read into `ArrayBuffer` (ref), then also passed as a `File` object in FormData. The buffer ref is for later save, the FormData upload is for validation. This means the file data exists twice in memory briefly. Acceptable for 20MB limit but worth documenting intent.

## Low Priority

### L1. Hardcoded Vietnamese strings in API route

**File:** `validate-upload/route.ts` L30, L33, L36, L43, L49

Error messages are hardcoded in Vietnamese. Other API routes (save-docx) use English. Inconsistent -- should either use i18n or standardize language.

### L2. `allValid` check ignores `missing` fields

**File:** `template-validation-report-modal.tsx` L43

```ts
const allValid = report.unknown.length === 0;
```

Shows success banner even if many catalog fields are missing from the template. This is a design choice (missing fields may be intentional), but could confuse users.

### L3. No loading state feedback when saving from modal

The `handleValidationSave` in page.tsx doesn't show a loading indicator. The modal has its own `saving` state, but after save completes, `validation.reset()` immediately closes the modal before user sees success feedback. The `setMessage` on page.tsx shows it, but modal is already gone.

## Edge Cases Found by Scouting

1. **Split placeholders across XML runs:** `parseDocxPlaceholdersFromBuffer` joins `<w:t>` fragments before matching -- correctly handles Word's run-splitting. Good.

2. **Regex for parts scanned:** The buffer version scans `footnotes` and `endnotes` in addition to headers/footers, while `parseDocxPlaceholderInventory` (file-based) does not. Inconsistency, but buffer version is more thorough.

3. **Empty file upload:** A 0-byte file passes extension check but will fail JSZip parsing. The catch block handles this gracefully, returning a generic error. Could provide a more specific "empty file" message.

4. **Concurrent validation calls:** If user clicks "Upload & Validate" rapidly, `validateFile` has no debounce/guard. The `setState` calls will interleave but ultimately the last response wins. Not a data corruption risk but UI could flicker.

5. **`savePath` with no `.docx` extension:** User could edit the save path input to remove the extension. Backend `save-docx` validates this, so it's caught.

## Positive Observations

- Clean hook pattern (`useTemplateUploadValidation`) with proper cleanup on unmount
- Buffer stored in `useRef` (not state) -- avoids unnecessary re-renders and serialization
- False positive filtering regex is pragmatic and effective
- Zip bomb protection via double size check (content-length + buffer.byteLength)
- Error handling with `toHttpError` consistent with codebase patterns
- Collapsible sections and stat badges provide good UX for validation results
- `SuggestionChip` copy-to-clipboard is a nice touch for fixing placeholders

## Recommended Actions

1. **[High]** Add `report_assets/` prefix validation in save-docx route for defense-in-depth
2. **[High]** Use BaseModal or add aria attributes to validation report modal
3. **[Medium]** Sanitize `fileName` before constructing default `savePath`
4. **[Medium]** Rename `total_placeholders` to `unique_placeholders` or add doc comment
5. **[Medium]** Extract sub-components from validation report modal to stay under 200 lines
6. **[Low]** Standardize error message language (EN vs VI)
7. **[Low]** Consider adding guard against concurrent validation calls

## Metrics

- Type Coverage: Good -- all props typed, API response types defined
- Test Coverage: Unknown -- no test files observed for this feature
- Linting Issues: 0 (no syntax errors observed)
- File Size Compliance: 2 files over 200-line limit

## Unresolved Questions

1. Should `missing` fields count toward the "all valid" check, or is it intentional that only `unknown` placeholders trigger warnings?
2. Is there a plan to add automated tests for the validate-upload endpoint?
3. Should the save path be restricted to specific directories, or is the current backend validation sufficient?
