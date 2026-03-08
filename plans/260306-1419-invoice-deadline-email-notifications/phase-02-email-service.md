# Phase 2: Email Service (Nodemailer)

**Priority:** HIGH | **Status:** completed | **Depends on:** Phase 1

## Overview
Tạo email service dùng Nodemailer + SMTP. Gửi email nhắc nhở hóa đơn sắp đến hạn/quá hạn.

## Implementation

### 1. Install dependency
```bash
npm install nodemailer
npm install -D @types/nodemailer
```

### 2. Environment variables (.env)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=app-password
EMAIL_FROM=noreply@company.com
```

### 3. Create `src/services/email.service.ts`
```ts
// Nodemailer transporter (lazy init, singleton)
// sendInvoiceReminder(to, invoiceData) — gửi email nhắc nhở
// sendInvoiceOverdue(to, invoiceData) — gửi email quá hạn
// Email templates: inline HTML (KISS — không cần template engine)
```

### Key Logic
- Lazy init transporter (không crash nếu SMTP chưa config)
- Skip nếu customer không có email
- Log gửi thành công/thất bại vào AppNotification.emailSentAt/emailError
- Không retry (KISS) — cron chạy lại ngày mai sẽ gửi lại

## Files to Create
- `src/services/email.service.ts`

## Files to Modify
- `package.json` (add nodemailer)

## Success Criteria
- [x] Email service gửi được qua SMTP
- [x] Graceful fallback khi SMTP chưa config (log warning, không crash)
- [x] Email content có: tên KH, số HĐ, số tiền, ngày đến hạn
