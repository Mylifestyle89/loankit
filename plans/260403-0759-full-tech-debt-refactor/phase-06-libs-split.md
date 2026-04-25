---
phase: 6
title: "Libs Split"
status: complete
effort: 1h
---

# Phase 6: Libs Split

## File Ownership

- `src/lib/xlsx-table-injector.ts` (360 lines)
- Any other `src/lib/**/*.ts` files >200 lines (check at implementation time)

## Files to Split

### 1. xlsx-table-injector.ts (360 lines)

Exported: InjectionCell, InjectionRow, TableInjectionSpec types, BOLD_CODES, injectTables, financialRowsToSpec, subTableToSpec
Internal: escXml, fmtNum, cellToStr, buildCell, buildRow, buildTableXml, findParagraphs, paragraphText

**Split strategy:**
- `xlsx-table-injector-types.ts` — InjectionCell, InjectionRow, TableInjectionSpec types (~40 lines)
- `xlsx-table-injector-xml-builder.ts` — escXml, fmtNum, cellToStr, buildCell, buildRow, buildTableXml, BOLD_CODES, PAGE_WIDTH (~120 lines)
- `xlsx-table-injector-paragraph-ops.ts` — findParagraphs, paragraphText (~40 lines)
- `xlsx-table-injector.ts` — injectTables, financialRowsToSpec, subTableToSpec + re-exports (~160 lines)

### 2. Additional libs >200 lines (Red Team #13: explicitly listed, no open-ended scan)

Known files to check (from initial audit):
- `src/lib/report/fs-store.ts` (364 lines) — owned by Phase 3, skip here
- `src/lib/i18n/translations.ts` (1032 lines) — data file, excluded
- `src/lib/report/financial-field-catalog.ts` (471 lines) — config/data, excluded

If other lib files >200L are discovered during implementation, document and create a follow-up task rather than ad-hoc splitting.

## Import Update Checklist

- xlsx-table-injector: imported by khcn-report.service.ts, docx-engine modules
- Keep all existing exports from original file (barrel re-export)

## Compile Verification

```bash
npx tsc --noEmit
```

## Todo

- [x] Split xlsx-table-injector.ts (360 → 4 files)
- [x] Scan for additional >200-line lib files and split
- [x] Verify compile: `npx tsc --noEmit`
