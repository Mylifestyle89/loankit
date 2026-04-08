/**
 * KHCN loan-plan builder — consumer loan (tiêu dùng) branch.
 *
 * Computes:
 *  - Total income (3m) from up to 2 earners
 *  - Interest cost (3m) ≈ loanAmount × avgOtherLoanRate × 3/12
 *  - Available for principal = income − expenses
 *  - Per-period principal = loanAmount / totalPeriods
 *
 * Emits PA.* placeholders used by Phương án sử dụng vốn and BCĐX tiêu dùng templates.
 */

import { parseNum } from "@/lib/import/xlsx-number-utils";
import { numberToVietnameseWords } from "@/lib/number-to-vietnamese-words";
import { formatPeriodLabel, roundPrincipal, type PrincipalRounding } from "@/lib/loan-plan/loan-plan-calculator";
import { fmtN } from "@/lib/report/format-number-vn";

type Data = Record<string, unknown>;
type Fin = Record<string, unknown>;

const SUBTYPE_LABELS: Record<string, string> = {
  xay_sua_nha: "xây sửa nhà ở",
  mua_dat: "mua đất ở",
  mua_xe: "mua xe tiêu dùng",
  mua_sam: "mua sắm vật dụng sinh hoạt",
};

// Locale-aware parser: handles "1.500.000", "1,5", plain numbers, null/undefined
const num = (v: unknown): number => parseNum(v);
const str = (v: unknown): string => (v == null ? "" : String(v));
const fmtMoney = (n: number): string => fmtN(n) + " đồng";

/** Format rate (0.09 → "9%" / 0.095 → "9,5%") */
function formatRatePercent(rate: number): string {
  const pct = rate * 100;
  return Number.isInteger(pct)
    ? `${pct}%`
    : `${pct.toFixed(1).replace(".", ",")}%`;
}

/** Build narrative sentence for phần a) "Thu nhập để trả nợ" */
function buildIncomeSentence(fin: Fin): string {
  const parts: string[] = [];
  const makeSentence = (
    title: string, name: string, workplace: string, income: number, defaultTitle: string,
  ) => `${title || defaultTitle} ${name} hiện đang công tác tại ${workplace || "—"} ` +
       `với mức lương và phụ cấp hàng tháng là ${fmtMoney(income)}`;

  const income1 = num(fin.earner1_monthly_income);
  const name1 = str(fin.earner1_name);
  if (name1 && income1 > 0) {
    parts.push(makeSentence(str(fin.earner1_title), name1, str(fin.earner1_workplace), income1, "Ông"));
  }

  const income2 = num(fin.earner2_monthly_income);
  const name2 = str(fin.earner2_name);
  if (name2 && income2 > 0) {
    parts.push(makeSentence(str(fin.earner2_title), name2, str(fin.earner2_workplace), income2, "Bà"));
  }

  return parts.join("; ");
}

