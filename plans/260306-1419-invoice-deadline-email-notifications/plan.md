# Invoice Deadline Email Notifications

## Overview
Cải tiến hệ thống quản lý hóa đơn: auto-set deadline, daily email reminders, overdue tracking by customer.

**Branch:** Disbursement-Invoice-tracking-implement
**Complexity:** Moderate (DB + service + cron + UI)

## Requirements
1. Invoice `dueDate` = `disbursementDate + 1 tháng` (auto-set, user có thể override)
2. 7 ngày trước deadline → gửi email nhắc nhở hàng ngày cho user
3. Email tiếp tục cho đến khi invoice chuyển "paid"
4. Quá hạn → mark "overdue", email cảnh báo
5. UI quản lý hóa đơn theo khách hàng, hiển thị hóa đơn còn nợ

## Tech Stack
- **Email:** Nodemailer + SMTP
- **Scheduler:** Next.js API route + external cron (cron-job.org / GitHub Actions)
- **DB:** Prisma + SQLite (existing)

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | DB Schema & Migration | completed | [phase-01-db-schema-migration.md](phase-01-db-schema-migration.md) |
| 2 | Email Service (Nodemailer) | completed | [phase-02-email-service.md](phase-02-email-service.md) |
| 3 | Auto DueDate & Cron API | completed | [phase-03-auto-duedate-cron-api.md](phase-03-auto-duedate-cron-api.md) |
| 4 | UI: Invoice by Customer | completed | [phase-04-ui-invoice-by-customer.md](phase-04-ui-invoice-by-customer.md) |

## Architecture

```
Invoice Created (dueDate = disbursementDate + 1 month)
    ↓
External Cron → GET /api/cron/invoice-deadlines (daily)
    ↓
┌─────────────────────────────────┐
│ 1. Find invoices due in 7 days  │
│ 2. Send email via Nodemailer    │
│ 3. Create AppNotification       │
│ 4. Mark overdue if past due     │
└─────────────────────────────────┘
```

## Key Decisions
- Email optional (Customer.email nullable) — skip nếu không có email
- Dedup email: 1 email/invoice/ngày (check AppNotification 24h window, hiện có)
- Cron endpoint secured bằng API key header
- Auto dueDate set ở service layer (invoice.service.ts create + API route)
