---
phase: 3
title: "Format consistency — currency, date, number"
status: pending
priority: P1
effort: 4-6h
blocks: none
---

# Phase 3 — Format consistency

Banking tool mỗi nơi format VND/date kiểu khác = chaos. Centralize.

## Problems observed (suspected, audit confirms)

- VND: `5,000,000đ` vs `5.000.000 ₫` vs `5tr` vs `5,000,000 VND` — random per component
- Date: `27/4/2026` vs `2026-04-27` vs `Apr 27, 2026` — random
- Percent: `7.5%` vs `7,5%` (Vietnamese locale dùng dấu phẩy thập phân)
- Big number (no currency): `1,234` vs `1.234` — locale mismatch

## Standards

| Type | Format | Example | API |
|---|---|---|---|
| Currency VND | `Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 })` | `5.000.000 ₫` | `formatVnd(5_000_000)` |
| Currency VND short | Custom (1tr / 1.5tr / 1,2 tỷ) cho dashboard cards | `1,5 tỷ` | `formatVndShort(1_500_000_000)` |
| Date short | `Intl.DateTimeFormat("vi-VN", { dateStyle: "short" })` | `27/04/2026` | `formatDate(new Date())` |
| Date long | `Intl.DateTimeFormat("vi-VN", { dateStyle: "long" })` | `27 tháng 4, 2026` | `formatDateLong(new Date())` |
| DateTime | `Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" })` | `27/04/2026 14:30` | `formatDateTime(new Date())` |
| Percent | `Intl.NumberFormat("vi-VN", { style: "percent", maximumFractionDigits: 2 })` | `7,5%` | `formatPercent(0.075)` |
| Number | `Intl.NumberFormat("vi-VN")` | `1.234.567` | `formatNumber(1234567)` |

## Implementation

### 3a — Centralize formatters

Create/expand `src/lib/format/` (locate existing first via grep):
- `format-currency.ts` — formatVnd, formatVndShort
- `format-date.ts` — formatDate, formatDateLong, formatDateTime
- `format-number.ts` — formatPercent, formatNumber

Each function: `if (!Number.isFinite(value)) return "—"` (consistent với Phase 1 NaN guard).

### 3b — Audit existing usages

Grep patterns:
- `toLocaleString.*(VND|vi-VN|currency)` — find direct calls
- `formatCurrency|formatVnd|formatMoney|formatDong|format.*Currency` — find existing helpers
- `Intl.NumberFormat` / `Intl.DateTimeFormat` — direct usage
- Manual concatenation: `\${.*}đ`, `\${.*} VND`

Catalog mỗi unique pattern → quyết định canonical → replace.

### 3c — Replace + dedup helpers

Remove duplicate helpers (multiple versions of formatCurrency from different files). Single source of truth.

### 3d — Display vs storage

Verify: numbers stored là plain Number / Decimal (Prisma), display layer chuyển string. Don't store formatted strings.

## Acceptance

- Single import path: `import { formatVnd, formatDate } from "@/lib/format"` toàn app
- Zero direct `toLocaleString("vi-VN", ...)` outside format module
- Visual audit 5 màn hình quan trọng — format đồng nhất
- Empty/null values → "—" everywhere

## Risks

- Có thể break test snapshots nếu test compare format strings
- Số liệu báo cáo printed/exported (DOCX) cần check riêng — Python pipeline có format format khác không

## Tests

- Unit tests cho mỗi formatter: null/undefined/NaN/0/negative/big number
- Snapshot test 1 component representative (vd `LoanSummaryCard`) trước/sau
