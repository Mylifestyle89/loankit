# Module Contracts

Source of truth cho business rules, states, permissions của các core modules. Agent và dev **MUST** đọc contract TRƯỚC khi sửa code module liên quan.

---

## 1. Purpose

Contracts giúp:
- Document rõ business logic mà code không nói hết (state transitions, edge cases, permissions)
- Chuẩn hóa terminology giữa các modules
- Giảm drift giữa ý định và implementation
- Agent (Claude Code) hiểu ngay context khi sửa code

**Golden rule:** Contract WINS. Nếu code conflict với contract → fix code. Muốn đổi behavior → sửa contract TRƯỚC.

---

## 2. File Convention

- **Location:** `docs/contracts/{module}.contract.md`
- **Naming:** kebab-case, match module name
  - `customer.contract.md`
  - `loan-and-plan.contract.md`
  - `disbursement-and-beneficiary.contract.md`
  - `invoice.contract.md`
  - `collateral.contract.md`
  - `auth-and-notification.contract.md`
- **Frontmatter bắt buộc:**
  ```md
  > **Status:** draft | stable | deprecated
  > **Owner:** {name}
  > **Last updated:** YYYY-MM-DD
  > **Related schemas:** `path/to/zod.ts`
  > **Cross-references:** (nếu có liên kết sang contract khác)
  > - [other.contract.md](other.contract.md) — §X.Y (mô tả ngắn)
  ```

- **Cross-references rule:** Khi module X reference concept/rule từ module Y, MUST list link ở đầu contract X. Agent đọc contract X sẽ biết MUST đọc thêm Y khi chạm tới concept đó — tránh sửa 1 bên mà miss bên kia.

---

## 3. Template Sections (10 max, skip nếu không áp dụng)

1. **Purpose** — 1 paragraph mô tả module làm gì
2. **Entities & Relations** — ASCII tree + key fields table
3. **States & Transitions** — state machine nếu có
4. **Business Rules** — behavior hiện tại từ code
5. **Permissions** — match `admin/editor/viewer` (better-auth)
6. **Validation** — reference Zod schemas trong code
7. **API Contract** — current `{ok, ...}` format
8. **Edge Cases & Decisions** — quirks, workarounds
9. **Open Questions** — gaps cần refine sau
10. **Changelog** (optional, khi stable)

---

## 4. Workflow khi MUỐN SỬA RULE

3 bước bắt buộc:

### Bước 1: Sửa contract TRƯỚC
- Update rule trong file `.contract.md`
- Bump `Last updated: YYYY-MM-DD`
- Nếu có CHANGELOG section → thêm entry

### Bước 2: Sửa code theo contract mới
- Agent đọc contract → implement theo rule mới
- Update Zod schemas nếu rule ảnh hưởng validation
- Update tests nếu có

### Bước 3: Commit chung 1 PR
- Format: `refactor({module}): {what changed}` hoặc `feat({module}): ...`
- Body ref contract section: `Contract updated: docs/contracts/{module}.contract.md §X.Y`
- **Không split contract change và code change thành 2 PR riêng** — dễ lệch

---

## 5. 3 Loại Thay Đổi Thường Gặp

| Loại | Cách xử lý |
|---|---|
| Fix typo / clarify wording | Sửa contract trực tiếp, bump Last updated. Không cần code change. |
| Change business rule | Sửa contract → sửa code → test. MUST chung 1 PR. |
| Add/remove field/entity/endpoint | Contract + Zod + DB migration + code. PR lớn. |

---

## 6. Agent Instructions

Khi được yêu cầu sửa code trong modules core (customer, loan, disbursement, invoice, collateral, auth, notification):

1. **ĐỌC `docs/contracts/{module}.contract.md` TRƯỚC KHI SỬA CODE**
2. Nếu yêu cầu conflict với contract → báo user, hỏi có muốn update contract không
3. Nếu user đồng ý update contract → sửa contract trước, code sau, commit chung PR
4. Nếu contract mô tả behavior không còn đúng với code (contract rot) → báo user, hỏi update contract hay fix code

### Markers trong contract

- **Plain section** → mô tả CURRENT code behavior, agent tuân theo
- **`⚠️ NOT YET IMPLEMENTED`** → target behavior chưa có trong code. Agent KHÔNG được tự ý implement trừ khi user yêu cầu. Gom vào follow-up plan.

---

## 7. When to Bump Version (Optional)

Phase đầu: chỉ cần `Last updated`. Khi contract stable (3-6 tháng) và muốn trace history:

- Thêm `version: X.Y` trong frontmatter
- Thêm `## Changelog` section ở cuối contract
- Breaking change = major bump (1.0 → 2.0); Clarification = minor (1.0 → 1.1)

Example changelog entry:
```md
## Changelog
- 2026-04-20 v1.2: Cho phép loan_method = the_loc_viet skip disbursement flow
- 2026-04-15 v1.1: Clarify dedup key format cho virtual invoices
- 2026-04-15 v1.0: Initial contract
```

---

## 8. Cross-Cutting Conventions

