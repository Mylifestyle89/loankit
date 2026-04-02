/**
 * KHCN (individual customer) report service — generates DOCX from templates + DB data.
 * Builds data dict from all customer tabs: info, branch/staff, co-borrowers,
 * related persons, credit info, loans, collaterals, loan plans.
 */
import { docxEngine } from "@/lib/docx-engine";
import { cloneSectionsForAssets, CATEGORY_TO_PREFIX, CATEGORY_TO_COLLATERAL_TYPE } from "@/lib/docx-section-cloner";
import { KHCN_TEMPLATES } from "@/lib/loan-plan/khcn-template-registry";
import { ASSET_CATEGORY_KEYS } from "@/lib/loan-plan/khcn-asset-template-registry";
import { numberToVietnameseWords } from "@/lib/number-to-vietnamese-words";
import { fmtDate, fmtDateCompact, today } from "@/lib/report/report-date-utils";
import { fmtN } from "@/lib/report/format-number-vn";

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
  OVERDUE_INTEREST_LABEL,
  LATE_PAYMENT_INTEREST_LABEL,
} from "./khcn-report-data-builders";
import {
  KHCN_DISBURSEMENT_TEMPLATES,
  type KhcnDisbursementTemplateKey,
} from "./khcn-disbursement-template-config";
import { loadFullCustomer } from "./khcn-report-data-loader";
import {
  mergeKhcnPriorContractAliases,
  flattenUncPlaceholders,
  buildBangKeItems,
} from "./khcn-report-helpers";

// ── Build flat data dict for KHCN template rendering ──

