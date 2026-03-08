# Phase 3: Auto DueDate & Cron API

**Priority:** HIGH | **Status:** completed | **Depends on:** Phase 2

## Overview
1. Auto-set `dueDate = disbursementDate + 1 tháng` khi tạo invoice
2. Tạo cron API endpoint cho external cron gọi hàng ngày
3. Tích hợp email vào deadline checker

## Implementation

### 1. Auto DueDate (invoice.service.ts)
Khi `create()` — nếu user không cung cấp `dueDate`:
- Lấy `disbursementDate` từ disbursement record
- Set `dueDate = disbursementDate + 1 tháng`
- User vẫn có thể override bằng `customDeadline`

### 2. Cron API Endpoint
```
GET /api/cron/invoice-deadlines
Header: x-cron-secret: {CRON_SECRET}
```

Logic:
1. Validate cron secret header
2. Find pending invoices where `effectiveDeadline - 7 days <= today`
3. For each: send email (nếu có email) + create AppNotification (dedup 24h)
4. Find overdue invoices (`effectiveDeadline < today AND status != paid`)
5. Mark overdue + send email cảnh báo
6. Return summary JSON

### 3. Update deadline-scheduler.ts
- Refactor `checkDeadlines()` → thêm email sending
- Giữ nguyên logic dedup 24h hiện có
- Thêm: sau `notificationService.create()` → `emailService.sendInvoiceReminder()`

### 4. Env variable
```
CRON_SECRET=random-secure-string
```

## Files to Create
- `src/app/api/cron/invoice-deadlines/route.ts`

## Files to Modify
- `src/services/invoice.service.ts` — auto dueDate trong create()
- `src/lib/notifications/deadline-scheduler.ts` — thêm email integration
- `src/app/api/disbursements/[id]/invoices/route.ts` — pass disbursementDate khi create

## Success Criteria
- [x] Invoice tạo từ giải ngân có dueDate tự động = disbursementDate + 1 tháng
- [x] `/api/cron/invoice-deadlines` trả summary JSON
- [x] Cron endpoint được bảo vệ bằng secret
- [x] Email gửi 7 ngày trước hạn, hàng ngày
- [x] Quá hạn → status "overdue" + email cảnh báo
