/**
 * Disbursement report service — generates DOCX reports from template + DB data.
 * Template config: ./disbursement-report-template-config.ts
 */
import JSZip from "jszip";

import { NotFoundError } from "@/core/errors/app-error";
import { docxEngine } from "@/lib/docx-engine";
import { numberToVietnameseWords } from "@/lib/number-to-vietnamese-words";
import { prisma } from "@/lib/prisma";
import {
  DISBURSEMENT_TEMPLATES,
  ALLOWED_OVERRIDE_KEYS,
  type TemplateKey,
} from "./disbursement-report-template-config";

export { DISBURSEMENT_TEMPLATES, type TemplateKey } from "./disbursement-report-template-config";

import { fmtDate, fmtDateCompact, monthsBetween, today } from "@/lib/report/report-date-utils";
import { fmtN } from "@/lib/report/format-number-vn";

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
  templateKey?: TemplateKey,
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

  // Build "Hóa đơn chứng từ" detail: list beneficiary + invoice numbers, or "Cam kết bổ sung hóa đơn"
  const invoiceDetailParts = d.beneficiaryLines
    .filter((b) => b.beneficiaryName?.trim())
    .map((b) => {
      const invoiceNums = b.invoices
        .filter((inv) => inv.invoiceNumber?.trim())
        .map((inv) => inv.invoiceNumber.trim());
      if (invoiceNums.length > 0) {
        return `${b.beneficiaryName}: ${invoiceNums.join(", ")}`;
      }
      return `${b.beneficiaryName}: Cam kết bổ sung hóa đơn`;
    });
  const invoiceDetail = invoiceDetailParts.length > 0
    ? `Hóa đơn chứng từ (${invoiceDetailParts.join("; ")})`
    : "Hóa đơn chứng từ (Cam kết bổ sung hóa đơn)";

  // Format "Số giải ngân" as "5400LDS{yyyy}0...."
  const disbCountRaw = loan.disbursementCount ?? "";
  const disbNumber = `5400LDS${t.yyyy}0${String(disbCountRaw).padStart(3, "0")}`;

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
    "HĐTD.Tổng giá trị TSBĐ": fmtN(loan.collateralValue),
    "HĐTD.Tổng nghĩa vụ bảo đảm": fmtN(loan.securedObligation),
    // Duplicate keys without prefix — some DOCX templates use unprefixed placeholders
    "Tổng giá trị TSBĐ": fmtN(loan.collateralValue),
    "Tổng nghĩa vụ bảo đảm": fmtN(loan.securedObligation),

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
    "GN.Số tiền nợ hóa đơn": totalInvoiceAmount,
    "GN.Số tiền nợ hóa đơn bằng chữ": numberToVietnameseWords(totalInvoiceAmount),

    // --- Loan misc ---
    "Số giải ngân": disbNumber,

    // --- Checklist: Invoice detail for "danh_muc_ho_so" ---
    "Hóa đơn chứng từ": invoiceDetail,

    // --- Loop: Beneficiary table (UNC) — filter empty lines ---
    UNC: d.beneficiaryLines
      .filter((b) => b.beneficiaryName?.trim() || b.amount > 0)
      .map((b, i) => ({
        STT: i + 1,
        "Khách hàng thụ hưởng": b.beneficiaryName,
        "Số tài khoản": b.accountNumber ?? "",
        "Nơi mở tài khoản": b.bankName ?? "",
        "Số tiền": b.amount,
      })),

    // --- Loop: Invoice table (HD) — filter empty lines ---
    HD: allInvoices
      .filter((inv) => inv.invoiceNumber?.trim() || inv.supplierName?.trim())
      .map((inv, i) => ({
        STT: i + 1,
        "Tổ chức phát hành": inv.supplierName,
        "Số hóa đơn": inv.invoiceNumber,
        "Ngày hóa đơn": fmtDate(inv.issueDate),
        "Số tiền hóa đơn": inv.amount,
      })),
  };

  // Merge manual overrides — only whitelisted keys per template (security)
  // Map override keys to their prefixed template placeholder aliases
  const OVERRIDE_ALIASES: Record<string, string[]> = {
    "Tổng giá trị TSBĐ": ["HĐTD.Tổng giá trị TSBĐ"],
    "Phạm vi bảo đảm": ["HĐTD.Tổng nghĩa vụ bảo đảm", "Tổng nghĩa vụ bảo đảm"],
  };
  if (overrides && templateKey) {
    const allowed = new Set(ALLOWED_OVERRIDE_KEYS[templateKey] ?? []);
    for (const [key, val] of Object.entries(overrides)) {
      if (val !== undefined && val !== "" && allowed.has(key)) {
        data[key] = val;
        // Also set prefixed aliases so template placeholders match
        for (const alias of OVERRIDE_ALIASES[key] ?? []) {
          data[alias] = val;
        }
      }
    }
  }

  // Auto-calc: Tổng mức cấp tín dụng = Dư nợ hiện tại + Số dư L/C + Số dư bảo lãnh
  const parseNum = (v: unknown) => Number(String(v ?? "0").replace(/\./g, "")) || 0;
  const tongMucCapTD = parseNum(data["GN.Dư nợ hiện tại"])
    + parseNum(data["GN.Số dư L/C"])
    + parseNum(data["GN.Số dư bảo lãnh"]);
  data["GN.Tổng mức cấp tín dụng"] = tongMucCapTD;

  return data;
}

