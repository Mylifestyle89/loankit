# Phase 1: Template Placeholder Mapping

## Status: pending | Priority: High | Effort: M

## Context
3 DOCX templates trong `report_assets/Disbursement templates/` cần được cập nhật placeholder syntax cho phù hợp với docxtemplater engine (dùng `[` `]` delimiters) và map chính xác với dữ liệu từ DB.

## Placeholder Analysis

### Template 1: 2268.09 — Bao cao de xuat giai ngan (BCDX)

| Placeholder | Source | DB Field |
|-------------|--------|----------|
| `[Tên gọi in hoa]` | Config/Manual | Branch name (manual) |
| `[Mã CN]` | Config/Manual | Branch code |
| `[Năm]` | Literal | `$TODAY_YYYY` |
| `[Mã khách hàng]` | Customer | `customer.customer_code` |
| `[Tên khách hàng]` | Customer | `customer.customer_name` |
| `[HĐTD.Số HĐ tín dụng]` | Loan | `loan.contractNumber` |
| `[HĐTD.Ngày ký HĐTD]` | Loan | `loan.startDate` (formatted dd/mm/yyyy) |
| `[HĐTD.Hạn mức tín dụng]` | Loan | `loan.loanAmount` |
| `[GN.Hạn mức tín dụng]` | Loan | `loan.loanAmount` (alias) |
| `[HĐTD.Hạn mức bảo lãnh]` | Manual | Not in DB — leave manual or add field |
| `[HĐTD.Hạn mức được giải ngân theo tài sản]` | Loan | `loan.disbursementLimitByAsset` |
| `[GN.Dư nợ hiện tại]` | Disbursement | `disbursement.currentOutstanding` |
| `[GN.Tổng mức cấp tín dụng]` | Manual | Not in DB |
| `[GN.Số dư L/C]` | Manual | Not in DB |
| `[GN.Số dư bảo lãnh]` | Manual | Not in DB |
| `[GN.Hạn mức còn lại]` | Computed | `loan.loanAmount - disbursement.currentOutstanding` |
| `[HĐTD.Thời hạn duy trì HMTD]` | Computed | months between loan.startDate → loan.endDate |
| `[HĐTD.Mục đích vay]` | Loan | `loan.purpose` |

### Template 2: 2268.10 — Giay nhan no (Debt Receipt)

Tất cả placeholder Template 1 + thêm:

| Placeholder | Source | DB Field |
|-------------|--------|----------|
| `[Tên chi nhánh/PGD]` | Config/Manual | Branch name |
| `[Loại giấy tờ pháp lý]` | Manual | "Giấy CN ĐKKD" etc. |
| `[Số ĐKKD]` | Customer/Manual | Could be in `data_json` |
| `[Nơi cấp ĐKKD]` | Customer/Manual | `data_json` |
| `[Ngày cấp ĐKKD]` | Customer/Manual | `data_json` |
| `[Địa chỉ]` | Customer | `customer.address` |
| `[Người đại diện]` | Customer | `customer.legal_representative_name` |
| `[Chức vụ]` | Customer | `customer.legal_representative_title` |
| `[Danh xưng]` | Manual | "Ông"/"Bà" |
| `[CMND]`, `[Ngày cấp]`, `[Nơi cấp]` | Customer/Manual | `data_json` |
| `[GN.Số tiền nhận nợ]` | Disbursement | `disbursement.debtAmount` |
| `[GN.STNN bằng chữ]` | Computed | Number to Vietnamese words |
| `[GN.Tổng dư nợ]` | Disbursement | `disbursement.totalOutstanding` |
| `[GN.TDN bằng chữ]` | Computed | Number to Vietnamese words |
| `[GN.Mục đích]` | Disbursement | `disbursement.purpose` |
| `[GN.Tài liệu chứng minh]` | Disbursement | `disbursement.supportingDoc` |
| `[GN.Thời hạn cho vay]` | Disbursement | `disbursement.loanTerm` |
| `[GN.Hạn trả cuối cùng]` | Disbursement | `disbursement.repaymentEndDate` |
| `[GN.Định kỳ trả lãi]` | Disbursement | `disbursement.interestSchedule` |
| `[GN.Lãi suất vay]` | Loan | `loan.interestRate` |
| `[HĐTD.Lãi suất quá hạn]` | Manual | Not in DB |
| `[HĐTD.Lãi suất chậm trả]` | Manual | Not in DB |
| `[Ngày]`, `[Tháng]` | Literal | `$TODAY_DD`, `$TODAY_MM` |

**Loop sections:**
- `{#UNC}` ... `{/UNC}` — Beneficiary table (DisbursementBeneficiary[])
  - `[UNC.STT]` → index + 1
  - `[UNC.Khách hàng thụ hưởng]` → `beneficiaryName`
  - `[UNC.Số tài khoản]` → `accountNumber`
  - `[UNC.Nơi mở tài khoản]` → `bankName`
  - `[UNC.Số tiền]` → `amount`
