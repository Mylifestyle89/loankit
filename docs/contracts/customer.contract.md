# Contract: Customer Module (Khách hàng)

> **Status:** draft
> **Owner:** Quân
> **Last updated:** 2026-04-15
> **Related schemas:** `src/services/customer-service-types.ts`, `src/lib/field-encryption.ts`, `prisma/schema.prisma` (Customer, CoBorrower, RelatedPerson)
> **Cross-references:**
> - [loan-and-plan.contract.md](loan-and-plan.contract.md) — Customer has many Loan/LoanPlan
> - [collateral.contract.md](collateral.contract.md) — Customer has many Collateral
> - [auth-and-notification.contract.md](auth-and-notification.contract.md) — PII masking by role, notification/email delivery

---

## 1. Purpose

Quản lý toàn bộ thông tin khách hàng — cả KHDN (doanh nghiệp) lẫn KHCN (cá nhân) — bao gồm thông tin định danh, người đồng vay, người có liên quan, và extended fields qua `data_json`. PII fields được mã hóa AES-256-GCM; lookup qua HMAC hash. Là foundation của toàn hệ thống (Loan, Collateral, LoanPlan đều FK → Customer).

> **⚠️ Contract mô tả current code.** Target rules mới sẽ được mark `⚠️ NOT YET IMPLEMENTED`.

---

## 2. Entities & Relations

```
Customer (KHDN hoặc KHCN)
  ├── has many → Loan
  ├── has many → LoanPlan
  ├── has many → Collateral (TSBĐ)
  ├── has many → CoBorrower (Người đồng vay — KHCN)
  ├── has many → RelatedPerson (Người liên quan — KHDN/KHCN)
  ├── has many → CreditAtAgribank (Dư nợ tại Agribank)
  ├── has many → CreditAtOther (Dư nợ tại TCTD khác)
  ├── has many → MappingInstance (report instances)
  └── belongs to → Branch (active_branch, optional)
```

### Customer Key Fields

| Field | Type | Required | PII | Notes |
|---|---|---|---|---|
| `customer_code` | String | ✅ | 🔒 AES | Mã CIF, encrypted. Lookup via `customer_code_hash` |
| `customer_code_hash` | String (HMAC) | ✅ | — | Unique index, derived từ plaintext CIF |
| `customer_name` | String | ✅ | — | Tên đầy đủ KH (plain text) |
| `customer_type` | String | ✅ | — | `corporate` \| `individual` |
| `address` | String? | ❌ | — | Địa chỉ |
| `email` | String? | ❌ | 🔒 AES | Email nhận notification |
| `phone` | String? | ❌ | 🔒 AES | Số điện thoại |
| `cccd` | String? | ❌ | 🔒 AES | CCCD/CMND (KHCN) |
| `cccd_old` | String? | ❌ | 🔒 AES | CMND cũ |
| `spouse_name` | String? | ❌ | 🔒 AES | Vợ/chồng |
| `spouse_cccd` | String? | ❌ | 🔒 AES | CCCD vợ/chồng |
| `bank_account` | String? | ❌ | 🔒 AES | Số tài khoản |
| `data_json` | String (JSON) | ✅ default `{}` | — | Extended fields (xem §4.3) |
| `documents_pa_json` | String (JSON) | ✅ default `[]` | — | Mảng documents cho PA |
| `active_branch_id` | String? | ❌ | — | FK Branch |

**KHDN-only fields:** `main_business`, `charter_capital`, `legal_representative_name`, `legal_representative_title`, `organization_type`

**KHCN-only fields:** `cccd*`, `date_of_birth`, `gender`, `marital_status`, `spouse_*`, `bank_account`, `bank_name`, `cic_product_*`

### CoBorrower Key Fields (KHCN only)

| Field | PII | Notes |
|---|---|---|
| `full_name` | 🔒 AES | Họ và tên |
| `id_number` | 🔒 AES | CMND/CCCD |
| `id_old` | 🔒 AES | CMND cũ |
| `phone` | 🔒 AES | |
| `current_address` | 🔒 AES | |
| `permanent_address` | 🔒 AES | |
| `birth_year`, `relationship`, `agribank_debt`, ... | — | Plain |

### RelatedPerson Key Fields

| Field | PII | Notes |
|---|---|---|
| `name` | — | Tên tổ chức/cá nhân (plain) |
| `id_number` | 🔒 AES | Số ĐKKD/CMND |
| `address` | 🔒 AES | |
| `relation_type`, `agribank_debt` | — | Plain |

---

## 3. States

Customer **không có state machine**. Chỉ có 2 axis phân loại:

