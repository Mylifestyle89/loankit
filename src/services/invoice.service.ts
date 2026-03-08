import { NotFoundError } from "@/core/errors/app-error";
import { addOneMonthClamped } from "@/lib/invoice-tracking-format-helpers";
import { prisma } from "@/lib/prisma";
import { notificationService } from "@/services/notification.service";

/** Recalculate invoiceStatus and invoiceAmount on a beneficiary line.
 * Status logic: pending (no invoices) → supplementing (has invoices but total < disbursement amount) → has_invoice (total >= amount) */
async function recalcBeneficiaryStatus(beneficiaryLineId: string) {
  const [invoices, beneficiary] = await Promise.all([
    prisma.invoice.findMany({
      where: { disbursementBeneficiaryId: beneficiaryLineId },
      select: { amount: true },
    }),
    prisma.disbursementBeneficiary.findUnique({
      where: { id: beneficiaryLineId },
      select: { amount: true },
    }),
  ]);
  const totalInvoiceAmount = invoices.reduce((s, inv) => s + inv.amount, 0);
  const disbursementAmount = beneficiary?.amount ?? 0;

  let status = "pending";
  if (invoices.length > 0 && totalInvoiceAmount < disbursementAmount) {
    status = "supplementing";
  } else if (invoices.length > 0 && totalInvoiceAmount >= disbursementAmount) {
    status = "has_invoice";
  }

  await prisma.disbursementBeneficiary.update({
    where: { id: beneficiaryLineId },
    data: { invoiceStatus: status, invoiceAmount: totalInvoiceAmount },
  });
}

export type CreateInvoiceInput = {
  disbursementId: string;
  disbursementBeneficiaryId?: string;
  invoiceNumber: string;
  supplierName: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  customDeadline?: string;
  notes?: string;
};

export type UpdateInvoiceInput = {
  invoiceNumber?: string;
  supplierName?: string;
  amount?: number;
  issueDate?: string;
  dueDate?: string;
  customDeadline?: string | null;
  notes?: string | null;
  status?: string;
};

