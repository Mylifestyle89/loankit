# Contract: Invoice Module (Hóa đơn)

> **Status:** draft
> **Owner:** Quân
> **Last updated:** 2026-04-16
> **Related schemas:** `src/services/invoice-queries.service.ts`, `src/services/invoice-crud.service.ts`, `src/lib/notifications/deadline-check-logic.ts`, `prisma/schema.prisma` (Invoice)
> **Cross-references:**
> - [disbursement-and-beneficiary.contract.md](disbursement-and-beneficiary.contract.md) — §3 (invoiceStatus enum), §4.2 (supplement deadline), §4.6 (virtual invoice reference)
> - [auth-and-notification.contract.md](auth-and-notification.contract.md) — Cron deadline check, email digest
> - [loan-and-plan.contract.md](loan-and-plan.contract.md) — §5.2 (`the_loc_viet` hide invoice flow)

---

## 1. Purpose

Quản lý hóa đơn chứng minh mục đích sử dụng vốn. **2 loại tồn tại song song:**
- **Real invoices** — bản ghi thật trong bảng `invoices`
- **Virtual invoices** — entries được SYNTHESIZE từ `DisbursementBeneficiary` chưa có đủ invoice (không stored)

Virtual invoices là quirk quan trọng nhất của module — agent phải hiểu để không query sai.

> **⚠️ Contract mô tả current code.** Target rules mark `⚠️ NOT YET IMPLEMENTED`.

---

## 2. Entities & Relations

```
Disbursement
  ├── has many → Invoice (real, stored in DB)
  │                ├── belongs to → Disbursement (cascade)
  │                └── belongs to → DisbursementBeneficiary (optional, SetNull)
  └── has many → DisbursementBeneficiary
                   └── when invoiceStatus ∈ [pending, supplementing]
                        → synthesized into Virtual Invoice entry
                          (id = "virtual-{beneficiaryId}", NOT in DB)
```

### Real Invoice Key Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `disbursementId` | String | ✅ | FK cascade |
| `disbursementBeneficiaryId` | String? | ❌ | Soft link, SetNull on delete |
| `invoiceNumber` | String | ✅ | Số hóa đơn |
| `supplierName` | String | ✅ | Tên nhà cung cấp |
| `amount` | Float | ✅ | Số tiền |
| `issueDate` | DateTime | ✅ | Ngày phát hành |
| `dueDate` | DateTime | ✅ | Ngày đến hạn |
| `customDeadline` | DateTime? | ❌ | Override `dueDate` (priority cao hơn) |
| `status` | String | ✅ | `pending / paid / overdue` |
| `notes` | String? | ❌ | Ghi chú |
| `qty`, `unitPrice` | Float? | ❌ | Cho bảng kê (bang_ke beneficiary lines) |

### Virtual Invoice Shape (computed, NOT in DB)

```ts
{
  id: `virtual-${beneficiaryId}`,  // format rule
  disbursementId: string,
  disbursementBeneficiaryId: string,
  invoiceNumber: "—",  // placeholder dash
  supplierName: beneficiary.beneficiaryName,
  amount: beneficiary.amount - beneficiary.invoiceAmount,  // remaining
  issueDate: disbursement.disbursementDate,
  dueDate: addOneMonthClamped(disbursement.disbursementDate),  // +1 tháng
  customDeadline: null,
  status: "needs_supplement",  // virtual-only status
  notes: null,
  disbursement: {...},  // included for UI
}
```

---

## 3. Status Enum

| Status | Storage | Nghĩa |
|---|---|---|
| `pending` | DB (real) | Mới tạo, chưa paid, chưa overdue |
| `paid` | DB (real) | Đã thanh toán |
| `overdue` | DB (real) | Quá hạn (auto-marked bởi cron) |
| `needs_supplement` | Virtual (computed) | Beneficiary line thiếu invoice, chưa có real invoice nào map tới |

**Transitions (real):**
- `pending` → `paid` (manual PATCH "mark paid")
- `pending` → `overdue` (auto bởi `markOverdue()` cron)
- `paid` → không chuyển nữa (terminal)
- `overdue` → `paid` (cho phép late payment)

