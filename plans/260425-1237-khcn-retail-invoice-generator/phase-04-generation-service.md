---
phase: 04
title: Generation Service
status: completed
effort: M
blockedBy: phase-01,phase-03
completed: 2026-04-25
---

# Phase 04 — Generation Service

## File mới: `src/services/retail-invoice-report.service.ts`

Tách ra file riêng (không thêm vào disbursement-report.service.ts đã 311 LOC).

## Template registry

```ts
export type RetailTemplateKey = "tap_hoa" | "vlxd" | "y_te" | "nong_san";

export const RETAIL_INVOICE_TEMPLATES: Record<RetailTemplateKey, { label: string; path: string }> = {
  tap_hoa: {
    label: "Hóa đơn tạp hóa / đồ uống",
    path: "report_assets/KHCN templates/Chứng từ giải ngân/HoaDon_TapHoa_DoUong.docx",
  },
  vlxd: {
    label: "Hóa đơn vật liệu xây dựng",
    path: "report_assets/KHCN templates/Chứng từ giải ngân/HoaDon_VatLieuXayDung.docx",
  },
  y_te: {
    label: "Hóa đơn thiết bị y tế",
    path: "report_assets/KHCN templates/Chứng từ giải ngân/HoaDon_ThietBiYTe.docx",
  },
  nong_san: {
    label: "Phiếu bán hàng nông sản",
    path: "report_assets/KHCN templates/Chứng từ giải ngân/HoaDon_NongSan.docx",
  },
};
```

## Data builder

```ts
import { fmtN } from "@/lib/report/format-number-vn";
import { fmtDate } from "@/lib/report/report-date-utils";
import { numberToVietnameseWords } from "@/lib/number-to-vietnamese-words";
import type { CostItem } from "@/lib/loan-plan/loan-plan-types";

function buildRetailInvoiceData(invoice: InvoiceWithRelations) {
  const items: CostItem[] = invoice.items_json
    ? JSON.parse(invoice.items_json)
    : [];

  const total = items.reduce((s, i) => s + i.amount, 0);

  return {
    // Supplier info (từ supplierName — có thể mở rộng sau)
    supplier_name: invoice.supplierName,
    supplier_address: "",  // TODO: extend supplier model
    supplier_phone: "",

    // Invoice metadata
    invoice_number: invoice.invoiceNumber,
    issue_date: fmtDate(invoice.issueDate),

    // Buyer = customer của loan
    customer_name: invoice.disbursement.loan.customer.customer_name,
    customer_address: invoice.disbursement.loan.customer.address ?? "",

    // Line items với index 1-based và formatted numbers
    items: items.map((item, idx) => ({
      i: idx + 1,
      name: item.name,
      unit: item.unit,
      qty: item.qty,
      unit_price_fmt: fmtN(item.unitPrice),
      subtotal_fmt: fmtN(item.amount),
      note: "",  // Ghi chú (Mau2, Mau3)
    })),

    // Totals
    total_fmt: fmtN(total),
    total_words: numberToVietnameseWords(total),

    // Payment method (Mau2, Mau4)
    payment_method: "Tiền mặt",
  };
}
```

## Main function

```ts
export async function generateRetailInvoiceDoc(
  invoiceId: string,
  templateKey: RetailTemplateKey,
): Promise<{ buffer: Buffer; filename: string }> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      disbursement: {
        include: {
          loan: {
            include: { customer: true },
          },
        },
      },
    },
  });
  if (!invoice) throw new NotFoundError("Invoice not found.");

  const template = RETAIL_INVOICE_TEMPLATES[templateKey];
  const data = buildRetailInvoiceData(invoice);

  // Reuse docxEngine (existing utility)
  const buffer = await docxEngine.generate(template.path, data);
  const filename = `HoaDon_${invoice.invoiceNumber}_${templateKey}.docx`;

  return { buffer, filename };
}
```

## Dependency check

- `docxEngine.generate(path, data)` — xem `src/lib/docx-engine.ts` để confirm method name chính xác
- `fmtN` — `src/lib/report/format-number-vn.ts`
- `fmtDate` — `src/lib/report/report-date-utils.ts`
- `numberToVietnameseWords` — `src/lib/number-to-vietnamese-words.ts`
- Tất cả đã được dùng trong `disbursement-report.service.ts`

## Todo

- [ ] Tạo `src/services/retail-invoice-report.service.ts`
- [ ] Implement `RETAIL_INVOICE_TEMPLATES` registry
- [ ] Implement `buildRetailInvoiceData()` với đúng field names theo template Phase 03
- [ ] Implement `generateRetailInvoiceDoc(invoiceId, templateKey)`
- [ ] Verify `docxEngine` method signature (generate vs render)
- [ ] Unit test thủ công: generate 1 DOCX, kiểm tra loop items render đúng
- [ ] `npx tsc --noEmit` — 0 errors

## Success Criteria

- `generateRetailInvoiceDoc(invoiceId, "tap_hoa")` trả về valid DOCX buffer
- DOCX có đủ rows = số items trong invoice
- Tổng cộng và bằng chữ đúng
- Tên file hợp lệ để download
