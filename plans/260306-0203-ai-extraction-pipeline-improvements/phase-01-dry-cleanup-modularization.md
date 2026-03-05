# Phase 01: DRY Cleanup + Modularize DOCX Extractor

## Context Links
- [extract-fields-from-docx-report.ts](../../src/core/use-cases/extract-fields-from-docx-report.ts) (660 lines)
- [extract-fields-from-ocr.ts](../../src/core/use-cases/extract-fields-from-ocr.ts) (158 lines)
- [document-extraction.service.ts](../../src/services/document-extraction.service.ts) (277 lines)

## Overview
- **Priority:** HIGH (prerequisite for all other phases)
- **Status:** completed
- **Effort:** 3h
- **Description:** Extract duplicated helpers into shared module. Split 660-line DOCX extractor into focused files under 200 lines.

## Key Insights
- 4 functions duplicated between DOCX and OCR extractors: `normalizeText`, `buildHeaderValueCandidates`, `lineValueAfterLabel`, `extractByHeuristic`
- DOCX extractor has clear separation boundaries: XML parsing, table extraction, paragraph extraction, repeater extraction, orchestration
- `toTypedValue` and `scoreTokenOverlap` are also reusable utility functions
- No existing tests for these use-cases -- add basic smoke tests before refactoring

## Requirements

### Functional
- Zero behavior change -- refactor only, no logic modifications
- All existing extraction pipelines produce identical results

### Non-Functional
- Every new file under 200 lines
- kebab-case file naming with descriptive names

## Architecture

### New File Structure
```
src/core/use-cases/extraction/
  extraction-text-helpers.ts        -- normalizeText, lineValueAfterLabel, buildHeaderValueCandidates, extractByHeuristic, toTypedValue, tokenize, scoreTokenOverlap, decodeXmlText
  extraction-docx-xml-parser.ts     -- parseXmlTablesFromDocx, parseXmlTablesRaw, extractCellText, XML regex constants
  extraction-docx-table-fields.ts   -- extractScalarFieldsFromTables (2-col table matching)
  extraction-docx-paragraph.ts      -- extractFromAdjacentParagraphs
  extraction-docx-repeater.ts       -- extractRepeaterSuggestions, buildRepeaterGroupMetas, parsePipeTableRows
  extract-fields-from-docx-report.ts -- orchestrator (imports above, runs 6-step pipeline)
  extract-fields-from-ocr.ts        -- OCR pipeline (imports shared helpers)
  extract-fields-from-report.ts     -- router (unchanged, just update import paths)
```

## Related Code Files
- **Modify:** `src/core/use-cases/extract-fields-from-docx-report.ts`
- **Modify:** `src/core/use-cases/extract-fields-from-ocr.ts`
- **Modify:** `src/core/use-cases/extract-fields-from-report.ts` (update imports)
- **Create:** `src/core/use-cases/extraction/extraction-text-helpers.ts`
- **Create:** `src/core/use-cases/extraction/extraction-docx-xml-parser.ts`
- **Create:** `src/core/use-cases/extraction/extraction-docx-table-fields.ts`
- **Create:** `src/core/use-cases/extraction/extraction-docx-paragraph.ts`
- **Create:** `src/core/use-cases/extraction/extraction-docx-repeater.ts`
- **Check:** Any file importing from old paths (use Grep `from.*extract-fields-from-docx`)

## Implementation Steps

1. **Add basic smoke tests** for current extraction behavior (snapshot inputs/outputs for regression)
2. **Create `extraction-text-helpers.ts`** -- move all shared utility functions
3. **Create `extraction-docx-xml-parser.ts`** -- move XML parsing (regex constants, `parseXmlTablesFromDocx`, `parseXmlTablesRaw`, `extractCellText`)
4. **Create `extraction-docx-table-fields.ts`** -- move `extractScalarFieldsFromTables` + constants
5. **Create `extraction-docx-paragraph.ts`** -- move `extractFromAdjacentParagraphs` + constants
6. **Create `extraction-docx-repeater.ts`** -- move `extractRepeaterSuggestions`, `buildRepeaterGroupMetas`, `parsePipeTableRows`
7. **Rewrite `extract-fields-from-docx-report.ts`** as orchestrator (import + compose)
8. **Update `extract-fields-from-ocr.ts`** -- import shared helpers from `extraction-text-helpers.ts`, remove duplicated functions
9. **Update `extract-fields-from-report.ts`** -- update import paths
10. **Grep for all importers** of old paths, update them
11. **Run smoke tests** -- verify identical output
12. **Run `npm run build`** -- verify compilation

## Todo List
- [ ] Write basic regression tests before refactoring
- [ ] Create extraction-text-helpers.ts with shared functions
- [ ] Create extraction-docx-xml-parser.ts
- [ ] Create extraction-docx-table-fields.ts
- [ ] Create extraction-docx-paragraph.ts
- [ ] Create extraction-docx-repeater.ts
- [ ] Rewrite DOCX orchestrator
- [ ] Update OCR extractor imports
- [ ] Update router imports
- [ ] Fix all external import references
- [ ] Run build + tests

## Success Criteria
- All new files under 200 lines
- No duplicated helper functions between DOCX and OCR extractors
- Build passes, tests pass
- Extraction output identical to pre-refactor (regression tests green)

## Risk Assessment
- **Risk:** Refactoring without tests could silently break extraction
- **Mitigation:** Step 1 is writing regression tests; do NOT skip
- **Risk:** Circular imports between new modules
- **Mitigation:** Keep dependency flow one-directional: helpers <- parsers <- orchestrator

## Security Considerations
- No security changes -- PII scrubbing logic stays in same locations
- `securityService.scrubSensitiveData` calls must be preserved in correct positions
