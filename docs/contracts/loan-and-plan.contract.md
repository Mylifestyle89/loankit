# Contract: Loan + LoanPlan Module (Khoản vay & Phương án)

> **Status:** draft
> **Owner:** Quân
> **Last updated:** 2026-04-15
> **Related schemas:** `src/lib/loan-plan/loan-plan-schemas.ts`, `src/lib/loan-plan/loan-plan-constants.ts`, `prisma/schema.prisma` (Loan, LoanPlan, LoanPlanTemplate)
> **Cross-references:**
> - [customer.contract.md](customer.contract.md) — §2 (Loan.customerId cascade)
> - [disbursement-and-beneficiary.contract.md](disbursement-and-beneficiary.contract.md) — §2 (Loan has many Disbursement)
> - [collateral.contract.md](collateral.contract.md) — §5.4 selectedCollateralIds references
> - [invoice.contract.md](invoice.contract.md) — §5.2 `the_loc_viet` impact on invoice flow

---

## 1. Purpose

**Loan** = hợp đồng tín dụng thực tế đã ký. **LoanPlan** = phương án vay vốn (proposal, có thể chưa ký HĐ). 2 entities gộp chung contract vì linked chặt qua `Loan.loanPlanId` và chia sẻ `loan_method` enum.

> **⚠️ Contract mix current + target state.** Sections có marker `⚠️ NOT YET IMPLEMENTED` là target.

---

## 2. Entities & Relations

```
Customer
  ├── has many → Loan
  │                ├── belongs to → Customer
  │                ├── belongs to → LoanPlan (optional, via loanPlanId)
  │                ├── has many → Disbursement
  │                ├── has many → Beneficiary
  │                └── selectedCollateralIds (JSON array of Collateral IDs)
  └── has many → LoanPlan
                   ├── belongs to → Customer
                   ├── belongs to → LoanPlanTemplate (optional)
                   ├── has many → Loan (reverse, 1 plan có thể link nhiều Loan?)
                   └── financials_json (JSON extended fields)
```

### Loan Key Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `customerId` | String | ✅ | FK Customer, cascade delete |
| `contractNumber` | String | ✅ | Số HĐTD — **không unique** (đã drop constraint) |
| `loanAmount` | Float | ✅ | VND, > 0. Với `the_loc_viet` = hạn mức thẻ |
| `interestRate` | Float? | ❌ | %/năm |
| `startDate`, `endDate` | DateTime | ✅ | Khoảng thời gian vay |
| `loan_method` | String | ✅ | enum, default `tung_lan` (xem §3) |
| `status` | String | ✅ | `active / completed / cancelled` |
| `purpose` | String? | ❌ | Mục đích vay (thẻ LV thì null) |
| `disbursementCount` | String? | ❌ | Số lần giải ngân dự kiến |
| `selectedCollateralIds` | String (JSON) | ✅ default `[]` | Array of Collateral IDs |
| `loanPlanId` | String? | ❌ | FK LoanPlan, SetNull on delete |
| `lending_method`, `tcmblm_reason`, `interest_method`, `principal_schedule`, `interest_schedule`, `policy_program` | String? | ❌ | Điều kiện cho vay (6 fields) |
| `total_capital_need`, `equity_amount`, `cash_equity`, `labor_equity`, `other_loan`, `other_asset_equity` | Float? | ❌ | Nguồn vốn & vốn đối ứng (6 fields) |
| `expected_revenue`, `expected_cost`, `expected_profit` | Float? | ❌ | Hiệu quả dự kiến |
| `customer_rating`, `debt_group`, `scoring_period` | String? | ❌ | Xếp hạng KH |
| `prior_contract_number`, `prior_contract_date`, `prior_outstanding` | —, String?, Float? | ❌ | Cho vay tái cơ cấu |

### LoanPlan Key Fields

