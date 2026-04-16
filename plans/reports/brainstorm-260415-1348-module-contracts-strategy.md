# Brainstorm: Module Contracts cho KHCN/Loankit Repo

## Problem

Repo được code "blindly" khi mới bắt đầu → nhiều bất cập về business rules, boundary giữa modules. Cần contracts để:
- Document rõ ràng business logic cho agent (Claude Code) & dev tương lai
- Chuẩn hóa terminology (state names, permissions, API response)
- Scale team/codebase an toàn hơn

## Snapshot Codebase

- 576 TS/TSX files
- 22 service files (`src/services/*.service.ts`)
- 16 API route groups
- 25 Prisma models

## Decision

**Phương án A: Lean contracts cho CORE DOMAIN, viết theo CURRENT code**

Viết ~6 contracts cho domain quan trọng, không cover infra/helper services. Contract mô tả đúng code hiện tại (không target design). User sẽ tinh chỉnh theo hướng mong muốn sau.

## 6 Core Contracts (priority order)

| # | Contract | Modules covered | Why prioritize |
|---|---|---|---|
| 1 | `customer` | customer.service, co_borrower, related_person | Foundation, PII encryption, phức tạp nhất |
| 2 | `loan-and-plan` | loan.service, loan-plan.service | Core business, có nhiều loan_method + loan_plan linking |
| 3 | `disbursement-and-beneficiary` | disbursement.service, beneficiary.service | State + invoice linking |
| 4 | `invoice` | invoice-crud, invoice-queries | Virtual invoices quirk quan trọng |
| 5 | `collateral` | (handled in customer.service collaterals) | TSBĐ có multi-owner, obligation tracking |
| 6 | `auth-and-notification` | better-auth, notification.service, email.service | Cross-cutting concerns |

## Skipped (infra/helper, ít business rules)

`ocr`, `email`, `ai-mapping`, `document-extraction`, `auto-tagging`, `auto-process`, `security.service`, `report.service`, `khcn-report.service`, `disbursement-report.service`, `customer-docx-extraction`, `financial-analysis`, `customer-draft`

Các file này là tools/helpers, được gọi bởi core services — không cần contract riêng.

## Contract Template (lean, based on draft)

Mỗi contract giữ các sections từ draft disbursement:

1. **Purpose** (1 paragraph)
2. **Entities & Relations** (ASCII tree + key fields table)
3. **States & Transitions** (nếu có; current code only)
4. **Business Rules** (current behavior)
5. **Permissions** (admin/editor/viewer — match better-auth roles hiện tại)
6. **Validation** (reference Zod schemas)
7. **API Contract** (current `{ok, ...}` format)
8. **Edge Cases & Decisions** (quirks đã discover)
9. **Open Questions** (flag gaps user muốn xử lý sau)

## Writing Approach

- **Location:** `/docs/contracts/{module}.contract.md`
- **Convention:** draft kiểu Vietnamese-first, code references bằng `path/to/file.ts:line`
- **Zod source of truth:** contract nói "see Zod schema in X", không duplicate type definitions
- **Length target:** 150-250 lines mỗi contract (draft disbursement hiện ~170 lines là OK)

## Timeline Estimate

~1 tuần part-time:
- Day 1-2: `customer` contract (phức tạp nhất, scout nhiều)
- Day 3: `loan-and-plan` contract
- Day 4: `disbursement-and-beneficiary` contract
- Day 5: `invoice` + `collateral` contracts
- Day 6-7: `auth-and-notification` contract + review/polish

## Risks

- **Contract rot:** Nếu contract không được update cùng code, sẽ mislead agent → **mitigation:** agent MUST-read contract trước khi code (đã có trong draft §9 "How to use")
- **Over-documentation:** Viết quá chi tiết cho modules đơn giản → **mitigation:** Stick to template, skip sections không áp dụng
- **Current vs target confusion:** Contract current → khi refactor bị outdated → **mitigation:** User sẽ tinh chỉnh sau; mỗi contract có section "Open Questions" ghi lại gap

## Next Steps

1. Tạo thư mục `docs/contracts/`
2. Move draft `disbursement.contract.md` → `docs/contracts/disbursement-and-beneficiary.contract.md` (adjust theo current code)
3. Viết 6 contracts theo priority order
4. Mỗi contract: scout → draft → user review → finalize

## Unresolved Questions

- Có cần ADR (Architecture Decision Records) song song không? (Chưa cần ở phase này)
- Contract có auto-sync với Zod schemas không, hay manual? (Manual ở phase này; tool sync sau nếu cần)
