# Brainstorm: Phân biệt UI khoản vay thường vs thẻ tín dụng

## Problem

Khoản vay thẻ tín dụng Lộc Việt khác vay thông thường:
- Không có số HĐTD → dùng mã hồ sơ thẻ
- Không cần phương án vay vốn, giải ngân, đơn vị thụ hưởng, hóa đơn
- Form HĐTD chỉ gồm trường trong templates thẻ

## Approach: Conditional UI via `loan_method`

Flag: `const isCard = loan.loan_method === "the_loc_viet"`

### Trang tạo khoản vay (`/report/loans/new`)
- Bước 1: chọn loại (2 cards: "Khoản vay" vs "Thẻ tín dụng")
- Thẻ → auto set `loan_method = "the_loc_viet"`, skip chọn phương án

### Loan detail page — conditional sections

| Section | Vay thường | Thẻ Lộc Việt |
|---|---|---|
| Header label | "Số HĐTD" | "Mã hồ sơ thẻ" |
| LoanPlanCard | ✓ | ✗ |
| CollateralPicker | ✓ | ✓ |
| Disbursement table + toolbar | ✓ | ✗ |
| BeneficiaryModal | ✓ | ✗ |
| Invoice link | ✓ | ✗ |

### Edit modal fields

Thẻ Lộc Việt chỉ show: Hạn mức thẻ (loanAmount), Lãi suất, Ngày phát hành, Ngày hết hạn.
Ẩn: purpose, disbursementCount, lending_method, repayment_frequency.

### Files to modify

1. `src/app/report/loans/new/page.tsx` — thêm bước chọn loại
2. `src/app/report/loans/[id]/page.tsx` — conditional sections
3. `src/app/report/loans/[id]/components/loan-detail-header.tsx` — conditional labels
4. `src/components/invoice-tracking/loan-edit-modal.tsx` — conditional fields

### No schema changes needed
Reuse `Loan` model hoàn toàn. `contractNumber` = mã hồ sơ thẻ.
