---
title: "XLSX Loan Plan Parser"
description: "Upload XLSX loan plan files, auto-detect type A/B/C, parse cost items & meta, preview & save to DB"
status: complete
priority: P1
effort: 6h
branch: KHCN-implement
tags: [khcn, import, xlsx, loan-plan]
created: 2026-03-15
completed: 2026-03-15
---

# XLSX Loan Plan Parser

## Goal
Users upload XLSX loan plan files -> auto-detect structure type -> parse into CostItem[] + meta fields -> preview -> confirm -> save as LoanPlan.

## Architecture

```
[Upload XLSX] -> [Type Detector] -> [Parser A | Parser B | Error C]
                                          |
                                   [XlsxParseResult]
                                          |
                              [Preview Modal] -> [Confirm] -> [loan-plan.service.createPlanFromTemplate]
```

## Data Flow
- Input: XLSX File + customerId
- Output: `{ costItems: CostItem[], revenueItems: RevenueItem[], meta: { loanAmount, interestRate, turnoverCycles, ... }, detectedType: "A"|"B"|"C" }`
- Reuse existing `CostItem`, `RevenueItem`, `CreatePlanInput` types

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | XLSX parser core (type detection + parsers A/B) | complete | 2.5h |
| 2 | API endpoint POST /api/loan-plans/import | complete | 1h |
| 3 | Frontend upload + preview modal | complete | 2h |
| 4 | Testing & edge cases | complete | 0.5h |

## Key Decisions
- Type C files -> return error with suggestion, no parsing attempted
- Reuse `xlsx` package already in project
- Follow bk-importer pattern: pure functions, no side effects in parser
- Parser returns preview data; save is separate step via existing service
- Save reuses existing `POST /api/loan-plans` — no new save endpoint

## New Files (8)
| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/import/xlsx-loan-plan-types.ts` | ~40 | Parse result types |
| `src/lib/import/xlsx-loan-plan-detector.ts` | ~60 | Type A/B/C detection |
| `src/lib/import/xlsx-loan-plan-parser-type-a.ts` | ~120 | Horizontal key-value parser |
| `src/lib/import/xlsx-loan-plan-parser-type-b.ts` | ~120 | Vertical table parser |
| `src/lib/import/xlsx-loan-plan-parser.ts` | ~50 | Entry point orchestrator |
| `src/app/api/loan-plans/import/route.ts` | ~80 | Upload API endpoint |
| `src/lib/hooks/use-xlsx-loan-plan-import.ts` | ~60 | Upload hook |
| `src/components/loan-plan/xlsx-import-preview-modal.tsx` | ~150 | Preview + edit modal |

## Modified Files (1-2)
- Customer loan plan section — add import button (exact file TBD based on where list renders)
