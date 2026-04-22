/**
 * Income-source helpers for tiêu dùng builder.
 * 3 branches: salary (existing), agriculture (6-col table + PA_TRANO), business (5-col table).
 */

import { fmtN } from "@/lib/report/format-number-vn";
import { calcRepaymentSchedule } from "@/lib/loan-plan/loan-plan-calculator";
import type { AgricultureItem, BusinessRevenueRow } from "@/lib/loan-plan/loan-plan-types";

type Fin = Record<string, unknown>;

function n(v: unknown): number { return Number(v) || 0; }
function s(v: unknown): string { return v == null ? "" : String(v); }

/** Agriculture: PA_CHIPHI_AGRI (6 col) + PA_TRANO (yearly) */
export function buildAgricultureIncomeData(fin: Fin, loanAmt: number): Record<string, unknown> {
  const items = (fin.agriculture_items ?? []) as AgricultureItem[];
  const living = n(fin.agriculture_living_expenses_annual);

  // Compute totals from items (skip group headers to avoid double-count)
  let cost = 0;
  let revenue = 0;
  let inRevenue = false;
  for (const it of items) {
    if (it.isGroupHeader) {
      if (it.name.includes("II") || it.name.toLowerCase().includes("thu nhập")) inRevenue = true;
      continue;
    }
    if (inRevenue) revenue += n(it.amount);
    else cost += n(it.amount);
  }
  const profit = revenue - cost;
  const repaymentIncome = profit - living;

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
    "HĐTD.Tổng chi phí nông nghiệp": fmtN(cost),
    "HĐTD.Tổng thu nhập nông nghiệp": fmtN(revenue),
    "HĐTD.Lợi nhuận nông nghiệp": fmtN(profit),
    "HĐTD.Chi phí sinh hoạt/năm": fmtN(living),
    "HĐTD.Thu nhập trả nợ/năm": fmtN(repaymentIncome),
  };
}

/** Business: PA_CHIPHI_BIZ (5 col), no PA_TRANO (monthly repayment) */
export function buildBusinessIncomeData(fin: Fin, loanAmt: number): Record<string, unknown> {
  const rows = (fin.business_rows ?? []) as BusinessRevenueRow[];
  const otherCosts = n(fin.business_other_costs_annual);
  const livingMonthly = n(fin.business_living_expenses_monthly);

  let totalImport = 0;
  let totalRevenue = 0;
  for (const r of rows) {
    if (r.isGroupHeader) continue;
    totalImport += n(r.importValue);
    totalRevenue += n(r.revenue);
  }
  const grossProfit = totalRevenue - totalImport;
  const monthlyIncome = Math.round((grossProfit - otherCosts) / 12);
  const monthlyRepayment = monthlyIncome - livingMonthly;
  const principalPerMonth = Math.round(loanAmt / (n(fin.term_months) || 1));

  const paChiPhi = rows.map((r) => ({
    "STT": s(r.order),
    "Nhóm Hàng": r.name,
    "Số lượng": fmtN(n(r.quantity)),
    "Giá trị nhập hàng": fmtN(n(r.importValue)),
    "Doanh thu dự kiến": fmtN(n(r.revenue)),
  }));

  return {
    "PA_CHIPHI_BIZ": paChiPhi,
    "HĐTD.Mô tả nguồn trả nợ": s(fin.repayment_narrative),
    "HĐTD.Tổng giá trị nhập": fmtN(totalImport),
    "HĐTD.Tổng doanh thu": fmtN(totalRevenue),
    "HĐTD.Lợi nhuận kinh doanh/năm": fmtN(grossProfit),
    "HĐTD.Chi phí khác/năm": fmtN(otherCosts),
    "HĐTD.Thu nhập bình quân/tháng": fmtN(monthlyIncome),
    "HĐTD.Chi phí sinh hoạt/tháng": fmtN(livingMonthly),
    "HĐTD.Thu nhập trả nợ/tháng": fmtN(monthlyRepayment),
    "HĐTD.Số gốc trả/tháng": fmtN(principalPerMonth),
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
    "Số tiền vay": fmtN(r.balance),
    "Gốc trả": fmtN(r.principal),
    "Lãi trả": fmtN(r.interest),
    "Thu nhập trả nợ": fmtN(r.income),
    "Thu nhập còn lại": fmtN(r.remaining),
  }));
}
