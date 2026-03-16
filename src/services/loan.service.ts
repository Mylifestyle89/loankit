import type { Loan } from "@prisma/client";

import { NotFoundError, ValidationError } from "@/core/errors/app-error";
import type { TrackingStatus } from "@/lib/invoice-tracking-format-helpers";
import { prisma } from "@/lib/prisma";

export type CreateLoanInput = {
  customerId: string;
  contractNumber: string;
  loanAmount: number;
  interestRate?: number;
  startDate: string;
  endDate: string;
  purpose?: string;
  disbursementCount?: string;
};

export type UpdateLoanInput = {
  contractNumber?: string;
  loanAmount?: number;
  interestRate?: number | null;
  startDate?: string;
  endDate?: string;
  purpose?: string | null;
  disbursementCount?: string | null;
  collateralValue?: number | null;
  securedObligation?: number | null;
  disbursementLimitByAsset?: number | null;
  status?: TrackingStatus;
  // Điều kiện cho vay
  lending_method?: string | null;
  tcmblm_reason?: string | null;
  interest_method?: string | null;
  principal_schedule?: string | null;
  interest_schedule?: string | null;
  policy_program?: string | null;
  // Nguồn vốn & Vốn đối ứng
  total_capital_need?: number | null;
  equity_amount?: number | null;
  cash_equity?: number | null;
  labor_equity?: number | null;
  other_loan?: number | null;
  other_asset_equity?: number | null;
  // Hiệu quả & Xếp hạng
  expected_revenue?: number | null;
  expected_cost?: number | null;
  expected_profit?: number | null;
  from_project?: string | null;
  other_income?: string | null;
  other_income_detail?: string | null;
  customer_rating?: string | null;
  debt_group?: string | null;
  scoring_period?: string | null;
  prior_contract_number?: string | null;
  prior_contract_date?: string | null;
  prior_outstanding?: number | null;
};

export const loanService = {
  async list(opts?: { customerId?: string; page?: number; limit?: number }) {
    const take = Math.min(opts?.limit ?? 50, 200);
    const skip = ((opts?.page ?? 1) - 1) * take;
    const where = opts?.customerId ? { customerId: opts.customerId } : undefined;
    const [data, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        include: {
          customer: { select: { id: true, customer_name: true } },
          _count: { select: { disbursements: true } },
        },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.loan.count({ where }),
    ]);
    return { data, total, page: opts?.page ?? 1, limit: take };
  },

  async getById(id: string) {
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, customer_name: true } },
      },
    });
    if (!loan) throw new NotFoundError("Loan not found.");
    return loan;
  },

  async create(input: CreateLoanInput) {
    if (!input.contractNumber?.trim()) {
      throw new ValidationError("contractNumber is required.");
    }
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (isNaN(startDate.getTime())) throw new ValidationError("startDate is not a valid date.");
    if (isNaN(endDate.getTime())) throw new ValidationError("endDate is not a valid date.");
    return prisma.loan.create({
      data: {
        customerId: input.customerId,
        contractNumber: input.contractNumber.trim(),
        loanAmount: input.loanAmount,
        interestRate: input.interestRate ?? null,
        startDate,
        endDate,
        purpose: input.purpose ?? null,
        disbursementCount: input.disbursementCount ?? null,
      },
    });
  },

  async update(id: string, input: UpdateLoanInput) {
    const existing = await prisma.loan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Loan not found.");

    const data: Record<string, unknown> = {};
    if (input.contractNumber !== undefined) data.contractNumber = input.contractNumber.trim();
    if (input.loanAmount !== undefined) data.loanAmount = input.loanAmount;
    if (input.interestRate !== undefined) data.interestRate = input.interestRate;
    if (input.startDate !== undefined) {
      const d = new Date(input.startDate);
      if (isNaN(d.getTime())) throw new ValidationError("startDate is not a valid date.");
      data.startDate = d;
    }
    if (input.endDate !== undefined) {
      const d = new Date(input.endDate);
      if (isNaN(d.getTime())) throw new ValidationError("endDate is not a valid date.");
      data.endDate = d;
    }
    if (input.purpose !== undefined) data.purpose = input.purpose;
    if (input.disbursementCount !== undefined) data.disbursementCount = input.disbursementCount;
    if (input.collateralValue !== undefined) data.collateralValue = input.collateralValue;
    if (input.securedObligation !== undefined) data.securedObligation = input.securedObligation;
    if (input.disbursementLimitByAsset !== undefined) data.disbursementLimitByAsset = input.disbursementLimitByAsset;
    if (input.status !== undefined) data.status = input.status;

    // Điều kiện cho vay + Nguồn vốn + Hiệu quả & Xếp hạng
    const passthrough: (keyof UpdateLoanInput)[] = [
      "lending_method", "tcmblm_reason", "interest_method", "principal_schedule",
      "interest_schedule", "policy_program", "total_capital_need", "equity_amount",
      "cash_equity", "labor_equity", "other_loan", "other_asset_equity",
      "expected_revenue", "expected_cost", "expected_profit", "from_project",
      "other_income", "other_income_detail", "customer_rating", "debt_group", "scoring_period",
      "prior_contract_number", "prior_contract_date", "prior_outstanding",
    ];
    for (const key of passthrough) {
      if (input[key] !== undefined) data[key] = input[key];
    }

    return prisma.loan.update({ where: { id }, data });
  },

  async delete(id: string) {
    const existing = await prisma.loan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Loan not found.");
    await prisma.loan.delete({ where: { id } });
  },
};
