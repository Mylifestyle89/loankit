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

import { numberToVietnameseWords } from "@/lib/number-to-vietnamese-words";
import { formatPeriodLabel } from "@/lib/loan-plan/loan-plan-calculator";
import { fmtN } from "@/lib/report/format-number-vn";

type Data = Record<string, unknown>;
type Fin = Record<string, unknown>;

const SUBTYPE_LABELS: Record<string, string> = {
  xay_sua_nha: "xây sửa nhà ở",
  mua_dat: "mua đất ở",
  mua_xe: "mua xe tiêu dùng",
  mua_sam: "mua sắm vật dụng sinh hoạt",
};

const num = (v: unknown): number => Number(v) || 0;
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
  const perPeriod = totalPeriods > 0 ? Math.round(loanAmt / totalPeriods) : 0;
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
}
