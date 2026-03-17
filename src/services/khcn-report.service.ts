/**
 * KHCN (individual customer) report service — generates DOCX from templates + DB data.
 * Builds data dict from all customer tabs: info, branch/staff, co-borrowers,
 * related persons, credit info, loans, collaterals, loan plans.
 */
import { NotFoundError } from "@/core/errors/app-error";
import { docxEngine } from "@/lib/docx-engine";
import { cloneSectionsForAssets, CATEGORY_TO_PREFIX, CATEGORY_TO_COLLATERAL_TYPE } from "@/lib/docx-section-cloner";
import { KHCN_TEMPLATES } from "@/lib/loan-plan/khcn-template-registry";
import { ASSET_CATEGORY_KEYS } from "@/lib/loan-plan/khcn-asset-template-registry";
import { numberToVietnameseWords } from "@/lib/number-to-vietnamese-words";
import { prisma } from "@/lib/prisma";
import { fmtDate, fmtDateCompact, today } from "@/lib/report/report-date-utils";

import {
  buildBeneficiaryLoopData,
  buildBranchStaffData,
  buildCoBorrowerData,
  buildCreditAgribankData,
  buildCreditOtherData,
  buildCustomerAliases,
  buildDisbursementExtendedData,
  buildLandCollateralData,
  buildLoanExtendedData,
  buildLoanPlanExtendedData,
  buildMovableCollateralData,
  buildOtherCollateralData,
  buildRelatedPersonData,
  buildSavingsCollateralData,
} from "./khcn-report-data-builders";
import {
  KHCN_DISBURSEMENT_TEMPLATES,
  type KhcnDisbursementTemplateKey,
} from "./khcn-disbursement-template-config";

// ── Load full customer with ALL relations needed for templates ──

async function loadFullCustomer(customerId: string, loanId?: string, disbursementId?: string) {
  const c = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      active_branch: true,
      loans: {
        where: loanId ? { id: loanId } : undefined,
        take: 1,
        include: {
          disbursements: disbursementId
            ? { where: { id: disbursementId }, take: 1, include: { beneficiaryLines: true } }
            : { orderBy: { disbursementDate: "desc" }, take: 1, include: { beneficiaryLines: true } },
          beneficiaries: true,
        },
        orderBy: { startDate: "desc" },
      },
      collaterals: { orderBy: { createdAt: "asc" } },
      loan_plans: { orderBy: { createdAt: "desc" }, take: 1 },
      co_borrowers: { orderBy: { createdAt: "asc" } },
      related_persons: { orderBy: { createdAt: "asc" } },
      credit_agribank: { orderBy: { createdAt: "asc" } },
      credit_other: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!c) throw new NotFoundError("Customer not found.");
  return c;
}

// ── Build flat data dict for KHCN template rendering ──