- `{#HD}` ... `{/HD}` — Invoice table (Invoice[])
  - `[HD.STT]` → index + 1
  - `[HD.Tổ chức phát hành]` → `supplierName`
  - `[HD.Số hóa đơn]` → `invoiceNumber`
  - `[HD.Ngày hóa đơn]` → `issueDate`
  - `[HD.Số tiền hóa đơn]` → `amount`
- `[GN.Tổng Số tiền hóa đơn]` → sum of invoice amounts

### Template 3: 2899.01 — Danh muc ho so vay von

Simple template, mostly scalar:

| Placeholder | Source | DB Field |
|-------------|--------|----------|
| `[Tên khách hàng]` | Customer | `customer.customer_name` |
| `[Mã khách hàng]` | Customer | `customer.customer_code` |
| `[Địa chỉ]` | Customer | `customer.address` |
| `[Số điện thoại]` | Customer/Manual | `data_json` |
| `[HĐTD.Số HĐ tín dụng]` | Loan | `loan.contractNumber` |
| `[Số giải ngân]` | Loan | `loan.disbursementCount` |
| `[Ngày]`, `[Tháng]`, `[Năm]` | Literal | Today |
| `[Tên người dùng]` | Config/Manual | Current user name |

## Template Modification Requirements

### Critical: Loop syntax for tables
Current templates have flat `[UNC.xxx]` and `[HD.xxx]` placeholders in table rows.
Docxtemplater needs loop tags to repeat rows:

**Before (current):**
```
| [UNC.STT] | [UNC.Khách hàng thụ hưởng] | [UNC.Số tài khoản] | ... |
```

**After (required):**
```
| {#UNC} |
| [STT] | [beneficiaryName] | [accountNumber] | [bankName] | [amount] |
| {/UNC} |
```

BUT: docxtemplater with `[`/`]` delimiters means loop tags use `{#xxx}` ... `{/xxx}` which conflicts.
**Solution:** Use docxtemplater's native loop syntax with the same delimiters:
- Loop open: `[#UNC]`
- Loop close: `[/UNC]`
- Inside loop: `[STT]`, `[beneficiaryName]`, etc.

### Implementation Steps

1. **Programmatically modify templates** — Use node script to:
   - Parse docx XML
   - Wrap beneficiary/invoice table rows with `[#UNC]...[/UNC]` and `[#HD]...[/HD]`
   - Rename inner placeholders to simple names (no prefix)
   - Save modified templates

2. **Create `disbursement-report.service.ts`** — Data mapper:
   ```typescript
   async function buildReportData(disbursementId: string): Promise<Record<string, unknown>> {
     const d = await disbursementService.getById(disbursementId);
     return {
       // Scalar fields
       "Tên khách hàng": d.loan.customer.customer_name,
       "Mã khách hàng": d.loan.customer.customer_code ?? "",
       "HĐTD.Số HĐ tín dụng": d.loan.contractNumber,
       // ... all mapped fields

       // Loop data
       UNC: d.beneficiaryLines.map((b, i) => ({
         STT: i + 1,
         beneficiaryName: b.beneficiaryName,
         accountNumber: b.accountNumber ?? "",
         bankName: b.bankName ?? "",
         amount: b.amount,
       })),
       HD: allInvoices.map((inv, i) => ({
         STT: i + 1,
         supplierName: inv.supplierName,
         invoiceNumber: inv.invoiceNumber,
         issueDate: formatDate(inv.issueDate),
         amount: inv.amount,
       })),
     };
   }
   ```

3. **Number-to-words utility** — for `[GN.STNN bằng chữ]` and `[GN.TDN bằng chữ]`
   - Implement Vietnamese number-to-words converter
   - Or use existing `so-thanh-chu` pattern if available

## Files to Create/Modify

| Action | File |
|--------|------|
| CREATE | `src/services/disbursement-report.service.ts` |
| CREATE | `src/lib/number-to-vietnamese-words.ts` |
| MODIFY | `report_assets/Disbursement templates/*.docx` (add loop tags) |

## Success Criteria
- [ ] All 3 templates have correct placeholder syntax
- [ ] Loop sections work for variable-length beneficiary/invoice tables
- [ ] Data mapper covers all placeholders with DB or computed values
- [ ] Missing fields identified and documented (manual input needed)

## Risk Assessment
- **Template XML manipulation** — docx XML can be fragile; placeholders split across runs
  - Mitigation: Use docxtemplater's built-in XML fixing or manual run-merging
- **Vietnamese number words** — Edge cases (triệu, tỷ, nghìn)
  - Mitigation: Well-tested utility with unit tests