// ---------------------------------------------------------------------------
// Generate report DOCX → return Buffer
// ---------------------------------------------------------------------------


async function generateSingleDocx(
  templatePath: string,
  data: Record<string, unknown>,
  label: string,
): Promise<{ buffer: Buffer; filename: string }> {
  // Use in-memory buffer generation — no filesystem write (Vercel-safe)
  const buffer = await docxEngine.generateDocxBuffer(templatePath, data);

  const customerName = String(data["Tên khách hàng"] ?? "Report");
  const dateStr = fmtDateCompact(new Date());
  const filename = `${customerName}_${label}_${dateStr}.docx`;
  return { buffer, filename };
}

export type ReportResult = { buffer: Buffer; filename: string; contentType: string };

/** Build per-beneficiary UNC data dict by flattening one line into top-level keys */
function buildUncDataForLine(baseData: Record<string, unknown>, line: Record<string, unknown>): Record<string, unknown> {
  return {
    ...baseData,
    "UNC.Khách hàng thụ hưởng": line["Khách hàng thụ hưởng"],
    "UNC.Số tài khoản": line["Số tài khoản"],
    "UNC.Nơi mở tài khoản": line["Nơi mở tài khoản"],
    "UNC.Số tiền": line["Số tiền"],
    "UNC.ST bằng chữ": numberToVietnameseWords(Number(line["Số tiền"]) || 0),
  };
}

export async function generateReport(
  disbursementId: string,
  templateKey: TemplateKey,
  overrides?: Record<string, string>,
): Promise<ReportResult> {
  const template = DISBURSEMENT_TEMPLATES[templateKey];
  if (!template) throw new NotFoundError("Unknown template key.");

  const data = await buildReportData(disbursementId, overrides, templateKey);
  const docxType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  // in_unc: one DOCX per beneficiary, zip if multiple
  if (templateKey === "in_unc") {
    const beneficiaryLines = data.UNC as Array<Record<string, unknown>> | undefined;
    if (!beneficiaryLines || beneficiaryLines.length === 0) {
      throw new NotFoundError("No beneficiary lines found for UNC printing.");
    }

    // Single beneficiary — return single docx
    if (beneficiaryLines.length === 1) {
      const uncData = buildUncDataForLine(data, beneficiaryLines[0]);
      const result = await generateSingleDocx(template.path, uncData, template.label);
      return { ...result, contentType: docxType };
    }

    // Multiple beneficiaries — generate one docx per line, bundle as zip
    const zip = new JSZip();
    for (const line of beneficiaryLines) {
      const uncData = buildUncDataForLine(data, line);
      const name = String(line["Khách hàng thụ hưởng"] ?? "beneficiary");
      const { buffer } = await generateSingleDocx(template.path, uncData, template.label);
      zip.file(`UNC_${name}.docx`, buffer);
    }
    const zipBuffer = Buffer.from(await zip.generateAsync({ type: "uint8array" }));
    const customerName = String(data["Tên khách hàng"] ?? "Report");
    const dateStr = fmtDateCompact(new Date());
    return {
      buffer: zipBuffer,
      filename: `${customerName}_UNC_${dateStr}.zip`,
      contentType: "application/zip",
    };
  }

  const result = await generateSingleDocx(template.path, data, template.label);
  return { ...result, contentType: docxType };
}
