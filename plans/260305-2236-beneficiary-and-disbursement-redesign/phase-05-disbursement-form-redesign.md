# Phase 5: Disbursement Form Redesign (P2)

**Priority:** High | **Status:** Pending | **Effort:** L

## Modal Structure

Replace `DisbursementFormModal` with multi-section form.
Location: `src/components/invoice-tracking/disbursement-form-modal.tsx` (rewrite)

### Section 1: Thông tin khoản giải ngân

| Field | Type | Computed | Notes |
|-------|------|----------|-------|
| Dư nợ hiện tại | number | readonly | Fetched from API (sum of existing disbursement debtAmounts) |
| Hạn mức còn lại | number | auto | = loan.loanAmount - currentOutstanding |
| Số tiền nhận nợ | number | input | **Validated**: must equal sum of beneficiary amounts |
| Số tiền nhận nợ bằng chữ | text | auto | = numberToVietnamese(debtAmount) |
| Tổng dư nợ | number | auto | = currentOutstanding + debtAmount |
| Tổng dư nợ bằng chữ | text | auto | = numberToVietnamese(totalOutstanding) |
| Mục đích | text | input | |
| Tài liệu chứng minh | text | input | |
| Ngày giải ngân | date | input | dd/mm/yyyy |
| Thời hạn cho vay | number | input | months |
| Hạn trả cuối cùng | date | auto | = disbursementDate + loanTerm months |
| Định kỳ trả gốc | text | input | |
| Định kỳ trả lãi | text | input | |

### Section 2: Đơn vị thụ hưởng (repeatable group)

Each beneficiary line:
| Field | Type | Notes |
|-------|------|-------|
| Khách hàng thụ hưởng | text + search | Search from saved beneficiaries → auto-fill account & bank |
| Số tài khoản | text | Auto-filled from beneficiary, editable |
| Ngân hàng thụ hưởng | text | Auto-filled from beneficiary, editable |
| Số tiền giải ngân | number | With thousand separators |
| Số tiền giải ngân bằng chữ | text | auto = numberToVietnamese(amount) |
| Trạng thái hóa đơn | select | "Nợ hóa đơn" / "Có hóa đơn" |
| Số tiền hóa đơn | number | If "Có hóa đơn": sum of invoices below |

**Buttons:** [+ Thêm đơn vị thụ hưởng] [🗑 Xóa]

### Section 3: Hóa đơn (per beneficiary, if invoiceStatus = "has_invoice")

Nested under each beneficiary with invoiceStatus = "has_invoice":
| Field | Type | Notes |
|-------|------|-------|
| Đơn vị phát hành | select | Limited to beneficiaries added in Section 2 |
| Số hóa đơn | text | |
| Ngày hóa đơn | date | dd/mm/yyyy |
| Số tiền hóa đơn | number | With thousand separators |

**Button:** [+ Thêm hóa đơn]

## UI Layout

```
┌─────────────────────────────────────────────────┐
│ Thêm giải ngân                             [X]  │
├─────────────────────────────────────────────────┤
│ ┌─ Thông tin khoản giải ngân ──────────────────┐│
│ │ Dư nợ hiện tại: [readonly]                   ││
│ │ Hạn mức còn lại: [auto]                      ││
│ │ Số tiền nhận nợ: [input]  Bằng chữ: [auto]  ││
│ │ Tổng dư nợ: [auto]       Bằng chữ: [auto]   ││
│ │ Mục đích: [input]                            ││
│ │ Tài liệu CM: [input]                        ││
│ │ Ngày GN: [date] Thời hạn: [num] Hạn trả:[a] ││
│ │ ĐK trả gốc: [input]  ĐK trả lãi: [input]   ││
│ └───────────────────────────────────────────────┘│
│                                                  │
│ ┌─ Đơn vị thụ hưởng #1 ───────────────────────┐│
│ │ KH thụ hưởng: [search+input] [🔍]           ││
│ │ Số TK: [auto] Ngân hàng: [auto]             ││
│ │ Số tiền GN: [input] Bằng chữ: [auto]        ││
│ │ TT hóa đơn: [Nợ hóa đơn ▼] Số tiền HD:[a]  ││
│ │  ┌─ Hóa đơn (if Có hóa đơn) ──────────────┐││
│ │  │ ĐV phát hành | Số HD | Ngày | Số tiền   │││
│ │  │ [select]     |[text] |[date]| [number]  │││
│ │  │ [+ Thêm hóa đơn]                        │││
│ │  └─────────────────────────────────────────┘││
│ └───────────────────────────────────────────────┘│
│ [+ Thêm đơn vị thụ hưởng]                       │
│                                                  │
│                             [Hủy] [Lưu]         │
└──────────────────────────────────────────────────┘
```

## Validation Rules
1. `debtAmount` > 0
2. `sum(beneficiary.amount)` === `debtAmount` (block save if mismatch)
3. Each beneficiary must have `name` and `amount > 0`
4. If `invoiceStatus = "has_invoice"`, must have at least 1 invoice
5. Invoice `amount > 0`, `invoiceNumber` required
6. `disbursementDate` required, valid date
7. `currentOutstanding + debtAmount` should not exceed `loanAmount` (warn, not block)

## State Management
All client-side in modal component state (no Zustand needed for modal-scoped data).
```typescript
type BeneficiaryLine = {
  tempId: string; // for React keys
  beneficiaryId: string | null;
  name: string;
  accountNumber: string;
  bankName: string;
  amount: string; // formatted with thousand seps
  invoiceStatus: "pending" | "has_invoice";
  invoices: InvoiceLine[];
};

type InvoiceLine = {
  tempId: string;
  supplierName: string;
  invoiceNumber: string;
  issueDate: string;
  amount: string;
};
```

## Related Files
- `src/components/invoice-tracking/disbursement-form-modal.tsx` (rewrite)
- `src/lib/number-to-vietnamese-text.ts` (new, Phase 6)
- `src/app/report/loans/[id]/page.tsx` (pass loan data to modal)

## Success Criteria
- [ ] All 3 sections render correctly
- [ ] Auto-calculations work in real-time
- [ ] Beneficiary search from saved list
- [ ] Validation blocks save on invalid data
- [ ] Submit creates disbursement + beneficiaries + invoices atomically
