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

  const income1 = num(fin.earner1_monthly_income);
  const income2 = num(fin.earner2_monthly_income);
  const totalIncome3m = (income1 + income2) * 3;

  const avgRate = num(fin.avg_other_loan_rate);
  const livingExpenses3m = num(fin.living_expenses_3m);
  const otherCosts3m = num(fin.other_costs_3m);
  const interestCost3m = Math.round(loanAmt * avgRate * 3 / 12);
  const totalExpenses3m = livingExpenses3m + interestCost3m + otherCosts3m;

  const available = totalIncome3m - totalExpenses3m;

  const termMonths = num(fin.term_months);
  const repaymentFreq = num(fin.repayment_frequency) || 12;
  const totalPeriods = termMonths > 0 ? Math.ceil(termMonths / repaymentFreq) : 0;
  const perPeriod = totalPeriods > 0 ? Math.round(loanAmt / totalPeriods) : 0;
  const remaining = available - perPeriod;

  const hasEarner2 = !!(str(fin.earner2_name) && income2 > 0);
  const subtype = str(fin.tieu_dung_subtype);

  // ── Narrative ──
  data["PA.Câu thu nhập"] = buildIncomeSentence(fin);
  data["PA.Mô tả người trả nợ"] = hasEarner2 ? "vợ chồng khách hàng" : "khách hàng";
  data["PA.Mục đích tiêu dùng"] = subtype ? (SUBTYPE_LABELS[subtype] ?? subtype) : "";

  // ── Numeric placeholders ──
  data["PA.Tổng thu nhập 3 tháng"] = fmtN(totalIncome3m);
  data["PA.Tổng thu nhập 3 tháng bằng chữ"] = totalIncome3m > 0 ? numberToVietnameseWords(totalIncome3m) : "";
  data["PA.Tổng chi phí 3 tháng"] = fmtN(totalExpenses3m);
  data["PA.Chi phí sinh hoạt 3 tháng"] = fmtN(livingExpenses3m);
  data["PA.Lãi suất vay khác"] = formatRatePercent(avgRate);
  data["PA.Chi phí lãi vay 3 tháng"] = fmtN(interestCost3m);
  data["PA.Chi phí khác 3 tháng"] = fmtN(otherCosts3m);
  data["PA.Dư trả gốc"] = fmtN(available);
  data["PA.Dư trả gốc bằng chữ"] = available > 0 ? numberToVietnameseWords(available) : "";
  data["PA.Số kỳ trả gốc"] = totalPeriods > 0 ? String(totalPeriods) : "";
  data["PA.Số tiền trả gốc mỗi kỳ"] = fmtN(perPeriod);
  data["PA.Số tiền trả gốc mỗi kỳ bằng chữ"] = perPeriod > 0 ? numberToVietnameseWords(perPeriod) : "";
  data["PA.Thu nhập còn lại"] = fmtN(remaining);
  data["PA.Kỳ hạn trả gốc text"] = repaymentFreq > 0 ? `${repaymentFreq} tháng/kỳ` : "";
  data["PA.Thời hạn vay text"] = termMonths > 0 ? `${termMonths} tháng` : "";

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