**Virtual không transition** — được generate lại mỗi lần query dựa trên `DisbursementBeneficiary.invoiceStatus`.

---

## 4. Business Rules

### 4.1 Virtual Invoice Generation

- Sinh từ `prisma.disbursementBeneficiary.findMany` filter `invoiceStatus ∈ [pending, supplementing]`
- Function: `getVirtualInvoiceEntries(customerId?)` trong `invoice-queries.service.ts`
- Virtual `id` format **MUST** bắt đầu `virtual-` — agent/UI dùng prefix này để phân biệt
- **CẤM** query `prisma.invoice.findUnique({ id: "virtual-xxx" })` — sẽ 404. Dùng `prisma.disbursementBeneficiary.findUnique({ id: "xxx" })` nếu cần load raw

### 4.2 `listAll()` Behavior

Entry point thống nhất cho mọi invoice query ở `invoice-queries.service.ts`.

**Truth table — filter vs source:**

| `filter.status` | `filter.customerId` | Real | Virtual |
|---|---|:-:|:-:|
| (none) | (none) | ✅ | ✅ |
| (none) | set | ✅ | ✅ (filtered by customer) |
| `needs_supplement` | any | ❌ | ✅ |
| `pending` \| `paid` \| `overdue` | any | ✅ | ❌ |

**Takeaways cho agent:**
- Muốn tất cả hóa đơn của 1 customer (bao gồm cần bổ sung) → không set `status`, set `customerId`
- Muốn riêng virtual → `status = "needs_supplement"`
- Muốn riêng real theo status → set `status` cụ thể

### 4.3 Bảng Kê Exclusion

- `DisbursementBeneficiary.invoiceStatus = "bang_ke"` → tất cả invoices linked bị exclude khỏi queries
- Where clause: `EXCLUDE_BANG_KE_INVOICES` constant
- Lý do: bảng kê là phương thức khác (1 file tổng thay vì từng invoice) — không tham gia invoice flow

### 4.4 Due Date Priority

- `customDeadline` nếu set → ưu tiên override `dueDate`
- `dueDate` fallback khi `customDeadline = null`
- Applied trong `markOverdue()` và cron deadline check

### 4.5 `markOverdue()` Chỉ Real Invoices

- Update `status: pending → overdue` cho real invoices có `dueDate/customDeadline < now`
- Virtual invoices KHÔNG thuộc scope — không có DB row để update
- Virtual "overdue" được compute on-the-fly ở cron deadline check

### 4.6 Deadline Check Cron (Gộp Email)

Cron `/api/cron/invoice-deadlines` — xem chi tiết ở [auth-and-notification contract](auth-and-notification.contract.md).

Summary liên quan Invoice:
- Scan: (1) real due-soon 7 ngày, (2) real newly overdue, (3) virtual supplement deadlines
- Group items by `customer.email` → **1 digest email/customer** (không spam nhiều email)
- Dedup 24h: key format `{type}:{invoiceId}` cho real, `{type}:supplement-{beneficiaryId}` cho virtual

### 4.7 Soft Delete

Follows repo-wide convention — xem `docs/contracts/README.md` §8.1.

Lưu ý: virtual invoices không delete (không tồn tại physically). Muốn "xóa" virtual → update `DisbursementBeneficiary.invoiceStatus = has_invoice / bang_ke` để loại khỏi query.

### 4.8 Data Integrity Strategy

Giống pattern [loan contract §5.9](loan-and-plan.contract.md):
- **CẤM** raw `prisma.invoice.*` ở API routes — MUST qua `invoiceService.*`
- **CẤM** assume virtual invoices tồn tại ở DB
- Service MUST check: status transition hợp lệ, update `DisbursementBeneficiary.invoiceAmount` + `invoiceStatus` khi upload real invoice
- IMPLEMENTED. `createInvoice()` validates `bene.invoiceAmount + input.amount ≤ bene.amount` before insert, throws error if exceeded.

---

## 5. Permissions

