/**
 * Invoice query operations — listByDisbursement, listAll, getVirtualInvoiceEntries,
 * getCustomerSummary, markOverdue.
 */
import { addOneMonthClamped } from "@/lib/invoice-tracking-format-helpers";
import { prisma } from "@/lib/prisma";

/** Prisma where clause to exclude invoices linked to bang_ke beneficiary lines */
const EXCLUDE_BANG_KE_INVOICES = {
  OR: [
    { disbursementBeneficiary: { invoiceStatus: { not: "bang_ke" } } },
    { disbursementBeneficiaryId: null },
  ],
};

export async function listByDisbursement(disbursementId: string) {
  return prisma.invoice.findMany({
    where: { disbursementId },
    orderBy: { createdAt: "desc" },
  });
}

/** Generate virtual invoice entries for beneficiary lines that still need invoices (pending or supplementing) */
export async function getVirtualInvoiceEntries(customerId?: string) {
  const beneficiaryWhere: Record<string, unknown> = { invoiceStatus: { in: ["pending", "supplementing"] } };
  if (customerId) {
    beneficiaryWhere.disbursement = { loan: { customerId } };
  }

  const lines = await prisma.disbursementBeneficiary.findMany({
    where: beneficiaryWhere,
    include: {
      disbursement: {
        select: {
          id: true,
          amount: true,
          disbursementDate: true,
          loan: {
            select: {
              contractNumber: true,
              customer: { select: { id: true, customer_name: true } },
            },
          },
        },
      },
    },
  });

  return lines.map((b) => ({
    id: `virtual-${b.id}`,
    disbursementId: b.disbursementId,
    disbursementBeneficiaryId: b.id,
    invoiceNumber: `—`,
    supplierName: b.beneficiaryName,
    amount: b.amount - b.invoiceAmount,
    issueDate: b.disbursement.disbursementDate,
    dueDate: addOneMonthClamped(b.disbursement.disbursementDate),
    customDeadline: null,
    status: "needs_supplement",
    notes: null,
    createdAt: b.disbursement.disbursementDate,
    updatedAt: b.disbursement.disbursementDate,
    disbursement: b.disbursement,
  }));
}

export async function listAll(filters?: { status?: string; customerId?: string }) {
  const where: Record<string, unknown> = {};
  if (filters?.status && filters.status !== "needs_supplement") {
    where.status = filters.status;
  }

  const customerWhere = filters?.customerId
    ? { disbursement: { loan: { customerId: filters.customerId } } }
    : {};

  const disbursementInclude = {
    select: {
      id: true,
      amount: true,
      loan: {
        select: {
          contractNumber: true,
          customer: { select: { id: true, customer_name: true } },
        },
      },
    },
  } as const;

  const realInvoices = await prisma.invoice.findMany({
    where: {
      ...where,
      ...customerWhere,
      ...EXCLUDE_BANG_KE_INVOICES,
    },
    include: {
      disbursement: disbursementInclude,
      disbursementBeneficiary: { select: { amount: true, invoiceAmount: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const virtualEntries = await getVirtualInvoiceEntries(filters?.customerId);

  if (filters?.status && filters.status !== "needs_supplement") {
    return realInvoices;
  }
  if (filters?.status === "needs_supplement") {
    return virtualEntries;
  }

  return [...realInvoices, ...virtualEntries];
}

/** Called by scheduler: mark pending invoices past due as overdue, return newly marked IDs */
export async function markOverdue(): Promise<{ count: number; newlyOverdueIds: string[] }> {
  const now = new Date();
  const toMark = await prisma.invoice.findMany({
    where: {
      status: "pending",
      OR: [
        { customDeadline: { not: null, lt: now } },
        { AND: [{ customDeadline: null }, { dueDate: { lt: now } }] },
      ],
      // Skip invoices whose beneficiary line is already fully covered
      NOT: { disbursementBeneficiary: { invoiceStatus: "has_invoice" } },
    },
    select: { id: true },
  });
  const ids = toMark.map((inv) => inv.id);
  if (ids.length === 0) return { count: 0, newlyOverdueIds: [] };

  await prisma.invoice.updateMany({
    where: { id: { in: ids } },
    data: { status: "overdue" },
  });
  return { count: ids.length, newlyOverdueIds: ids };
}

/** Aggregate invoices per customer for summary view (optimized — no full graph load) */
export async function getCustomerSummary() {
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      customer_name: true,
      email: true,
      _count: { select: { loans: true } },
    },
  });

  const [disbCounts, invoiceStats, supplementCounts, loans] = await Promise.all([
    prisma.disbursement.groupBy({ by: ["loanId"], _count: true }),
    prisma.invoice.findMany({
      where: { ...EXCLUDE_BANG_KE_INVOICES },
      select: {
        amount: true,
        status: true,
        disbursement: { select: { loan: { select: { customerId: true } } } },
      },
    }),
    prisma.disbursementBeneficiary.findMany({
      where: { invoiceStatus: { in: ["pending", "supplementing"] } },
      select: {
        disbursement: { select: { loan: { select: { customerId: true } } } },
      },
    }),
    prisma.loan.findMany({ select: { id: true, customerId: true } }),
  ]);

  const loanToCustomer = new Map(loans.map((l) => [l.id, l.customerId]));

  const custDisbursements = new Map<string, number>();
  for (const d of disbCounts) {
    const custId = loanToCustomer.get(d.loanId);
    if (custId) custDisbursements.set(custId, (custDisbursements.get(custId) ?? 0) + d._count);
  }

  const custStats = new Map<string, { total: number; amount: number; pending: number; overdue: number }>();
  for (const inv of invoiceStats) {
    const custId = inv.disbursement.loan.customerId;
    const s = custStats.get(custId) ?? { total: 0, amount: 0, pending: 0, overdue: 0 };
    s.total++;
    s.amount += inv.amount;
    if (inv.status === "pending") s.pending++;
    if (inv.status === "overdue") s.overdue++;
    custStats.set(custId, s);
  }

  const custSupplement = new Map<string, number>();
  for (const b of supplementCounts) {
    const custId = b.disbursement.loan.customerId;
    custSupplement.set(custId, (custSupplement.get(custId) ?? 0) + 1);
  }

  return customers.map((c) => {
    const stats = custStats.get(c.id) ?? { total: 0, amount: 0, pending: 0, overdue: 0 };
    return {
      customerId: c.id,
      customerName: c.customer_name,
      customerEmail: c.email,
      totalLoans: c._count.loans,
      totalDisbursements: custDisbursements.get(c.id) ?? 0,
      totalInvoices: stats.total,
      totalAmount: stats.amount,
      pendingCount: stats.pending,
      overdueCount: stats.overdue,
      needsSupplementCount: custSupplement.get(c.id) ?? 0,
    };
  });
}
