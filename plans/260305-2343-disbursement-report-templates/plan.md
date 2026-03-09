# Disbursement Report Templates — Plan

## Overview
Map loan/disbursement/beneficiary/invoice data to 3 DOCX templates, then build a modal UI to generate reports from the Loan module.

**Status:** Draft
**Priority:** High
**Phases:** 2

## Phase Summary

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | Template Placeholder Mapping | pending | M |
| 2 | Report Generation Modal UI | pending | L |

## Key Dependencies
- `docxEngine` (docxtemplater with `[` `]` delimiters) — already built
- Prisma models: Customer, Loan, Disbursement, DisbursementBeneficiary, Invoice
- Existing report export flow: `reportService.runReportExport()`

## Architecture Decision
- **Reuse `docxEngine.generateDocx()`** for template rendering — no new engine needed
- **New service:** `disbursement-report.service.ts` — maps DB data → flat placeholder dict
- **New API route:** `POST /api/loans/[id]/disbursements/[disbursementId]/report`
- **New modal component** in loan detail page — select template → preview → download
- Templates use `{#UNC}...{/UNC}` loop syntax for beneficiary table rows, `{#HD}...{/HD}` for invoice rows

---

See phase files for details:
- [Phase 1](phase-01-template-placeholder-mapping.md)
- [Phase 2](phase-02-report-generation-modal.md)
