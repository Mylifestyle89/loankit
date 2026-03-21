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

/** Lãi vay = Số tiền vay × Lãi suất (annual, no month factor) */
export function calcInterest(loanAmount: number, rate: number): number {
  return loanAmount * rate;
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
};

/** Khấu hao nhà kính = đơn giá × số sào / số năm khấu hao */
export function calcDepreciation(assetUnitPrice: number, landArea: number, years: number): number {
  if (years <= 0) return 0;
  return Math.round(assetUnitPrice * landArea / years);
}

/** Bảng trả nợ theo năm cho vay trung dài hạn */
export function calcRepaymentSchedule(params: {
  loanAmount: number;
  termMonths: number;
  standardRate: number;
  preferentialRate?: number; // lãi suất ưu đãi năm đầu
  annualIncome: number;     // lợi nhuận + khấu hao
}): RepaymentRow[] {
  const years = Math.ceil(params.termMonths / 12);
  if (years <= 0 || params.loanAmount <= 0) return [];
  const principalPerYear = Math.round(params.loanAmount / years);
  const rows: RepaymentRow[] = [];
  let balance = params.loanAmount;

  for (let y = 1; y <= years; y++) {
    const rate = (y === 1 && params.preferentialRate) ? params.preferentialRate : params.standardRate;
    const interest = Math.round(balance * rate);
    const principal = y === years ? balance : principalPerYear;
    const remaining = params.annualIncome - principal - interest;
    rows.push({ year: y, income: params.annualIncome, balance, principal, interest, remaining });
    balance -= principal;
  }
  return rows;
}

export function calcFinancials(input: CalcFinancialsInput): LoanPlanFinancials {
  const totalDirectCost = calcTotalDirectCost(input.costItems);
  const interest = calcInterest(input.loanAmount, input.interestRate);
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
