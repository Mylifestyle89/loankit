import { NotFoundError, ValidationError } from "@/core/errors/app-error";
import type { TrackingStatus } from "@/lib/invoice-tracking-format-helpers";
import { prisma } from "@/lib/prisma";

export type CreateDisbursementInput = {
  loanId: string;
  amount: number;
  disbursementDate: string;
  description?: string;
};

export type UpdateDisbursementInput = {
  amount?: number;
  disbursementDate?: string;
  description?: string | null;
  status?: TrackingStatus;
};

export type ListByLoanOpts = {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export const disbursementService = {
  /** Paginated disbursement list for a specific loan */
  async listByLoan(loanId: string, opts: ListByLoanOpts = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { loanId };
    if (opts.status) where.status = opts.status;
    if (opts.search) where.description = { contains: opts.search };
    if (opts.dateFrom || opts.dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (opts.dateFrom) dateFilter.gte = new Date(opts.dateFrom);
      if (opts.dateTo) dateFilter.lte = new Date(opts.dateTo);
      where.disbursementDate = dateFilter;
    }

    const [disbursements, total] = await Promise.all([
      prisma.disbursement.findMany({
        where,
        include: { _count: { select: { invoices: true } } },
        orderBy: { disbursementDate: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.disbursement.count({ where }),
    ]);

    return { disbursements, total, page, pageSize };
  },

  /** Aggregate summary for a loan's disbursements */
  async getSummaryByLoan(loanId: string) {
    const [result, activeCount] = await Promise.all([
      prisma.disbursement.aggregate({
        where: { loanId },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.disbursement.count({
        where: { loanId, status: "active" },
      }),
    ]);
    return {
      totalDisbursed: result._sum.amount ?? 0,
      disbursementCount: result._count,
      activeCount,
      completedCount: result._count - activeCount,
    };
  },

  async list(loanId?: string) {
    return prisma.disbursement.findMany({
      where: loanId ? { loanId } : undefined,
      include: { _count: { select: { invoices: true } } },
      orderBy: { disbursementDate: "desc" },
    });
  },

  async getById(id: string) {
    const disbursement = await prisma.disbursement.findUnique({
      where: { id },
      include: {
        loan: {
          select: {
            id: true,
            contractNumber: true,
            customer: { select: { id: true, customer_name: true } },
          },
        },
        invoices: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!disbursement) throw new NotFoundError("Disbursement not found.");
    return disbursement;
  },

  async create(input: CreateDisbursementInput) {
    if (input.amount <= 0) {
      throw new ValidationError("amount must be positive.");
    }
    const date = new Date(input.disbursementDate);
    if (isNaN(date.getTime())) {
      throw new ValidationError("disbursementDate is not a valid date.");
    }
    return prisma.disbursement.create({
      data: {
        loanId: input.loanId,
        amount: input.amount,
        disbursementDate: date,
        description: input.description ?? null,
      },
    });
  },

  async update(id: string, input: UpdateDisbursementInput) {
    const existing = await prisma.disbursement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Disbursement not found.");

    const data: Record<string, unknown> = {};
    if (input.amount !== undefined) data.amount = input.amount;
    if (input.disbursementDate !== undefined) {
      const date = new Date(input.disbursementDate);
      if (isNaN(date.getTime())) {
        throw new ValidationError("disbursementDate is not a valid date.");
      }
      data.disbursementDate = date;
    }
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) data.status = input.status;

    return prisma.disbursement.update({ where: { id }, data });
  },

  async delete(id: string) {
    const existing = await prisma.disbursement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Disbursement not found.");
    await prisma.disbursement.delete({ where: { id } });
  },

  async getSurplusDeficit(id: string) {
    const d = await prisma.disbursement.findUnique({
      where: { id },
      include: { invoices: { select: { amount: true } } },
    });
    if (!d) throw new NotFoundError("Disbursement not found.");

    const totalInvoice = d.invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const diff = totalInvoice - d.amount;
    const label: "surplus" | "deficit" | "balanced" =
      diff > 0 ? "surplus" : diff < 0 ? "deficit" : "balanced";

    return { disbursementAmount: d.amount, totalInvoice, diff, label };
  },
};
