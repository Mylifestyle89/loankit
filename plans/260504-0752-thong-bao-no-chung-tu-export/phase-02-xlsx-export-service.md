# Phase 02 — XLSX export service

## Context Links

- Scout: [`plans/reports/scout-260504-0752-thong-bao-no-chung-tu-export.md`](../reports/scout-260504-0752-thong-bao-no-chung-tu-export.md)
- Pattern reference: `src/services/report/customer-xlsx-export.service.ts` (multi-sheet workbook → Buffer).
- Depends on: Phase 01 — `collectDigestItems`, `DigestSnapshot`.

## Overview

- Priority: P2.
- Status: pending.
- Build XLSX 3 sheet từ `DigestSnapshot`. Trả `Buffer` cho route handler.

## Key Insights

- `xlsx` package (SheetJS) có sẵn trong `package.json` — import `* as XLSX from "xlsx"`.
- Format số tiền: VND (no decimal). Date: `dd/MM/yyyy`.
- `InvoiceDigestItem` đã có flag `isOverdue`, `isSupplement` → bucket vào sheet.

## Requirements

- Functional:
  - Input: `DigestSnapshot` từ `collectDigestItems`.
  - Output: `Buffer` (xlsx).
  - 3 sheets: "Quá hạn", "Sắp đến hạn", "Cần bổ sung".
  - Cột mỗi sheet: `Khách hàng | Hợp đồng | Số HĐ/Beneficiary | Số tiền (VND) | Ngày đến hạn | Số ngày quá hạn` (cột cuối chỉ ở "Quá hạn" + "Cần bổ sung" rows quá hạn).
  - Nếu sheet rỗng → vẫn tạo sheet với header (user biết là không có data).
- Non-functional: file < 200 lines.

## Architecture

```
buildOverdueXlsxBuffer(snapshot): Buffer
  ├─ flatten snapshot → rows {customerName, contract, invoiceNumber, amount, dueDate, isOverdue, isSupplement}
  ├─ partition vào 3 array (overdue real, dueSoon real, supplement)
  ├─ XLSX.utils.aoa_to_sheet cho mỗi bucket
  └─ XLSX.write({ type: "buffer", bookType: "xlsx" })
```

## Related Code Files

- Create: `src/services/invoice-overdue-xlsx-export.service.ts`
- Read-only: `src/services/email.service.ts` (`InvoiceDigestItem`)
- Read-only: Phase 01 output (`DigestSnapshot`)

## Implementation Steps

1. Tạo file `src/services/invoice-overdue-xlsx-export.service.ts`.
2. Import `* as XLSX from "xlsx"`, `DigestSnapshot` từ deadline-check-logic.
3. Helper `formatVND(n: number): string` (e.g. `n.toLocaleString("vi-VN")`).
4. Helper `formatDate(d: Date): string` (`dd/MM/yyyy`).
5. Helper `daysOverdue(due: Date, now: Date): number` — `Math.floor((now - due) / 86400000)`, min 0.
6. Hàm chính `buildOverdueXlsxBuffer(snapshot: DigestSnapshot, now = new Date()): Buffer`:
   - Flatten snapshot thành array `{ customerName, contract, invoiceNumber, amount, dueDate, isOverdue, isSupplement }`.
   - Partition:
     - `overdueRows` = `isOverdue && !isSupplement`.
     - `dueSoonRows` = `!isOverdue && !isSupplement`.
     - `supplementRows` = `isSupplement`.
   - Build worksheet bằng `XLSX.utils.aoa_to_sheet`:
     - Sheet "Quá hạn": header `["Khách hàng","Hợp đồng","Số HĐ","Số tiền (VND)","Ngày đến hạn","Số ngày quá hạn"]`.
     - Sheet "Sắp đến hạn": header `["Khách hàng","Hợp đồng","Số HĐ","Số tiền (VND)","Ngày đến hạn"]`.
     - Sheet "Cần bổ sung": header `["Khách hàng","Hợp đồng","Beneficiary","Số tiền cần bổ sung (VND)","Ngày đến hạn","Số ngày quá hạn"]` — cột cuối để 0 nếu chưa quá hạn.
   - `XLSX.utils.book_new()` + `XLSX.utils.book_append_sheet` x3.
   - Return `XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer`.
7. Set column width hợp lý (ws['!cols']) — KISS: width chung 18, customer 28, beneficiary/contract 22.
8. `npm run build` verify TS.

## Todo List

- [ ] Create file `invoice-overdue-xlsx-export.service.ts`
- [ ] Helper formatters (VND, date, daysOverdue)
- [ ] `buildOverdueXlsxBuffer` flatten + partition + 3 sheets
- [ ] Column widths
- [ ] File ≤ 200 lines
- [ ] `npm run build` pass

## Success Criteria

- Gọi với snapshot mock → trả Buffer mở được trong Excel với 3 sheet đúng tên + header + data.
- Sheet rỗng vẫn render (header only).

## Risk Assessment

- **Risk:** Số tiền lớn bị Excel hiển thị scientific. **Mitigation:** lưu là number (Excel format mặc định ok), hoặc set cell type `n` + format `#,##0`.
- **Risk:** Date timezone — Date object Vietnam vs UTC. **Mitigation:** format string Việt từ JS Date trước khi đưa vào sheet (tránh Excel re-parse).

## Security Considerations

- Không log PII customer.
- Buffer không chứa metadata user.

## Next Steps

- Phase 03 wraps service trong API route.
