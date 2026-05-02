# Contract: Auth + Notification Module (Xác thực & Thông báo)

> **Status:** draft
> **Owner:** Quân
> **Last updated:** 2026-04-15
> **Related schemas:** `src/lib/auth-guard.ts`, `src/lib/auth/**`, `src/proxy.ts`, `src/services/notification.service.ts`, `src/services/email.service.ts`, `src/lib/notifications/deadline-check-logic.ts`, `prisma/schema.prisma` (User, TwoFactor, Session, AppNotification)
> **Cross-references:**
> - [customer.contract.md](customer.contract.md) — §4.5 PII masking theo role
> - [invoice.contract.md](invoice.contract.md) — §4.6 Cron deadline check scans invoice + virtual supplement
> - [disbursement-and-beneficiary.contract.md](disbursement-and-beneficiary.contract.md) — Supplement deadline nguồn của virtual invoices

---

## 1. Purpose

**Cross-cutting concerns** cho toàn hệ thống:
- **Auth** — route protection + role-based permissions (better-auth + TOTP 2FA)
- **Notification** — in-app notifications + digest email cho hạn hóa đơn

Gộp vào 1 contract vì 2 modules đều là infrastructure layer, ít business logic thuần, chủ yếu là rules về access control + delivery.

> **⚠️ Contract mô tả current code.** Target rules mark `⚠️ NOT YET IMPLEMENTED`.

---

## 2. Entities & Relations

### Auth

```
User (better-auth)
  ├── has one → TwoFactor (optional, TOTP secret + backup codes)
  ├── has many → Session (cookie-based, multi-device)
  ├── has many → Account (provider credentials)
  └── role: "admin" | "editor" | "viewer"
```

### Notification

```
AppNotification
  ├── type: "invoice_due_soon" | "invoice_overdue" | "duplicate_invoice"
  ├── metadata JSON: { invoiceId?, disbursementId?, customerId?, virtual? }
  ├── emailSentAt: DateTime? (tracking)
  └── emailError: String? (tracking)
```

**Relation:** AppNotification không có FK tới User — notifications là global (admin/editor view), không per-user.

---

## 3. Roles & Permissions

### 3 Roles (User.role)

| Role | Capabilities |
|---|---|
| `admin` | Full access, delete ops, manage templates, view PII reveal |
| `editor` | CRUD (except delete), PII reveal, mark paid, cron endpoints internal |
| `viewer` | Read-only, PII **masked** always |

Default cho user mới: `viewer` (schema `@default("viewer")`).

### Auth Guards (`src/lib/auth-guard.ts`)

| Guard | Behavior |
|---|---|
| `requireSession()` | 401 nếu chưa login; trả session + user |
| `requireAdmin()` | 403 nếu `role !== "admin"` |
| `requireEditorOrAdmin()` | 403 nếu `role === "viewer"` |
| `requireOwnerOrAdmin(resourceOwnerId)` | Admin qua luôn, người khác MUST là owner |

**Rule:** API routes MUST gọi guard tương ứng ở đầu handler. Không tin UI — luôn enforce ở API.

---

## 4. Business Rules

### 4.1 Route Protection

- `src/proxy.ts` (Next.js proxy, **thay thế middleware.ts**) — intercept request, check cookie `better-auth.session_token`
- Public routes (không require auth): `/login`, `/2fa-setup`, `/api/cron/**` (secret-gated qua `Authorization: Bearer` hoặc `x-cron-secret` header)
- Authenticated routes: tất cả trang và API còn lại

**Note:** proxy.ts **không** kiểm tra role — chỉ check logged-in. Role check ở service/API layer qua auth-guard.

### 4.2 2FA (Two-Factor Authentication) — TOTP

- Toggle per user (`User.twoFactorEnabled` trong better-auth)
- Implementation: better-auth plugin `twoFactor` — TOTP (Google Authenticator compatible)
- `TwoFactor` table lưu encrypted secret + hashed backup codes
- Rotation: session rotate sau khi verify 2FA code

**Context ngân hàng Agribank:**
- Bật cho web production (public exposure)
- **Tắt** cho máy trạm nội bộ (offline network) — env toggle `ENABLE_2FA`

