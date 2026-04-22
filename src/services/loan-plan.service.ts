// Service layer for Loan Plan (Phương án vay vốn) CRUD + financials recalculation

import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/core/errors/app-error";
import { calcFinancials } from "@/lib/loan-plan/loan-plan-calculator";
import type { CostItem, RevenueItem, LoanPlanFinancials } from "@/lib/loan-plan/loan-plan-types";

// ─── Templates ─────────────────────────────────────────────────────────────

export async function listTemplates(category?: string) {
  return prisma.loanPlanTemplate.findMany({
    where: category ? { category } : undefined,
    orderBy: { name: "asc" },
  });
}

export async function getTemplate(id: string) {
  const tpl = await prisma.loanPlanTemplate.findUnique({ where: { id } });
  if (!tpl) throw new NotFoundError(`Template ${id} not found`);
  return tpl;
}

// ─── Plans ──────────────────────────────────────────────────────────────────

export type CreatePlanInput = {
  customerId: string;
  templateId?: string;
  name?: string;
  loan_method?: string;
  cost_items?: CostItem[];
  revenue_items?: RevenueItem[];
  loanAmount?: number;
  interestRate?: number;
  turnoverCycles?: number;
  tax?: number;
};

export type UpdatePlanInput = Partial<Omit<CreatePlanInput, "customerId">>;

/** Ensure every revenue item has numeric qty/unitPrice/amount (fix missing fields from AI/import) */
function sanitizeRevenueItems(items: RevenueItem[]): RevenueItem[] {
  return items.map((r) => {
    const qty = Number(r.qty) || 0;
    const unitPrice = Number(r.unitPrice) || 0;
    const amount = Number(r.amount) || (qty * unitPrice);
    return { description: r.description ?? "", unit: r.unit, qty, unitPrice, amount };
  });
}

/** Extended fields merged into financials_json (trung_dai + tiêu dùng) */
const EXTENDED_FINANCIAL_KEYS = [
  "depreciation_years", "asset_unit_price", "land_area_sau",
  "preferential_rate", "term_months", "repayment_frequency", "principal_rounding", "construction_contract_no",
  "construction_contract_date", "farmAddress",
  "legal_assessment", "market_input", "market_output",
  "labor_capability", "machinery_capability", "other_factors",
  "turnover_analysis",
  "income_source_type",
  // Tiêu dùng
  "tieu_dung_subtype", "loan_capital_need",
  "earner1_title", "earner1_name", "earner1_workplace", "earner1_monthly_income",
  "earner2_title", "earner2_name", "earner2_workplace", "earner2_monthly_income",
  "living_expenses_period", "avg_other_loan_rate", "other_costs_period",
  // Tiêu dùng - nông nghiệp / kinh doanh
  "agriculture_items", "agriculture_living_expenses_annual",
  "business_rows", "business_other_costs_annual", "business_living_expenses_monthly",
  "repayment_narrative",
] as const;

function recalcFinancials(
  costItems: CostItem[],
  revenueItems: RevenueItem[],
  loanAmount: number,
  interestRate: number,
  turnoverCycles: number,
  tax: number,
  termMonths: number = 12,
): LoanPlanFinancials {
  const revenue = revenueItems.reduce((sum, r) => sum + r.amount, 0);
  return calcFinancials({ costItems, revenue, loanAmount, interestRate, turnoverCycles, tax, termMonths });
}

