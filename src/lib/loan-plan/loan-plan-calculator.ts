// Calculator for Loan Plan financials (Phương án vay vốn)

import type {
  CostItem,
  LoanPlanFinancials,
  RepaymentRow,
  NongNghiepRevenue,
  KinhDoanhRevenue,
  ChanNuoiRevenue,
  AnUongRevenue,
  XayDungRevenue,
  HanMucRevenue,
  LoanPlanCategory,
} from "./loan-plan-types";

export function calcTotalDirectCost(costItems: CostItem[]): number {
  return costItems.reduce((sum, item) => sum + item.amount, 0);
}

/** Lãi vay = Số tiền vay × Lãi suất năm × (termMonths / 12).
 *  termMonths default 12 để backward-compat với caller cũ (1-year loans). */
export function calcInterest(loanAmount: number, rate: number, termMonths: number = 12): number {
  const months = termMonths > 0 ? termMonths : 12;
  return loanAmount * rate * months / 12;
}

// Revenue calculators per category
export function calcNongNghiepRevenue(input: NongNghiepRevenue): number {
  return input.yield_per_unit * input.area * input.price;
}

export function calcKinhDoanhRevenue(input: KinhDoanhRevenue): number {
  return input.product_count * input.margin * input.days * 12;
}

export function calcChanNuoiRevenue(input: ChanNuoiRevenue): number {
  return input.head_count * input.weight * input.price_per_kg;
}

export function calcAnUongRevenue(input: AnUongRevenue): number {
  return input.capacity * input.avg_ticket * input.days * input.occupancy * 12;
}

export function calcXayDungRevenue(input: XayDungRevenue): number {
  return input.monthly_income * 12;
}

export function calcHanMucRevenue(input: HanMucRevenue): number {
  return input.turnover_cycles * input.capital * input.margin;
}

export type RevenueInputs = {
  category: LoanPlanCategory;
  params: Record<string, number>;
};

