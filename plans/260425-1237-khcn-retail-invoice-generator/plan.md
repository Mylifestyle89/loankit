---
title: KHCN Retail Invoice Generator
status: completed
created: 2026-04-25
completed: 2026-04-25
brainstorm: plans/reports/brainstorm-260425-1237-khcn-retail-invoice-generator.md
---

# KHCN Retail Invoice Generator

## Overview

Tạo module sinh **hóa đơn bán lẻ** (chứng từ giải ngân) cho KHCN. User chọn items từ phương án kinh doanh, nhập số lượng/giá, hệ thống sinh DOCX theo 4 loại mẫu.

## Key Technical Facts

- Docxtemplater dùng `[...]` delimiters → loop syntax: `[#items]...[/items]`
- `numberToVietnameseWords` có sẵn tại `@/lib/number-to-vietnamese-words`
- `generateSingleDocx` pattern đã có trong `disbursement-report.service.ts`
- `CostItem { name, unit, qty, unitPrice, amount }` từ `loan-plan-types.ts`
- `LoanPlan.cost_items_json` chứa items để pre-fill

## Approach

- Thêm `items_json` + `templateType` vào Invoice model (Approach A)
- Pre-fill: user chọn từng item từ LoanPlan.cost_items
- Validation: soft warning nếu vượt PA (không block)
- UI: modal trong trang disbursement

## Phases

| Phase | Title | Status | Effort |
|-------|-------|--------|--------|
| [01](phase-01-schema-migration.md) | Schema + Migration | ✅ completed | S |
| [02](phase-02-api-endpoints.md) | API Endpoints | ✅ completed | S |
| [03](phase-03-docx-templates.md) | DOCX Templates (4 loại) | ✅ completed | M |
| [04](phase-04-generation-service.md) | Generation Service | ✅ completed | M |
| [05](phase-05-ui-retail-invoice-modal.md) | UI — RetailInvoiceModal | ✅ completed | M |

## Key Files

```
prisma/schema.prisma                                     ← Phase 01
src/app/api/invoices/[id]/retail-doc/route.ts            ← Phase 02
src/app/api/loan-plans/[id]/cost-items/route.ts          ← Phase 02
report_assets/KHCN templates/Chứng từ giải ngân/Mau*.docx ← Phase 03 (create new)
src/services/retail-invoice-report.service.ts             ← Phase 04
src/components/invoice-tracking/retail-invoice-modal.tsx  ← Phase 05
```

## Dependencies (thứ tự)

Phase 01 → Phase 02 → Phase 04
Phase 03 (DOCX templates) → Phase 04
Phase 02 + Phase 04 → Phase 05