/** Extract numeric term_months từ object nếu có; trả undefined nếu thiếu/invalid. */
function pickTermMonths(source: Record<string, unknown> | undefined): number | undefined {
  if (!source || !("term_months" in source)) return undefined;
  const raw = source["term_months"];
  if (raw === undefined || raw === null) return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function createPlanFromTemplate(input: CreatePlanInput) {
  let costItems: CostItem[] = input.cost_items ?? [];
  let revenueItems: RevenueItem[] = sanitizeRevenueItems(input.revenue_items ?? []);

  // Seed from template defaults if provided
  if (input.templateId && costItems.length === 0) {
    const tpl = await prisma.loanPlanTemplate.findUnique({ where: { id: input.templateId } });
    if (tpl) {
      const rawCosts = JSON.parse(tpl.cost_items_template_json) as Array<{
        name: string;
        unit: string;
        default_price?: number;
      }>;
      costItems = rawCosts.map((c) => ({
        name: c.name,
        unit: c.unit,
        qty: 0,
        unitPrice: c.default_price ?? 0,
        amount: 0,
      }));
    }
  }

  const loanAmount = input.loanAmount ?? 0;
  const interestRate = input.interestRate ?? 0;
  const turnoverCycles = input.turnoverCycles ?? 1;
  const tax = input.tax ?? 0;
  const termMonths = pickTermMonths(input as Record<string, unknown>) ?? 12;
  const financials: Record<string, unknown> = recalcFinancials(costItems, revenueItems, loanAmount, interestRate, turnoverCycles, tax, termMonths);

  // Merge trung_dai extended fields into financials
  for (const key of EXTENDED_FINANCIAL_KEYS) {
    if ((input as Record<string, unknown>)[key] !== undefined) {
      financials[key] = (input as Record<string, unknown>)[key];
    }
  }

  return prisma.loanPlan.create({
    data: {
      customerId: input.customerId,
      templateId: input.templateId ?? null,
      name: input.name ?? "",
      loan_method: input.loan_method ?? "tung_lan",
      cost_items_json: JSON.stringify(costItems),
      revenue_items_json: JSON.stringify(revenueItems),
      financials_json: JSON.stringify(financials),
    },
  });
}

export async function updatePlan(id: string, data: UpdatePlanInput) {
  const existing = await prisma.loanPlan.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`LoanPlan ${id} not found`);

  const costItems: CostItem[] = data.cost_items ?? JSON.parse(existing.cost_items_json);
  const revenueItems: RevenueItem[] = sanitizeRevenueItems(data.revenue_items ?? JSON.parse(existing.revenue_items_json));
  const existingFinancials: Partial<LoanPlanFinancials> = JSON.parse(existing.financials_json);
  const loanAmount = data.loanAmount ?? existingFinancials.loanAmount ?? 0;
  const interestRate = data.interestRate ?? existingFinancials.interestRate ?? 0;
  const turnoverCycles = data.turnoverCycles ?? existingFinancials.turnoverCycles ?? 1;
  const tax = data.tax ?? existingFinancials.tax ?? 0;
  const termMonths = pickTermMonths(data as Record<string, unknown>)
    ?? pickTermMonths(existingFinancials as Record<string, unknown>)
    ?? 12;
  const financials: Record<string, unknown> = recalcFinancials(costItems, revenueItems, loanAmount, interestRate, turnoverCycles, tax, termMonths);

  // Merge trung_dai extended fields into financials_json
  for (const key of EXTENDED_FINANCIAL_KEYS) {
    if (key in data) {
      financials[key] = (data as Record<string, unknown>)[key];
    } else if (key in existingFinancials) {
      financials[key] = (existingFinancials as Record<string, unknown>)[key];
    }
  }

  return prisma.loanPlan.update({
    where: { id },
    data: {
      name: data.name ?? existing.name,
      loan_method: data.loan_method ?? existing.loan_method,
      templateId: data.templateId !== undefined ? data.templateId : existing.templateId,
      cost_items_json: JSON.stringify(costItems),
      revenue_items_json: JSON.stringify(revenueItems),
      financials_json: JSON.stringify(financials),
    },
  });
}

export async function deletePlan(id: string) {
  try {
    return await prisma.loanPlan.delete({ where: { id } });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2025") throw new NotFoundError(`LoanPlan ${id} not found`);
    throw e;
  }
}

export async function listPlansForCustomer(customerId: string) {
  return prisma.loanPlan.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPlan(id: string) {
  const plan = await prisma.loanPlan.findUnique({ where: { id } });
  if (!plan) throw new NotFoundError(`LoanPlan ${id} not found`);
  return plan;
}

export const loanPlanService = {
  listTemplates,
  getTemplate,
  createPlanFromTemplate,
  updatePlan,
  deletePlan,
  listPlansForCustomer,
  getPlan,
};