| Action | admin | editor | viewer |
|---|:-:|:-:|:-:|
| List invoices | ✅ | ✅ | ✅ |
| View detail | ✅ | ✅ | ✅ |
| Create real invoice | ✅ | ✅ | ❌ |
| Mark paid (PATCH status) | ✅ | ✅ | ❌ |
| Delete | ✅ | ❌ | ❌ |
| Bulk mark paid | ✅ | ✅ | ❌ |
| Trigger cron endpoint | — | — | — | (requires CRON_SECRET) |

---

## 6. Validation

Zod schemas inline trong API routes (`src/app/api/invoices/**`). Không có central schema file.

**Target refactor:** tập trung vào `src/services/invoice-types.ts` giống loan-plan-schemas — deferred.

---

## 7. API Contract

### Response format (repo-wide, xem README §8.4)
```json
{ "ok": true, "invoices": [...] }
{ "ok": false, "error": "..." }
```

### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/invoices` | session | List paginated, filter `status`, `customerId` — return real + virtual mix |
| GET | `/api/invoices/summary` | session | Aggregated per customer (xem `getCustomerSummary()`) |
| POST | `/api/invoices` | editor+ | Create real invoice. Nếu link `disbursementBeneficiaryId` → update beneficiary `invoiceAmount` + `invoiceStatus` |
| GET | `/api/invoices/[id]` | session | Detail (real only — virtual id sẽ 404) |
| PATCH | `/api/invoices/[id]` | editor+ | Update (mark paid, edit fields) |
| DELETE | `/api/invoices/[id]` | admin | Soft delete (target, xem §4.7) |
| GET | `/api/cron/invoice-deadlines` | CRON_SECRET | Vercel Cron daily 0h UTC — scan + send digest |
| POST | `/api/invoices/from-virtual` ⚠️ NOT YET IMPLEMENTED | editor+ | Convert virtual → real. Body: `{ virtualId, invoiceNumber, amount, issueDate }`. Service extract `beneficiaryId` từ prefix, pre-populate `supplierName/disbursementId/disbursementBeneficiaryId/dueDate` từ beneficiary data, chỉ require user nhập 3 fields mới. |

### Bulk endpoints
- POST `/api/invoices/bulk-complete` — mark multiple paid cùng lúc (admin UI tool)

---

## 8. Edge Cases & Decisions

| Situation | Decision |
|---|---|
| Query virtual `id` trong Prisma trực tiếp | 404 — virtual không ở DB. Dùng `DisbursementBeneficiary.findUnique` nếu cần |
| Upload invoice khiến tổng > beneficiary.amount | Blocked at service — 400 error if total exceeds beneficiary allocation |
| Upload invoice cho `bang_ke` beneficiary | Block — `bang_ke` là alternative path, không dùng invoice |
| Real invoice `dueDate` giống `customDeadline` | `customDeadline` wins (§4.4) |
| Cron trigger 2 lần trong 24h | Idempotent nhờ dedup 24h (AppNotification metadata) |
| Customer không có email | Skip email, vẫn tạo in-app notification |
| Virtual invoice "paid" | Không có khái niệm — khi beneficiary có đủ invoice thực, `invoiceStatus → has_invoice`, virtual biến mất khỏi list tự động |
| `qty + unitPrice ≠ amount` | Không enforce — amount là source of truth, qty/unitPrice cho bảng kê display |

---

## 9. Open Questions

### Deferred refactors (trigger-based)

- **Persist virtual invoices vào DB?** — Deferred. Hiện compute mỗi lần query đủ fast. **Trigger:** khi query virtual thành bottleneck (> 100ms trên production) hoặc cần audit trail cho "virtual history".

### Undecided

- [ ] Supplement deadline (1 tháng) có nên configurable per loan_method không? (Hiện hardcode `addOneMonthClamped`)
- [ ] `paid` → `overdue` reverse có cho phép không? (Edge case: mark paid nhầm, phát hiện chưa thật sự paid)
- [ ] Invoice có nên có `paidDate` field để track khi nào paid (không chỉ `updatedAt`)?
- [ ] Bulk upload invoice từ DOCX/PDF qua OCR — scope expand?

---

> **How to use this contract:** Xem `docs/contracts/README.md` §4 cho workflow sửa rule.
