# Phase 1: DB Schema & Migration

**Priority:** HIGH | **Status:** completed

## Overview
Thêm email field vào Customer, thêm tracking fields cho email notification.

## Schema Changes

### 1. Customer — thêm email
```prisma
model Customer {
  // ... existing fields
  email    String?   // Email nhận thông báo hóa đơn
}
```

### 2. AppNotification — thêm email tracking
```prisma
model AppNotification {
  // ... existing fields
  emailSentAt      DateTime?  // Thời điểm gửi email
  emailError       String?    // Lỗi gửi email (nếu có)
}
```

## Migration Steps
1. Add `email` to Customer model in `schema.prisma`
2. Add `emailSentAt`, `emailError` to AppNotification model
3. Run `npx prisma migrate dev --name add_customer_email_notification_tracking`

## Files to Modify
- `prisma/schema.prisma`

## Success Criteria
- [x] Migration chạy thành công
- [x] Customer có field email nullable
- [x] AppNotification có emailSentAt, emailError
