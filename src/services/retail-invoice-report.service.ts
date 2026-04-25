/**
 * Retail invoice DOCX generator — generates purchase receipts (chứng từ mua hàng)
 * for KHCN disbursement module. Supports 4 template types.
 */
import { NotFoundError } from "@/core/errors/app-error";
import { docxEngine } from "@/lib/docx-engine";
import { numberToVietnameseWords } from "@/lib/number-to-vietnamese-words";
import { fmtDate, fmtDateCompact } from "@/lib/report/report-date-utils";
import { fmtN } from "@/lib/report/format-number-vn";
import { prisma } from "@/lib/prisma";
import type { CostItem } from "@/lib/loan-plan/loan-plan-types";

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

export type RetailTemplateKey = "tap_hoa" | "vlxd" | "y_te" | "nong_san";

export const RETAIL_INVOICE_TEMPLATES: Record<RetailTemplateKey, { label: string; path: string }> = {
  tap_hoa: {
    label: "Hóa đơn tạp hóa - Đồ uống",
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

// ---------------------------------------------------------------------------
// Data builder
// ---------------------------------------------------------------------------

function buildRetailInvoiceData(
  invoice: {
    invoiceNumber: string;
    supplierName: string;
    issueDate: Date;
    items_json: string | null;
    disbursement: {
      loan: {
        customer: { customer_name: string; address: string | null };
      };
    };
  },
) {
  const items: CostItem[] = invoice.items_json
    ? (JSON.parse(invoice.items_json) as CostItem[])
    : [];

  const total = items.reduce((s, i) => s + i.amount, 0);

  return {
    supplier_name: invoice.supplierName,
    invoice_number: invoice.invoiceNumber,
    issue_date: fmtDate(invoice.issueDate),
    customer_name: invoice.disbursement.loan.customer.customer_name,
    customer_address: invoice.disbursement.loan.customer.address ?? "",

    // Line items loop — docxtemplater uses [#items]...[/items]
    items: items.map((item, idx) => ({
      i: idx + 1,
      name: item.name,
      unit: item.unit,
      qty: item.qty,
      unit_price_fmt: fmtN(item.unitPrice),
      subtotal_fmt: fmtN(item.amount),
      note: "",
    })),

    total_fmt: fmtN(total),
    total_words: numberToVietnameseWords(total),
    payment_method: "Tiền mặt",
  };
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

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
  const buffer = await docxEngine.generateDocxBuffer(template.path, data);

  const dateStr = fmtDateCompact(new Date());
  const filename = `HoaDon_${invoice.invoiceNumber}_${templateKey}_${dateStr}.docx`;
  return { buffer, filename };
}