| Field | Type | Notes |
|---|---|---|
| `customerId` | String | FK cascade |
| `templateId` | String? | FK LoanPlanTemplate, SetNull |
| `name` | String default `""` | Tên phương án (VD: "PA trồng 6 sào hoa") |
| `loan_method` | String default `tung_lan` | Cùng enum với Loan |
| `status` | String default `draft` | `draft / approved` |
| `cost_items_json` | String (JSON) | Chi phí: `[{name, unit, qty, unitPrice, amount}]` |
| `revenue_items_json` | String (JSON) | Doanh thu: `[{description, qty, unitPrice, amount}]` |
| `financials_json` | String (JSON) | Extended fields (xem §4.3) |

### LoanPlanTemplate Key Fields

Template gốc dùng để spawn LoanPlan mới (VD: "Trồng hoa Cát tường" template → clone ra plan cụ thể). Fields:
- `name`, `category` (nong_nghiep/kinh_doanh/chan_nuoi/an_uong/xay_dung/han_muc), `description`
- `cost_items_template_json`, `revenue_template_json`, `defaults_json`

---

## 3. `loan_method` Enum (6 values)

Reference: `LOAN_METHODS` trong `loan-plan-schemas.ts`

| Value | Label | Áp dụng cho | UI conditional |
|---|---|---|---|
| `tung_lan` | Từng lần ngắn hạn SXKD | Loan + LoanPlan | Full flow |
| `han_muc` | Hạn mức SXKD | Loan + LoanPlan | Full flow + review 36 tháng |
| `trung_dai` | Trung dài hạn SXKD | Loan + LoanPlan | Extended fields (depreciation, term_months, preferential_rate) |
| `tieu_dung` | Tiêu dùng | Loan + LoanPlan | 4 subtypes (xay_sua_nha/mua_dat/mua_xe/mua_sam), earner info |
| `cam_co` | Vay cầm cố | Loan (có templates riêng) | Use camco registry |
| `the_loc_viet` | Thẻ tín dụng Lộc Việt | Loan only (không có Plan) | **HIDE** disbursement/beneficiary/invoice/LoanPlan |

**Rule:** khi thêm method mới phải sync 4 nơi — `LOAN_METHODS` array, `METHOD_OPTIONS`, `METHOD_LABELS`, `METHOD_SHORT_LABELS` (xem `loan-plan-constants.ts`).

---

## 4. States & Transitions

### Loan.status

```
active (default) ──┬──→ completed
                   └──→ cancelled
```

Chuyển state qua PATCH API. Không có approval workflow tự động.

**Forbidden transitions:**
- ❌ `completed` → `active`/`cancelled` (terminal)
- ❌ `cancelled` → `active`/`completed` (terminal)

### LoanPlan.status

```
draft (default) ──→ approved
```

**Forbidden:**
- ❌ `approved` → `draft` (không được reopen, phải tạo plan mới nếu muốn sửa)

---

## 5. Business Rules

### 5.1 `contractNumber` Not Unique

- Migration đã drop unique constraint — lý do: reuse số HĐ cũ sau khi cancel, hoặc nhiều Loan pointer tới 1 HĐ gốc
- Không có guard DB — rely on business logic nếu cần unique

### 5.2 `loan_method = "the_loc_viet"` Conditional

UI hide: Phương án vay (LoanPlanCard), Giải ngân, Đơn vị thụ hưởng, Hóa đơn. Fields không cần: `purpose`, `disbursementCount`, `lending_method`.

Xem chi tiết ở [disbursement-and-beneficiary contract](disbursement-and-beneficiary.contract.md).

### 5.3 `financials_json` Sync 4 Places

Extended fields persist qua `financials_json`. Follows repo-wide JSON extension checklist — xem `docs/contracts/README.md` §8.5.

**Module-specific file paths:**
| Place | File |
|---|---|
| 1. Zod schema | `src/lib/loan-plan/loan-plan-schemas.ts` (`createPlanSchema`) |
| 2. Type definition | `src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-editor-types.ts` (`Financials` type) |
| 3. Persistence whitelist | `src/services/loan-plan.service.ts` (save logic) |
| 4. UI editor | `src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-editor-*.tsx` |

