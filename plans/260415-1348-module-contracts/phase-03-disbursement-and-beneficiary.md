# Phase 3: Disbursement + Beneficiary Contract

## Priority: HIGH | Effort: M | Status: pending

## Goal

Contract cho Disbursement + Beneficiary (đơn vị thụ hưởng). Gộp vì Beneficiary là child của Disbursement.

## Files to scout

- `prisma/schema.prisma` — Disbursement, Beneficiary, DisbursementBeneficiary models
- `src/services/disbursement.service.ts`
- `src/services/disbursement-beneficiary-helpers.ts`
- `src/services/beneficiary.service.ts`
- `src/app/api/loans/[id]/disbursements/**`
- `src/app/api/beneficiaries/**`

## Sections

### Purpose
Disbursement = lần giải ngân từ 1 khoản vay. Beneficiary = bên nhận tiền (supplier/contractor). 1 disbursement → nhiều beneficiary lines.

### Entities

```
Loan
  └── has many → Disbursement
                   ├── belongs to → Loan
                   └── has many → DisbursementBeneficiary
                                    ├── belongs to → Disbursement
                                    └── links to → Beneficiary (by name match)
```

### States
- Disbursement: `active | completed | cancelled`
- DisbursementBeneficiary.invoiceStatus: `pending | supplementing | complete | bang_ke`

### Business Rules

- Tổng `DisbursementBeneficiary.amount` ≤ `Disbursement.amount`
- `invoiceAmount` được cộng dồn khi upload invoice
- `invoiceStatus = pending` → chưa có hóa đơn nào
- `invoiceStatus = supplementing` → có hóa đơn nhưng chưa đủ amount
- `invoiceStatus = complete` → đủ amount
- `invoiceStatus = bang_ke` → dùng bảng kê thay invoice chi tiết
- Due date invoice supplement = `disbursementDate + 1 tháng` (addOneMonthClamped)

### Permissions
- `admin/editor` — create/update/delete
- `viewer` — read only

### Validation
Inline Zod trong API routes + service layer

### API
- GET `/api/loans/[id]/disbursements` (paginated)
- POST/PATCH/DELETE `/api/loans/[id]/disbursements/[disbId]`
- Beneficiary CRUD qua modal

### Edge Cases

- **Virtual invoices**: beneficiaries với `invoiceStatus in [pending, supplementing]` → sinh virtual invoice entries với `id = "virtual-{beneficiaryId}"` (xem invoice contract)
- Cron nhắc hạn phải scan cả real invoices + virtual (từ DisbursementBeneficiary)
- Bảng kê (bang_ke) bỏ qua logic nhắc invoice

### Open Questions

- Logic tính due date (1 tháng) nên configurable?
- Soft delete disbursement?

## Output

`docs/contracts/disbursement-and-beneficiary.contract.md` (~200 lines)