Các convention áp dụng cho TẤT CẢ contracts, không repeat trong từng contract:

### 8.1 Soft Delete ⚠️ NOT YET IMPLEMENTED (repo-wide)

Tất cả domain entities (Customer, Loan, LoanPlan, Disbursement, DisbursementBeneficiary, Invoice, Collateral, CoBorrower, RelatedPerson) **MUST** dùng soft delete — không hard delete.

- Field chuẩn: `deletedAt: DateTime?` (nullable)
- Queries mặc định filter `where: { deletedAt: null }` (Prisma middleware hoặc explicit per query)
- API DELETE → set `deletedAt = now()`, KHÔNG `prisma.delete()`
- Cascade: dùng service-layer cascade (set `deletedAt` theo tree), vì Prisma `onDelete: Cascade` là hard delete
- Restore: chỉ admin, qua endpoint riêng hoặc DB manual
- Retention: nếu có regulatory requirement → cron job hard-delete records cũ hơn N năm (N theo compliance)

**Lý do:** nghiệp vụ ngân hàng cần audit trail; mất trace data → compliance violation.

### 8.2 Hash-for-Lookup Pattern (cho encrypted PII fields cần unique/search)

Khi field PII cần unique constraint HOẶC search performance:
- Thêm `{field}_hash: String` — HMAC-SHA256 deterministic
- Unique index nếu cần uniqueness
- Lookup MUST qua hash, không decrypt-compare toàn bảng
- Đã áp dụng: `customer_code_hash` (CIF)
- Candidates: `cccd_hash`, `phone_hash`, `email_hash` (khi có nhu cầu)

### 8.3 Marker Convention

Đã nêu ở §6:
- **Plain section** → current code, agent tuân theo
- **`⚠️ NOT YET IMPLEMENTED`** → target behavior, agent KHÔNG tự implement

**Rule:** Khi thêm marker `⚠️ NOT YET IMPLEMENTED` vào contract, MUST thêm entry tương ứng vào [TARGET-BACKLOG.md](TARGET-BACKLOG.md). Khi implement xong, xóa cả marker trong contract và entry trong backlog — cùng 1 PR.

### 8.4 API Response Format

Tất cả API routes dùng format nhất quán:
```json
{ "ok": true, "data_key": {...} }    // success; data_key = "customer" | "loans" | ...
{ "ok": false, "error": "message" }  // failure
```

Không dùng `{success, data, error}` hay nested structures khác. Phải dùng `ok` boolean ở root.

### 8.5 JSON Extension Fields — Sync Checklist

Khi thêm field mới vào JSON extension field (`customer.data_json`, `loan.financials_json`, `loanPlan.financials_json`, `collateral.properties_json`, etc.):

**MUST sync ở 4 places, theo thứ tự:**

1. **Zod schema** — file validation (`*-schemas.ts` hoặc inline API route)
   - Quên bước này → field bị silent strip khi POST/PATCH → DB save `{}` → reload mất data, không có error
2. **Type definition** — TypeScript interface/type cho UI editor (`*-editor-types.ts`)
   - Quên → TypeScript không biết, IDE không auto-complete
3. **Persistence whitelist** — service layer quy định fields nào được persist vào JSON column (`*.service.ts`)
   - Quên → Zod pass nhưng service không lưu
4. **UI input** — form controls cho user nhập (`*-editor-*.tsx`, `*-form.tsx`)
   - Quên → data không bao giờ được nhập, field vô nghĩa

**Optional (phase sau):** document default value nếu field cần fallback khi missing.

**Áp dụng cho module nào:**
- Customer `data_json` — xem `customer.contract.md` §4.3, §4.7
- LoanPlan `financials_json` — xem `loan-and-plan.contract.md` §5.3
- Collateral `properties_json` — xem `collateral.contract.md` (TBD)
- Bất kỳ module nào có JSON extension trong tương lai

---

## 9. List of Contracts (6 core modules)

| Contract | Scope |
|---|---|
| [customer](customer.contract.md) | Customer + CoBorrower + RelatedPerson + PII |
| [loan-and-plan](loan-and-plan.contract.md) | Loan + LoanPlan |
| [disbursement-and-beneficiary](disbursement-and-beneficiary.contract.md) | Disbursement + Beneficiary |
| [invoice](invoice.contract.md) | Real + Virtual invoices + Deadline check |
| [collateral](collateral.contract.md) | TSBĐ multi-type, multi-owner |
| [auth-and-notification](auth-and-notification.contract.md) | better-auth + Notification + Email |

## 10. Target Backlog

Tất cả rules `⚠️ NOT YET IMPLEMENTED` được gom ở [TARGET-BACKLOG.md](TARGET-BACKLOG.md), grouped theo priority (P0 Compliance → P1 Data Integrity → P2 DX → Trigger-based). Dùng backlog này khi plan sprint implement target rules.

Modules không có contract (infra/helper, ít business logic): `ocr`, `email`, `ai-mapping`, `document-extraction`, `auto-tagging`, `auto-process`, `security`, `report`, `khcn-report`, `disbursement-report`, `financial-analysis`, `customer-draft`.
