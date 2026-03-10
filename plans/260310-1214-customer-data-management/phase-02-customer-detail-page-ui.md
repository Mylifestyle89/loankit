# Phase 2: Customer Detail Page UI Upgrade

## Priority: HIGH | Status: pending | Depends on: Phase 1

## Overview

Nâng cấp trang chi tiết khách hàng `/report/customers/[id]` để hiển thị toàn bộ data: basic info, loans, disbursements, invoices, beneficiaries, mapping instances.

## Key Insights

- Trang hiện tại chỉ có form edit basic fields
- Cần thêm các section/tabs cho related data
- Dùng collapsible sections hoặc tabs để tránh overwhelming
- Tận dụng existing components từ loans/disbursements pages

## Related Code Files

### Modify
- `src/app/report/customers/[id]/page.tsx` — Main page, thêm sections

### Create (components)
- `src/app/report/customers/[id]/components/customer-summary-cards.tsx` — Summary statistics
- `src/app/report/customers/[id]/components/customer-loans-section.tsx` — Loans table
- `src/app/report/customers/[id]/components/customer-invoices-section.tsx` — Invoices table
- `src/app/report/customers/[id]/components/customer-templates-section.tsx` — Mapping instances

### Reference
- `src/app/report/loans/page.tsx` — Loan list UI patterns
- `src/app/report/invoices/page.tsx` — Invoice list UI patterns

## Implementation Steps

### Step 1: Summary Cards

Hiển thị overview stats ở đầu trang:
- Tổng số khoản vay (loans)
- Tổng số giải ngân (disbursements)
- Tổng số hoá đơn (invoices)
- Tổng dư nợ
- Trạng thái: active loans, overdue invoices

### Step 2: Loans Section

Bảng danh sách loans với:
- contractNumber, loanAmount, status, startDate, endDate
- Expandable row → show disbursements
- Link to loan detail page

### Step 3: Invoices Section

Bảng tổng hợp invoices across all loans:
- invoiceNumber, supplierName, amount, dueDate, status
- Filter by status
- Link to disbursement detail

### Step 4: Templates/Mapping Instances Section

Danh sách mapping instances:
- name, status, master template name, publishedAt

### Step 5: Integrate into Customer Detail Page

- Fetch data với `?full=true`
- Render summary cards + sections
- Keep existing edit form at top

## Success Criteria

- [ ] Full profile data loads and displays correctly
- [ ] Summary cards show accurate stats
- [ ] Loans table with expandable disbursements
- [ ] Invoices table with status filter
- [ ] Templates section shows mapping instances
- [ ] Page responsive and performant
