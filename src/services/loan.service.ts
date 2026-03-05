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
  status?: TrackingStatus;
};

export const loanService = {
  async list(customerId?: string): Promise<Loan[]> {
    return prisma.loan.findMany({
      where: customerId ? { customerId } : undefined,
      include: {
        customer: { select: { id: true, customer_name: true } },
        _count: { select: { disbursements: true } },
      },
      orderBy: { createdAt: "desc" },
    });
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
    if (input.status !== undefined) data.status = input.status;

    return prisma.loan.update({ where: { id }, data });
  },

  async delete(id: string) {
    const existing = await prisma.loan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Loan not found.");
    await prisma.loan.delete({ where: { id } });
  },
};