export async function buildKhcnReportData(
  customerId: string,
  loanId?: string,
  overrides?: Record<string, string>,
  disbursementId?: string,
): Promise<Record<string, unknown>> {
  const c = await loadFullCustomer(customerId, loanId, disbursementId);
  const t = today();
  const cicProductName = c.cic_product_name ?? "";
  const cicProductCode = c.cic_product_code ?? "";

  const loan = c.loans[0]; // Already filtered by loanId in query
  const latestPlan = c.loan_plans[0];

  // Filter collaterals by loan selection (empty = use all for backward compat)
  let collaterals = c.collaterals;
  if (loan?.selectedCollateralIds) {
    try {
      const selectedIds: string[] = JSON.parse(loan.selectedCollateralIds);
      if (selectedIds.length > 0) {
        collaterals = c.collaterals.filter((col) => selectedIds.includes(col.id));
      }
    } catch { /* invalid JSON — use all */ }
  }

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
    "Tên sản phẩm TTTD": cicProductName,
    "Mã sản phẩm TTTD": cicProductCode,
    // CIC aliases across old/new template variants
    "Tên sản phẩm tra cứu": cicProductName,
    "Tên sản phẩm tra cứu:": cicProductName,
    "Tên sản phẩm tra cứu CIC": cicProductName,
    "Mã sản phẩm": cicProductCode,
    "Mã sản phẩm:": cicProductCode,
    "Mã sản phẩm tra cứu": cicProductCode,
    // Canonical smart-field keys used by some templates
    "A.credit.product_name": cicProductName,
    "A.credit.product_code": cicProductCode,
    "customer.cic_product_name": cicProductName,
    "customer.cic_product_code": cicProductCode,
    "Mục đích tra cứu CIC": "Kiểm tra TTTD trước khi cho vay",
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
    data["HĐTD.Số tiền vay"] = fmtN(loan.loanAmount);
    data["HĐTD.STvay bằng chữ"] = numberToVietnameseWords(loan.loanAmount);
    data["HĐTD.Mục đích vay"] = loan.purpose ?? "";
    // Thời hạn vay: tính tháng, nếu < 1 tháng → tính ngày (cầm cố thường ngắn hạn theo ngày)
    if (loan.endDate) {
      const diffMs = loan.endDate.getTime() - loan.startDate.getTime();
      const diffDays = Math.round(diffMs / (24 * 3600000));
      const diffMonths = (loan.endDate.getFullYear() - loan.startDate.getFullYear()) * 12
        + (loan.endDate.getMonth() - loan.startDate.getMonth());
      if (diffMonths < 1) {
        data["HĐTD.Thời hạn vay"] = String(diffDays);
        data["HĐTD.Kiểu thời hạn"] = "ngày";
      } else {
        data["HĐTD.Thời hạn vay"] = String(diffMonths);
        data["HĐTD.Kiểu thời hạn"] = "tháng";
      }
    } else {
      data["HĐTD.Thời hạn vay"] = "";
      data["HĐTD.Kiểu thời hạn"] = "";
    }
    data["HĐTD.Hạn trả cuối"] = fmtDate(loan.endDate);
    // Format lãi suất: 9.5 → "9,5%/năm"
    const rate = loan.interestRate;
    data["HĐTD.Lãi suất vay"] = typeof rate === "number" && rate > 0
      ? `${(rate < 1 ? rate * 100 : rate).toFixed(2).replace(".", ",")}%/năm`
      : "";
    data["HĐTD.Lãi suất quá hạn"] = OVERDUE_INTEREST_LABEL;
    data["HĐTD.Lãi suất chậm trả"] = LATE_PAYMENT_INTEREST_LABEL;
    // Phương thức cho vay: ưu tiên text tự nhập trên HĐ (lending_method), sau đó map từ loan_method (sản phẩm)
    const lendingMethodMap: Record<string, string> = {
      tung_lan: "Cho vay từng lần",
      han_muc: "Cho vay theo hạn mức tín dụng",
      du_an: "Cho vay theo dự án đầu tư",
      hop_von: "Cho vay hợp vốn",
      tra_gop: "Cho vay trả góp",
      the_chap: "Cho vay thế chấp",
    };
    const lendingFreeText = (loan.lending_method ?? "").trim();
    data["HĐTD.Phương thức cho vay"] = lendingFreeText
      ? lendingFreeText
      : lendingMethodMap[loan.loan_method ?? ""] ?? loan.loan_method ?? "";

    // Extended HĐTD fields (lending terms, equity, rating, etc.)
    buildLoanExtendedData(loan, data);

    // Latest disbursement snapshot
    const latestDisb = loan.disbursements[0];
    if (latestDisb) {
      data["GN.Dư nợ hiện tại"] = fmtN(latestDisb.currentOutstanding);
      data["GN.Số tiền nhận nợ"] = fmtN(latestDisb.debtAmount ?? latestDisb.amount);
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
          address: bl.address,
          accountNumber: bl.accountNumber,
          bankName: bl.bankName,
        })),
      );
    } else {
      data.UNC = buildBeneficiaryLoopData(loan.beneficiaries);
    }
  }

  // ── Collateral (TSBĐ) loop — filtered by loan selection ──
  data.TSBD = collaterals.map((col, i) => {
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

  // Total collateral summary — một nguồn hiển thị: có chi tiết TSBĐ → tổng từ DB collateral; không → snapshot trên khoản vay
  const totalCollateralValue = collaterals.reduce((s, col) => s + (col.total_value ?? 0), 0);
  const totalObligation = collaterals.reduce((s, col) => s + (col.obligation ?? 0), 0);
  const useCollateralRows = collaterals.length > 0;
  const displayCollateralTotal = useCollateralRows ? totalCollateralValue : Number(loan?.collateralValue ?? 0);
  const displayObligationTotal = useCollateralRows ? totalObligation : Number(loan?.securedObligation ?? 0);

  data["Tổng giá trị TSBĐ"] = displayCollateralTotal ? fmtN(displayCollateralTotal) : "";
  data["HĐTD.Tổng giá trị TSBĐ"] = displayCollateralTotal ? fmtN(displayCollateralTotal) : "";
  data["Tổng giá trị TSBĐ bằng chữ"] = displayCollateralTotal ? numberToVietnameseWords(displayCollateralTotal) : "";
  data["Tổng nghĩa vụ bảo đảm"] = displayObligationTotal ? fmtN(displayObligationTotal) : "";
  data["HĐTD.Tổng nghĩa vụ bảo đảm"] = displayObligationTotal ? fmtN(displayObligationTotal) : "";
  data["HĐTD.Tổng nghĩa vụ bảo đảm tối đa"] = displayObligationTotal ? fmtN(displayObligationTotal) : "";
  data["HĐTD.Tổng Nghĩa vụ bảo đảm tối đa"] = displayObligationTotal ? fmtN(displayObligationTotal) : "";
  if (displayCollateralTotal) {
    data["HĐTD.TGTTSBĐ bằng chữ"] = numberToVietnameseWords(displayCollateralTotal);
  }
  if (displayObligationTotal) {
    const oblWords = numberToVietnameseWords(displayObligationTotal);
    data["HĐTD.TNVBĐ bằng chữ"] = oblWords;
    data["HĐTD.TNVBĐTĐ bằng chữ"] = oblWords;
  }

  // Type-specific collateral flat fields (using filtered selection)
  buildLandCollateralData(collaterals, data);
  buildMovableCollateralData(collaterals, data);
  buildSavingsCollateralData(collaterals, data);
  buildOtherCollateralData(collaterals, data);

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
        const months = (loan.endDate.getFullYear() - loan.startDate.getFullYear()) * 12
          + (loan.endDate.getMonth() - loan.startDate.getMonth());
        data["PA.Thời hạn vay"] = months > 0 ? String(months) : "";
      }
      if (!data["PA.Lãi suất vay"] && loan.interestRate) {
        const rate = loan.interestRate;
        data["PA.Lãi suất vay"] = `${(rate < 1 ? rate * 100 : rate).toFixed(2).replace(".", ",")}%/năm`;
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

  // Hợp nhất placeholder HĐ cũ (PA / HĐTD / phương án) — chỉ điền khi ô còn trống
  mergeKhcnPriorContractAliases(data);

  // Merge manual overrides (last, so they can override any computed value)
  if (overrides) {
    for (const [key, val] of Object.entries(overrides)) {
      if (val !== undefined && val !== "") data[key] = val;
    }
  }

  return data;
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

  // Count collaterals of matching type for clone count (skip if template uses loops)
  const collaterals = data.TSBD as Array<{ "Loại TSBĐ": string }> | undefined;
  const noClone = templateEntry?.noClone === true;
  const count = (isAssetTemplate && prefix && collateralType && collaterals && !noClone)
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

  // BANG_KE loop: collect invoices from bang_ke beneficiary lines for Bảng kê mua hàng
  if (templateKey === "bang_ke_mua_hang") {
    const bangKeItems = await buildBangKeItems(loanId, disbursementId);
    data["BANG_KE"] = bangKeItems;
  }

  const buffer = await docxEngine.generateDocxBuffer(template.path, data);

  const customerName = String(data["Tên khách hàng"] ?? "KHCN");
  const filename = `${customerName}_${template.label}_${fmtDateCompact(new Date())}.docx`;

  return {
    buffer,
    filename,
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
}
