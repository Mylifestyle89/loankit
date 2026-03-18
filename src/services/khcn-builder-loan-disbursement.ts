/**
 * KHCN builder: loan extended data, disbursement extended data, beneficiary loop.
 */
import { numberToVietnameseWords } from "@/lib/number-to-vietnamese-words";
import { fmtN } from "@/lib/report/format-number-vn";

type Data = Record<string, unknown>;

// ── Extended Loan (HĐTD) fields ──

export function buildLoanExtendedData(
  loan: {
    loanAmount: number;
    interestRate?: number | null;
    lending_method?: string | null; tcmblm_reason?: string | null;
    interest_method?: string | null; principal_schedule?: string | null;
    interest_schedule?: string | null; policy_program?: string | null;
    total_capital_need?: number | null; equity_amount?: number | null;
    cash_equity?: number | null; labor_equity?: number | null;
    other_loan?: number | null; other_asset_equity?: number | null;
    expected_revenue?: number | null; expected_cost?: number | null;
    expected_profit?: number | null; from_project?: string | null;
    other_income?: string | null; customer_rating?: string | null;
    debt_group?: string | null; scoring_period?: string | null;
    collateralValue?: number | null; securedObligation?: number | null;
    prior_contract_number?: string | null; prior_contract_date?: string | null;
    prior_outstanding?: number | null;
  },
  data: Data,
) {
  data["HĐTD.Bằng chữ"] = numberToVietnameseWords(loan.loanAmount);
  data["HĐTD.số tiền vay"] = fmtN(loan.loanAmount); // lowercase alias in Bia HS
  data["HĐTD.Phương thức áp dụng LS"] = loan.interest_method ?? "";
  data["HĐTD.Định kỳ trả gốc"] = loan.principal_schedule ?? "";
  data["HĐTD.Định kỳ trả lãi"] = loan.interest_schedule ?? "";
  // Lãi suất chậm trả & quá hạn — set by khcn-report.service.ts, keep existing if already set
  if (!data["HĐTD.Lãi suất chậm trả"]) data["HĐTD.Lãi suất chậm trả"] = "";
  if (!data["HĐTD.Lãi suất quá hạn"]) data["HĐTD.Lãi suất quá hạn"] = "";
  data["HĐTD.Phí khác (nếu có)"] = "";
  data["HĐTD.Bổ sung vào HĐTD"] = "";
  data["HĐTD.Bổ sung BCĐX cho vay"] = "";
  data["HĐTD.Giấy tờ ủy quyền"] = "";
  // TNCV = Tổng nhu cầu vốn (alias bằng chữ)
  data["HĐTD.TNCV bằng chữ"] = loan.total_capital_need
    ? numberToVietnameseWords(Number(loan.total_capital_need))
    : "";
  data["HĐTD.Ngày giao/nhận"] = "";
  data["HĐTD.STT"] = "";

  // Chương trình cho vay — policy_program may contain multiple, map first 4 slots
  const programs = (loan.policy_program ?? "").split(";").map((s) => s.trim());
  data["HĐTD.Chương trình cho vay 1"] = programs[0] ?? "";
  data["HĐTD.Chương trình cho vay 2"] = programs[1] ?? "";
  data["HĐTD.Chương trình cho vay 3"] = programs[2] ?? "";
  data["HĐTD.Chương trình cho vay 4"] = programs[3] ?? "";

  // Tài chính minh bạch
  data["HĐTD.Tài chính minh bạch, LM"] = loan.tcmblm_reason ? "Có" : "";
  data["HĐTD.Lý do đáp ứng/không đáp ứng TCMBLM"] = loan.tcmblm_reason ?? "";

  // Vốn đối ứng & nguồn vốn
  data["HĐTD.Tổng nhu cầu vốn"] = fmtN(loan.total_capital_need);
  data["HĐTD.Vốn đối ứng"] = fmtN(loan.equity_amount);
  data["HĐTD.Tỷ lệ vốn đối ứng"] = loan.total_capital_need && loan.equity_amount
    ? `${((loan.equity_amount / loan.total_capital_need) * 100).toFixed(2).replace(".", ",")}%`
    : "";
  data["HĐTD.Tr.đó: Vốn bằng tiền"] = fmtN(loan.cash_equity);
  // Fallback: tính labor_equity = equity_amount - cash_equity nếu chưa lưu
  const laborEquity = loan.labor_equity
    ?? (loan.equity_amount != null && loan.cash_equity != null
      ? Math.max(0, Number(loan.equity_amount) - Number(loan.cash_equity))
      : "");
  data["HĐTD.Vốn bằng sức lao động"] = fmtN(laborEquity);
  data["HĐTD.Vốn vay TCTD khác"] = fmtN(loan.other_loan);
  data["HĐTD.Vốn bằng tài sản khác"] = fmtN(loan.other_asset_equity);

  // Hiệu quả
  data["HĐTD.Tổng doanh thu dự kiến"] = fmtN(loan.expected_revenue);
  data["HĐTD.Tổng chi phí dự kiến"] = fmtN(loan.expected_cost);
  data["HĐTD.Lợi nhuận dự kiến"] = fmtN(loan.expected_profit);
  data["HĐTD.Từ phương án, dự án"] = loan.from_project ?? "";
  data["HĐTD.Thu nhập khác"] = loan.other_income ?? "";

  // Xếp hạng
  data["HĐTD.Xếp hạng khách hàng"] = loan.customer_rating ?? "";
  data["HĐTD.Nhóm nợ"] = loan.debt_group ?? "";
  data["HĐTD.Kỳ chấm điểm"] = loan.scoring_period ?? "";

  // TSBĐ tổng hợp bằng chữ
  data["HĐTD.TGTTSBĐ bằng chữ"] = loan.collateralValue
    ? numberToVietnameseWords(loan.collateralValue)
    : "";
  data["HĐTD.TNVBĐ bằng chữ"] = loan.securedObligation
    ? numberToVietnameseWords(loan.securedObligation)
    : "";
  data["HĐTD.TNVBĐTĐ bằng chữ"] = loan.securedObligation
    ? numberToVietnameseWords(loan.securedObligation)
    : "";
  data["HĐTD.Tổng nghĩa vụ bảo đảm tối đa"] = fmtN(loan.securedObligation);
  data["HĐTD.Tổng Nghĩa vụ bảo đảm tối đa"] = fmtN(loan.securedObligation);

  // Dư nợ tín dụng — populated separately from credit info
  data["HĐTD.Dư nợ của KH và NLQ tại Agribank"] = "";
  data["HĐTD.Dư nợ tại TCTD khác"] = "";

  // HĐ cũ (gia hạn, tái cơ cấu)
  data["PA.HĐ cũ Số"] = loan.prior_contract_number ?? "";
  data["PA.HĐ cũ Ngày"] = loan.prior_contract_date ?? "";
  data["PA.Dư nợ cũ"] = fmtN(loan.prior_outstanding);
  data["HĐTD.Số HĐ cũ"] = loan.prior_contract_number ?? "";
  data["HĐTD.Ngày HĐ cũ"] = loan.prior_contract_date ?? "";
}

