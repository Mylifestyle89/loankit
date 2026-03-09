# Phase 04: Smart Branching Optimization

## Context Links
- [Phase 01](./phase-01-dry-cleanup-modularization.md) (prerequisite)
- [extract-fields-from-report.ts](../../src/core/use-cases/extract-fields-from-report.ts) (router)
- [bctc-extractor.ts](../../src/lib/bctc-extractor.ts) (XLSX deterministic parser)
- [ocr.service.ts](../../src/services/ocr.service.ts)

## Overview
- **Priority:** MEDIUM
- **Status:** pending
- **Effort:** 2h
- **Description:** Optimize extraction routing to skip AI when unnecessary. XLSX uses deterministic parser (already done). DOCX with rich text goes through table/paragraph extraction first -- AI only fills gaps. PDF-with-text skips OCR Vision.

## Key Insights
- XLSX/XLS files already routed to `bctc-extractor.ts` -- no AI needed (deterministic)
- DOCX already does table/paragraph extraction before AI (Steps 1-4 in DOCX extractor)
- PDF-with-text: `ocr.service.ts` already has `pdf-parse` text extraction with Vision fallback -- partially implemented
- Main gap: router (`extract-fields-from-report.ts`) doesn't handle XLSX routing
- Secondary gap: no "coverage threshold" to skip full-doc AI call when Steps 1-4 find enough fields

## Requirements

### Functional
- Add XLSX/XLS routing in `extract-fields-from-report.ts` -> delegate to bctc-extractor
- Add coverage threshold in DOCX orchestrator: if Steps 1-4 find >80% of fields, skip AI full-doc call (Step 5)
- Log skipped steps for observability (dev mode only)

### Non-Functional
- Reduce unnecessary API calls (cost saving)
- No accuracy regression

## Architecture

### Updated Router Logic
```
detect file type:
  .xlsx/.xls -> bctc-extractor (deterministic, no AI)
  .docx -> DOCX pipeline (table/paragraph first, AI fills gaps)
  .pdf -> check text extractability:
    - text present -> treat as text extraction (header:value + AI mapping)
    - scanned/image -> Vision OCR
  image/* -> Vision OCR
```

### Coverage Threshold
```
After Steps 1-4:
  foundKeys.size / scalarCatalog.length >= 0.8 -> skip Step 5 (AI full-doc)
  Log: "Skipping AI full-doc: {found}/{total} fields covered ({percent}%)"
```

## Related Code Files
- **Modify:** `src/core/use-cases/extract-fields-from-report.ts` (add XLSX routing)
- **Modify:** `src/core/use-cases/extraction/extract-fields-from-docx-report.ts` (add coverage threshold)
- **Read:** `src/lib/bctc-extractor.ts` (understand XLSX extraction interface)
- **Read:** `src/services/ocr.service.ts` (understand PDF text extraction)

## Implementation Steps

1. **Study bctc-extractor.ts interface** -- understand input/output types for XLSX
2. **Add XLSX detection** in `detectKind()`: `.xlsx`, `.xls` -> new kind `"xlsx"`
3. **Add XLSX branch** in `extractFieldsFromReport()`: delegate to bctc-extractor, map output to suggestion format
4. **Add coverage threshold** in DOCX orchestrator: calculate coverage ratio after Steps 1-4, skip Step 5 if >80%
5. **Add dev logging** for skipped steps
6. **Test with sample files**: DOCX (high coverage), DOCX (low coverage), XLSX, PDF
7. **Run build + tests**

## Todo List
- [ ] Add XLSX detection in router
- [ ] Add XLSX branch with bctc-extractor delegation
- [ ] Add coverage threshold in DOCX orchestrator
- [ ] Add dev-mode logging for skipped steps
- [ ] Test with various file types
- [ ] Run build + tests

## Success Criteria
- XLSX files processed without AI calls
- DOCX with >80% field coverage from Steps 1-4 skips AI full-doc call
- No accuracy regression for files that still need AI

## Risk Assessment
- **Risk:** 80% threshold too aggressive -- misses important fields
- **Mitigation:** Make threshold configurable via env var `AI_COVERAGE_THRESHOLD` (default 0.8). Can tune per deployment.
- **Risk:** bctc-extractor output format may not match suggestion format
- **Mitigation:** Create thin adapter function for format mapping

## Security Considerations
- No new security surface
