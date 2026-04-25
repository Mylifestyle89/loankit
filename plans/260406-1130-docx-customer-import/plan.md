---
status: pending
created: 2026-04-06
slug: docx-customer-import
---

# Import Thông Tin Khách Hàng từ DOCX Cũ

## Overview
Upload file hồ sơ DOCX cũ (BCĐX, HĐTD, PASDV, BB định giá) → AI extract thông tin → Review → Tạo Customer + Loan + Collateral.

Giải quyết: không phải lúc nào cũng có file BK, chỉ có docx bàn giao từ người khác.

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | API route: docx upload → AI extract | ⬜ | M |
| 2 | UI: upload + review + confirm | ⬜ | M |

## Dependencies
- Gemini API key phải có trên env
- Reuse: `documentExtractionService`, `extractParagraphs`, `GoogleGenerativeAI`

## Context
- Brainstorm: `plans/reports/brainstorm-260406-1127-docx-customer-import.md` (not created — inline brainstorm)
- Existing AI extraction: `src/core/use-cases/extract-fields-from-docx-report.ts`
- Document extraction service: `src/services/document-extraction.service.ts`
- BK import flow: `src/services/bk-to-customer-relations.ts`
