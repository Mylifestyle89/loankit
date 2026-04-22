/**
 * KHCN report data builder — builds flat data dict from DB for template rendering.
 * Covers: customer info, branch/staff, loans, collaterals, co-borrowers,
 * credit info, related persons, loan plans.
 */
import { decryptCollateralOwners } from "@/lib/field-encryption";
import { numberToVietnameseWords } from "@/lib/number-to-vietnamese-words";
import { fmtDate, today } from "@/lib/report/report-date-utils";
import { fmtN } from "@/lib/report/format-number-vn";

import {
  buildBeneficiaryLoopData,
  buildBranchStaffData,
  buildCoBorrowerData,
  buildCreditAgribankData,
  buildCreditOtherData,
  buildUnifiedCreditLoop,
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
import { buildDocumentsPAData } from "./khcn-builder-documents-pa";
import { loadFullCustomer } from "./khcn-report-data-loader";
import { mergeKhcnPriorContractAliases } from "./khcn-report-helpers";

export async function buildKhcnReportData(
  customerId: string,
  loanId?: string,
  overrides?: Record<string, string>,
  disbursementId?: string,
  collateralIds?: string[],
): Promise<Record<string, unknown>> {
  const c = await loadFullCustomer(customerId, loanId, disbursementId);
  const t = today();
  const cicProductName = c.cic_product_name ?? "";
  const cicProductCode = c.cic_product_code ?? "";

  const loan = c.loans[0];
  const latestPlan = c.loan_plans[0];

  // Filter collaterals: explicit selection from UI takes priority over loan.selectedCollateralIds
  let collaterals = c.collaterals;
  if (collateralIds && collateralIds.length > 0) {
    collaterals = c.collaterals.filter((col) => collateralIds.includes(col.id));
  } else if (loan?.selectedCollateralIds) {
    try {
      const selectedIds: string[] = JSON.parse(loan.selectedCollateralIds);
      if (selectedIds.length > 0) {
        collaterals = c.collaterals.filter((col) => selectedIds.includes(col.id));
      }
    } catch { /* invalid JSON — use all */ }
  }

  const data: Record<string, unknown> = {
    Ngày: t.dd,
    Tháng: t.mm,
    Năm: t.yyyy,
    năm: t.yyyy,
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
    "Tên sản phẩm tra cứu": cicProductName,
    "Tên sản phẩm tra cứu:": cicProductName,
    "Tên sản phẩm tra cứu CIC": cicProductName,
    "Mã sản phẩm": cicProductCode,
    "Mã sản phẩm:": cicProductCode,
    "Mã sản phẩm tra cứu": cicProductCode,
    "A.credit.product_name": cicProductName,
    "A.credit.product_code": cicProductCode,
    "customer.cic_product_name": cicProductName,
    "customer.cic_product_code": cicProductCode,
    "Mục đích tra cứu CIC": "Kiểm tra TTTD trước khi cho vay",
    "Văn bản ủy quyền số": "",
  };

  // Extended customer fields from data_json (Lộc Việt + general)
  const dataJson: Record<string, unknown> =
    typeof c.data_json === "string" ? JSON.parse(c.data_json || "{}") : (c.data_json ?? {});
  data["Nghề nghiệp"] = dataJson.occupation ?? "";
  data["Quốc tịch"] = dataJson.nationality ?? "Việt Nam";
  data["Loại giấy tờ tùy thân"] = dataJson.id_type ?? "CCCD";
  data["Nơi công tác"] = dataJson.workplace ?? "";
  data["Thu nhập bình quân/tháng"] = dataJson.monthly_income ? fmtN(Number(dataJson.monthly_income)) : "";
  data["Ngành nghề kinh doanh"] = c.main_business ?? "";

  buildCustomerAliases(c, data);

  buildBranchStaffData(
    c.active_branch,
    {
      relationship_officer: c.relationship_officer,
      appraiser: c.appraiser,
      approver_name: c.approver_name,
      approver_title: c.approver_title,
    },
    data,
  );

  if (loan) {
    data["HĐTD.Số HĐ tín dụng"] = loan.contractNumber;
    data["HĐTD.Ngày ký HĐTD"] = fmtDate(loan.startDate);
    data["HĐTD.Số tiền vay"] = fmtN(loan.loanAmount);
    data["HĐTD.STvay bằng chữ"] = numberToVietnameseWords(loan.loanAmount);
    data["HĐTD.Mục đích vay"] = loan.purpose ?? "";

    if (loan.endDate) {
      const diffMs = loan.endDate.getTime() - loan.startDate.getTime();
      const diffDays = Math.round(diffMs / (24 * 3600000));
      const diffMonths =
        (loan.endDate.getFullYear() - loan.startDate.getFullYear()) * 12 +
        (loan.endDate.getMonth() - loan.startDate.getMonth());
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
    const rate = loan.interestRate;
    data["HĐTD.Lãi suất vay"] =
      typeof rate === "number" && rate > 0
        ? `${(rate < 1 ? rate * 100 : rate).toFixed(2).replace(".", ",")}%/năm`
        : "";
    data["HĐTD.Lãi suất quá hạn"] = OVERDUE_INTEREST_LABEL;
    data["HĐTD.Lãi suất chậm trả"] = LATE_PAYMENT_INTEREST_LABEL;

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
      : (lendingMethodMap[loan.loan_method ?? ""] ?? loan.loan_method ?? "");

    // Thẻ tín dụng Lộc Việt
    data["HĐTD.Hạn mức thẻ tín dụng"] = fmtN(loan.loanAmount);
    data["HĐTD.HMTTD bằng chữ"] = numberToVietnameseWords(loan.loanAmount);
    data["HĐTD.Số tài khoản"] = c.bank_account ?? "";
    if (loan.endDate) {
      data["HĐTD.Thời hạn hiệu lực của thẻ"] = `${data["HĐTD.Thời hạn vay"]} ${data["HĐTD.Kiểu thời hạn"]}`.trim();
    }

    buildLoanExtendedData(loan, data);

    const latestDisb = loan.disbursements[0];
    if (latestDisb) {
      data["GN.Dư nợ hiện tại"] = fmtN(latestDisb.currentOutstanding);
      data["GN.Số tiền nhận nợ"] = fmtN(latestDisb.debtAmount ?? latestDisb.amount);
      data["GN.STNN bằng chữ"] = numberToVietnameseWords(latestDisb.debtAmount ?? latestDisb.amount);
      data["GN.Mục đích"] = latestDisb.purpose ?? "";
      buildDisbursementExtendedData(latestDisb, data);
    }

    const latestBenefLines = latestDisb?.beneficiaryLines;
    if (latestBenefLines && latestBenefLines.length > 0) {
      data.UNC = buildBeneficiaryLoopData(
        latestBenefLines.map((bl) => ({
          name: bl.beneficiaryName,
          address: bl.address,
          accountNumber: bl.accountNumber,
          bankName: bl.bankName,
          amount: bl.amount,
        })),
      );
    } else {
      data.UNC = buildBeneficiaryLoopData(loan.beneficiaries);
    }
  }

  data.TSBD = collaterals.map((col, i) => {
    const props = decryptCollateralOwners(JSON.parse(col.properties_json || "{}"));
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

  const totalCollateralValue = collaterals.reduce((s, col) => s + (col.total_value ?? 0), 0);
  const totalObligation = collaterals.reduce((s, col) => s + (col.obligation ?? 0), 0);
  const useCollateralRows = collaterals.length > 0;
  const displayCollateralTotal = useCollateralRows ? totalCollateralValue : Number(loan?.collateralValue ?? 0);
  const displayObligationTotal = useCollateralRows ? totalObligation : Number(loan?.securedObligation ?? 0);

  data["Tổng giá trị TSBĐ"] = displayCollateralTotal ? fmtN(displayCollateralTotal) : "";
  data["HĐTD.Tổng giá trị TSBĐ"] = displayCollateralTotal ? fmtN(displayCollateralTotal) : "";
  data["Tổng giá trị TSBĐ bằng chữ"] = displayCollateralTotal
    ? numberToVietnameseWords(displayCollateralTotal)
    : "";
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

  buildLandCollateralData(collaterals, data);
  buildMovableCollateralData(collaterals, data);
  buildSavingsCollateralData(collaterals, data);
  buildOtherCollateralData(collaterals, data);

  buildCoBorrowerData(c.co_borrowers, data);
  buildRelatedPersonData(c.related_persons, data);
  buildDocumentsPAData(c, data);
  buildCreditAgribankData(c.credit_agribank, data);
  buildCreditOtherData(c.credit_other, data);
  buildUnifiedCreditLoop(data);

  if (latestPlan) {
    buildLoanPlanExtendedData(latestPlan, data);

    if (loan) {
      if (!data["PA.Mục đích vay"]) data["PA.Mục đích vay"] = loan.purpose ?? "";
      if (!data["PA.Thời hạn vay"] && loan.endDate) {
        const months =
          (loan.endDate.getFullYear() - loan.startDate.getFullYear()) * 12 +
          (loan.endDate.getMonth() - loan.startDate.getMonth());
        data["PA.Thời hạn vay"] = months > 0 ? String(months) : "";
      }
      if (!data["PA.Lãi suất vay"] && loan.interestRate) {
        const rate = loan.interestRate;
        data["PA.Lãi suất vay"] = `${(rate < 1 ? rate * 100 : rate).toFixed(2).replace(".", ",")}%/năm`;
      }
    }

    const paRevenue = Number(data["PA.Tổng doanh thu dự kiến"]) || 0;
    const paDirectCost = Number(data["PA.Tổng chi phí trực tiếp"]) || 0;
    const paInterest = Number(data["PA.Lãi vay NH"]) || 0;
    const paCost = paDirectCost + paInterest || Number(data["PA.Tổng chi phí dự kiến"]) || 0;
    const paProfit = paRevenue && paCost ? paRevenue - paCost : Number(data["PA.Lợi nhuận dự kiến"]) || 0;

    if (paRevenue && !data["HĐTD.Doanh thu dự kiến"]) data["HĐTD.Doanh thu dự kiến"] = paRevenue;
    if (paCost && !data["HĐTD.Chi phí dự kiến"]) data["HĐTD.Chi phí dự kiến"] = paCost;
    if (paProfit && !data["HĐTD.Lợi nhuận dự kiến"]) data["HĐTD.Lợi nhuận dự kiến"] = paProfit;
  }

  mergeKhcnPriorContractAliases(data);

  if (overrides) {
    for (const [key, val] of Object.entries(overrides)) {
      if (val !== undefined && val !== "") data[key] = val;
    }
  }

  return data;
}

