---
title: "KHCN Disbursement Module"
description: "Lightweight disbursement flow for individual customers — reuses existing Disbursement model, adds KHCN-specific templates and UI"
status: pending
priority: P1
effort: 6h
branch: KHCN-implement
tags: [khcn, disbursement, docx, feature]
created: 2026-03-16
---

# KHCN Disbursement Module

## Summary

KHCN Disbursement = simplified version of KHDN Disbursement. Key differences:
- **Templates**: 2268.07 BCĐXGN, UNC, HĐ cung ứng vật tư, BB giao nhận (NOT 2268.09/2268.10)
- **No invoice tracking** — no Invoice/BeneficiaryLine invoice management
- **Data source**: Loan + LoanPlan (not separate KHDN disbursement model)
- **GN.* placeholders** already registered in `khcn-placeholder-registry.ts`

## Architecture Decision

**Reuse existing `Disbursement` table** — no new DB model needed. KHCN disbursements are simpler (no invoices, no beneficiary-level invoice status), but the same table works. Just skip invoice-related fields.

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | Template config + data builder | pending | 1.5h |
| 2 | API endpoints (CRUD + generate) | pending | 1.5h |
| 3 | UI — Disbursement section in customer detail | pending | 2h |
| 4 | DOCX generation integration | pending | 1h |

## Key Files

### Existing (modify)
- `src/services/khcn-report.service.ts` — add disbursement data loading
- `src/services/khcn-report-data-builders.ts` — `buildDisbursementExtendedData` already exists
- `src/lib/loan-plan/khcn-template-registry.ts` — giai_ngan templates already registered
- `src/app/report/customers/[id]/page.tsx` — add disbursement tab/section

### New (create)
- `src/services/khcn-disbursement-template-config.ts` — KHCN-specific template registry
- `src/app/api/report/templates/khcn/disbursement/route.ts` — generate endpoint
- `src/app/report/customers/[id]/components/customer-disbursement-section.tsx` — UI

---

## Phase Details

→ [Phase 1: Template Config + Data Builder](./phase-01-template-config-data-builder.md)
→ [Phase 2: API Endpoints](./phase-02-api-endpoints.md)
→ [Phase 3: UI — Disbursement Section](./phase-03-ui-disbursement-section.md)
→ [Phase 4: DOCX Generation](./phase-04-docx-generation.md)
