# Phase 4: Invoice Contract

## Priority: HIGH | Effort: M | Status: pending

## Goal

Contract cho Invoice module. **Quirk quan trọng:** virtual invoices (sinh từ DisbursementBeneficiary) khác real invoices (bảng DB).

## Files to scout

- `prisma/schema.prisma` — Invoice model
- `src/services/invoice.service.ts`
- `src/services/invoice-crud.service.ts`
- `src/services/invoice-queries.service.ts` (virtual invoice logic)
- `src/app/api/invoices/**`
- `src/lib/notifications/deadline-check-logic.ts` (how cron uses invoices)

## Sections

### Purpose
Invoice = hóa đơn chứng minh mục đích sử dụng vốn. 2 loại: real (stored in DB) + virtual (synthesized from beneficiary lines chưa đủ invoice).

### Entities

```
Invoice (real)
  ├── belongs to → Disbursement
  └── belongs to → DisbursementBeneficiary (optional)

Virtual Invoice (NOT in DB)
  ├── id = "virtual-{beneficiaryId}"
  ├── status = "needs_supplement"
  └── sinh khi DisbursementBeneficiary.invoiceStatus ∈ [pending, supplementing]
```

### Status enum
- Real: `pending | paid | overdue`
- Virtual: `needs_supplement`

### Business Rules

- Real invoice: insert vào bảng `invoices`
- Virtual invoice: computed, không stored. Generated bởi `getVirtualInvoiceEntries(customerId?)`
- `listAll()` return REAL + VIRTUAL trừ khi filter explicit 1 loại
- `dueDate` real = user nhập; virtual = `disbursementDate + 1 tháng`
- `customDeadline` override `dueDate`
- `bang_ke` beneficiaries bị exclude khỏi invoice queries (flag `EXCLUDE_BANG_KE_INVOICES`)
- `markOverdue()` chỉ áp real invoices (update status thành `overdue`)

### Deadline Check
- Cron `/api/cron/invoice-deadlines` daily 0h UTC
- Check: due-soon (7 ngày) + newly overdue + virtual supplement deadlines
- Gửi **1 digest email per customer** (không lắt nhắt)
- Dedup 24h theo `{type}:invoiceId` hoặc `{type}:supplement-{beneficiaryId}`

### Permissions
- `admin/editor` — create/update/mark paid
- `viewer` — read

### Validation
Inline Zod trong API routes

### API
- GET `/api/invoices` (paginated, filters: status, customerId)
- GET `/api/invoices/summary`
- POST `/api/invoices` (create real invoice; can supplement beneficiary)
- PATCH `/api/invoices/[id]` (mark paid, update)
- DELETE `/api/invoices/[id]`
- GET `/api/cron/invoice-deadlines` (secured by CRON_SECRET)

### Edge Cases

- Virtual invoice `id` bắt đầu `virtual-` → không phải UUID thực, không query được bằng Prisma
- Bảng kê beneficiaries: exclude khỏi invoice flow
- Overdue detection: dueDate vs customDeadline priority
- Email digest: gom real + virtual cùng 1 email

### Open Questions

- Virtual invoices có nên persist vào DB không? (Hiện computed mỗi lần query)
- Configurable supplement deadline (hiện hardcode 1 tháng)

## Output

`docs/contracts/invoice.contract.md` (~250 lines — có nhiều quirks)
