/** Disbursement query operations — list, aggregate, suggestions, surplus/deficit */
import { NotFoundError } from "@/core/errors/app-error";
import { prisma } from "@/lib/prisma";
import type { DisbursementFieldSuggestions, ListByLoanOpts } from "./disbursement-service-types";

export async function listByLoan(loanId: string, opts: ListByLoanOpts = {}) {
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
}

export async function getSummaryByLoan(loanId: string) {
  const [result, activeCount] = await Promise.all([
    prisma.disbursement.aggregate({
      where: { loanId },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.disbursement.count({ where: { loanId, status: "active" } }),
  ]);
  return {
    totalDisbursed: result._sum.amount ?? 0,
    disbursementCount: result._count,
    activeCount,
    completedCount: result._count - activeCount,
  };
}

export async function list(loanId?: string) {
  return prisma.disbursement.findMany({
    where: loanId ? { loanId } : undefined,
    include: { _count: { select: { invoices: true } } },
    orderBy: { disbursementDate: "desc" },
  });
}

export async function getFieldSuggestions(loanId: string): Promise<DisbursementFieldSuggestions> {
  const loan = await prisma.loan.findUnique({ where: { id: loanId }, select: { customerId: true } });
  if (!loan) return { principalSchedule: [], interestSchedule: [], purpose: [] };

  const rows = await prisma.disbursement.findMany({
    where: { loan: { customerId: loan.customerId } },
    select: { principalSchedule: true, interestSchedule: true, purpose: true },
  });

  const collect = (key: keyof DisbursementFieldSuggestions) =>
    [...new Set(rows.map((r) => r[key]).filter((v): v is string => !!v?.trim()))];

  return {
    principalSchedule: collect("principalSchedule"),
    interestSchedule: collect("interestSchedule"),
    purpose: collect("purpose"),
  };
}

export async function getSurplusDeficit(id: string) {
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
}