### 5.4 `selectedCollateralIds` Semantics

- JSON string array of Collateral IDs
- Default `"[]"` (empty) → dùng TẤT CẢ collaterals của customer khi xuất report
- UI: `LoanCollateralPicker` chọn subset
- Không validate IDs tồn tại ở DB (orphan IDs được filter silent trong builder)

### 5.5 Loan ↔ LoanPlan Linking

- `Loan.loanPlanId` nullable, `onDelete: SetNull` — xóa plan không xóa Loan
- 1 LoanPlan có thể link nhiều Loans (reverse relation)
- Linking = tham chiếu, không copy data — Loan không snapshot plan data (có thể stale nếu plan đổi)

### 5.6 LoanPlan.loan_method vs Loan.loan_method ⚠️ NOT YET IMPLEMENTED — HIGH PRIORITY

Duplicate field ở 2 entities. Khi link Loan↔Plan, 2 methods nên khớp. Hiện không enforce → có thể mismatch (VD: plan `tung_lan`, loan link là `han_muc`) → xuất report lệch, builder pick sai template, silent bug.

**Target rule:** Khi PATCH `loan.loanPlanId = X`:
1. Load `plan = LoanPlan.findUnique({ id: X })`
2. Reject nếu `plan.loan_method !== loan.loan_method`
3. Error message: `"LoanPlan method (${plan.loan_method}) mismatch với Loan method (${loan.loan_method})"`

**Priority:** HIGH. Đây là risk lớn nhất hiện tại — resolve trước các open questions khác.

### 5.7 Template Spawn

LoanPlanTemplate → LoanPlan: clone `cost_items_template_json` → `cost_items_json`, `defaults_json` → `financials_json`. Template đổi sau không affect plan đã spawn (snapshot pattern).

### 5.8 Soft Delete

Follows repo-wide convention — xem `docs/contracts/README.md` §8.1.

### 5.9 Data Integrity Strategy

Loan module có 3 design choices **cố tình relax DB constraints** để flexibility:
- `contractNumber` không unique (§5.1)
- `selectedCollateralIds` không validate IDs tồn tại (§5.4)
- `financials_json` fallback `{}` khi parse fail (§9)

**Consequence:** DB không có safety net. **Tất cả integrity enforcement dồn về service layer.**

**Rules bắt buộc cho agent:**
- ❌ **CẤM** raw `prisma.loan.create/update/delete` ở API routes — MUST đi qua `loanService.*`
- ❌ **CẤM** update `financials_json` trực tiếp — MUST qua `loanPlanService` với Zod validation
- ❌ **CẤM** seed/migration scripts bỏ qua service (trừ khi documented explicitly)
- ✅ Service layer MUST validate: method mismatch, amount > 0, sum(beneficiary) ≤ loan.loanAmount, financials_json shape
- ✅ Mọi validation failure throw explicit error, không silent fallback

**Why relaxed DB constraints:**
- `contractNumber` không unique: reuse số HĐ cũ sau cancel, multi-Loan cho 1 HĐ gốc
- `selectedCollateralIds` JSON: dễ thay đổi schema collateral mà không migrate Loan
- `financials_json` fallback: avoid crash khi load customer cũ có JSON malformed

Nếu thấy safety net cần thiết hơn flexibility ở 1 field cụ thể → propose migrate field thành column/unique constraint (ADR process).

---

## 6. Permissions

| Action | admin | editor | viewer |
|---|:-:|:-:|:-:|
| List/View Loan & Plan | ✅ | ✅ | ✅ |
| Create Loan | ✅ | ✅ | ❌ |
| Update Loan (incl status) | ✅ | ✅ | ❌ |
| Delete Loan | ✅ | ❌ | ❌ |
| Create/Update LoanPlan | ✅ | ✅ | ❌ |
| Approve LoanPlan (→ status: approved) | ✅ | ✅ | ❌ |
| Delete LoanPlan | ✅ | ❌ | ❌ |
| Manage LoanPlanTemplate | ✅ | ❌ | ❌ |

