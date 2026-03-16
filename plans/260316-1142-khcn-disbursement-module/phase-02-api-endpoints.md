# Phase 2: API Endpoints

## Priority: P1 | Status: pending | Effort: 1.5h

## Overview

CRUD for KHCN disbursements + DOCX generation endpoint. Reuse existing Disbursement model. Pattern follows KHDN disbursement API at `src/app/api/loans/[id]/disbursements/`.

## Key Insights

- Existing KHDN API: `POST /api/loans/[id]/disbursements` creates with beneficiaries + invoices
- KHCN version: simpler — no invoices, optional beneficiaries
- Generation endpoint: follows `src/app/api/report/templates/khcn/generate/route.ts` pattern
- Disbursement CRUD already works via existing endpoints — KHCN just needs a **generate** endpoint

## Implementation Steps

### 1. Create KHCN disbursement generate endpoint

`src/app/api/report/templates/khcn/disbursement/route.ts`

```ts
// POST /api/report/templates/khcn/disbursement
// Body: { customerId, loanId, templateKey, disbursementId?, overrides? }
// - If disbursementId provided: load that disbursement's data
// - If not: use latest disbursement from the loan
// Returns: DOCX buffer
```

Pattern: reuse `buildKhcnReportData()` from `khcn-report.service.ts` — it already loads latest disbursement. For specific disbursement selection, extend `loadFullCustomer` to accept `disbursementId`.

### 2. Extend loadFullCustomer for specific disbursement

In `khcn-report.service.ts`, modify query:
```ts
async function loadFullCustomer(customerId: string, loanId?: string, disbursementId?: string) {
  // ... existing code ...
  // If disbursementId, filter disbursements to that specific one
}
```

### 3. Reuse existing CRUD endpoints

**No new CRUD endpoints needed.** Existing:
- `GET /api/loans/[id]/disbursements` — list disbursements for loan
- `POST /api/loans/[id]/disbursements` — create (skip invoice/beneficiary for KHCN)
- `PATCH /api/disbursements/[id]` — update
- `DELETE /api/disbursements/[id]` — delete

KHCN UI will call these same endpoints with simpler payloads (no invoices).

## Related Code Files

- Create: `src/app/api/report/templates/khcn/disbursement/route.ts`
- Modify: `src/services/khcn-report.service.ts` (extend loadFullCustomer)

## Todo

- [ ] Create generate endpoint
- [ ] Extend loadFullCustomer for specific disbursement
- [ ] Test with existing KHCN customer data
- [ ] Compile check

## Success Criteria

- `POST /api/report/templates/khcn/disbursement` returns DOCX with correct GN.* data
- Existing CRUD endpoints work for KHCN (simpler payload)