export async function buildKhcnReportData(
  customerId: string,
  loanId?: string,
  overrides?: Record<string, string>,
  disbursementId?: string,
): Promise<Record<string, unknown>> {
  const c = await loadFullCustomer(customerId, loanId, disbursementId);
  const t = today();

  const loan = c.loans[0]; // Already filtered by loanId in query
  const latestPlan = c.loan_plans[0];

  const data: Record<string, unknown> = {
    // ── Date literals ──
    Ngày: t.dd,
    Tháng: t.mm,
    Năm: t.yyyy,
    năm: t.yyyy, // lowercase alias used in some templates

    // ── Customer (individual) fields ──
    "Tên khách hàng": c.customer_name,
    "Mã khách hàng": c.customer_code,
    "Địa chỉ": c.address ?? "",
    CCCD: c.cccd ?? "",
    "Ngày cấp CCCD": c.cccd_issued_date ?? "",
    "Nơi cấp CCCD": c.cccd_issued_place ?? "",
    "Năm sinh": c.date_of_birth ?? "",
    "Giới tính": c.gender === "male" ? "Nam" : c.gender === "female" ? "Nữ" : "",
    "Số điện thoại": c.phone ?? "",
    "Tình trạng hôn nhân": c.marital_status ?? "",
    "Họ tên vợ/chồng": c.spouse_name ?? "",
    "CCCD vợ/chồng": c.spouse_cccd ?? "",
    "Số tài khoản": c.bank_account ?? "",
    "Nơi mở tài khoản": c.bank_name ?? "",
    "Văn bản ủy quyền số": "", // Filled via override if applicable
  };

  // Customer aliases (CMND, Danh xưng, Tên gọi in hoa, etc.)
  buildCustomerAliases(c, data);

  // ── Branch & Staff ──
  buildBranchStaffData(c.active_branch, {
    relationship_officer: c.relationship_officer,
    appraiser: c.appraiser,
    approver_name: c.approver_name,
    approver_title: c.approver_title,
  }, data);

  // ── Loan (HĐTD) fields ──
  if (loan) {
    data["HĐTD.Số HĐ tín dụng"] = loan.contractNumber;
    data["HĐTD.Ngày ký HĐTD"] = fmtDate(loan.startDate);
    data["HĐTD.Số tiền vay"] = loan.loanAmount;
    data["HĐTD.STvay bằng chữ"] = numberToVietnameseWords(loan.loanAmount);
    data["HĐTD.Mục đích vay"] = loan.purpose ?? "";
    data["HĐTD.Thời hạn vay"] = loan.endDate
      ? `${Math.round((loan.endDate.getTime() - loan.startDate.getTime()) / (30.44 * 24 * 3600000))} tháng`
      : "";
    data["HĐTD.Hạn trả cuối"] = fmtDate(loan.endDate);
    // Format lãi suất: 9.5 → "9,5%/năm"
    const rate = loan.interestRate;
    data["HĐTD.Lãi suất vay"] = typeof rate === "number" && rate > 0
      ? `${parseFloat((rate < 1 ? rate * 100 : rate).toFixed(2)).toString().replace(".", ",")}%/năm`
      : "";
    // Lãi suất quá hạn = 150% lãi suất trong hạn (theo quy định Agribank)
    data["HĐTD.Lãi suất quá hạn"] = typeof rate === "number" && rate > 0
      ? `${parseFloat(((rate < 1 ? rate * 100 : rate) * 1.5).toFixed(2)).toString().replace(".", ",")}%/năm`
      : "";
    // Lãi chậm trả = 130% lãi suất trong hạn
    data["HĐTD.Lãi suất chậm trả"] = typeof rate === "number" && rate > 0
      ? `${parseFloat(((rate < 1 ? rate * 100 : rate) * 1.3).toFixed(2)).toString().replace(".", ",")}%/năm`
      : "";
    // Map lending_method enum → tiếng Việt
    const lendingMethodMap: Record<string, string> = {
      tung_lan: "Cho vay từng lần",
      han_muc: "Cho vay theo hạn mức tín dụng",
      du_an: "Cho vay theo dự án đầu tư",
      hop_von: "Cho vay hợp vốn",
      tra_gop: "Cho vay trả góp",
      the_chap: "Cho vay thế chấp",
    };
    data["HĐTD.Phương thức cho vay"] = lendingMethodMap[loan.loan_method ?? ""] ?? loan.loan_method ?? "";
    data["HĐTD.Tổng giá trị TSBĐ"] = loan.collateralValue ?? "";
    data["HĐTD.Tổng nghĩa vụ bảo đảm"] = loan.securedObligation ?? "";

    // Extended HĐTD fields (lending terms, equity, rating, etc.)
    buildLoanExtendedData(loan, data);

    // Latest disbursement snapshot
    const latestDisb = loan.disbursements[0];
    if (latestDisb) {
      data["GN.Dư nợ hiện tại"] = latestDisb.currentOutstanding ?? 0;
      data["GN.Số tiền nhận nợ"] = latestDisb.debtAmount ?? latestDisb.amount;
      data["GN.STNN bằng chữ"] = numberToVietnameseWords(latestDisb.debtAmount ?? latestDisb.amount);
      data["GN.Mục đích"] = latestDisb.purpose ?? "";
      buildDisbursementExtendedData(latestDisb, data);
    }

    // Beneficiaries: prefer disbursement-specific lines over loan-level
    const latestBenefLines = latestDisb?.beneficiaryLines;
    if (latestBenefLines && latestBenefLines.length > 0) {
      data.UNC = buildBeneficiaryLoopData(
        latestBenefLines.map((bl) => ({
          name: bl.beneficiaryName,
          accountNumber: bl.accountNumber,
          bankName: bl.bankName,
        })),
      );
    } else {
      data.UNC = buildBeneficiaryLoopData(loan.beneficiaries);
    }
  }

  // ── Collateral (TSBĐ) loop ──
  data.TSBD = c.collaterals.map((col, i) => {
    const props = JSON.parse(col.properties_json || "{}");
    return {
      STT: i + 1,
      "Tên TSBĐ": col.name,
      "Loại TSBĐ": col.collateral_type,
      "Tổng giá trị TS": col.total_value ?? "",
      "TGTTS bằng chữ": col.total_value ? numberToVietnameseWords(col.total_value) : "",
      "Nghĩa vụ bảo đảm": col.obligation ?? "",
      ...(typeof props === "object" && props !== null ? props : {}),
    };
  });

  // Total collateral summary
  const totalCollateralValue = c.collaterals.reduce((s, col) => s + (col.total_value ?? 0), 0);
  const totalObligation = c.collaterals.reduce((s, col) => s + (col.obligation ?? 0), 0);
  data["Tổng giá trị TSBĐ"] = totalCollateralValue || "";
  data["HĐTD.Tổng giá trị TSBĐ"] = totalCollateralValue || "";
  data["Tổng giá trị TSBĐ bằng chữ"] = totalCollateralValue ? numberToVietnameseWords(totalCollateralValue) : "";
  data["Tổng nghĩa vụ bảo đảm"] = totalObligation || "";
  data["HĐTD.Tổng nghĩa vụ bảo đảm"] = totalObligation || "";

  // Type-specific collateral flat fields
  buildLandCollateralData(c.collaterals, data);
  buildMovableCollateralData(c.collaterals, data);
  buildSavingsCollateralData(c.collaterals, data);
  buildOtherCollateralData(c.collaterals, data);

  // ── CoBorrower (TV = Thành viên đồng vay) ──
  buildCoBorrowerData(c.co_borrowers, data);

  // ── RelatedPerson (NLQ = Người liên quan) ──
  buildRelatedPersonData(c.related_persons, data);

  // ── Credit info (VBA = Agribank, TCTD = other) ──
  buildCreditAgribankData(c.credit_agribank, data);
  buildCreditOtherData(c.credit_other, data);

  // ── Loan plan (Phương án) fields — all PA.* handled by builder ──
  if (latestPlan) {
    buildLoanPlanExtendedData(latestPlan, data);

    // Fallback PA fields from loan if not set by plan financials
    if (loan) {
      if (!data["PA.Mục đích vay"]) data["PA.Mục đích vay"] = loan.purpose ?? "";
      if (!data["PA.Thời hạn vay"] && loan.endDate) {
        const months = Math.round((loan.endDate.getTime() - loan.startDate.getTime()) / (30.44 * 24 * 3600000));
        data["PA.Thời hạn vay"] = months > 0 ? String(months) : "";
      }
      if (!data["PA.Lãi suất vay"] && loan.interestRate) {
        const rate = loan.interestRate;
        data["PA.Lãi suất vay"] = `${parseFloat((rate < 1 ? rate * 100 : rate).toFixed(2))}%/năm`;
      }
    }

    // Map PA financials → HĐTD aliases (only if not already set from loan extended fields)
    const paRevenue = Number(data["PA.Tổng doanh thu dự kiến"]) || 0;
    const paDirectCost = Number(data["PA.Tổng chi phí trực tiếp"]) || 0;
    const paInterest = Number(data["PA.Lãi vay NH"]) || 0;
    const paCost = paDirectCost + paInterest || Number(data["PA.Tổng chi phí dự kiến"]) || 0;
    const paProfit = paRevenue && paCost ? paRevenue - paCost : Number(data["PA.Lợi nhuận dự kiến"]) || 0;

    if (paRevenue && !data["HĐTD.Doanh thu dự kiến"]) data["HĐTD.Doanh thu dự kiến"] = paRevenue;
    if (paCost && !data["HĐTD.Chi phí dự kiến"]) data["HĐTD.Chi phí dự kiến"] = paCost;
    if (paProfit && !data["HĐTD.Lợi nhuận dự kiến"]) data["HĐTD.Lợi nhuận dự kiến"] = paProfit;
  }

  // Merge manual overrides (last, so they can override any computed value)
  if (overrides) {
    for (const [key, val] of Object.entries(overrides)) {
      if (val !== undefined && val !== "") data[key] = val;
    }
  }

  return data;
}

