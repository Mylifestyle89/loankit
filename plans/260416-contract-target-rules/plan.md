---
status: pending
---

# Plan: Implement Contract Target Rules (P0 + P1)

## Overview

Implement 6 target rules từ `docs/contracts/TARGET-BACKLOG.md` — 1 P0 compliance + 5 P1 data integrity. Tất cả là service-layer validations, không cần DB migration (trừ P0 nếu dùng Option B cần field mới).

## Source of truth

[TARGET-BACKLOG.md](../../docs/contracts/TARGET-BACKLOG.md) — items #1-#6.

## Phases

| # | Phase | Backlog # | Effort | Status |
|---|-------|-----------|--------|--------|
| 1 | [Encrypt _owners PII (P0)](phase-01-encrypt-owners-pii.md) | #1 | M | pending |
| 2 | [Method mismatch validation](phase-02-method-mismatch.md) | #2 | S | pending |
| 3 | [Invoice over-fill guard](phase-03-invoice-overfill.md) | #3 | S | pending |
| 4 | [Obligation ≤ total_value](phase-04-obligation-guard.md) | #4 | S | pending |
| 5 | [Sum beneficiary ≤ disbursement + transaction](phase-05-beneficiary-sum-guard.md) | #5 + #6 | M | pending |

## Key Decisions

- P0 (#1): Option B — encrypt `_owners` JSON string trong `properties_json`, không promote table riêng
- P1 (#2-#5): service-layer validation throw explicit errors, không silent fallback
- P1 (#5+#6): gộp sum guard + concurrency vào 1 phase (cùng file service, cùng transaction)
- Mỗi phase done → remove `⚠️ NOT YET IMPLEMENTED` marker khỏi contract, remove entry khỏi backlog

## Post-Implementation

Sau phase xong:
- Update contracts: marker → current behavior
- Update TARGET-BACKLOG: remove items #1-#6
- Commit contracts + code chung PR (theo README §4 workflow)
