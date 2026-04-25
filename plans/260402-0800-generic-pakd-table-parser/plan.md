---
status: completed
created: 2026-04-02
branch: main
completed: 2026-04-02
---

# Plan: Nâng cấp Type B Parser → Smart Section Detection

## Objective
Nâng cấp Type B XLSX parser để parse được generic PAKD hạn mức (thiết bị y tế, mùi nệm, v.v.) — không chỉ cost items mà cả revenue items + summary metadata.

## Context
- Brainstorm report: `plans/reports/brainstorm-260402-0800-generic-pakd-table-parser.md`
- Accuracy target: 80-90%, user chỉnh sửa trên app
- Dưới 10 mẫu, format tương tự nhau
- Cán bộ tín dụng tự tạo file → column order/names khác nhau

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | Section Detection + Revenue Extraction | completed | [phase-01](phase-01-section-detection.md) |
| 2 | Summary Meta Extraction | completed | [phase-02](phase-02-summary-meta-extraction.md) |
| 3 | Test với 3 file mẫu | completed | [phase-03](phase-03-test-sample-files.md) |

## Key Files
- `src/lib/import/xlsx-loan-plan-parser-type-b.ts` — TARGET (nâng cấp)
- `src/lib/import/xlsx-loan-plan-types.ts` — types (không đổi)
- `src/lib/import/xlsx-loan-plan-detector.ts` — detector (không đổi)
- `src/lib/import/xlsx-loan-plan-parser.ts` — orchestrator (không đổi)

## Architecture
```
parseTypeB(wb)
  → findHeaderRow()         [existing — already fuzzy matches column names]
  → splitSections(rows)     [NEW — detect cost/summary/revenue boundaries]
  → extractCostItems()      [existing — minor refactor to use section bounds]
  → extractRevenueItems()   [NEW — same logic as cost but for revenue section]
  → extractSummaryMeta()    [NEW — parse lãi vay, thuế, vốn from summary rows]
  → return XlsxParseResult  [existing — now with revenueItems + meta populated]
```

## Risks
- Column order varies → mitigated by existing fuzzy column mapping
- Section markers differ → regex patterns cover Vietnamese variants
- Revenue has different header row → re-run findHeaderRow() on revenue section
