# Phase 1: DOCX Tag Scanner

**Priority:** High | **Status:** pending | **Effort:** 0.5d

## Overview

Extract all `[placeholder]` tags from DOCX template files. This is the foundation — phases 2-3 depend on this scanner.

## Context

- DOCX = ZIP containing `word/document.xml` + headers/footers
- Tags use `[` `]` delimiters (docxtemplater config: `delimiters: { start: "[", end: "]" }`)
- Loop tags: `[#LOOP_NAME]...[/LOOP_NAME]`
- Regular tags: `[Field Name]`, `[PREFIX.Field Name]`, `[PREFIX_N.Field Name]`
- Tags may be split across XML runs (handled by `mergeAdjacentRuns` in docx-engine-helpers.ts)

## Related Files

- `src/lib/docx-engine-helpers.ts` — has `mergeAdjacentRuns()` we can reuse
- `src/lib/loan-plan/khcn-template-registry.ts` — KHCN_TEMPLATES array (62 templates)
- `src/lib/loan-plan/khcn-asset-template-registry.ts` — ASSET_TEMPLATES array (97 templates)

## Implementation Steps

### 1. Create `src/lib/report/khcn-docx-tag-scanner.ts`

```typescript
// Input: DOCX file path (relative to cwd)
// Output: Set<string> of tag names (without [ ])
//
// Steps:
// 1. Read DOCX as buffer
// 2. Open with PizZip
// 3. Extract word/document.xml + headers/footers
// 4. Apply mergeAdjacentRuns() to fix split tags
// 5. Regex extract all [TAG] patterns
// 6. Separate into: regular tags, loop open (#), loop close (/)
```

**Key regex:** `/\[([^\[\]]+)\]/g` after merging runs

**Return type:**
```typescript
type DocxTagScanResult = {
  filePath: string;
  tags: Set<string>;          // regular placeholder tags
  loopOpens: Set<string>;     // #LOOP names
  loopCloses: Set<string>;    // /LOOP names
  errors: string[];           // parse errors
};
```

### 2. Scan all registered templates

```typescript
// Combine KHCN_TEMPLATES + ASSET_TEMPLATES
// For each: scanDocxTags(template.path)
// Return Map<filePath, DocxTagScanResult>
```

### 3. Handle edge cases

- **Dynamic indexed tags:** `[SĐ_1.Tên TSBĐ]` — strip index to get base: `SĐ.Tên TSBĐ`
- **Loop context tags:** Tags inside `[#UNC]...[/UNC]` belong to UNC loop — track parent loop
- **XML files to scan:** document.xml, header1.xml, header2.xml, footer1.xml, footer2.xml (same list as mergeAdjacentRuns)
- **Missing files:** Report as error, don't crash

## Todo

- [ ] Create `khcn-docx-tag-scanner.ts` with `scanDocxTags()` function
- [ ] Create `scanAllKhcnTemplates()` that scans all registered templates
- [ ] Handle split tags via `mergeAdjacentRuns`
- [ ] Handle indexed prefix stripping (SĐ_1. → SĐ.)
- [ ] Write unit test with a known DOCX template

## Success Criteria

- Scans 159 templates (62 + 97) without error
- Extracts correct tag set from known template (manual spot-check)
- Handles missing files gracefully (error in result, no crash)