| Axis | Values | Ý nghĩa |
|---|---|---|
| `customer_type` | `corporate` \| `individual` | KHDN vs KHCN — quyết định field visibility, template filtering |

Không có `active/deleted/archived` trạng thái (hard delete hiện tại — xem §9 open questions).

---

## 4. Business Rules

### 4.1 PII Encryption

- **Encrypt before save, decrypt after read** — bắt buộc qua `encryptCustomerPii` / `decryptCustomerPii` helpers
- Fields list: xem `src/lib/field-encryption.ts` (`PII_CUSTOMER_FIELDS`, `PII_COBORROWER_FIELDS`, `PII_RELATED_PERSON_FIELDS`)
- AES-256-GCM với random IV per encrypt → mỗi lần encrypt cùng plaintext ra ciphertext KHÁC NHAU
- `isEncrypted()` check trước khi encrypt lần 2 (tránh double-encrypt)
- `ENCRYPTION_KEY` env var bắt buộc (32 bytes hex)
- Lý do: Agribank security scan quét plaintext PII — compliance requirement

### 4.2 Customer Code Hash (Unique Lookup)

- `customer_code` ciphertext không unique được (IV random → khác nhau)
- Uniqueness enforced qua `customer_code_hash` (HMAC-SHA256 deterministic)
- **Mọi lookup theo CIF MUST qua `hashCustomerCode(plaintext) → customer_code_hash`**
- Update code CIF → phải update cả `customer_code` và `customer_code_hash`

### 4.3 `data_json` Extension Pattern

- JSON object lưu fields chưa promote thành DB column (tránh migration cho changes nhỏ)
- Current fields trong `data_json`:
  - `occupation` — Nghề nghiệp
  - `nationality` — Quốc tịch (default "Việt Nam")
  - `id_type` — Loại giấy tờ tùy thân (default "CCCD")
- **Khi thêm field:** follow repo-wide JSON extension checklist — xem `docs/contracts/README.md` §8.5
  - Ngoài ra map vào builder `src/services/khcn-report-data-builder.ts:93-101`
- **Không** đặt PII vào `data_json` — PII phải vào column với encrypt

### 4.4 Dual Customer Type

- `customer_type` quyết định field visibility ở UI form (`useGroupVisibility`)
- KHDN/KHCN dùng chung bảng `customers` — fields không áp dụng là `null`
- Validation Zod: hiện 1 schema chung với optional fields cho cả 2 types (chưa tách riêng)

### 4.5 PII Masking ở API Response

- Default: mask (VD: `cccd: "***-***-6233"`)
- `?reveal=all` hoặc `?reveal=cccd,phone` → return plain — requires `editor+` role
- Mask function: `maskCustomerResponse()` từ `field-encryption.ts`

### 4.6 Cascade Delete

- Xóa Customer → cascade xóa: Loan, LoanPlan, Collateral, CoBorrower, RelatedPerson, CreditAtAgribank, CreditAtOther, MappingInstance
- Branch SetNull

### 4.7 `data_json` Schema Validation ⚠️ NOT YET IMPLEMENTED

- Target: loose Zod schema với known keys + `.passthrough()` cho future fields
- Current: free-form JSON — typo key silent fail
- Known keys phase 1: `occupation`, `nationality`, `id_type`, `workplace`, `monthly_income`
- Validate ở service layer TRƯỚC khi save; reject unknown nested structures có risk
- Lý do: typo như `occupation` → `ocupation` sẽ không được persist vào builder, không fail visibly

### 4.8 CCCD Unique Check ⚠️ NOT YET IMPLEMENTED

- Target: thêm field `cccd_hash` (HMAC-SHA256 deterministic) với unique index — replicate pattern của `customer_code_hash`
- Service: `hashCccd(plaintext)` helper song song với `hashCustomerCode()`
- Mọi lookup/unique check qua `cccd_hash`, không decrypt-compare toàn bảng
- Không scale khi bảng `customers` lớn (> 10k rows) → MUST implement trước khi prod scale
- Nullable: KHDN không có CCCD, hash = null
- Migration: tương tự migration `20260408220000_add_customer_code_hash` + `20260408223000_add_customer_code_hash_unique`

### 4.9 Search Behavior

Customer search là hot path — phải dùng đúng strategy theo field:

| Field | Strategy | Note |
|---|---|---|
| `customer_name` | Plain `LIKE %query%` | Field không encrypted, dùng index `customer_name` nếu có |
| `customer_code` (CIF) | **MUST** `hashCustomerCode(query)` → match `customer_code_hash` | Exact match only (deterministic hash) |
| `cccd` | Khi `cccd_hash` tồn tại (§4.8) → hash rồi match; chưa có thì không search được | ⚠️ NOT YET: rely on promoted hash |
| `phone` | Hiện không thể search (encrypted, không có hash) | ⚠️ Promote `phone_hash` nếu cần search |
| `data_json` nested field | JSON path query (`data_json->>'occupation'`) — slow, không index | Chỉ cho admin UI, không expose search endpoint |

