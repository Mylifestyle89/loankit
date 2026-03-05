# Phase 02: Zod Validation Layer for Extracted Values

## Context Links
- [Phase 01](./phase-01-dry-cleanup-modularization.md) (prerequisite)
- [document-extraction.service.ts](../../src/services/document-extraction.service.ts)
- [Field catalog schema](../../src/lib/report/config-schema.ts)

## Overview
- **Priority:** HIGH (biggest accuracy win, zero API cost)
- **Status:** completed
- **Effort:** 3h
- **Description:** Add Zod-based validation that checks extracted field values against their declared types (number, date, percent, text, boolean). Replace hardcoded confidence scores with validation-adjusted scores.

## Key Insights
- Current confidence scores are static per extraction method (e.g., table=0.75, AI=0.82, heuristic=0.68)
- No actual validation of whether "1234567.89" is a valid number or "2024-13-45" is a valid date
- Field catalog already declares `type` per field: `number`, `percent`, `date`, `text`, `boolean`
- Some fields have `examples` arrays that could inform validation patterns
- Validation can catch AI hallucinations (e.g., returning a date for a number field)

## Requirements

### Functional
- Validate each extracted value against its field type from catalog
- Adjust confidence score based on validation result:
  - Valid value + passes type check: keep or boost confidence (+0.05)
  - Value exists but fails type check: reduce confidence (-0.15) + add warning
  - Empty/null value: exclude from suggestions
- Support field types: `number`, `percent`, `date`, `text`, `boolean`
- Support Vietnamese number format (dots as thousands, comma as decimal)
- Support common Vietnamese date formats (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)

### Non-Functional
- Validation must be synchronous (no API calls)
- New validation module under 200 lines
- Must not break existing extraction pipelines

## Architecture

### New File
```
src/core/use-cases/extraction/extraction-value-validator.ts
```

### Validation Schema per Field Type
```typescript
// number: strip VN formatting, check parseable
// percent: strip %, check 0-100 or valid decimal
// date: check common formats, reject impossible dates
// text: non-empty string, reasonable length
// boolean: truthy/falsy Vietnamese strings ("Co"/"Khong", "Dat"/"Khong dat")
```

### Integration Point
- Called in DOCX orchestrator after Step 5 (merge all sources) before `dedupeByField`
- Called in OCR extractor after `aiSuggestions` or `heuristicSuggestions` are built
- Each suggestion gets `validationStatus: "valid" | "warning" | "invalid"` added to type

## Related Code Files
- **Create:** `src/core/use-cases/extraction/extraction-value-validator.ts`
- **Modify:** `src/core/use-cases/extraction/extract-fields-from-docx-report.ts` (add validation call)
- **Modify:** `src/core/use-cases/extract-fields-from-ocr.ts` (add validation call)
- **Modify:** Types in `extraction-text-helpers.ts` (add `validationStatus` to suggestion types)

## Implementation Steps

1. **Define Zod schemas** for each field type in `extraction-value-validator.ts`:
   - `numberSchema`: strip VN formatting -> parse float -> finite check
   - `percentSchema`: strip % -> parse float -> range check (0-1000 generous)
   - `dateSchema`: regex for DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD -> Date parse -> valid date check
   - `textSchema`: non-empty, length 1-5000
   - `booleanSchema`: match known VN boolean strings
2. **Create `validateExtractedValue(value: string, fieldType: string): ValidationResult`** function
3. **Create `adjustConfidenceByValidation(suggestion, fieldType): suggestion`** function
4. **Integrate into DOCX orchestrator** -- validate all suggestions after merge, before dedupe
5. **Integrate into OCR extractor** -- validate suggestions before return
6. **Add `validationStatus` to suggestion types** (backward compatible: optional field)
7. **Write unit tests** for validator with edge cases (VN numbers, dates, edge formats)
8. **Run build + existing tests**

## Todo List
- [ ] Create extraction-value-validator.ts with Zod schemas
- [ ] Implement validateExtractedValue function
- [ ] Implement adjustConfidenceByValidation function
- [ ] Integrate into DOCX orchestrator
- [ ] Integrate into OCR extractor
- [ ] Update suggestion types with validationStatus
- [ ] Write unit tests for validator
- [ ] Run build + tests

## Success Criteria
- All extracted values pass type validation before being returned
- Invalid values get reduced confidence (not silently accepted)
- Valid values get slight confidence boost
- Validator catches: non-numeric strings in number fields, impossible dates, empty strings
- Zero regression in existing extraction behavior (valid values unchanged)

## Risk Assessment
- **Risk:** Over-strict validation rejects valid but unconventional values
- **Mitigation:** Start lenient, tighten later. Use "warning" not "reject" for edge cases.
- **Risk:** VN date formats are highly variable
- **Mitigation:** Support top 5 common formats, pass-through unknown formats with reduced confidence

## Security Considerations
- No new security surface -- validation is read-only on already-scrubbed data
