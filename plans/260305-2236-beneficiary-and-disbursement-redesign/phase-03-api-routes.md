# Phase 3: API Route Updates for Disbursement

**Priority:** High | **Status:** Pending | **Effort:** S

## Updated Disbursement API

### `POST /api/loans/[id]/disbursements` — Create Disbursement (redesigned)

New payload structure:
```json
{
  "currentOutstanding": 500000000,
  "debtAmount": 200000000,
  "totalOutstanding": 700000000,
  "purpose": "Mua nguyên liệu",
  "supportingDoc": "Hợp đồng mua bán #123",
  "disbursementDate": "2026-03-05",
  "loanTerm": 12,
  "repaymentEndDate": "2027-03-05",
  "principalSchedule": "Hàng tháng",
  "interestSchedule": "Hàng tháng",
  "beneficiaries": [
    {
      "beneficiaryId": "clx...",
      "beneficiaryName": "Cty ABC",
      "accountNumber": "123456789",
      "bankName": "Vietcombank",
      "amount": 150000000,
      "invoiceStatus": "has_invoice",
      "invoices": [
        {
          "supplierName": "Cty ABC",
          "invoiceNumber": "HD001",
          "issueDate": "2026-03-01",
          "amount": 150000000
        }
      ]
    },
    {
      "beneficiaryId": null,
      "beneficiaryName": "Cty XYZ",
      "accountNumber": "987654321",
      "bankName": "BIDV",
      "amount": 50000000,
      "invoiceStatus": "pending"
    }
  ]
}
```

### Service Changes

Update `disbursement.service.ts`:
- `create()` accepts expanded input with beneficiary lines
- Uses `prisma.$transaction` to create disbursement + beneficiary lines + invoices atomically
- Validates: `sum(beneficiary amounts) === debtAmount`

Update `disbursement.service.ts` → `getById()`:
- Include `beneficiaryLines` with their `invoices`

## Related Files
- `src/services/disbursement.service.ts` (modify)
- `src/app/api/loans/[id]/disbursements/route.ts` (modify)

## Success Criteria
- [ ] Create disbursement with beneficiaries + invoices in single transaction
- [ ] Validation: beneficiary amounts sum to debtAmount
- [ ] getById returns full nested structure
