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
  // Optional extended fields (DOCX import, plan builder). All nullable so
  // callers can pass partial data without breaking the Prisma create.
  loan_method?: string | null;
  lending_method?: string | null;
  principal_schedule?: string | null;
  interest_schedule?: string | null;
  total_capital_need?: number | null;
  equity_amount?: number | null;
  expected_revenue?: number | null;
  expected_profit?: number | null;
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
  // Tài sản bảo đảm đã chọn (JSON array of collateral IDs)
  selectedCollateralIds?: string;
};

export const loanService = {
  async list(opts?: {
    customerId?: string;
    search?: string;
    status?: string;
    customerType?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    page?: number;
    limit?: number;
  }) {
    const take = Math.min(opts?.limit ?? 50, 200);
    const skip = ((opts?.page ?? 1) - 1) * take;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (opts?.customerId) where.customerId = opts.customerId;
    if (opts?.status) where.status = opts.status;
    if (opts?.customerType) where.customer = { ...where.customer, customer_type: opts.customerType };
    if (opts?.search) {
      const term = opts.search.trim();
      where.OR = [
        { contractNumber: { contains: term, mode: "insensitive" } },
        { customer: { customer_name: { contains: term, mode: "insensitive" } } },
      ];
    }

    // Build orderBy
    const SORT_MAP: Record<string, object> = {
      contractNumber: { contractNumber: opts?.sortOrder ?? "asc" },
      customerName: { customer: { customer_name: opts?.sortOrder ?? "asc" } },
      loanAmount: { loanAmount: opts?.sortOrder ?? "desc" },
      startDate: { startDate: opts?.sortOrder ?? "desc" },
      status: { status: opts?.sortOrder ?? "asc" },
    };
    const orderBy = (opts?.sortBy && SORT_MAP[opts.sortBy]) || { createdAt: "desc" };

    const [data, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        include: {
          customer: { select: { id: true, customer_name: true, customer_type: true } },
          _count: { select: { disbursements: true } },
        },
        orderBy,
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
        customer: { select: { id: true, customer_name: true, customer_type: true } },
      },
    });
    if (!loan) throw new NotFoundError("Loan not found.");
    // KHCN = individual customer (customer_type === "individual")
    return { ...loan, isKhcn: loan.customer.customer_type === "individual" };
  },

  async create(input: CreateLoanInput) {
    if (!input.contractNumber?.trim()) {
      throw new ValidationError("contractNumber is required.");
    }
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (isNaN(startDate.getTime())) throw new ValidationError("startDate is not a valid date.");
    if (isNaN(endDate.getTime())) throw new ValidationError("endDate is not a valid date.");
    // Build extended-field overrides. Only include fields the caller
    // actually provided a non-null value for — null gets dropped so Prisma
    // keeps the schema default (e.g. loan_method defaults to "tung_lan").
    const extended: Record<string, string | number> = {};
    if (typeof input.loan_method === "string" && input.loan_method) extended.loan_method = input.loan_method;
    if (typeof input.lending_method === "string" && input.lending_method) extended.lending_method = input.lending_method;
    if (typeof input.principal_schedule === "string" && input.principal_schedule) extended.principal_schedule = input.principal_schedule;
    if (typeof input.interest_schedule === "string" && input.interest_schedule) extended.interest_schedule = input.interest_schedule;
    if (typeof input.total_capital_need === "number") extended.total_capital_need = input.total_capital_need;
    if (typeof input.equity_amount === "number") extended.equity_amount = input.equity_amount;
    if (typeof input.expected_revenue === "number") extended.expected_revenue = input.expected_revenue;
    if (typeof input.expected_profit === "number") extended.expected_profit = input.expected_profit;

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
        ...extended,
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
      "selectedCollateralIds",
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
