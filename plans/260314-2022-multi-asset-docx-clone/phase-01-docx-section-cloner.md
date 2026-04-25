---
phase: 1
title: "DOCX Section Cloner Utility"
status: pending
effort: 1.5h
---

# Phase 1: DOCX Section Cloner Utility

## Context
- [docx-engine.ts](../../src/lib/docx-engine.ts) — current engine
- [Brainstorm](../../plans/reports/brainstorm-260314-2022-multi-asset-docx-clone.md)

## Overview
Create `src/lib/docx-section-cloner.ts` — a utility that manipulates `word/document.xml` inside a PizZip instance to clone body content N times with rewritten prefixes.

## Key Insights
- DOCX XML structure: `<w:body>` contains `<w:p>` (paragraphs), `<w:tbl>` (tables), ends with `<w:sectPr>` (section properties = page layout)
- Placeholders in XML are split across `<w:r>` runs: `[SĐ.Tên TSBĐ]` may appear as `[SĐ` + `.Tên TSBĐ]` across runs
- docxtemplater already handles run-splitting for rendering — we only need to rewrite prefix text BEFORE docxtemplater processes
- Headers/footers are in separate XML files (`word/header1.xml`) — NOT in `<w:body>`, so naturally excluded

## Architecture

```
cloneSectionsForAssets(zip: PizZip, prefix: string, count: number): void
```

1. Read `word/document.xml` from zip
2. Extract body content: everything between `<w:body>` and final `<w:sectPr>`
3. For each clone i (1..N):
   - Copy body content string
   - Replace all `prefix.` with `prefix_i.` (e.g., `SĐ.` → `SĐ_1.`)
4. Replace original body content with concatenated clones
5. Write back to zip

## Requirements
- Must handle prefix appearing split across XML runs
- Must preserve `<w:sectPr>` (page layout) — only one copy at end
- Must not touch headers/footers/styles
- Must be idempotent (calling with count=1 produces same XML)

## Related Code Files
- **Create:** `src/lib/docx-section-cloner.ts`

## Implementation Steps

1. Create `src/lib/docx-section-cloner.ts`
2. Parse XML string, locate `<w:body>` start and `<w:sectPr` start
3. Extract body inner content (between body open tag and sectPr)
4. Pre-process: merge split placeholder runs using regex to find `[prefix` patterns split across `</w:t></w:r><w:r>...<w:t>` boundaries — normalize them into single runs first
5. For i = 1..count: clone body content, string-replace `prefix.` → `prefix_i.`
6. Reassemble: `<w:body>` + cloned sections + `<w:sectPr>...</w:sectPr>` + `</w:body>`
7. Write back to zip

### Run-splitting strategy
Rather than merging runs (complex, may break formatting), use a simpler approach:
- The prefix (e.g., `SĐ`) will only appear inside `<w:t>` text nodes
- Do global regex replace on full XML string: replace `SĐ.` with `SĐ_1.` etc.
- This works because `SĐ.` is a unique Vietnamese prefix unlikely to appear in non-placeholder context
- Even if split across runs like `SĐ` + `.Tên`, the `.` is in the next run — but the prefix `SĐ` itself needs no `.` replacement. The key insight: we replace the **full** `SĐ.` string. If split, docxtemplater's parser already handles split delimiters.

**Revised approach:** Actually, we don't need to handle run-splitting at all. docxtemplater already merges split tags internally. We just need to rewrite the text BEFORE docxtemplater sees it. Since `SĐ.` may be split, we should do the replacement on the raw XML where `SĐ.` could span `</w:t>` boundaries.

**Final approach (simplest):**
- Strip XML tags temporarily, find all placeholder occurrences
- OR: just do string replace on raw XML: `SĐ.` → `SĐ_1.` — even if split across tags, each fragment gets replaced correctly because `SĐ` and `.` are separate. Wait — no, if split as `SĐ` in one `<w:t>` and `.Tên` in another, replacing `SĐ.` won't match.

**Robust approach:**
- Use regex to find `SĐ` followed by (optional XML tags) then `.` and replace with `SĐ_i` + (same XML tags) + `.`
- Pattern: `(SĐ)((?:<[^>]*>)*)(\.)` → `SĐ_i$2.`

## Todo List
- [ ] Create `docx-section-cloner.ts` with `cloneSectionsForAssets()`
- [ ] Handle prefix replacement with XML-tag-aware regex
- [ ] Handle body extraction preserving sectPr
- [ ] Export helper: `detectAssetPrefix(templatePath, category)` mapping category → prefix
- [ ] Unit-testable: pure function on string XML

## Success Criteria
- Given a zip with `[SĐ.X]` placeholders and count=3, output has `[SĐ_1.X]`, `[SĐ_2.X]`, `[SĐ_3.X]` sections
- `<w:sectPr>` appears exactly once at end
- Headers/footers unchanged
- count=1 produces functionally identical output

## Risk Assessment
- XML run-splitting: mitigated by XML-aware regex
- Complex table layouts: body clone copies tables as-is — formatting preserved
- Large templates: string ops on ~100KB XML — no perf concern