### 4.3 PII Access Control

Customer PII (cccd, phone, bank_account, ...) mặc định masked trong API response. Để reveal:
- Request param: `?reveal=all` hoặc `?reveal=cccd,phone`
- Requires `editor+` role (enforced qua `requireEditorOrAdmin()`)
- Viewer NEVER see raw PII, kể cả request `?reveal=`

Xem chi tiết: [customer.contract.md](customer.contract.md) §4.5.

### 4.4 Session Management

- Cookie-based session qua better-auth
- Cookie name: `better-auth.session_token`
- Rotate khi 2FA verified hoặc password change
- Multi-device OK (1 user → multiple Sessions)
- Expiry: default better-auth (thường 7 ngày, check config)

### 4.5 Notification Types

| Type | Trigger | Channel |
|---|---|---|
| `invoice_due_soon` | Cron phát hiện invoice có `dueDate ≤ 7 ngày` | In-app + email digest |
| `invoice_overdue` | Cron phát hiện invoice `dueDate < now` (vừa chuyển overdue) | In-app + email digest |
| `duplicate_invoice` | Service phát hiện duplicate khi import | In-app only |

### 4.6 Deadline Check Cron — 1 Digest Email/Customer

Logic ở `src/lib/notifications/deadline-check-logic.ts`, endpoint `/api/cron/invoice-deadlines`.

**Flow:**
1. Query 3 nguồn:
   - Real invoices due-soon (7 ngày tới)
   - Real invoices newly overdue (vừa chuyển status)
   - Virtual supplement invoices (beneficiary pending/supplementing quá hạn/sắp hạn)
2. Gom items theo `customer.email` → 1 digest email
3. Dedup 24h: key format `{type}:invoiceId` cho real, `{type}:supplement-{beneficiaryId}` cho virtual
4. Email có 2 tables rõ ràng: **Quá hạn** (màu đỏ) + **Sắp đến hạn** (màu vàng)

**Rule:** KHÔNG gửi 1 email per invoice — tránh spam, khó đọc. 1 customer = 1 email = tất cả HĐ của họ.

### 4.7 Cron Authentication

Endpoint `/api/cron/invoice-deadlines` hỗ trợ **2 cách** pass secret (header only — query param đã bị loại bỏ vì PII leak trong server logs):
| Method | Header | Use case |
|---|---|---|
| Bearer token | `Authorization: Bearer ${CRON_SECRET}` | Vercel Cron (default) |
| Custom header | `x-cron-secret: ${CRON_SECRET}` | External cron services hỗ trợ custom headers |

**Không chấp nhận** `?secret=` query param — tránh secret lộ trong access logs và referrer headers.

Comparison: `timingSafeEqual()` — chống timing attack. 401 nếu missing hoặc mismatch. 500 nếu `CRON_SECRET` env chưa set.

### 4.8 Internal Scheduler Skip Logic

`deadline-scheduler.ts` chạy in-process mỗi giờ. **Skip** khi `process.env.CRON_SECRET` set → avoid duplicate với Vercel Cron.

Logic này chỉ áp dụng cho self-hosted/local dev. Production Vercel rely hoàn toàn vào Vercel Cron.

### 4.9 SMTP Configuration

