/**
 * Income-source helpers for tiêu dùng builder.
 * Branches: salary (earner fields), agriculture/business (shared 6-col table + PA_TRANO).
 */

import { fmtN } from "@/lib/report/format-number-vn";
import { calcRepaymentSchedule } from "@/lib/loan-plan/loan-plan-calculator";
import type { AgricultureItem, ExpenseItem } from "@/lib/loan-plan/loan-plan-types";

type Fin = Record<string, unknown>;

function n(v: unknown): number { return Number(v) || 0; }
function s(v: unknown): string { return v == null ? "" : String(v); }

/** Tìm nguồn trả nợ từ bảng: ưu tiên dòng "lợi nhuận", fallback group split II-I */
function extractNguonTraNo(items: AgricultureItem[]): number {
  const profitRow = items.find((it) => {
    const name = it.name.toLowerCase();
    return name.includes("lợi nhuận") || name.includes("loi nhuan") || name.includes("profit");
  });
  if (profitRow) return n(profitRow.amount);

  let cost = 0;
  let revenue = 0;
  let inRevenue = false;
  for (const it of items) {
    if (it.isGroupHeader) {
      if (it.name.includes("II") || it.name.toLowerCase().includes("thu nhập") || it.name.toLowerCase().includes("doanh thu")) inRevenue = true;
      continue;
    }
    if (inRevenue) revenue += n(it.amount);
    else cost += n(it.amount);
  }
  return revenue - cost;
}

/** Agriculture: PA_CHIPHI_AGRI (6 col) + PA_TRANO (yearly) */
export function buildAgricultureIncomeData(fin: Fin, loanAmt: number): Record<string, unknown> {
  const items = (fin.agriculture_items ?? []) as AgricultureItem[];
  const nguonTraNo = extractNguonTraNo(items);

  // Expense deductions: use agriculture_expense_items (new) or fallback to legacy living_expenses
  const expenseItems = (fin.agriculture_expense_items ?? []) as ExpenseItem[];
  const totalExpenses = expenseItems.length > 0
    ? expenseItems.reduce((sum, e) => sum + n(e.amount), 0)
    : n(fin.agriculture_living_expenses_annual);
  const repaymentIncome = nguonTraNo - totalExpenses;

  const paChiPhi = items.map((it) => ({
    "STT": s(it.order),
    "Khoản mục": it.name,
    "ĐVT": s(it.unit),
    "Đơn giá": fmtN(n(it.unitPrice)),
    "Số lượng": fmtN(n(it.quantity)),
    "Thành tiền": fmtN(n(it.amount)),
  }));

  const paTrano = buildPaTranoAnnual(loanAmt, n(fin.term_months), n(fin.interestRate), n(fin.preferential_rate) || undefined, repaymentIncome);

  return {
    "PA_CHIPHI_AGRI": paChiPhi,
    "PA_TRANO": paTrano,
    "HĐTD.Mô tả nguồn trả nợ": s(fin.repayment_narrative),
    "HĐTD.Nguồn trả nợ": fmtN(nguonTraNo),
    "HĐTD.Tổng chi phí khấu trừ": fmtN(totalExpenses),
    "HĐTD.Thu nhập trả nợ cho Agribank": fmtN(repaymentIncome),
    "HĐTD.Thu nhập trả nợ/năm": fmtN(repaymentIncome),
  };
}


function buildPaTranoAnnual(
  loanAmt: number, termMonths: number,
  stdRate: number, prefRate: number | undefined,
  annualIncome: number,
): Record<string, string>[] {
  if (termMonths <= 12 || loanAmt <= 0) return [];
  const rows = calcRepaymentSchedule({
    loanAmount: loanAmt, termMonths,
    standardRate: stdRate,
    preferentialRate: prefRate !== stdRate ? prefRate : undefined,
    annualIncome,
    repaymentFrequency: 12,
  });
  return rows.map((r) => ({
    "Năm": r.periodLabel ?? `Năm ${r.year}`,
    "Thu nhập trả nợ": fmtN(r.income),
    "Dư nợ": fmtN(r.balance),
    "Gốc trả": fmtN(r.principal),
    "Lãi trả": fmtN(r.interest),
    "TN còn lại": fmtN(r.remaining),
  }));
}