---

## 7. Validation

### Loan
Inline Zod trong `src/app/api/loans/**` — không có central schema file.

### LoanPlan
`src/lib/loan-plan/loan-plan-schemas.ts`:
- `createPlanSchema` — POST body
- `updatePlanSchema` — PATCH body (omit `customerId`)
- `costItemSchema`, `revenueItemSchema` — line items
- `loanMethodEnum`, `incomeSourceEnum`

**Note:** schema rất rộng (~50 optional fields) vì cover 6 loan methods. Discriminated union theo `loan_method` là target refactor.

---

## 8. API Contract

### Response format (repo-wide, xem README §8.4)
```json
{ "ok": true, "loan": {...} }
{ "ok": false, "error": "..." }
```

### Loan Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/loans` | session | List paginated, filters (status, customerId) |
| POST | `/api/loans` | editor+ | Create |
| GET | `/api/loans/[id]` | session | Detail |
| PATCH | `/api/loans/[id]` | editor+ | Update (status, contractNumber, loanPlanId, ...) |
| DELETE | `/api/loans/[id]` | admin | Delete |
| CRUD | `/api/loans/[id]/disbursements/**` | editor+/session | Nested — xem disbursement contract |

### LoanPlan Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/loan-plans?customerId=X` | session | List for customer |
| POST | `/api/loan-plans` | editor+ | Create |
| GET | `/api/loan-plans/[id]` | session | Detail |
| PATCH | `/api/loan-plans/[id]` | editor+ | Update + approve |
| DELETE | `/api/loan-plans/[id]` | admin | Delete |

---

## 9. Edge Cases & Decisions

| Situation | Decision |
|---|---|
| Loan + Plan `loan_method` mismatch | Hiện không enforce — MUST validate (§5.6, target) |
| `selectedCollateralIds` trống | Dùng TẤT CẢ collaterals của customer khi xuất report |
| `selectedCollateralIds` chứa ID không tồn tại | Silent filter trong builder, không throw |
| Template bị xóa khi Plan đã spawn | Plan giữ data (snapshot), `templateId` set null |
| Loan method `the_loc_viet` | Không dùng LoanPlan — tạo Loan độc lập với mã hồ sơ thẻ trong `contractNumber` |
| `financials_json` parse fail | Fallback `{}`, không crash — nhưng loss data |
| Contract rot: Zod mới thêm field nhưng UI không hiển thị | Silent — user không biết field bị skip. Đây là motivation cho discriminated union refactor |
| Duplicate `contractNumber` | Cho phép — DB không enforce; nghiệp vụ cần phân biệt bằng `contractNumber + customerId + startDate` |

---

## 10. Open Questions

### Deferred refactors (target, trigger-based)

- **Discriminated union cho Zod schema theo `loan_method`** — deferred. Hiện 6 methods × ~50 optional fields là manageable. **Trigger refactor khi:** (a) thêm loan method thứ 7+, hoặc (b) có bug thực do field được set sai method. Agent KHÔNG tự ý refactor.

### Undecided

- [ ] LoanPlan có cần state `rejected` ngoài `draft/approved` không?
- [ ] `loanPlanId` cho phép nhiều Loan link cùng 1 plan có đúng nghiệp vụ không? Hay enforce 1-1?
- [ ] `contractNumber` có nên unique theo tuple `(customerId, contractNumber)` không?
- [ ] `LoanPlanTemplate` permission: admin hay editor mới được sửa templates?
- [ ] `financials_json` schema validation (giống `data_json` customer — §4.7 customer contract)?

---

> **How to use this contract:** Xem `docs/contracts/README.md` §4 cho workflow sửa rule.