Email phụ thuộc env:
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` — bắt buộc
- `SMTP_PORT` — default 587 (STARTTLS), 465 auto-enable SSL
- `EMAIL_FROM` — optional, fallback `SMTP_USER`
- `secure: port === 465` — auto-detect

Transporter init lazy — không crash nếu SMTP chưa config, chỉ warn + email disabled.

### 4.10 Notification Dedup

- Trong 24h không notify cùng invoice 2 lần (cùng type)
- Query: `AppNotification.findMany({ createdAt: { gte: now - 24h }, type: ... })`
- Extract `invoiceId` từ metadata JSON → build dedup set
- Virtual invoices: key `supplement-{beneficiaryId}` để không đụng key của real invoices

### 4.11 Data Integrity / Agent Rules

- **CẤM** bypass auth guards ở API routes — luôn gọi `requireSession()` trở lên
- **CẤM** tin `X-User-Role` header từ client
- **CẤM** skip 2FA check trong production
- `CRON_SECRET` MUST là random string mạnh (≥ 32 bytes hex), unique per environment

---

## 5. Permissions Matrix (Cross-Module Summary)

Reference gốc cho tất cả contracts — ai làm được gì:

| Action type | admin | editor | viewer |
|---|:-:|:-:|:-:|
| View (masked PII) | ✅ | ✅ | ✅ |
| View (reveal PII) | ✅ | ✅ | ❌ |
| Create | ✅ | ✅ | ❌ |
| Update | ✅ | ✅ | ❌ |
| Delete | ✅ | ❌ | ❌ |
| Mark paid / Approve | ✅ | ✅ | ❌ |
| Manage templates | ✅ | ❌ | ❌ |
| Manage users / roles | ✅ | ❌ | ❌ |
| View notifications | ✅ | ✅ | ✅ |

---

## 6. Validation

### Auth
- better-auth handles login/signup schemas (không custom Zod)
- 2FA setup: TOTP secret generation + verify qua better-auth plugin

### Notification
Inline Zod trong `/api/notifications/**` routes.

---

## 7. API Contract

### Response format (repo-wide, xem README §8.4)
```json
{ "ok": true, ... }
{ "ok": false, "error": "..." }
```

### Auth Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/sign-in` | public | Email/password login |
| POST | `/api/auth/sign-out` | session | Logout |
| POST | `/api/auth/two-factor/enable` | session | Setup TOTP (generate secret + QR) |
| POST | `/api/auth/two-factor/verify` | session | Verify TOTP code |
| GET | `/api/auth/get-session` | public | Return current session (null nếu chưa login) |

### Notification Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications` | session | List recent, paginated |
| PATCH | `/api/notifications/[id]` | session | Mark read (`readAt = now()`) |
| POST | `/api/notifications/mark-all-read` | session | Mark all read |

### Cron Endpoint

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/cron/invoice-deadlines` | CRON_SECRET | Vercel Cron daily 0h UTC |

---

## 8. Edge Cases & Decisions

| Situation | Decision |
|---|---|
| User role = null (legacy) | Fallback `viewer` (safest) |
| 2FA disabled env trên production | Proxy allow, nhưng tất cả sessions không có 2FA claim sẽ pass — compliance risk. Production MUST set `ENABLE_2FA=true` |
| Customer không có email | Cron skip email, chỉ tạo in-app notification |
| SMTP không config | Service return `{ success: false, error: "SMTP not configured" }` — không crash |
| Cron gọi 2 lần trong 24h | Idempotent nhờ dedup 24h ở `notifiedSet` |
| `CRON_SECRET` chưa set | Endpoint return 500 "Server misconfigured" (không 401) — giúp admin phân biệt lỗi |
| Email bounce / SMTP timeout | Error lưu vào `AppNotification.emailError`, status sẽ retry ở cron run lần sau (sau 24h dedup) |
| Session hết hạn khi đang request | 401 từ `requireSession()`, UI redirect login |
| Admin xóa user chính mình | better-auth block (không được xóa self) |

---

## 9. Open Questions

### Deferred refactors (trigger-based)

- **Push notification (browser/mobile)** — deferred. **Trigger:** user complain email latency, hoặc cần real-time alert. Hiện email digest hàng ngày là đủ.
- **Rate limit auth endpoints** — deferred. **Trigger:** bị brute force attack, hoặc compliance audit yêu cầu.

### Undecided

- [ ] 2FA cho tất cả users hay optional? (Hiện optional per-user; Agribank muốn mandatory cho admin?)
- [ ] AppNotification có nên per-user (thêm `userId`) thay vì global không? (Hiện global = admin/editor đều thấy tất cả)
- [ ] Notification retention policy — cron cleanup notifications cũ hơn N ngày?
- [ ] Email template customization (logo, branding) — hiện hardcode HTML inline
- [ ] Audit log riêng cho login/logout/role change events?
- [ ] Forgot password flow — hiện chưa có, admin phải reset manual?

---

> **How to use this contract:** Xem `docs/contracts/README.md` §4 cho workflow sửa rule.
