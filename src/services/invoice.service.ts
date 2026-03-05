import { NotFoundError } from "@/core/errors/app-error";
import { prisma } from "@/lib/prisma";
import { notificationService } from "@/services/notification.service";

/** Recalculate invoiceStatus and invoiceAmount on a beneficiary line */
async function recalcBeneficiaryStatus(beneficiaryLineId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { disbursementBeneficiaryId: beneficiaryLineId },
    select: { amount: true },
  });
  const totalAmount = invoices.reduce((s, inv) => s + inv.amount, 0);
  await prisma.disbursementBeneficiary.update({
    where: { id: beneficiaryLineId },
    data: {
      invoiceStatus: invoices.length > 0 ? "has_invoice" : "pending",
      invoiceAmount: totalAmount,
    },
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
    if (filters?.status) where.status = filters.status;

    // Filter by customer requires joining through disbursement → loan → customer
    if (filters?.customerId) {
      return prisma.invoice.findMany({
        where: {
          ...where,
          disbursement: { loan: { customerId: filters.customerId } },
        },
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
        orderBy: { createdAt: "desc" },
      });
    }

    return prisma.invoice.findMany({
      where,
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
      orderBy: { createdAt: "desc" },
    });
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

      for (const loan of c.loans) {
        totalDisbursements += loan.disbursements.length;
        for (const d of loan.disbursements) {
          for (const inv of d.invoices) {
            totalInvoices++;
            totalAmount += inv.amount;
            if (inv.status === "pending") pendingCount++;
            if (inv.status === "overdue") overdueCount++;
          }
        }
      }

      return {
        customerId: c.id,
        customerName: c.customer_name,
        totalLoans: c.loans.length,
        totalDisbursements,
        totalInvoices,
        totalAmount,
        pendingCount,
        overdueCount,
      };
    });
  },
};