/** Safely extract numeric fields from params, defaulting to 0 for missing/invalid values */
function safeNum(params: Record<string, number>, key: string): number {
  const v = params[key];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** Build a typed revenue input from raw params with safe numeric extraction */
function toRevenueInput<T extends Record<string, number>>(params: Record<string, number>, keys: (keyof T & string)[]): T {
  const result = {} as Record<string, number>;
  for (const key of keys) result[key] = safeNum(params, key);
  return result as T;
}

export function calcCategoryRevenue(category: LoanPlanCategory, params: Record<string, number>): number {
  switch (category) {
    case "nong_nghiep":
      return calcNongNghiepRevenue(toRevenueInput<NongNghiepRevenue>(params, ["yield_per_unit", "area", "price"]));
    case "kinh_doanh":
      return calcKinhDoanhRevenue(toRevenueInput<KinhDoanhRevenue>(params, ["product_count", "margin", "days"]));
    case "chan_nuoi":
      return calcChanNuoiRevenue(toRevenueInput<ChanNuoiRevenue>(params, ["head_count", "weight", "price_per_kg"]));
    case "an_uong":
      return calcAnUongRevenue(toRevenueInput<AnUongRevenue>(params, ["capacity", "avg_ticket", "days", "occupancy"]));
    case "xay_dung":
      return calcXayDungRevenue(toRevenueInput<XayDungRevenue>(params, ["monthly_income"]));
    case "han_muc":
      return calcHanMucRevenue(toRevenueInput<HanMucRevenue>(params, ["turnover_cycles", "capital", "margin"]));
    default:
      return 0;
  }
}

export type CalcFinancialsInput = {
  costItems: CostItem[];
  revenue: number;
  loanAmount: number;
  interestRate: number; // annual rate, e.g. 0.09 for 9%
  turnoverCycles: number; // Vòng quay vốn
  tax: number; // Thuế (user-editable)
  termMonths?: number; // Thời hạn vay (tháng). Default 12 nếu undefined.
};

/** Khấu hao nhà kính = đơn giá × số sào / số năm khấu hao */
export function calcDepreciation(assetUnitPrice: number, landArea: number, years: number): number {
  if (years <= 0) return 0;
  return Math.round(assetUnitPrice * landArea / years);
}

/** Format số tháng/kỳ thành label hiển thị: 1 → "tháng", 3 → "3 tháng" */
export function formatPeriodLabel(months: number): string {
  if (months <= 0) return "tháng";
  return months === 1 ? "tháng" : `${months} tháng`;
}

/** Principal rounding mode for equal-installment schedules.
 *  - "none":   Math.round (default, legacy behavior)
 *  - "up_100k":   round UP to nearest 100,000 — last period auto-adjusts smaller
 *  - "down_100k": round DOWN to nearest 100,000 — last period auto-adjusts larger
 */
export type PrincipalRounding = "none" | "up_100k" | "down_100k";

export function roundPrincipal(value: number, mode: PrincipalRounding): number {
  if (mode === "up_100k") return Math.ceil(value / 100_000) * 100_000;
  if (mode === "down_100k") return Math.floor(value / 100_000) * 100_000;
  return Math.round(value);
}

/**
 * Bảng trả nợ cho vay trung dài hạn
 * Hỗ trợ kỳ hạn trả gốc: 1/3/6/12 tháng (default 12 = theo năm)
 * Kỳ cuối tự điều chỉnh để tổng gốc = loanAmount.
 */
export function calcRepaymentSchedule(params: {
  loanAmount: number;
  termMonths: number;
  standardRate: number;
  preferentialRate?: number;   // lãi suất ưu đãi năm đầu
  annualIncome: number;        // lợi nhuận + khấu hao (theo năm)
  repaymentFrequency?: number; // kỳ hạn trả gốc (tháng): 1, 3, 6, 12. Default 12
  principalRounding?: PrincipalRounding; // default "none"
}): RepaymentRow[] {
  const freq = params.repaymentFrequency || 12;
  const totalPeriods = Math.ceil(params.termMonths / freq);
  if (totalPeriods <= 0 || params.loanAmount <= 0) return [];

  const rounding = params.principalRounding ?? "none";
  const principalPerPeriod = roundPrincipal(params.loanAmount / totalPeriods, rounding);
  // Thu nhập pro-rata theo kỳ (annualIncome × freq/12)
  const incomePerPeriod = Math.round(params.annualIncome * freq / 12);
  // Lãi suất theo kỳ = annual rate × freq/12
  const rows: RepaymentRow[] = [];
  let balance = params.loanAmount;

  // Label format
  const labelFn = (p: number): string => {
    if (freq === 12) return `Năm ${p}`;
    if (freq === 1) return `Tháng ${p}`;
    return `Kỳ ${p}`;
  };

  for (let p = 1; p <= totalPeriods; p++) {
    // Năm hiện tại (1-based) = tháng đã qua / 12
    const currentYear = Math.ceil((p * freq) / 12);
    const annualRate = (currentYear === 1 && params.preferentialRate)
      ? params.preferentialRate : params.standardRate;
    // Lãi kỳ = dư nợ × lãi suất năm × (freq / 12)
    const interest = Math.round(balance * annualRate * freq / 12);
    const principal = p === totalPeriods ? balance : principalPerPeriod;
    const remaining = incomePerPeriod - principal - interest;
    rows.push({
      period: p, year: currentYear, periodLabel: labelFn(p),
      income: incomePerPeriod, balance, principal, interest, remaining,
    });
    balance -= principal;
  }
  return rows;
}

export function calcFinancials(input: CalcFinancialsInput): LoanPlanFinancials {
  const totalDirectCost = calcTotalDirectCost(input.costItems);
  const interest = calcInterest(input.loanAmount, input.interestRate, input.termMonths);
  const tax = input.tax;
  const totalIndirectCost = interest + tax;
  const totalCost = totalDirectCost + totalIndirectCost;
  const profit = input.revenue - totalCost;
  const turnoverCycles = input.turnoverCycles || 1;
  const loanNeed = totalDirectCost / turnoverCycles;
  const counterpartCapital = loanNeed - input.loanAmount;

  return {
    totalDirectCost,
    interestRate: input.interestRate,
    turnoverCycles: input.turnoverCycles,
    interest,
    tax,
    totalIndirectCost,
    totalCost,
    revenue: input.revenue,
    profit,
    loanNeed,
    loanAmount: input.loanAmount,
    counterpartCapital,
  };
}
