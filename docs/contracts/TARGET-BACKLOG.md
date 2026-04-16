# Target Rules Backlog

Gom tất cả rules `⚠️ NOT YET IMPLEMENTED` từ các contracts, grouped theo priority. Dùng file này khi plan sprint thay vì đọc lại từng contract.

> **Convention:** Khi contract thêm marker `⚠️ NOT YET IMPLEMENTED`, MUST thêm entry vào file này. Khi implement xong, xóa khỏi backlog + remove marker khỏi contract.
>
> **Priority:**
> - **P0 (Compliance)** — rò rỉ PII, vi phạm regulatory. Fix ngay khi phát hiện.
> - **P1 (Data Integrity)** — risk sai lệch data, inconsistency. Fix trước production scale.
> - **P2 (DX/Quality)** — improve developer experience, tránh silent bugs. Fix khi có bandwidth.
> - **Trigger-based** — fix khi đạt điều kiện cụ thể.

---

## P0 — Compliance (Critical)

| # | Item | Contract | Effort |
|---|---|---|---|
| 1 | Encrypt PII trong `_owners` (cccd, phone, address) — Option B: encrypt JSON string | [collateral §4.2.1](collateral.contract.md) | M |

---

## P1 — Data Integrity

| # | Item | Contract | Effort |
|---|---|---|---|
| 2 | Validate `Loan.loanPlanId` method mismatch khi PATCH | [loan-and-plan §5.6](loan-and-plan.contract.md) | S |
| 3 | Validate `totalInvoiceAmount + newAmount ≤ beneficiary.amount` trước insert invoice | [invoice §4.8](invoice.contract.md) | S |
| 4 | Block `obligation > total_value` ở service (throw error) | [collateral §4.7](collateral.contract.md) | S |
| 5 | Enforce `sum(DisbursementBeneficiary.amount) ≤ Disbursement.amount` ở service | [disbursement §4.1](disbursement-and-beneficiary.contract.md) | S |
| 6 | Optimistic concurrency + re-validate trong transaction cho beneficiary amount | [disbursement §4.5](disbursement-and-beneficiary.contract.md) | M |

---

## P2 — DX / Quality

| # | Item | Contract | Effort |
|---|---|---|---|
| 7 | `data_json` Zod schema (loose + passthrough) — validate known keys | [customer §4.7](customer.contract.md) | S |
| 8 | `cccd_hash` field + unique index (replicate customer_code_hash pattern) | [customer §4.8](customer.contract.md) | M |
| 9 | POST `/api/invoices/from-virtual` endpoint (convert virtual → real 1 bước) | [invoice §7](invoice.contract.md) | S |
| 10 | Soft delete repo-wide (`deletedAt` field, service cascade) | [README §8.1](README.md) | L |

---

## Trigger-based (Deferred)

| # | Item | Contract | Trigger condition |
|---|---|---|---|
| 11 | Discriminated Zod schema theo `loan_method` | [loan-and-plan §10](loan-and-plan.contract.md) | Thêm method thứ 7+, hoặc bug thực do field sai method |
| 12 | Discriminated Zod per `collateral_type` | [collateral §9](collateral.contract.md) | Thêm type thứ 5+, hoặc bug do typo key |
| 13 | Migrate `_owners` sang table `CollateralOwner` (Option A) | [collateral §4.2.1](collateral.contract.md) | Cần query owner theo CCCD, hoặc >10 owners/collateral bottleneck |
| 14 | Persist virtual invoices vào DB | [invoice §9](invoice.contract.md) | Virtual query > 100ms production, hoặc cần audit trail |
| 15 | Push notification (browser/mobile) | [auth-and-notification §9](auth-and-notification.contract.md) | User complain email latency, hoặc cần real-time alert |
| 16 | Rate limit auth endpoints | [auth-and-notification §9](auth-and-notification.contract.md) | Brute force attack phát hiện, hoặc compliance audit yêu cầu |

---

## Suggested Implementation Order

**Sprint 1 (P0 — Compliance):**
- Item #1 — Encrypt owners PII. Block Agribank security scan.

**Sprint 2 (P1 quick wins — 1-2 ngày mỗi item):**
- Item #2, #3, #4, #5 — 4 service-layer validations. Tất cả đều S effort, giảm data inconsistency risk ngay.

**Sprint 3 (P1 concurrency):**
- Item #6 — Transaction + re-validate. Cần design cẩn thận.

**Sprint 4 (P2):**
- Item #7, #8 — Customer improvements. Do cùng vì liên quan field-encryption.
- Item #9 — from-virtual endpoint.
- Item #10 — Soft delete repo-wide (L effort, riêng sprint).

**Ongoing:**
- Items #11-14 — monitor trigger conditions; không active work.

---

## How to Use

1. **Trước khi tạo plan sprint:** review file này, chọn items theo priority
2. **Khi implement:** đọc contract section tương ứng để hiểu full context
3. **Khi done:**
   - Remove marker `⚠️ NOT YET IMPLEMENTED` khỏi contract
   - Update section: từ target → current behavior
   - Remove entry khỏi backlog này
   - Bump `Last updated` trong contract
   - Commit contract + code + backlog cùng 1 PR
