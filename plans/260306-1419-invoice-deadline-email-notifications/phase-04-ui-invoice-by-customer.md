# Phase 4: UI - Invoice Management by Customer

**Priority:** MEDIUM | **Status:** completed | **Depends on:** Phase 3

## Overview
Cải tiến trang quản lý hóa đơn (`/report/invoices`) hiển thị theo khách hàng, highlight hóa đơn sắp hạn/quá hạn.

## Implementation

### 1. Cập nhật `/report/invoices/page.tsx`
- Group invoices by customer (hiện đã có filter `customerId`)
- Hiển thị summary per customer: tổng nợ, số HĐ pending, số HĐ overdue
- Badge màu: 🟢 paid, 🟡 sắp hạn (≤7 ngày), 🔴 overdue
- Cột "Ngày đến hạn" hiện rõ countdown (vd: "Còn 3 ngày")

### 2. Customer email field
- Thêm input email trong customer edit form (nếu có)
- Hoặc hiển thị email ở header customer summary

### 3. Notification panel enhancement
- Hiển thị email status (đã gửi/lỗi) nếu có
- Icon email bên cạnh notification

## Files to Modify
- `src/app/report/invoices/page.tsx` — group by customer, deadline badges
- `src/components/invoice-tracking/notification-panel.tsx` — email status

## Success Criteria
- [x] Invoices grouped & filterable by customer
- [x] Countdown/overdue badges hiển thị rõ ràng
- [x] Customer email editable từ UI
