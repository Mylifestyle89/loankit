---
status: completed
completed_at: 2026-04-15
---

# Plan: Module Contracts cho Core Domain

## Overview

Viết 6 contracts mô tả CURRENT code cho các core domain modules, lưu tại `docs/contracts/`. Mục đích: agent/dev đọc contract TRƯỚC khi sửa code; standardize business rules, states, permissions.

## Brainstorm

[brainstorm-260415-1348-module-contracts-strategy.md](../reports/brainstorm-260415-1348-module-contracts-strategy.md)

## Phases

| # | Phase | Effort | Status |
|---|-------|--------|--------|
| 0 | [Setup + move disbursement draft](phase-00-setup.md) | S | ✅ done |
| 1 | [Customer contract](phase-01-customer.md) | L | ✅ done |
| 2 | [Loan + Plan contract](phase-02-loan-and-plan.md) | M | ✅ done |
| 3 | [Disbursement + Beneficiary contract](phase-03-disbursement-and-beneficiary.md) | M | ✅ done (merged phase 0) |
| 4 | [Invoice contract](phase-04-invoice.md) | M | ✅ done |
| 5 | [Collateral contract](phase-05-collateral.md) | M | ✅ done |
| 6 | [Auth + Notification contract](phase-06-auth-and-notification.md) | S | ✅ done |

## Contract Template (all phases use this)

Each contract file: `docs/contracts/{module}.contract.md`, following draft disbursement structure:

1. **Header** — status (draft), owner, last updated, related specs/schemas
2. **Purpose** — 1 paragraph
3. **Entities & Relations** — ASCII tree + key fields table
4. **States & Transitions** — only if module has state machine (omit if không áp dụng)
5. **Business Rules** — current behavior from code
6. **Permissions** — match better-auth (admin/editor/viewer)
7. **Validation** — reference Zod schemas in code
8. **API Contract** — current `{ok, ...}` format, list endpoints
9. **Edge Cases & Decisions** — quirks (vd: virtual invoices, PII encryption, noClone flag)
10. **Open Questions** — flag gaps user muốn refine sau

## Writing Rules

- Vietnamese-first, code refs bằng `path/to/file.ts:line`
- 150-250 lines mỗi contract
- Zod là source of truth cho types — contract chỉ reference, không duplicate
- Skip sections không áp dụng
- User review sau mỗi phase trước khi next

## Key Decisions (from brainstorm)

- **Current code only**, không viết target design
- **6 modules core**, skip 13 infra/helper services
- **Gộp modules liên quan** (Loan+Plan, Disbursement+Beneficiary, Auth+Notification)

## Success Criteria

- 6 contract files trong `docs/contracts/`
- Mỗi contract ≤ 250 lines
- Tất cả business rules, states, permissions hiện tại được capture
- Open Questions section ghi gap để user refine sau
- Agent prompt rule được update: "MUST read contract trước khi code module"

## Target Rules (Follow-up Plan)

Trong quá trình viết contracts, có thể surface các rules cần áp dụng nhưng chưa trong code. Mark bằng `⚠️ NOT YET IMPLEMENTED` ngay trong contract, rồi gom vào plan follow-up.

**Hiện đã có (từ disbursement contract):**
- Service-layer enforce `sum(beneficiary.amount) ≤ disbursement.amount`
- Optimistic concurrency + re-validate trong transaction
- Soft delete cho Disbursement + DisbursementBeneficiary (thêm `deletedAt` field)

**Action sau khi xong 6 contracts:** Tạo plan riêng `plans/{date}-contract-target-rules-implementation/` — scope = implement tất cả target rules được mark `⚠️ NOT YET IMPLEMENTED` across 6 contracts.
