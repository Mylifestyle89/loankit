// Types for loan plan editor page

export type { RevenueItem, TieuDungSubtype, EarnerTitle } from "@/lib/loan-plan/loan-plan-types";
import type { TieuDungSubtype, EarnerTitle } from "@/lib/loan-plan/loan-plan-types";

export type Financials = {
  totalDirectCost: number;
  interestRate: number;
  turnoverCycles: number;
  interest: number;
  tax: number;
  totalIndirectCost: number;
  totalCost: number;
  revenue: number;
  profit: number;
  loanNeed: number;
  loanAmount: number;
  counterpartCapital: number;
  // trung_dai extended
  depreciation_years?: number;
  asset_unit_price?: number;
  land_area_sau?: number;
  preferential_rate?: number;
  term_months?: number;
  repayment_frequency?: number;
  principal_rounding?: "none" | "up_100k" | "down_100k";
  // Tiêu dùng
  tieu_dung_subtype?: TieuDungSubtype;
  loan_capital_need?: number;
  earner1_title?: EarnerTitle;
  earner1_name?: string;
  earner1_workplace?: string;
  earner1_monthly_income?: number;
  earner2_title?: EarnerTitle;
  earner2_name?: string;
  earner2_workplace?: string;
  earner2_monthly_income?: number;
  living_expenses_period?: number;
  avg_other_loan_rate?: number;
  other_costs_period?: number;
  construction_contract_no?: string;
  construction_contract_date?: string;
  farmAddress?: string;
  // Đánh giá tín dụng (AI-assisted)
  legal_assessment?: string;
  market_input?: string;
  market_output?: string;
  labor_capability?: string;
  machinery_capability?: string;
  other_factors?: string;
  turnover_analysis?: string; // Phân tích vòng quay vốn
};
