# Phase 1: DB Schema Changes

**Priority:** High | **Status:** Pending | **Effort:** M

## New Models

### Beneficiary (đơn vị thụ hưởng - per loan)
```prisma
model Beneficiary {
  id           String   @id @default(cuid())
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  loanId       String
  loan         Loan     @relation(fields: [loanId], references: [id], onDelete: Cascade)
  name         String   // Đơn vị thụ hưởng
  accountNumber String? // Số tài khoản
  bankName     String?  // Ngân hàng thụ hưởng

  disbursementLines DisbursementBeneficiary[]

  @@index([loanId])
  @@map("beneficiaries")
}
```

### DisbursementBeneficiary (junction: disbursement ↔ beneficiary line)
```prisma
model DisbursementBeneficiary {
  id              String       @id @default(cuid())
  createdAt       DateTime     @default(now())
  disbursementId  String
  disbursement    Disbursement @relation(fields: [disbursementId], references: [id], onDelete: Cascade)
  beneficiaryId   String?
  beneficiary     Beneficiary? @relation(fields: [beneficiaryId], references: [id], onDelete: SetNull)
  beneficiaryName String       // snapshot: Khách hàng thụ hưởng
  accountNumber   String?      // snapshot: Số tài khoản
  bankName        String?      // snapshot: Ngân hàng
  amount          Float        // Số tiền giải ngân cho đơn vị này
  invoiceStatus   String       @default("pending") // pending | has_invoice
  invoiceAmount   Float        @default(0) // tổng hóa đơn đã nộp
  invoices        Invoice[]

  @@index([disbursementId])
  @@index([beneficiaryId])
  @@map("disbursement_beneficiaries")
}
```

### Expanded Disbursement fields
Add to existing `Disbursement` model:
```prisma
  // New fields
  currentOutstanding   Float?   // Dư nợ hiện tại (snapshot at creation)
  debtAmount           Float?   // Số tiền nhận nợ
  totalOutstanding     Float?   // Tổng dư nợ (snapshot)
  purpose              String?  // Mục đích
  supportingDoc        String?  // Tài liệu chứng minh
  loanTerm             Int?     // Thời hạn cho vay (months)
  repaymentEndDate     DateTime? // Hạn trả cuối cùng
  principalSchedule    String?  // Định kỳ trả gốc
  interestSchedule     String?  // Định kỳ trả lãi
  beneficiaryLines     DisbursementBeneficiary[]
```

### Re-parent Invoice
Change `Invoice.disbursementId` → `Invoice.disbursementBeneficiaryId`:
```prisma
model Invoice {
  // Change from:
  //   disbursementId String
  //   disbursement   Disbursement
  // To:
  disbursementBeneficiaryId String
  disbursementBeneficiary   DisbursementBeneficiary @relation(...)
  // ...rest stays same
}
```

## Migration Strategy
1. Add new models (Beneficiary, DisbursementBeneficiary)
2. Add new columns to Disbursement
3. Migrate Invoice: add `disbursementBeneficiaryId`, keep old `disbursementId` temporarily
4. Data migration script: create DisbursementBeneficiary rows for existing disbursements, re-link invoices
5. Drop old `disbursementId` from Invoice

## Related Files
- `prisma/schema.prisma`
- Migration SQL files

## Success Criteria
- [ ] `npx prisma migrate dev` runs clean
- [ ] `npx prisma generate` succeeds
- [ ] Existing data preserved via migration script
