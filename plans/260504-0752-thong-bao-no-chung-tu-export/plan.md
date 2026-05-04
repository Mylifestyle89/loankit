---
title: "Export danh sách nợ chứng từ ra XLSX"
description: "Modal chọn customer + filter type, gọi API export → tải XLSX 3 sheet (Quá hạn / Sắp đến hạn / Cần bổ sung)."
status: pending
priority: P2
effort: 4h
branch: main
tags: [invoice-tracking, export, xlsx, notification]
created: 2026-05-04
---

## Overview

Thêm chức năng cho user trang `/report/invoices` tải file XLSX liệt kê khoản nợ chứng từ (overdue / due-soon / cần bổ sung) theo customer + type đã chọn. Tái sử dụng logic scan từ `deadline-check-logic.ts` (refactor tách `collectDigestItems` pure query). Không gửi email — user tự forward.

## Context

- Scout report: [`plans/reports/scout-260504-0752-thong-bao-no-chung-tu-export.md`](../reports/scout-260504-0752-thong-bao-no-chung-tu-export.md)
- Decisions: XLSX only, không email, modal multi-checkbox, yêu cầu session.

## Phases

| # | File | Status | Effort |
|---|---|---|---|
| 01 | [phase-01-refactor-collect-digest-items.md](./phase-01-refactor-collect-digest-items.md) | pending | 1h |
| 02 | [phase-02-xlsx-export-service.md](./phase-02-xlsx-export-service.md) | pending | 45m |
| 03 | [phase-03-api-endpoint.md](./phase-03-api-endpoint.md) | pending | 30m |
| 04 | [phase-04-export-modal-ui.md](./phase-04-export-modal-ui.md) | pending | 1h |
| 05 | [phase-05-wire-page-and-verify.md](./phase-05-wire-page-and-verify.md) | pending | 45m |

## Key Dependencies

- Phase 02 + 03 cần `collectDigestItems` từ Phase 01.
- Phase 04 cần endpoint từ Phase 03.
- Phase 05 cần modal từ Phase 04.

## Principles

- YAGNI: không thêm send-email / audit / attach.
- KISS: 1 endpoint GET, 1 modal, không streaming.
- DRY: tái sử dụng `InvoiceDigestItem` type, pattern xlsx từ `customer-xlsx-export.service.ts`, pattern auth từ `summary/route.ts`.

## Unresolved Questions

1. Có cần thêm cột "Email khách hàng" trong sheet không? (Hiện tại scope không yêu cầu — default: không.)
2. Filename: `no-chung-tu-{YYYYMMDD}.xlsx` — có cần kèm tên user / customer khi chỉ chọn 1 customer? (Default: không, giữ format chung.)
3. Khi user không chọn customer nào → coi như "tất cả" hay block button? (Đề xuất: disable button nếu chưa chọn customer.)
