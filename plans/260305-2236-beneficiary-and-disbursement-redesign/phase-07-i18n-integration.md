# Phase 7: i18n + Integration

**Priority:** Medium | **Status:** Pending | **Effort:** S

## i18n Keys to Add

### Vietnamese
```
"beneficiaries.title": "Đơn vị thụ hưởng"
"beneficiaries.add": "Thêm đơn vị thụ hưởng"
"beneficiaries.import": "Import Excel"
"beneficiaries.name": "Đơn vị thụ hưởng"
"beneficiaries.accountNumber": "Số tài khoản"
"beneficiaries.bankName": "Ngân hàng thụ hưởng"
"beneficiaries.search": "Tìm đơn vị thụ hưởng..."
"beneficiaries.noData": "Chưa có đơn vị thụ hưởng"
"disbursements.currentOutstanding": "Dư nợ hiện tại"
"disbursements.remainingLimit": "Hạn mức còn lại"
"disbursements.debtAmount": "Số tiền nhận nợ"
"disbursements.debtAmountText": "Bằng chữ"
"disbursements.totalOutstanding": "Tổng dư nợ"
"disbursements.purpose": "Mục đích"
"disbursements.supportingDoc": "Tài liệu chứng minh"
"disbursements.loanTerm": "Thời hạn cho vay (tháng)"
"disbursements.repaymentEndDate": "Hạn trả cuối cùng"
"disbursements.principalSchedule": "Định kỳ trả gốc"
"disbursements.interestSchedule": "Định kỳ trả lãi"
"disbursements.beneficiaryAmount": "Số tiền giải ngân"
"disbursements.invoiceStatus": "Trạng thái hóa đơn"
"disbursements.invoiceStatus.pending": "Nợ hóa đơn"
"disbursements.invoiceStatus.has_invoice": "Có hóa đơn"
"disbursements.invoiceAmount": "Số tiền hóa đơn"
"disbursements.addBeneficiary": "Thêm đơn vị thụ hưởng"
"disbursements.addInvoice": "Thêm hóa đơn"
"disbursements.amountMismatch": "Tổng số tiền giải ngân phải bằng số tiền nhận nợ"
```

## Integration Points
- Update `src/app/report/disbursements/[id]/page.tsx` to show expanded disbursement info
- Update invoice list to link through DisbursementBeneficiary instead of Disbursement directly
- Ensure existing invoice tracking page still works after re-parenting

## Related Files
- `src/lib/i18n/translations.ts` (modify)
- `src/app/report/disbursements/[id]/page.tsx` (modify)
- `src/app/report/invoices/page.tsx` (modify)

## Success Criteria
- [ ] All UI text uses i18n keys
- [ ] Existing invoice pages work after schema migration
- [ ] Full flow test: create beneficiary → create disbursement with beneficiaries → add invoices