export const invoiceService = {
  async listByDisbursement(disbursementId: string) {
    return prisma.invoice.findMany({
      where: { disbursementId },
      orderBy: { createdAt: "desc" },
    });
  },

  async listAll(filters?: { status?: string; customerId?: string }) {
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
      where: { ...where, ...customerWhere },
      include: { disbursement: disbursementInclude },
      orderBy: { createdAt: "desc" },
    });

    // Build virtual entries for beneficiary lines without invoices
    const virtualEntries = await this.getVirtualInvoiceEntries(filters?.customerId);

    // If filtering by a real status (not needs_supplement), skip virtual entries
    if (filters?.status && filters.status !== "needs_supplement") {
      return realInvoices;
    }
    // If filtering specifically for needs_supplement, return only virtual
    if (filters?.status === "needs_supplement") {
      return virtualEntries;
    }

    return [...realInvoices, ...virtualEntries];
  },

  /** Generate virtual invoice entries for beneficiary lines that still need invoices (pending or supplementing) */
  async getVirtualInvoiceEntries(customerId?: string) {
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
  },

  async getById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        disbursement: {
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
        },
      },
    });
    if (!invoice) throw new NotFoundError("Invoice not found.");
    return invoice;
  },

  async create(input: CreateInvoiceInput) {
    // Auto-set dueDate = disbursementDate + 1 month if not provided or same as issueDate
    if (!input.dueDate || input.dueDate === input.issueDate) {
      const disbursement = await prisma.disbursement.findUnique({
        where: { id: input.disbursementId },
        select: { disbursementDate: true },
      });
      if (disbursement) {
        input.dueDate = addOneMonthClamped(disbursement.disbursementDate).toISOString();
      }
    }

    // Check duplicate by BOTH invoiceNumber + supplierName
    const existing = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: input.invoiceNumber,
        supplierName: input.supplierName,
      },
    });

    const duplicateWarning = existing
      ? `Hóa đơn "${input.invoiceNumber}" từ "${input.supplierName}" đã tồn tại (ID: ${existing.id})`
      : null;

    // Create notification if duplicate detected
    if (duplicateWarning) {
      await notificationService.create({
        type: "duplicate_invoice",
        title: "Trùng lặp hóa đơn",
        message: duplicateWarning,
        metadata: {
          invoiceNumber: input.invoiceNumber,
          supplierName: input.supplierName,
          disbursementId: input.disbursementId,
        },
      });
    }

    // Non-blocking: still saves even if duplicate
    const invoice = await prisma.invoice.create({
      data: {
        disbursementId: input.disbursementId,
        disbursementBeneficiaryId: input.disbursementBeneficiaryId ?? null,
        invoiceNumber: input.invoiceNumber,
        supplierName: input.supplierName,
        amount: input.amount,
        issueDate: new Date(input.issueDate),
        dueDate: new Date(input.dueDate),
        customDeadline: input.customDeadline ? new Date(input.customDeadline) : null,
        notes: input.notes ?? null,
      },
    });

    // Auto-recalc beneficiary line status
    if (input.disbursementBeneficiaryId) {
      await recalcBeneficiaryStatus(input.disbursementBeneficiaryId);
    }

    return { invoice, duplicateWarning };
  },

  async update(id: string, input: UpdateInvoiceInput) {
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Invoice not found.");

    const data: Record<string, unknown> = {};
    if (input.invoiceNumber !== undefined) data.invoiceNumber = input.invoiceNumber;
    if (input.supplierName !== undefined) data.supplierName = input.supplierName;
    if (input.amount !== undefined) data.amount = input.amount;
    if (input.issueDate !== undefined) data.issueDate = new Date(input.issueDate);
    if (input.dueDate !== undefined) data.dueDate = new Date(input.dueDate);
    if (input.customDeadline !== undefined) {
      data.customDeadline = input.customDeadline ? new Date(input.customDeadline) : null;
    }
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.status !== undefined) data.status = input.status;

    const updated = await prisma.invoice.update({ where: { id }, data });
    if (existing.disbursementBeneficiaryId) {
      await recalcBeneficiaryStatus(existing.disbursementBeneficiaryId);
    }
    return updated;
  },

  async delete(id: string) {
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Invoice not found.");
    await prisma.invoice.delete({ where: { id } });
    if (existing.disbursementBeneficiaryId) {
      await recalcBeneficiaryStatus(existing.disbursementBeneficiaryId);
    }
  },

  /** Called by scheduler: mark pending invoices past due as overdue */
  async markOverdue() {
    const now = new Date();
    return prisma.invoice.updateMany({
      where: {
        status: "pending",
        OR: [
          { customDeadline: { not: null, lt: now } },
          { AND: [{ customDeadline: null }, { dueDate: { lt: now } }] },
        ],
      },
      data: { status: "overdue" },
    });
  },

  /** Aggregate invoices per customer for summary view */
  async getCustomerSummary() {
    const customers = await prisma.customer.findMany({
      include: {
        loans: {
          include: {
            disbursements: {
              include: {
                invoices: { select: { amount: true, status: true } },
                beneficiaryLines: { select: { invoiceStatus: true } },
              },
            },
          },
        },
      },
    });

    return customers.map((c) => {
      let totalInvoices = 0;
      let totalAmount = 0;
      let pendingCount = 0;
      let overdueCount = 0;
      let totalDisbursements = 0;
      let needsSupplementCount = 0;

      for (const loan of c.loans) {
        totalDisbursements += loan.disbursements.length;
        for (const d of loan.disbursements) {
          for (const inv of d.invoices) {
            totalInvoices++;
            totalAmount += inv.amount;
            if (inv.status === "pending") pendingCount++;
            if (inv.status === "overdue") overdueCount++;
          }
          // Count beneficiary lines that still need invoices (pending or supplementing)
          for (const b of d.beneficiaryLines) {
            if (b.invoiceStatus === "pending" || b.invoiceStatus === "supplementing") needsSupplementCount++;
          }
        }
      }

      return {
        customerId: c.id,
        customerName: c.customer_name,
        customerEmail: c.email,
        totalLoans: c.loans.length,
        totalDisbursements,
        totalInvoices,
        totalAmount,
        pendingCount,
        overdueCount,
        needsSupplementCount,
      };
    });
  },
};