export function buildTieuDungLoanPlanData(fin: Fin, data: Data): void {
  const loanAmt = num(fin.loanAmount);
  if (loanAmt <= 0) return;

  // Period = repayment_frequency tháng. Default 1 (hàng tháng) khi rỗng.
  const periodMonths = num(fin.repayment_frequency) || 1;
  const periodLabel = formatPeriodLabel(periodMonths);

  const income1 = num(fin.earner1_monthly_income);
  const income2 = num(fin.earner2_monthly_income);
  const totalIncomePeriod = (income1 + income2) * periodMonths;

  const avgRate = num(fin.avg_other_loan_rate);
  const livingExpensesPeriod = num(fin.living_expenses_period);
  const otherCostsPeriod = num(fin.other_costs_period);
  const interestCostPeriod = Math.round(loanAmt * avgRate * periodMonths / 12);
  const totalExpensesPeriod = livingExpensesPeriod + interestCostPeriod + otherCostsPeriod;

  const available = totalIncomePeriod - totalExpensesPeriod;

  const termMonths = num(fin.term_months);
  const totalPeriods = termMonths > 0 ? Math.ceil(termMonths / periodMonths) : 0;
  const rounding: PrincipalRounding = (fin.principal_rounding === "up_100k" || fin.principal_rounding === "down_100k")
    ? fin.principal_rounding : "none";
  const perPeriod = totalPeriods > 0
    ? roundPrincipal(loanAmt / totalPeriods, rounding)
    : 0;
  // Kỳ cuối auto-adjust để tổng = loanAmount
  const lastPeriodAmount = totalPeriods > 0
    ? loanAmt - perPeriod * (totalPeriods - 1)
    : 0;
  const remaining = available - perPeriod;

  const hasEarner2 = !!(str(fin.earner2_name) && income2 > 0);
  const subtype = str(fin.tieu_dung_subtype);

  // ── Narrative ──
  data["PA.Câu thu nhập"] = buildIncomeSentence(fin);
  data["PA.Mô tả người trả nợ"] = hasEarner2 ? "vợ chồng khách hàng" : "khách hàng";
  data["PA.Mục đích tiêu dùng"] = subtype ? (SUBTYPE_LABELS[subtype] ?? subtype) : "";

  // ── Period info ──
  data["PA.Số tháng kỳ"] = String(periodMonths);
  data["PA.Kỳ text"] = periodLabel;
  data["PA.Kỳ hạn trả gốc text"] = `${periodMonths} tháng/kỳ`;
  data["PA.Thời hạn vay text"] = termMonths > 0 ? `${termMonths} tháng` : "";

  // ── Nhu cầu vốn vay (user nhập trực tiếp cho tiêu dùng) ──
  const capitalNeed = num(fin.loan_capital_need);
  const counterpart = capitalNeed - loanAmt;
  data["PA.Tổng nhu cầu vốn"] = fmtN(capitalNeed);
  data["PA.Tổng nhu cầu vốn bằng chữ"] = capitalNeed > 0 ? numberToVietnameseWords(capitalNeed) : "";
  data["PA.Vốn đối ứng"] = fmtN(counterpart);
  data["PA.Vốn đối ứng bằng chữ"] = counterpart > 0 ? numberToVietnameseWords(counterpart) : "";
  data["PA.Tỷ lệ vốn đối ứng"] = capitalNeed > 0
    ? `${((counterpart / capitalNeed) * 100).toFixed(2).replace(".", ",")}%`
    : "";
  // Mirror sang HĐTD prefix (template HĐTD đôi khi dùng)
  data["HĐTD.Tổng nhu cầu vốn"] = fmtN(capitalNeed);
  data["HĐTD.TNCV bằng chữ"] = capitalNeed > 0 ? numberToVietnameseWords(capitalNeed) : "";
  data["HĐTD.Vốn đối ứng"] = fmtN(counterpart);
  data["HĐTD.Tỷ lệ vốn đối ứng"] = capitalNeed > 0
    ? `${((counterpart / capitalNeed) * 100).toFixed(2).replace(".", ",")}%`
    : "";

  // ── Numeric placeholders (period-aware names) ──
  data["PA.Tổng thu nhập kỳ"] = fmtN(totalIncomePeriod);
  data["PA.Tổng thu nhập kỳ bằng chữ"] = totalIncomePeriod > 0 ? numberToVietnameseWords(totalIncomePeriod) : "";
  data["PA.Tổng chi phí kỳ"] = fmtN(totalExpensesPeriod);
  data["PA.Chi phí sinh hoạt kỳ"] = fmtN(livingExpensesPeriod);
  data["PA.Lãi suất vay khác"] = formatRatePercent(avgRate);
  data["PA.Chi phí lãi vay kỳ"] = fmtN(interestCostPeriod);
  data["PA.Chi phí khác kỳ"] = fmtN(otherCostsPeriod);
  data["PA.Dư trả gốc"] = fmtN(available);
  data["PA.Dư trả gốc bằng chữ"] = available > 0 ? numberToVietnameseWords(available) : "";
  data["PA.Số kỳ trả gốc"] = totalPeriods > 0 ? String(totalPeriods) : "";
  data["PA.Số tiền trả gốc mỗi kỳ"] = fmtN(perPeriod);
  data["PA.Số tiền trả gốc mỗi kỳ bằng chữ"] = perPeriod > 0 ? numberToVietnameseWords(perPeriod) : "";
  data["PA.Số tiền trả gốc kỳ cuối"] = fmtN(lastPeriodAmount);
  data["PA.Số tiền trả gốc kỳ cuối bằng chữ"] = lastPeriodAmount > 0 ? numberToVietnameseWords(lastPeriodAmount) : "";
  data["PA.Thu nhập còn lại"] = fmtN(remaining);

  // ── Individual earner fields (for templates with direct access) ──
  data["PA.Earner1 danh xưng"] = str(fin.earner1_title);
  data["PA.Earner1 họ tên"] = str(fin.earner1_name);
  data["PA.Earner1 nơi công tác"] = str(fin.earner1_workplace);
  data["PA.Earner1 lương tháng"] = fmtN(income1);
  data["PA.Earner2 danh xưng"] = str(fin.earner2_title);
  data["PA.Earner2 họ tên"] = str(fin.earner2_name);
  data["PA.Earner2 nơi công tác"] = str(fin.earner2_workplace);
  data["PA.Earner2 lương tháng"] = fmtN(income2);

  // ── HĐTD.* income placeholders (BCDX common "Nguồn trả nợ" section) ──
  // Tiêu dùng: nguồn trả duy nhất là lương. SXKD/khác = 0.
  const monthlyTotal = income1 + income2;
  const annualTotal = monthlyTotal * 12;
  data["HĐTD.Tiền lương hàng tháng"] = fmtN(monthlyTotal);
  data["HĐTD.Tổng thu nhập từ lương"] = fmtN(annualTotal);
  data["HĐTD.Tổng thu nhập từ SXKD"] = fmtN(0);
  data["HĐTD.Thu nhập khác"] = fmtN(0);
  data["HĐTD.Cụ thể về thu nhập khác"] = "";
  data["HĐTD.Nơi công tác"] = str(fin.earner1_workplace);

  // ── Phí trả nợ trước hạn (HDTD placeholders) ──
  // Áp dụng khi term > 12 tháng với kỳ trả đều (không áp dụng vay ngắn hạn tiêu dùng).
  const MIN_FEE = 1_000_000;
  const isMidLongTerm = termMonths > 12 && totalPeriods > 0;

  // Vay trả trong ngày: 0.5%, max 16tr (áp dụng mọi khoản)
  const sameDayFee = Math.max(MIN_FEE, Math.min(loanAmt * 0.005, 16_000_000));
  data["HDTD.Phí vay trả trong ngày"] = "0,5%";
  data["HDTD.Min vay trả trong ngày"] = fmtN(MIN_FEE);
  data["HDTD.Max vay trả trong ngày"] = fmtN(sameDayFee);

  if (isMidLongTerm) {
    // Formula: Max phí năm N = (dư nợ sau kỳ đầu năm N) × rate
    // = loanAmt - (số kỳ đã trả trước khi sang năm N + 1) × perPeriod
    // Năm 1 bắt đầu kỳ 1. Sau kỳ 1 → trả 1 kỳ.
    // Năm 2 bắt đầu tháng 13. Số kỳ đã trả đầu năm 2 = 12/periodMonths.
    // Sau kỳ đầu năm N = (N-1)*12/periodMonths + 1 kỳ.
    const periodsPerYear = 12 / periodMonths;
    const maxFeeForYear = (year: number, rate: number): number => {
      const periodsBeforeFirstOfYear = (year - 1) * periodsPerYear;
      const periodsPaid = periodsBeforeFirstOfYear + 1;
      if (periodsPaid >= totalPeriods) return MIN_FEE;
      const balAfter = loanAmt - periodsPaid * perPeriod;
      return Math.max(MIN_FEE, Math.round(balAfter * rate));
    };
    data["HDTD.Phí trả trước năm 1"] = "4%";
    data["HDTD.Min trả trước năm 1"] = fmtN(MIN_FEE);
    data["HDTD.Max trả trước năm 1"] = fmtN(maxFeeForYear(1, 0.04));
    data["HDTD.Phí trả trước năm 2"] = "3%";
    data["HDTD.Min trả trước năm 2"] = fmtN(MIN_FEE);
    data["HDTD.Max trả trước năm 2"] = fmtN(maxFeeForYear(2, 0.03));
    data["HDTD.Phí trả trước năm 3+"] = "2%";
    data["HDTD.Min trả trước năm 3+"] = fmtN(MIN_FEE);
    data["HDTD.Max trả trước năm 3+"] = fmtN(maxFeeForYear(3, 0.02));
  }
}
