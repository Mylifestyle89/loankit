// Shared Zod schemas for Loan Plan API validation
import { z } from "zod";

export const agricultureItemSchema = z.object({
  order: z.string().optional(),
  name: z.string(),
  unit: z.string().optional(),
  unitPrice: z.number().optional(),
  quantity: z.number().optional(),
  amount: z.number(),
  isGroupHeader: z.boolean().optional(),
});

export const businessRevenueRowSchema = z.object({
  order: z.string().optional(),
  name: z.string(),
  quantity: z.number().optional(),
  importValue: z.number().optional(),
  revenue: z.number().optional(),
  isGroupHeader: z.boolean().optional(),
});

export const costItemSchema = z.object({
  name: z.string(),
  unit: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
  amount: z.number(),
});

export const revenueItemSchema = z.object({
  description: z.string(),
  unit: z.string().optional(),
  qty: z.number(),
  unitPrice: z.number(),
  amount: z.number(),
});

export const LOAN_METHODS = ["tung_lan", "han_muc", "trung_dai", "tieu_dung", "the_loc_viet"] as const;
export const INCOME_SOURCE_TYPES = ["salary", "rental", "agriculture", "business"] as const;

export const loanMethodEnum = z.enum(LOAN_METHODS);
export const incomeSourceEnum = z.enum(INCOME_SOURCE_TYPES);

export const createPlanSchema = z.object({
  customerId: z.string().min(1),
  templateId: z.string().optional(),
  name: z.string().optional(),
  loan_method: loanMethodEnum.optional(),
  income_source_type: incomeSourceEnum.optional(),
  cost_items: z.array(costItemSchema).optional(),
  revenue_items: z.array(revenueItemSchema).optional(),
  loanAmount: z.number().optional(),
  interestRate: z.number().optional(),
  turnoverCycles: z.number().optional(),
  tax: z.number().optional(),
  // trung_dai extended fields
  depreciation_years: z.number().optional(),
  asset_unit_price: z.number().optional(),
  land_area_sau: z.number().optional(),
  preferential_rate: z.number().optional(),
  term_months: z.number().optional(),
  repayment_frequency: z.number().optional(),
  principal_rounding: z.enum(["none", "up_100k", "down_100k"]).optional(),
  construction_contract_no: z.string().optional(),
  construction_contract_date: z.string().optional(),
  farmAddress: z.string().optional(),
  // Đánh giá tín dụng
  legal_assessment: z.string().optional(),
  market_input: z.string().optional(),
  market_output: z.string().optional(),
  labor_capability: z.string().optional(),
  machinery_capability: z.string().optional(),
  other_factors: z.string().optional(),
  turnover_analysis: z.string().optional(),
  // Đánh giá lại hạn mức 36 tháng
  review_36_months: z.boolean().optional(),
  actual_revenue: z.number().optional(),
  actual_cost: z.number().optional(),
  // Tiêu dùng
  tieu_dung_subtype: z.enum(["xay_sua_nha", "mua_dat", "mua_xe", "mua_sam"]).optional(),
  loan_capital_need: z.number().optional(),
  earner1_title: z.enum(["Ông", "Bà"]).optional(),
  earner1_name: z.string().optional(),
  earner1_workplace: z.string().optional(),
  earner1_monthly_income: z.number().optional(),
  earner2_title: z.enum(["Ông", "Bà"]).optional(),
  earner2_name: z.string().optional(),
  earner2_workplace: z.string().optional(),
  earner2_monthly_income: z.number().optional(),
  living_expenses_period: z.number().optional(),
  avg_other_loan_rate: z.number().optional(),
  other_costs_period: z.number().optional(),
  // Tiêu dùng - nguồn nông nghiệp / kinh doanh
  agriculture_items: z.array(agricultureItemSchema).optional(),
  agriculture_living_expenses_annual: z.number().optional(),
  business_rows: z.array(businessRevenueRowSchema).optional(),
  business_other_costs_annual: z.number().optional(),
  business_living_expenses_monthly: z.number().optional(),
  repayment_narrative: z.string().optional(),
});

export const updatePlanSchema = createPlanSchema.omit({ customerId: true });
