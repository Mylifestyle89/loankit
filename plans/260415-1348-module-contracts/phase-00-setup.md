# Phase 0: Setup + Move Disbursement Draft

## Priority: HIGH | Effort: S | Status: pending

## Goal

Setup `docs/contracts/` directory + migrate existing disbursement draft to match current code.

## Steps

1. Tạo folder `docs/contracts/`
2. Tạo `docs/contracts/README.md` giải thích — xem section "README Content" bên dưới
3. Move `disbursement.contract.md` (ở repo root) → `docs/contracts/disbursement-and-beneficiary.contract.md`
4. **Adjust theo current code** — xem section "Adjustments needed" bên dưới
5. Update `CLAUDE.md` hoặc rule file: agent MUST read relevant contract trước khi sửa code liên quan module

## Adjustments needed cho draft disbursement hiện tại

| Draft section | Issue | Fix |
|---|---|---|
| §3 States | Mô tả state machine phức tạp (draft→pending_review→approved→disbursed→closed) | Thay bằng current: `active / completed / cancelled` |
| §5 Permissions | Nhắc `credit_officer/approver` (không có) | Đổi sang `admin/editor/viewer` (better-auth) |
| §7 API Response | `{success, data, error}` | Đổi sang `{ok, ...}` match current |
| §7 Endpoints | List endpoints hiện chưa có (submit, approve, return, disburse) | Chỉ list endpoints thực sự tồn tại |
| §2 Entities | DisbursementRequest | Rename → Disbursement (match Prisma model) |
| §2 Entities | CreditFile | Không có model này — đổi sang Loan |
| §4 Temporal rules | "expire after 30 days approved" | Bỏ nếu code chưa có logic này |

## Files to create

- `docs/contracts/README.md`
- `docs/contracts/disbursement-and-beneficiary.contract.md` (from draft, adjusted)

## Files to modify

- `CLAUDE.md` — add rule: agent must read contract trước khi code module

## README Content (to write in `docs/contracts/README.md`)

### 1. Purpose
Contracts là source of truth cho business rules, states, permissions của mỗi module. Agent và dev MUST đọc contract TRƯỚC khi sửa code module liên quan.

### 2. File convention
- Location: `docs/contracts/{module}.contract.md`
- Naming: kebab-case, match với module name (VD: `customer.contract.md`, `loan-and-plan.contract.md`)
- Frontmatter bắt buộc:
  ```md
  > **Status:** draft | stable | deprecated
  > **Owner:** {name}
  > **Last updated:** YYYY-MM-DD
  > **Related schemas:** `path/to/zod.ts`
  ```

### 3. Template sections (10)
Purpose → Entities & Relations → States → Business Rules → Permissions → Validation → API Contract → Edge Cases → Open Questions. Skip sections không áp dụng.

### 4. Workflow khi MUỐN SỬA RULE

**Golden rule:** Contract WINS. Nếu code conflict với contract → fix code. Muốn đổi behavior → sửa contract TRƯỚC.

3 bước bắt buộc:

1. **Sửa contract trước**
   - Update rule trong file `.contract.md`
   - Bump `Last updated: YYYY-MM-DD`
   - Nếu có CHANGELOG section → thêm entry

2. **Sửa code theo contract mới**
   - Agent đọc contract → implement theo rule mới
   - Update Zod schemas nếu rule ảnh hưởng validation
   - Update tests nếu có

3. **Commit chung 1 PR**
   - Message format: `refactor({module}): {what changed}` hoặc `feat({module}): ...`
   - Body ref contract section: `Contract updated: docs/contracts/{module}.contract.md §X.Y`
   - Không split contract change và code change thành 2 PR riêng — dễ lệch

### 5. 3 loại thay đổi thường gặp

| Loại | Cách xử lý |
|---|---|
| Fix typo / clarify wording | Sửa contract trực tiếp, bump Last updated. Không cần code change. |
| Change business rule | Sửa contract → sửa code → test. MUST chung 1 PR. |
| Add/remove field/entity/endpoint | Contract + Zod + DB migration + code. PR lớn. |

### 6. Agent instructions

Thêm vào `CLAUDE.md` hoặc rule file:
```
Khi được yêu cầu sửa code trong modules core (customer, loan, disbursement, invoice, collateral, auth, notification):
1. ĐỌC `docs/contracts/{module}.contract.md` TRƯỚC KHI SỬA CODE
2. Nếu yêu cầu conflict với contract → báo user, hỏi có muốn update contract không
3. Nếu user đồng ý update contract → sửa contract trước, code sau, commit chung PR
```

### 7. When to bump version (optional)

Phase đầu: chỉ cần `Last updated`. Khi contract stable (3-6 tháng), nếu thấy cần trace history:
- Thêm `version: X.Y` trong frontmatter
- Thêm `## Changelog` section ở cuối contract
- Breaking change = major bump (1.0 → 2.0); Clarification = minor (1.0 → 1.1)

## Success Criteria

- Folder `docs/contracts/` tồn tại
- README có đủ 7 sections trên
- `CLAUDE.md` có agent instructions (§6)
- Disbursement contract phản ánh đúng current code
