# Scout Report — Thông báo nợ chứng từ + Export/Send Feature

## Tóm tắt feature hiện có

Hệ thống "thông báo nợ chứng từ" (= invoice/document deadline tracking) đã có:
- **Cron deadline check** → tạo `AppNotification` + gửi **digest email** mỗi customer.
- **3 loại notification:** `invoice_due_soon`, `invoice_overdue`, `duplicate_invoice` + virtual "needs supplement" cho `DisbursementBeneficiary` chưa có hóa đơn.
- **UI:** notification bell, panel, history modal trên `/report/invoices`.
- **Email:** `nodemailer` SMTP, đã có template digest HTML (đầy đủ table overdue/due-soon).
- **Export pattern có sẵn:** `xlsx` package + `customer-xlsx-export.service.ts` (multi-sheet workbook → Buffer).

## Relevant Files

### Core notification logic
- [src/lib/notifications/deadline-check-logic.ts](src/lib/notifications/deadline-check-logic.ts) — Logic chính: scan invoice/beneficiary, dedup 24h, group theo customer, gửi digest. **Đây là nơi xác định "danh sách nợ chứng từ"** (real overdue + virtual supplement).
- [src/lib/notifications/deadline-scheduler.ts](src/lib/notifications/deadline-scheduler.ts) — Scheduler wrapper.
- [src/services/notification.service.ts](src/services/notification.service.ts) — CRUD `AppNotification`.
- [src/app/api/cron/invoice-deadlines/route.ts](src/app/api/cron/invoice-deadlines/route.ts) — Cron trigger endpoint.

### Email
- [src/services/email.service.ts](src/services/email.service.ts) — `sendInvoiceReminder`, `sendInvoiceOverdue`, `sendInvoiceDigest` (HTML table). Có sẵn `InvoiceDigestItem` type — tái sử dụng được.

### UI hiện tại
- [src/app/report/invoices/page.tsx](src/app/report/invoices/page.tsx) — Trang chính, có nút "Thông báo đến hạn" mở `NotificationHistoryModal`. Đây là **chỗ đặt nút Export/Send**.
- [src/components/invoice-tracking/notification-history-modal.tsx](src/components/invoice-tracking/notification-history-modal.tsx) — Modal lịch sử thông báo.
- [src/components/invoice-tracking/notification-panel.tsx](src/components/invoice-tracking/notification-panel.tsx) — Dropdown panel.
- [src/components/invoice-tracking/notification-bell.tsx](src/components/invoice-tracking/notification-bell.tsx) — Bell icon trigger.
- [src/components/invoice-tracking/use-notification-store.ts](src/components/invoice-tracking/use-notification-store.ts) — Zustand store.
- [src/components/invoice-tracking/customer-email-settings-modal.tsx](src/components/invoice-tracking/customer-email-settings-modal.tsx) — Setup email cho customer (đã có).

### API endpoints liên quan
- [src/app/api/notifications/route.ts](src/app/api/notifications/route.ts) — GET list.
- [src/app/api/notifications/[id]/read/route.ts](src/app/api/notifications/[id]/read/route.ts)
- [src/app/api/notifications/mark-all-read/route.ts](src/app/api/notifications/mark-all-read/route.ts)
- [src/app/api/invoices/route.ts](src/app/api/invoices/route.ts) — GET invoices (có filter status/customerId).
- [src/app/api/invoices/summary/route.ts](src/app/api/invoices/summary/route.ts) — Customer summary.

### Reference pattern (export)
- [src/services/report/customer-xlsx-export.service.ts](src/services/report/customer-xlsx-export.service.ts) — Pattern dùng `xlsx` lib để build multi-sheet Buffer.
- [src/app/api/report/export-data/route.ts](src/app/api/report/export-data/route.ts) — Pattern endpoint trả Buffer xlsx.
- [src/lib/save-file-with-picker.ts](src/lib/save-file-with-picker.ts) — Helper download client (đã biết bug Turbopack — chỉ gate cho production, theo memory).

### Schema
- `prisma/schema.prisma` — Xem model `Invoice`, `DisbursementBeneficiary`, `AppNotification`.

## Khuyến nghị implementation

### 1. Endpoint export danh sách nợ chứng từ
- **Path:** `src/app/api/invoices/overdue-export/route.ts` (hoặc `/api/notifications/export`)
- **Output:** XLSX (sheet "Quá hạn", "Sắp đến hạn", "Cần bổ sung") hoặc CSV.
- **Tái sử dụng:** Tách hàm `collectDigestItems()` từ `deadline-check-logic.ts` → trả về `Map<customer, InvoiceDigestItem[]>` mà KHÔNG tạo notification/gửi email. Endpoint export gọi hàm này.
- **Filter params:** `customerId`, `type=overdue|dueSoon|all`, `from/to`.

### 2. Endpoint send digest on-demand
- **Path:** `src/app/api/invoices/send-digest/route.ts` (POST).
- **Body:** `{ customerIds?: string[], includeOverdue, includeDueSoon, includeSupplement }`.
- **Logic:** Tái sử dụng `emailService.sendInvoiceDigest` với items từ `collectDigestItems()`. Có thể attach file XLSX (nodemailer support `attachments`).

### 3. UI buttons trong `/report/invoices`
Thêm cụm 2 nút cạnh nút "Thông báo đến hạn":
- **"Tải danh sách"** → call export endpoint, dùng `save-file-with-picker.ts`.
- **"Gửi thông báo ngay"** → confirm modal → call send-digest. Có thể chọn customer hoặc gửi tất cả.

### 4. Refactor cần thiết
- Tách `deadline-check-logic.ts` thành 2 hàm:
  - `collectDigestItems(opts)` — pure query, không side-effect.
  - `runDeadlineCheck()` — orchestrator: gọi `collectDigestItems` → tạo notification → gửi email.
- Sau refactor, cả cron + on-demand export/send dùng chung `collectDigestItems`.

## Unresolved Questions

1. **Định dạng file:** XLSX (giàu format) hay CSV (gọn, dễ Excel)? Hay cả 2?
2. **Phạm vi gửi thủ công:** Gửi cho 1 customer được chọn, hay broadcast như cron?
3. **Attach XLSX vào email** khi send-digest on-demand? (Cron hiện tại chỉ gửi HTML inline.)
4. **Audit log:** Có cần log lại lần nào "user X đã gửi thông báo cho customer Y" không?
5. **Permission:** Chỉ admin gửi/export, hay tất cả user có session?
6. **Filter UI:** User chọn invoice nào để export (checkbox), hay export theo filter hiện tại trên trang?
