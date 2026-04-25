/**
 * Invoice CRUD operations — create, update, delete, getById.
 */
import { NotFoundError } from "@/core/errors/app-error";
import { addOneMonthClamped } from "@/lib/invoice-tracking-format-helpers";
import { prisma } from "@/lib/prisma";
import { notificationService } from "@/services/notification.service";

import type { CreateInvoiceInput, UpdateInvoiceInput } from "./invoice.service";

/** Recalculate invoiceStatus and invoiceAmount on a beneficiary line.
 * Status logic: pending (no invoices) → supplementing (has invoices but total < disbursement amount) → has_invoice (total >= amount) */
export async function recalcBeneficiaryStatus(beneficiaryLineId: string) {
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

export async function getById(id: string) {
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
}

export async function createInvoice(input: CreateInvoiceInput) {
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

  // Check duplicate by invoiceNumber + supplierName within same disbursement
  const existing = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: input.invoiceNumber,
      supplierName: input.supplierName,
      disbursementId: input.disbursementId,
    },
  });

  const duplicateWarning = existing
    ? `Hóa đơn "${input.invoiceNumber}" từ "${input.supplierName}" đã tồn tại (ID: ${existing.id})`
    : null;

  if (duplicateWarning) {
    const disbForNotif = await prisma.disbursement.findUnique({
      where: { id: input.disbursementId },
      select: { loan: { select: { customerId: true } } },
    });
    await notificationService.create({
      type: "duplicate_invoice",
      title: "Trùng lặp hóa đơn",
      message: duplicateWarning,
      metadata: {
        invoiceNumber: input.invoiceNumber,
        supplierName: input.supplierName,
        disbursementId: input.disbursementId,
      },
      customerId: disbForNotif?.loan.customerId ?? null,
    });
  }

  // Guard: invoice amount must not exceed remaining beneficiary allocation
  if (input.disbursementBeneficiaryId) {
    const bene = await prisma.disbursementBeneficiary.findUnique({
      where: { id: input.disbursementBeneficiaryId },
      select: { amount: true, invoiceAmount: true },
    });
    if (bene && bene.invoiceAmount + input.amount > bene.amount) {
      throw new Error(`Tổng hóa đơn (${bene.invoiceAmount + input.amount}) vượt số tiền phân bổ (${bene.amount})`);
    }
  }

  // When retail line items provided, compute total from items
  const effectiveAmount = input.items?.length
    ? input.items.reduce((s, i) => s + i.amount, 0)
    : input.amount;

  const invoice = await prisma.invoice.create({
    data: {
      disbursementId: input.disbursementId,
      disbursementBeneficiaryId: input.disbursementBeneficiaryId ?? null,
      invoiceNumber: input.invoiceNumber,
      supplierName: input.supplierName,
      amount: effectiveAmount,
      issueDate: new Date(input.issueDate),
      dueDate: new Date(input.dueDate),
      customDeadline: input.customDeadline ? new Date(input.customDeadline) : null,
      notes: input.notes ?? null,
      items_json: input.items?.length ? JSON.stringify(input.items) : null,
      templateType: input.templateType ?? null,
    },
  });

  if (input.disbursementBeneficiaryId) {
    await recalcBeneficiaryStatus(input.disbursementBeneficiaryId);
  }

  return { invoice, duplicateWarning };
}

export async function updateInvoice(id: string, input: UpdateInvoiceInput) {
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
  if (input.items !== undefined) {
    data.items_json = input.items.length ? JSON.stringify(input.items) : null;
    // Recompute amount from items when items provided
    if (input.items.length) data.amount = input.items.reduce((s, i) => s + i.amount, 0);
  }
  if (input.templateType !== undefined) data.templateType = input.templateType;

  const updated = await prisma.invoice.update({ where: { id }, data });
  if (existing.disbursementBeneficiaryId) {
    await recalcBeneficiaryStatus(existing.disbursementBeneficiaryId);
  }
  return updated;
}


export async function deleteInvoice(id: string) {
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Invoice not found.");
  await prisma.invoice.delete({ where: { id } });
  if (existing.disbursementBeneficiaryId) {
    await recalcBeneficiaryStatus(existing.disbursementBeneficiaryId);
  }
}
