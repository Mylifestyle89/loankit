// Shared Zod schemas for Loan Plan API validation
import { z } from "zod";

export const costItemSchema = z.object({
  name: z.string(),
  unit: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
  amount: z.number(),
});

export const revenueItemSchema = z.object({
  description: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
  amount: z.number(),
});

export const LOAN_METHODS = ["tung_lan", "han_muc", "trung_dai", "tieu_dung"] as const;

export const loanMethodEnum = z.enum(LOAN_METHODS);

export const createPlanSchema = z.object({
  customerId: z.string().min(1),
  templateId: z.string().optional(),
  name: z.string().optional(),
  loan_method: loanMethodEnum.optional(),
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
  construction_contract_no: z.string().optional(),
  construction_contract_date: z.string().optional(),
  // Đánh giá tín dụng
  legal_assessment: z.string().optional(),
  market_input: z.string().optional(),
  market_output: z.string().optional(),
  labor_capability: z.string().optional(),
  machinery_capability: z.string().optional(),
  other_factors: z.string().optional(),
});

export const updatePlanSchema = createPlanSchema.omit({ customerId: true });
