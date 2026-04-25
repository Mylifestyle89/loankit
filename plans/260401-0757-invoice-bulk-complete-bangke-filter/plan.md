# Plan: Lọc bảng kê + Tick chọn hoàn thành hàng loạt hóa đơn

## Tổng quan

3 tính năng cho màn hình Hóa đơn:
1. **Ẩn hóa đơn bảng kê** — invoice thuộc beneficiary `bang_ke` không hiển thị trong theo dõi
2. **Tick chọn nhiều hóa đơn** — checkbox + bulk action toolbar
3. **Chặn hoàn thành "cần bổ sung"** — hóa đơn chưa bổ sung đủ không được mark paid

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | Filter bảng kê khỏi danh sách | ✅ | [phase-01](phase-01-filter-bangke.md) |
| 2 | Bulk select + hoàn thành hàng loạt | ✅ | [phase-02](phase-02-bulk-complete.md) |

## Key Files

- `src/services/invoice.service.ts` — listAll(), getVirtualInvoiceEntries()
- `src/app/api/invoices/route.ts` — GET endpoint
- `src/app/api/invoices/[id]/route.ts` — PATCH endpoint
- `src/components/invoice-tracking/invoice-table.tsx` — table UI
- `src/app/report/invoices/page.tsx` — page component
- `src/app/api/invoices/summary/route.ts` — summary stats

## Dependencies
- Prisma schema: Invoice.disbursementBeneficiary relation already exists
- DisbursementBeneficiary.invoiceStatus field already has `bang_ke` value