// ── Flatten first beneficiary into UNC.* flat placeholders ──

function flattenUncPlaceholders(
  data: Record<string, unknown>,
  overrides?: Record<string, string>,
): void {
  if (!Array.isArray(data.UNC) || data.UNC.length === 0) return;
  const b = data.UNC[0] as Record<string, unknown>;
  data["UNC.STT"] = b["STT"] ?? 1;
  data["UNC.Khách hàng thụ hưởng"] = b["Khách hàng thụ hưởng"] ?? "";
  data["UNC.Số tài khoản"] = b["Số tài khoản"] ?? "";
  data["UNC.Nơi mở tài khoản"] = b["Nơi mở tài khoản"] ?? "";
  const uncAmount = overrides?.["UNC.Số tiền"] || data["GN.Số tiền nhận nợ"] || b["Số tiền"] || "";
  data["UNC.Số tiền"] = uncAmount;
  data["UNC.ST bằng chữ"] = overrides?.["UNC.ST bằng chữ"] || (uncAmount ? numberToVietnameseWords(Number(uncAmount)) : "");
  data["UNC.Nội dung"] = b["Nội dung"] ?? overrides?.["UNC.Nội dung"] ?? "";
}

// ── Generate DOCX buffer ──

export type KhcnReportResult = { buffer: Buffer; filename: string; contentType: string };

