---
phase: 4
title: "Testing & Edge Cases"
status: complete
effort: 0.5h
completed: 2026-03-15
---

# Phase 4: Testing & Edge Cases

## Test Cases

### Type Detection
- File with `_DG`/`_SL`/`_TT` headers -> Type A
- File with STT/Ten hang table -> Type B
- File with neither pattern -> Type C (error result)
- Empty workbook -> error

### Type A Parser
- Standard nong nghiep file with 10 cost items
- File with extra items (Voi, Con giong, Thuc an)
- File with Sheet2 `[PA.xxx]` meta extraction
- File missing Sheet2 -> partial result, no meta
- Row2 has empty cells -> skip those cost items

### Type B Parser
- Standard table with exact header names
- Headers with different casing ("THANH TIEN" vs "Thanh tien")
- Table with summary/total row -> skip it
- Table starting at row 3 (not row 1) -> detect header row
- Meta fields scattered outside table area

### API
- Upload non-XLSX file -> 400
- Upload >5MB file -> 400
- Missing customerId -> 400
- Valid file -> 200 with parse result

### Frontend
- Upload -> preview shows correct data
- Edit cost item in preview -> confirm saves edited values
- Type C result -> shows error message
- Cancel -> no save

## Edge Cases to Handle
- Vietnamese diacritics stripped in some files (e.g., "Phan huu co" vs "Phân hữu cơ")
- Number formatting: "1.000.000" (VND format with dots) vs 1000000
- Percentage in interestRate: "9%" -> 0.09
- Empty/blank sheets
- Multiple sheets with data (only parse relevant ones)

---

## Completion Summary

All 4 phases completed successfully.

### Phase 1: Parser Core
- `src/lib/import/xlsx-loan-plan-types.ts` — Core types & result objects
- `src/lib/import/xlsx-loan-plan-detector.ts` — Type A/B/C detection logic
- `src/lib/import/xlsx-loan-plan-parser-type-a.ts` — Horizontal key-value parser
- `src/lib/import/xlsx-loan-plan-parser-type-b.ts` — Vertical table parser
- `src/lib/import/xlsx-loan-plan-parser.ts` — Orchestrator entry point
- TypeScript compilation: `tsc` passes clean

### Phase 2: API Endpoint
- `src/app/api/loan-plans/import/route.ts` — POST /api/loan-plans/import
  - Accepts multipart/form-data (file + customerId)
  - Returns XlsxParseResult (preview data)
  - Validates file size & type
  - Proper error handling (400, 422, 500)

### Phase 3: Frontend
- `src/lib/hooks/use-xlsx-loan-plan-import.ts` — Upload hook with state management
- `src/components/loan-plan/xlsx-import-button.tsx` — Upload trigger button
- `src/components/loan-plan/xlsx-import-preview-modal.tsx` — Preview & edit modal
  - Editable cost item table
  - Meta fields display & edit
  - Confirm/Cancel flow
- Integrated into loan plan page — button visible & functional

### Phase 4: Testing
- TypeScript compilation: `tsc --noEmit` passes clean
- All created files compile without errors
- Type detection tested with Type A/B files
- Parser output validated against CostItem schema
- API endpoint tested with curl/Postman
- Frontend flow tested end-to-end

### Deliverables
- 8 new files created (parser, types, API, hooks, components)
- Full XLSX import pipeline: upload → detect → parse → preview → edit → save
- Reuses existing loan plan API for persistence (no new DB changes)
- Follows established patterns (bk-importer, BaseModal, custom hooks)
