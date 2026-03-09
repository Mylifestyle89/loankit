# Plan: Beneficiary Management & Disbursement Redesign

**Branch:** Disbursement-Invoice-tracking-implement
**Status:** Planning
**Priority:** High

## Overview

Two interconnected features:
1. **P1 - Beneficiary Modal**: CRUD + Excel import for beneficiaries (per loan)
2. **P2 - Disbursement Form Redesign**: Complex multi-section modal with auto-calculations, beneficiary selection, and inline invoices

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | DB Schema: Beneficiary + Disbursement expansion | Pending | M |
| 2 | Services: Beneficiary CRUD + Excel import | Pending | M |
| 3 | API Routes: Beneficiary + Disbursement update | Pending | S |
| 4 | UI: Beneficiary Modal (P1) | Pending | M |
| 5 | UI: Disbursement Form Redesign (P2) | Pending | L |
| 6 | Number-to-Vietnamese-text utility | Pending | S |
| 7 | i18n + Integration testing | Pending | S |

## Key Design Decisions

### Data Model

```
Loan 1──N Beneficiary (new)
Loan 1──N Disbursement (expanded fields)
Disbursement 1──N DisbursementBeneficiary (new junction)
DisbursementBeneficiary 1──N Invoice (re-parented)
```

**Why junction table?** A disbursement can pay multiple beneficiaries with different amounts. Each beneficiary line has its own invoice status tracking.

### Auto-calculations (client-side)
- `Hạn mức còn lại` = loanAmount - currentOutstanding
- `Số tiền nhận nợ bằng chữ` = numberToVietnamese(amount)
- `Tổng dư nợ` = currentOutstanding + debtAmount
- `Hạn trả cuối cùng` = disbursementDate + loanTerm (months)
- `Số tiền giải ngân bằng chữ` = numberToVietnamese(beneficiaryAmount)
- Validation: sum of beneficiary amounts must equal debtAmount

### Invoice status logic
- "Nợ hóa đơn" → tracked in invoice table until invoices cover disbursement amount
- "Có hóa đơn" → invoiceAmount = sum of invoices for that beneficiary line