// ── Extended Disbursement (GN) fields ──

export function buildDisbursementExtendedData(
  disb: {
    currentOutstanding?: number | null; totalOutstanding?: number | null;
    debtAmount?: number | null; amount: number;
    supportingDoc?: string | null;
  } | null,
  data: Data,
) {
  if (!disb) return;
  data["GN.Tổng dư nợ"] = disb.totalOutstanding ?? disb.currentOutstanding ?? "";
  data["GN.DNHT bằng chữ"] = disb.currentOutstanding
    ? numberToVietnameseWords(disb.currentOutstanding)
    : "";
  data["GN.TDN bằng chữ"] = disb.totalOutstanding
    ? numberToVietnameseWords(disb.totalOutstanding)
    : "";
  data["GN.Tài liệu chứng minh"] = disb.supportingDoc ?? "";
  data["GN.Tiền mặt"] = ""; // Not tracked separately
}

// ── Extended UNC (Beneficiary) fields in loop ──

export function buildBeneficiaryLoopData(
  beneficiaries: Array<{
    name: string; accountNumber?: string | null; bankName?: string | null;
  }>,
) {
  return beneficiaries.map((b, i) => ({
    STT: i + 1,
    "Khách hàng thụ hưởng": b.name,
    "Số tài khoản": b.accountNumber ?? "",
    "Nơi mở tài khoản": b.bankName ?? "",
    // Extended fields from templates
    "Số tiền": "", // Filled from disbursement line or override
    "ST bằng chữ": "",
    "Nội dung": "",
    "CMND": "",
    "Ngày cấp": "",
    "Nơi cấp": "",
    "Địa chỉ": "",
  }));
}