export async function generateKhcnReport(
  customerId: string,
  templatePath: string,
  templateLabel: string,
  loanId?: string,
  overrides?: Record<string, string>,
): Promise<KhcnReportResult> {
  const data = await buildKhcnReportData(customerId, loanId, overrides);

  // Detect asset template category for multi-asset cloning
  const templateEntry = KHCN_TEMPLATES.find((t) => t.path === templatePath);
  const category = templateEntry?.category;
  const isAssetTemplate = category ? ASSET_CATEGORY_KEYS.has(category) : false;
  const prefix = category ? CATEGORY_TO_PREFIX[category] : undefined;
  const collateralType = category ? CATEGORY_TO_COLLATERAL_TYPE[category] : undefined;

  // Flatten first beneficiary into UNC.* flat placeholders
  flattenUncPlaceholders(data, overrides);

  // Count collaterals of matching type for clone count
  const collaterals = data.TSBD as Array<{ "Loại TSBĐ": string }> | undefined;
  const count = (isAssetTemplate && prefix && collateralType && collaterals)
    ? collaterals.filter((c) => c["Loại TSBĐ"] === collateralType).length
    : 0;

  const buffer = await docxEngine.generateDocxBuffer(templatePath, data, {
    preProcessZip: (count > 1 && prefix)
      ? (zip) => cloneSectionsForAssets(zip, prefix, count)
      : undefined,
  });

  const customerName = String(data["Tên khách hàng"] ?? "KHCN");
  const filename = `${customerName}_${templateLabel}_${fmtDateCompact(new Date())}.docx`;

  return {
    buffer,
    filename,
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
}

// ── Generate KHCN disbursement DOCX ──

export async function generateKhcnDisbursementReport(
  customerId: string,
  templateKey: KhcnDisbursementTemplateKey,
  loanId?: string,
  disbursementId?: string,
  overrides?: Record<string, string>,
): Promise<KhcnReportResult> {
  const template = KHCN_DISBURSEMENT_TEMPLATES[templateKey];
  const data = await buildKhcnReportData(customerId, loanId, overrides, disbursementId);

  // Flatten first beneficiary into UNC.* flat placeholders (used by BCDXGN, UNC, etc.)
  flattenUncPlaceholders(data, overrides);

  const buffer = await docxEngine.generateDocxBuffer(template.path, data);

  const customerName = String(data["Tên khách hàng"] ?? "KHCN");
  const filename = `${customerName}_${template.label}_${fmtDateCompact(new Date())}.docx`;

  return {
    buffer,
    filename,
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
}
