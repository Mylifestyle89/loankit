---
status: pending
---

# Plan: Bộ hồ sơ Thẻ Lộc Việt (Thẻ tín dụng KHCN)

## Overview

Thêm loan method `the_loc_viet` + 4 DOCX templates + builder logic cho sản phẩm thẻ tín dụng Lộc Việt.

**No DB migration needed** — dùng `data_json`, `loanAmount`, computed fields.

## Brainstorm

[brainstorm-260413-0004-loc-viet-credit-card-templates.md](../reports/brainstorm-260413-0004-loc-viet-credit-card-templates.md)

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [Constants + Schema](phase-01-constants-schema.md) | pending | S |
| 2 | [Registry + Placeholder](phase-02-registry-placeholder.md) | pending | S |
| 3 | [Builder logic](phase-03-builder-logic.md) | pending | M |
| 4 | [Customer info fields](phase-04-customer-info-fields.md) | pending | S |

## Key Decisions

- `HĐTD.Hạn mức thẻ tín dụng` → map từ `loan.loanAmount`
- `HĐTD.Số tài khoản` → map từ `customer.bank_account` (đã có trong DB + builder)
- `HĐTD.Thời hạn hiệu lực của thẻ` → auto-compute từ startDate/endDate (tháng)
- `HĐTD.HMTTD bằng chữ` → `numberToVietnameseWords(loanAmount)`
- `Nghề nghiệp`, `Quốc tịch`, `Loại giấy tờ tùy thân` → `data_json` fields