**Cấm decrypt toàn bảng rồi filter in-memory** — O(N) per request, không scale.

### 4.10 UI / Backend Sync Points

Logic customer chia giữa backend validation và frontend field visibility:
- Backend: Zod schema (§6) quyết định data shape
- Frontend: `useGroupVisibility("customer.individual_fields")` / `"customer.corporate_fields"` quyết định form field nào hiện
- 2 bên MUST khớp — khi thêm field mới phải update cả 2

> **Cross-reference:** Khi có UI contract (`docs/contracts/ui.contract.md`), link field visibility rules ở đây để agent không sửa 1 bên mà quên bên kia.

---

## 5. Permissions

| Action | admin | editor | viewer |
|---|:-:|:-:|:-:|
| List customers | ✅ | ✅ | ✅ (PII masked) |
| View detail | ✅ | ✅ | ✅ (PII masked) |
| View detail with `?reveal=` | ✅ | ✅ | ❌ |
| Create | ✅ | ✅ | ❌ |
| Update | ✅ | ✅ | ❌ |
| Delete | ✅ | ❌ | ❌ |
| CRUD CoBorrower / RelatedPerson | ✅ | ✅ | ❌ (read OK) |

---

## 6. Validation

Zod schemas: `src/services/customer-service-types.ts`
- `customerBaseSchema` — common fields
- `createCustomerSchema` — extends với required cho POST
- `updateCustomerSchema` — partial cho PATCH

CoBorrower / RelatedPerson: inline Zod trong respective API routes.

**Note:** 1 schema chung cho KHDN + KHCN → optional fields. Open question: tách 2 schemas với discriminated union?

---

## 7. API Contract

### Response format
```json
{ "ok": true, "customer": {...} }
{ "ok": true, "customers": [...], "total": N }
{ "ok": false, "error": "..." }
```

### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/customers` | session | List paginated, filters (customer_type, search) |
| POST | `/api/customers` | editor+ | Create (full body validated) |
| GET | `/api/customers/[id]` | session | Detail, PII masked |
| GET | `/api/customers/[id]?reveal=all` | editor+ | Detail with PII revealed |
| GET | `/api/customers/[id]?full=true` | session | With relations (co_borrowers, collaterals, loans, ...) |
| PATCH | `/api/customers/[id]` | editor+ | Update (partial) |
| DELETE | `/api/customers/[id]` | admin | Hard delete (cascade) |
| CRUD | `/api/customers/[id]/co-borrowers/**` | editor+ | CoBorrower nested |
| CRUD | `/api/customers/[id]/related-persons/**` | editor+ | RelatedPerson nested |
| CRUD | `/api/customers/[id]/collaterals/**` | editor+ | Collateral nested — xem collateral contract |

---

## 8. Edge Cases & Decisions

| Situation | Decision |
|---|---|
| Import cùng CIF nhiều lần | Update existing (upsert by `customer_code_hash`) |
| `data_json` parse fail | Fallback empty object `{}` — không crash |
| Customer chưa có email nhưng có invoice due | Cron skip email, chỉ tạo in-app notification |
| Dual dev.db (root + prisma/) | Service dùng `prisma/dev.db` (Prisma config), runtime có thể hit root dev.db — bug nguồn cũ, cần verify |
| PII encrypt khi seed | MUST chạy qua service (`customerService.create`) — không được raw INSERT |
| `customer_name` KHDN có ký tự đặc biệt | Plain text — không escape ở DB, escape ở render |
| KHCN với CCCD trùng customer khác | Không enforce unique ở DB (CCCD encrypted). Check manual khi cần. |

---

## 9. Open Questions

- [ ] Tách schema KHDN vs KHCN (discriminated union) thay vì 1 schema optional fields?
- [ ] Email unique? Hiện không unique — 1 người có nhiều customer records? (Nếu unique → cần `email_hash` giống CIF)
- [ ] Branch SetNull khi xóa Branch có hợp lý không? (Có thể làm customer mất tracking)
- [ ] `spouse_name`/`spouse_cccd` có cần promote thành CoBorrower entry không? (Hiện flat fields)
- [ ] Phone search có đủ business need để promote `phone_hash` không?

---

> **How to use this contract:** Xem `docs/contracts/README.md` §4 cho workflow sửa rule.
