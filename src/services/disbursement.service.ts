import { NotFoundError, ValidationError } from "@/core/errors/app-error";
import type { TrackingStatus } from "@/lib/invoice-tracking-format-helpers";
import { prisma } from "@/lib/prisma";

export type BeneficiaryLineInput = {
  beneficiaryId?: string | null;
  beneficiaryName: string;
  accountNumber?: string;
  bankName?: string;
  amount: number;
  invoiceStatus?: "pending" | "has_invoice";
  invoices?: {
    supplierName: string;
    invoiceNumber: string;
    issueDate: string;
    amount: number;
  }[];
};

export type CreateDisbursementInput = {
  loanId: string;
  amount: number;
  disbursementDate: string;
  description?: string;
  // Expanded fields
  currentOutstanding?: number;
  debtAmount?: number;
  totalOutstanding?: number;
  purpose?: string;
  supportingDoc?: string;
  loanTerm?: number;
  repaymentEndDate?: string;
  principalSchedule?: string;
  interestSchedule?: string;
  beneficiaries?: BeneficiaryLineInput[];
};

export type UpdateDisbursementInput = {
  amount?: number;
  disbursementDate?: string;
  description?: string | null;
  status?: TrackingStatus;
};

export type FullUpdateDisbursementInput = {
  amount: number;
  disbursementDate: string;
  description?: string | null;
  status?: string;
  currentOutstanding?: number;
  debtAmount?: number;
  totalOutstanding?: number;
  purpose?: string;
  supportingDoc?: string;
  loanTerm?: number;
  repaymentEndDate?: string;
  principalSchedule?: string;
  interestSchedule?: string;
  beneficiaries?: BeneficiaryLineInput[];
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
        include: {
          _count: { select: { invoices: true } },
          beneficiaryLines: { select: { id: true, beneficiaryName: true, amount: true, invoiceStatus: true, invoiceAmount: true } },
        },
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
            loanAmount: true,
            customer: { select: { id: true, customer_name: true } },
          },
        },
        invoices: { orderBy: { createdAt: "desc" } },
        beneficiaryLines: {
          include: {
            beneficiary: { select: { id: true, name: true } },
            invoices: { orderBy: { createdAt: "desc" } },
          },
          orderBy: { createdAt: "asc" },
        },
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

    // Validate beneficiary amounts sum
    const beneficiaries = input.beneficiaries ?? [];
    if (beneficiaries.length > 0) {
      const debtAmount = input.debtAmount ?? input.amount;
      const beneficiarySum = beneficiaries.reduce((s, b) => s + b.amount, 0);
      if (Math.abs(beneficiarySum - debtAmount) > 0.01) {
        throw new ValidationError(
          `Beneficiary amounts sum (${beneficiarySum}) must equal debt amount (${debtAmount}).`,
        );
      }
    }

    const repaymentEnd = input.repaymentEndDate ? new Date(input.repaymentEndDate) : null;

    return prisma.$transaction(async (tx) => {
      const disbursement = await tx.disbursement.create({
        data: {
          loanId: input.loanId,
          amount: input.amount,
          disbursementDate: date,
          description: input.description ?? null,
          currentOutstanding: input.currentOutstanding ?? null,
          debtAmount: input.debtAmount ?? null,
          totalOutstanding: input.totalOutstanding ?? null,
          purpose: input.purpose ?? null,
          supportingDoc: input.supportingDoc ?? null,
          loanTerm: input.loanTerm ?? null,
          repaymentEndDate: repaymentEnd,
          principalSchedule: input.principalSchedule ?? null,
          interestSchedule: input.interestSchedule ?? null,
        },
      });

      // Create beneficiary lines + their invoices
      for (const b of beneficiaries) {
        const line = await tx.disbursementBeneficiary.create({
          data: {
            disbursementId: disbursement.id,
            beneficiaryId: b.beneficiaryId || null,
            beneficiaryName: b.beneficiaryName,
            accountNumber: b.accountNumber ?? null,
            bankName: b.bankName ?? null,
            amount: b.amount,
            invoiceStatus: b.invoiceStatus ?? "pending",
          },
        });

        if (b.invoices?.length) {
          await tx.invoice.createMany({
            data: b.invoices.map((inv) => ({
              disbursementId: disbursement.id,
              disbursementBeneficiaryId: line.id,
              invoiceNumber: inv.invoiceNumber,
              supplierName: inv.supplierName,
              amount: inv.amount,
              issueDate: new Date(inv.issueDate),
              dueDate: new Date(inv.issueDate), // default dueDate = issueDate
            })),
          });

          // Update invoiceAmount on the line
          const totalInv = b.invoices.reduce((s, i) => s + i.amount, 0);
          await tx.disbursementBeneficiary.update({
            where: { id: line.id },
            data: { invoiceAmount: totalInv },
          });
        }
      }

      return disbursement;
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

  /** Full update: replace all fields + beneficiary lines atomically */
  async fullUpdate(id: string, input: FullUpdateDisbursementInput) {
    const existing = await prisma.disbursement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Disbursement not found.");

    if (input.amount <= 0) throw new ValidationError("amount must be positive.");
    const date = new Date(input.disbursementDate);
    if (isNaN(date.getTime())) throw new ValidationError("disbursementDate is not a valid date.");

    const beneficiaries = input.beneficiaries ?? [];
    if (beneficiaries.length > 0) {
      const debtAmount = input.debtAmount ?? input.amount;
      const beneficiarySum = beneficiaries.reduce((s, b) => s + b.amount, 0);
      if (Math.abs(beneficiarySum - debtAmount) > 0.01) {
        throw new ValidationError(
          `Beneficiary amounts sum (${beneficiarySum}) must equal debt amount (${debtAmount}).`,
        );
      }
    }

    const repaymentEnd = input.repaymentEndDate ? new Date(input.repaymentEndDate) : null;

    return prisma.$transaction(async (tx) => {
      // Delete old beneficiary lines (cascades their invoices via DisbursementBeneficiary → Invoice relation)
      await tx.disbursementBeneficiary.deleteMany({ where: { disbursementId: id } });
      // Delete old direct invoices (ones not linked to a beneficiary line)
      await tx.invoice.deleteMany({ where: { disbursementId: id, disbursementBeneficiaryId: null } });

      const disbursement = await tx.disbursement.update({
        where: { id },
        data: {
          amount: input.amount,
          disbursementDate: date,
          description: input.description ?? null,
          status: input.status ?? existing.status,
          currentOutstanding: input.currentOutstanding ?? null,
          debtAmount: input.debtAmount ?? null,
          totalOutstanding: input.totalOutstanding ?? null,
          purpose: input.purpose ?? null,
          supportingDoc: input.supportingDoc ?? null,
          loanTerm: input.loanTerm ?? null,
          repaymentEndDate: repaymentEnd,
          principalSchedule: input.principalSchedule ?? null,
          interestSchedule: input.interestSchedule ?? null,
        },
      });

      // Re-create beneficiary lines + their invoices
      for (const b of beneficiaries) {
        const line = await tx.disbursementBeneficiary.create({
          data: {
            disbursementId: id,
            beneficiaryId: b.beneficiaryId || null,
            beneficiaryName: b.beneficiaryName,
            accountNumber: b.accountNumber ?? null,
            bankName: b.bankName ?? null,
            amount: b.amount,
            invoiceStatus: b.invoiceStatus ?? "pending",
          },
        });

        if (b.invoices?.length) {
          await tx.invoice.createMany({
            data: b.invoices.map((inv) => ({
              disbursementId: id,
              disbursementBeneficiaryId: line.id,
              invoiceNumber: inv.invoiceNumber,
              supplierName: inv.supplierName,
              amount: inv.amount,
              issueDate: new Date(inv.issueDate),
              dueDate: new Date(inv.issueDate),
            })),
          });

          const totalInv = b.invoices.reduce((s, i) => s + i.amount, 0);
          await tx.disbursementBeneficiary.update({
            where: { id: line.id },
            data: { invoiceAmount: totalInv },
          });
        }
      }

      return disbursement;
    });
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
