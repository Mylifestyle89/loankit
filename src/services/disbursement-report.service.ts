/**
 * Disbursement report service — maps DB data to template placeholders
 * and generates DOCX reports using docxEngine.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { NotFoundError } from "@/core/errors/app-error";
import { docxEngine } from "@/lib/docx-engine";
import { numberToVietnameseWords } from "@/lib/number-to-vietnamese-words";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

export const DISBURSEMENT_TEMPLATES = {
  bcdx: {
    label: "Báo cáo đề xuất giải ngân",
    path: "report_assets/Disbursement templates/2268.09.PN BCDX giai ngan HMTD.docx",
  },
  giay_nhan_no: {
    label: "Giấy nhận nợ",
    path: "report_assets/Disbursement templates/2268.10.PN Giay nhan no HMTD.docx",
  },
  danh_muc_ho_so: {
    label: "Danh mục hồ sơ vay vốn",
    path: "report_assets/Disbursement templates/2899.01.CV Danh muc ho so vay von.docx",
  },
  in_unc: {
    label: "In UNC",
    path: "report_assets/Disbursement templates/in UNC.docx",
  },
} as const;

export type TemplateKey = keyof typeof DISBURSEMENT_TEMPLATES;

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function monthsBetween(start: Date, end: Date): number {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

function today() {
  const now = new Date();
  return {
    dd: String(now.getDate()).padStart(2, "0"),
    mm: String(now.getMonth() + 1).padStart(2, "0"),
    yyyy: String(now.getFullYear()),
  };
}

// ---------------------------------------------------------------------------
// Data fetcher — loads full disbursement with all relations needed for reports
// ---------------------------------------------------------------------------

async function loadFullDisbursement(disbursementId: string) {
  const d = await prisma.disbursement.findUnique({
    where: { id: disbursementId },
    include: {
      loan: {
        include: {
          customer: true,
        },
      },
      invoices: { orderBy: { createdAt: "asc" } },
      beneficiaryLines: {
        include: {
          invoices: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!d) throw new NotFoundError("Disbursement not found.");
  return d;
}

// ---------------------------------------------------------------------------
// Build flat data dict for template rendering
// ---------------------------------------------------------------------------

export async function buildReportData(
  disbursementId: string,
  overrides?: Record<string, string>,
): Promise<Record<string, unknown>> {
  const d = await loadFullDisbursement(disbursementId);
  const loan = d.loan;
  const cust = loan.customer;
  const t = today();

  // Collect all invoices (from beneficiary lines)
  const allInvoices = d.beneficiaryLines.flatMap((b) => b.invoices);
  const totalInvoiceAmount = allInvoices.reduce((s, inv) => s + inv.amount, 0);

  // Computed fields
  const remainingLimit = (loan.loanAmount ?? 0) - (d.currentOutstanding ?? 0);
  const loanTermMonths = monthsBetween(loan.startDate, loan.endDate);

  const data: Record<string, unknown> = {
    // --- Date literals ---
    Ngày: t.dd,
    Tháng: t.mm,
    Năm: t.yyyy,

    // --- Customer fields ---
    "Tên khách hàng": cust.customer_name,
    "Mã khách hàng": cust.customer_code,
    "Địa chỉ": cust.address ?? "",
    "Người đại diện": cust.legal_representative_name ?? "",
    "Chức vụ": cust.legal_representative_title ?? "",

    // --- Loan (HĐTD) fields ---
    "HĐTD.Số HĐ tín dụng": loan.contractNumber,
    "HĐTD.Ngày ký HĐTD": fmtDate(loan.startDate),
    "HĐTD.Hạn mức tín dụng": loan.loanAmount,
    "HĐTD.Hạn mức được giải ngân theo tài sản": loan.disbursementLimitByAsset ?? "",
    "HĐTD.Thời hạn duy trì HMTD": loanTermMonths,
    "HĐTD.Mục đích vay": loan.purpose ?? "",
    "HĐTD.Tổng giá trị TSBĐ": loan.collateralValue ?? "",
    "HĐTD.Tổng nghĩa vụ bảo đảm": loan.securedObligation ?? "",

    // --- Disbursement (GN) fields ---
    "GN.Hạn mức tín dụng": loan.loanAmount,
    "GN.Dư nợ hiện tại": d.currentOutstanding ?? 0,
    "GN.Hạn mức còn lại": remainingLimit,
    "GN.Số tiền nhận nợ": d.debtAmount ?? d.amount,
    "GN.STNN bằng chữ": numberToVietnameseWords(d.debtAmount ?? d.amount),
    "GN.Tổng dư nợ": d.totalOutstanding ?? 0,
    "GN.TDN bằng chữ": numberToVietnameseWords(d.totalOutstanding ?? 0),
    "GN.Mục đích": d.purpose ?? "",
    "GN.Tài liệu chứng minh": d.supportingDoc ?? "",
    "GN.Thời hạn cho vay": d.loanTerm ?? "",
    "GN.Hạn trả cuối cùng": fmtDate(d.repaymentEndDate),
    "GN.Định kỳ trả gốc": d.principalSchedule ?? "",
    "GN.Định kỳ trả lãi": d.interestSchedule ?? "",
    "GN.Lãi suất vay": loan.interestRate ?? "",
    "GN.Tổng mức cấp tín dụng": loan.loanAmount,
    "GN.Tổng Số tiền hóa đơn": totalInvoiceAmount,

    // --- Loan misc ---
    "Số giải ngân": loan.disbursementCount ?? "",

    // --- Loop: Beneficiary table (UNC) ---
    UNC: d.beneficiaryLines.map((b, i) => ({
      STT: i + 1,
      "Khách hàng thụ hưởng": b.beneficiaryName,
      "Số tài khoản": b.accountNumber ?? "",
      "Nơi mở tài khoản": b.bankName ?? "",
      "Số tiền": b.amount,
    })),

    // --- Loop: Invoice table (HD) ---
    HD: allInvoices.map((inv, i) => ({
      STT: i + 1,
      "Tổ chức phát hành": inv.supplierName,
      "Số hóa đơn": inv.invoiceNumber,
      "Ngày hóa đơn": fmtDate(inv.issueDate),
      "Số tiền hóa đơn": inv.amount,
    })),
  };

  // Merge manual overrides (e.g., Mã CN, Tên chi nhánh, CMND, etc.)
  if (overrides) {
    for (const [key, val] of Object.entries(overrides)) {
      if (val !== undefined && val !== "") {
        data[key] = val;
      }
    }
  }

  return data;
}

// ---------------------------------------------------------------------------
// Generate report DOCX → return Buffer
// ---------------------------------------------------------------------------

function fmtDateCompact(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}-${mm}-${yyyy}`;
}

async function generateSingleDocx(
  templatePath: string,
  data: Record<string, unknown>,
  label: string,
): Promise<{ buffer: Buffer; filename: string }> {
  const tmpDir = path.join(process.cwd(), "report_assets", "generated");
  await fs.mkdir(tmpDir, { recursive: true });

  const ts = Date.now();
  const tmpFile = path.join(tmpDir, `report-${ts}.docx`);
  const tmpRel = path.relative(process.cwd(), tmpFile).replaceAll("\\", "/");

  await docxEngine.generateDocx(templatePath, data, tmpRel);

  const buffer = await fs.readFile(tmpFile);
  await fs.unlink(tmpFile).catch(() => {});

  const customerName = String(data["Tên khách hàng"] ?? "Report");
  const dateStr = fmtDateCompact(new Date());
  const filename = `${customerName}_${label}_${dateStr}.docx`;
  return { buffer, filename };
}

export async function generateReport(
  disbursementId: string,
  templateKey: TemplateKey,
  overrides?: Record<string, string>,
): Promise<{ buffer: Buffer; filename: string }> {
  const template = DISBURSEMENT_TEMPLATES[templateKey];
  if (!template) throw new NotFoundError("Unknown template key.");

  const data = await buildReportData(disbursementId, overrides);

  // in_unc is a per-beneficiary print form — flatten UNC prefix for single beneficiary
  if (templateKey === "in_unc") {
    const beneficiaryLines = data.UNC as Array<Record<string, unknown>> | undefined;
    if (!beneficiaryLines || beneficiaryLines.length === 0) {
      throw new NotFoundError("No beneficiary lines found for UNC printing.");
    }

    // Generate one file for the first beneficiary (or all combined in a zip could be future work)
    const line = beneficiaryLines[0];
    const uncData: Record<string, unknown> = {
      ...data,
      "UNC.Khách hàng thụ hưởng": line["Khách hàng thụ hưởng"],
      "UNC.Số tài khoản": line["Số tài khoản"],
      "UNC.Nơi mở tài khoản": line["Nơi mở tài khoản"],
      "UNC.Số tiền": line["Số tiền"],
      "UNC.ST bằng chữ": numberToVietnameseWords(Number(line["Số tiền"]) || 0),
    };

    return generateSingleDocx(template.path, uncData, template.label);
  }

  return generateSingleDocx(template.path, data, template.label);
}
