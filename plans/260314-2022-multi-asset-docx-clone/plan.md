---
title: "Multi-Asset DOCX Clone Section Rendering"
description: "Clone template body N times for N collaterals, replacing prefixes with indexed keys"
status: complete
priority: P1
effort: 3h
branch: KHCN-implement
tags: [docx, collateral, template, khcn]
created: 2026-03-14
completed: 2026-03-14
---

# Multi-Asset DOCX Clone Section Rendering

## Problem
TSBĐ templates use flat prefixed placeholders (`[SĐ.Tên TSBĐ]`, `[ĐS.Nhãn hiệu]`). Currently only renders 1st collateral per type. Need to render ALL collaterals of same type in one DOCX.

## Solution
Before docxtemplater renders, clone the `word/document.xml` body content N times and rewrite prefixes to indexed form. Data builders emit indexed keys.

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [DOCX Section Cloner utility](./phase-01-docx-section-cloner.md) | complete | 1.5h |
| 2 | [Indexed data builders](./phase-02-indexed-data-builders.md) | complete | 1h |
| 3 | [Integration into generate flow](./phase-03-integration.md) | complete | 0.5h |

## Key Decisions
- Delimiter: `[` and `]` (docxtemplater config already uses these)
- Prefix detection: scan XML for known prefixes (`SĐ.`, `ĐS.`, `TK.`, `TSK.`)
- Clone scope: everything inside `<w:body>` except final `<w:sectPr>` (page settings)
- No page break separator between cloned sections
- 1 collateral = 1 clone = no behavior change (backward compat)
- Only asset template categories trigger cloning (detected via `ASSET_CATEGORY_KEYS`)

## Dependencies
- `docx-engine.ts` — hook into `generateDocxBuffer` before render
- `khcn-report-data-builders.ts` — add indexed output functions
- `khcn-report.service.ts` — pass collateral count + category to engine
