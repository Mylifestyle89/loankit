# Code Review: Multi-Asset DOCX Section Cloner

**Date:** 2026-03-14 | **Reviewer:** code-reviewer | **Severity:** Mixed

## Scope
- `src/lib/docx-section-cloner.ts` (NEW, 140 LOC)
- `src/lib/docx-engine.ts` (lines 241-267, preProcessZip hook)
- `src/services/khcn-report-data-builders.ts` (emitIndexedFields + 4 builders)
- `src/services/khcn-report.service.ts` (generateKhcnReport integration)

## Overall Assessment

Solid implementation. Clean separation: cloner handles XML, builders handle data, service wires them. The XML-tag-aware regex is clever and handles the split-run problem correctly. A few edge cases and one medium-severity issue found.

## Critical Issues

None.

## High Priority

### 1. Regex false-positive: prefix matches inside unrelated text (HIGH)

The regex `(S)((?:<[^>]*>)*)(Đ)((?:<[^>]*>)*)(\.)` will match ANY occurrence of "SĐ." in the document body, not just inside `[SĐ.fieldName]` delimiters. If the template has prose containing "SĐ." (e.g., "theo SĐ. số 123"), those get rewritten too.

**Impact:** Corrupted output text in templates with Vietnamese prose mentioning "SĐ.", "ĐS.", etc.

**Fix:** Anchor the regex to require `[` before the prefix or `]` after the field:
```ts
// Option A: require [ before prefix (with optional XML tags)
const fullPattern = new RegExp(
  `(\\[(?:<[^>]*>)*)(${charPattern})((?:<[^>]*>)*)(\\.)`, "g"
);
// Then in replace, preserve the opening bracket
```

**Mitigation note:** In practice, these prefixes appear only inside `[...]` placeholder delimiters in DOCX templates, so risk is low but not zero.

### 2. Collateral count source mismatch (HIGH)

In `khcn-report.service.ts:214-216`, count is derived from `data.TSBD` array filtering by `"Loai TSBD"` field (which contains raw `collateral_type` like `"qsd_dat"`). But `CATEGORY_TO_COLLATERAL_TYPE` also maps to `"qsd_dat"`. This works correctly.

However, `ts_glvd_bv` and `ts_glvd_bt3` map to `collateralType: "qsd_dat"` but prefix `"SD"` -- same as `ts_qsd_*`. This means "GLVD" templates (gia lam viec dat?) use same prefix "SD" and same collateral type filter. Intentional? If GLVD has different field semantics from QSD but same prefix, cloner will produce identical output for both. Verify this is correct business logic.

## Medium Priority

### 3. ĐSH owner prefix hardcoded in cloner (MEDIUM)

`cloneSectionsForAssets` hardcodes `ownerPrefix = "ĐSH"` (line 62). This means every call to the cloner also rewrites ĐSH placeholders regardless of whether the template uses them. Harmless if no ĐSH placeholders exist, but couples cloner to specific business knowledge.

**Suggestion:** Accept owner prefix as optional parameter, or derive from the main prefix mapping.

### 4. `JSON.parse` without try-catch in extractLandFields/extractMovableFields (MEDIUM)

`extractLandFields` (line 233) and `extractMovableFields` (line 376) call `JSON.parse(col.properties_json || "{}")` without try-catch. If `properties_json` contains malformed JSON, entire report generation crashes.

**Fix:** Wrap in try-catch or use `parseOwners`-style safe parser.

### 5. `CATEGORY_TO_PREFIX` missing `tai_san` key (MEDIUM)

`ASSET_CATEGORY_KEYS` includes `"tai_san"` but `CATEGORY_TO_PREFIX` does not. When `category === "tai_san"`, `prefix` is `undefined`, `isAssetTemplate` is true but `count` falls to 0 due to the `prefix &&` guard. Works correctly (no cloning for common templates), but the implicit behavior depends on multiple falsy guards. Add explicit comment or handle `tai_san` explicitly.

## Low Priority

### 6. Linear scan for template lookup

`KHCN_TEMPLATES.find()` on every generate call. Templates list is small (~50 entries), so no perf concern. Could use a Map if list grows.

### 7. No page break between cloned sections

Multiple collateral sections are concatenated without `<w:br w:type="page"/>` separator. May or may not be desired depending on template design. Worth documenting the decision.

## Edge Cases Verified

| Case | Behavior | Status |
|------|----------|--------|
| count=0 | Early return, no-op | OK |
| count=1 | Single clone with `_1` suffix | OK |
| Missing document.xml | Silent return | OK |
| No `<w:sectPr>` | Content cloned without sectPr extraction | OK |
| Prefix with regex special chars | `escapeRegex()` handles it | OK |
| Multi-byte Vietnamese chars in prefix | Regex char split works (SĐ = 2 chars) | OK |

## Security

- No injection risk: XML manipulation is string replacement on existing XML, not user-controlled input
- `preProcessZip` hook is internal-only, called with trusted data
- `templatePath` already validated by `isSafeDocxPath()` in docx-engine

## Positive Observations

- Clean API: `preProcessZip` hook is minimal and non-invasive to existing engine
- `emitIndexedFields` helper avoids duplication across 4 builder functions
- Backward compatibility preserved: flat `SĐ.*` fields still emitted alongside indexed `SĐ_1.*`
- `rewritePrefixChars` correctly handles XML tags interspersed in prefix characters

## Recommended Actions

1. **[HIGH]** Evaluate regex false-positive risk for prefix matching outside delimiters -- add delimiter anchoring if templates contain prose with prefix strings
2. **[HIGH]** Confirm GLVD categories intentionally share prefix "SĐ" and collateral type with QSD
3. **[MEDIUM]** Add try-catch around `JSON.parse` in `extractLandFields` and `extractMovableFields`
4. **[LOW]** Document page-break-between-sections decision

## Unresolved Questions

1. Do GLVD templates (ts_glvd_bv/bt3) use identical SĐ.* placeholders as QSD templates, or do they have distinct field names?
2. Should cloned sections have page breaks between them?
3. Are there templates where "SĐ." appears in prose text (not inside `[...]` placeholders)?
