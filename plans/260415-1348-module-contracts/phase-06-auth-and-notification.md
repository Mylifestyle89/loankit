# Phase 6: Auth + Notification Contract

## Priority: MEDIUM | Effort: S | Status: pending

## Goal

Contract cho cross-cutting concerns: Auth (better-auth) + Notification/Email — ít business logic, chủ yếu là infra rules.

## Files to scout

### Auth
- `src/lib/auth-guard.ts` (requireSession, requireAdmin, requireEditorOrAdmin)
- `src/lib/auth/**`
- `src/proxy.ts` (route protection)
- `src/app/api/auth/**`

### Notification
- `src/services/notification.service.ts`
- `src/services/email.service.ts` (sendInvoiceDigest, sendInvoiceReminder, sendInvoiceOverdue)
- `src/lib/notifications/deadline-check-logic.ts`
- `src/lib/notifications/deadline-scheduler.ts`
- `src/lib/notifications/browser-notifications.ts`
- `src/app/api/cron/**`
- `src/app/api/notifications/**`

## Sections

### Purpose
**Auth**: route protection + role-based permissions (better-auth + 2FA TOTP).
**Notification**: in-app notifications + email digest (real + virtual invoices).

### Auth

#### Roles
- `admin` — full access, delete ops
- `editor` — CRUD, reveal PII
- `viewer` — read-only, masked PII

#### Route Protection
- `proxy.ts` (Next.js proxy, replaced middleware) — cookie `better-auth.session_token`
- Public routes: login, 2FA setup, cron endpoints (secret-gated)
- API guards: `requireSession`, `requireAdmin`, `requireEditorOrAdmin`
- 2FA: TOTP required nếu user có `twoFactorEnabled` (toggle per user)

#### PII Access
- Default: masked
- `?reveal=all` or `?reveal=field1,field2` → editor+ only

#### API
- POST `/api/auth/sign-in`
- POST `/api/auth/sign-out`
- 2FA endpoints

### Notification

#### Types
- `invoice_due_soon`, `invoice_overdue` (in-app + email digest)
- Extensible: add type + handler

#### In-app Notification
- Table `AppNotification` — type, title, message, metadata JSON, emailSentAt, emailError
- Dedup 24h: cùng `{type}:invoiceId` không notify lại

#### Email Digest
- **1 digest email/customer**, không lắt nhắt
- Content: 2 tables (overdue + due-soon), gom real + virtual invoices
- SMTP env: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_PORT`, `EMAIL_FROM`
- `secure: port === 465` (auto-detect SSL)

#### Cron
- `/api/cron/invoice-deadlines` daily 0h UTC (Vercel Cron via `vercel.json`)
- Secret: `CRON_SECRET` env (required)
- Supports: `Authorization: Bearer`, `x-cron-secret` header, `?secret=` query
- Internal scheduler (`deadline-scheduler.ts`) skips khi `CRON_SECRET` set (tránh duplicate)

### Business Rules

- Sessions persist via cookie (better-auth), rotate on 2FA
- Route guards MUST be at API level (không tin UI)
- Notifications dedup 24h theo invoiceId
- Cron idempotent (chạy 2 lần trong 24h = same result nhờ dedup)

### Edge Cases

- Offline máy trạm → 2FA disabled
- PII encrypt trước khi save, decrypt khi load (field-encryption lib)
- Virtual invoice notification key: `supplement-{beneficiaryId}` không đụng real invoice key

### Open Questions

- Push notification (browser) có thay email được không?
- Rate limit auth endpoints?

## Output

`docs/contracts/auth-and-notification.contract.md` (~220 lines)
