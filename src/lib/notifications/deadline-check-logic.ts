import { prisma } from "@/lib/prisma";
import { invoiceService } from "@/services/invoice.service";
import { notificationService } from "@/services/notification.service";
import { emailService } from "@/services/email.service";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export type DeadlineCheckResult = {
  dueSoonChecked: number;
  newlyOverdue: number;
  totalOverdue: number;
  notificationsCreated: number;
  emailsSent: number;
  emailErrors: number;
};

/** Shared logic: check due-soon + overdue invoices, create notifications, send emails */
export async function runDeadlineCheck(): Promise<DeadlineCheckResult> {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + SEVEN_DAYS);
  let emailsSent = 0;
  let emailErrors = 0;
  let notificationsCreated = 0;

  // Invoice include pattern for customer access
  const invoiceInclude = {
    disbursement: { include: { loan: { include: { customer: true } } } },
  } as const;

  // Batch-fetch recent notifications for dedup (avoids N+1)
  const recentNotifs = await prisma.appNotification.findMany({
    where: {
      type: { in: ["invoice_due_soon", "invoice_overdue"] },
      createdAt: { gte: new Date(now.getTime() - TWENTY_FOUR_HOURS) },
    },
    select: { type: true, metadata: true },
  });
  // Build set of "type:invoiceId" for fast dedup lookup
  const notifiedSet = new Set<string>();
  for (const n of recentNotifs) {
    if (!n.metadata) continue;
    try {
      const meta = JSON.parse(n.metadata) as { invoiceId?: string };
      if (meta.invoiceId) notifiedSet.add(`${n.type}:${meta.invoiceId}`);
    } catch { /* skip malformed */ }
  }

  // 1. Find pending invoices due within 7 days
  const dueSoon = await prisma.invoice.findMany({
    where: {
      status: "pending",
      OR: [
        { customDeadline: { not: null, lte: sevenDaysFromNow, gt: now } },
        { AND: [{ customDeadline: null }, { dueDate: { lte: sevenDaysFromNow, gt: now } }] },
      ],
    },
    include: invoiceInclude,
  });

  for (const inv of dueSoon) {
    const effectiveDate = inv.customDeadline ?? inv.dueDate;
    if (effectiveDate > sevenDaysFromNow || effectiveDate <= now) continue;

    // Dedup: skip if notified in last 24h
    if (notifiedSet.has(`invoice_due_soon:${inv.id}`)) continue;

    const customer = inv.disbursement.loan.customer;
    const notif = await notificationService.create({
      type: "invoice_due_soon",
      title: `HD sap den han: ${inv.invoiceNumber}`,
      message: `HD ${inv.invoiceNumber} (${customer.customer_name}) den han ${effectiveDate.toLocaleDateString("vi-VN")}`,
      metadata: { invoiceId: inv.id, disbursementId: inv.disbursementId, customerId: customer.id },
    });
    notificationsCreated++;

    // Send email if customer has email
    if (customer.email) {
      const result = await emailService.sendInvoiceReminder(customer.email, {
        customerName: customer.customer_name,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        dueDate: effectiveDate,
        contractNumber: inv.disbursement.loan.contractNumber,
      });
      await prisma.appNotification.update({
        where: { id: notif.id },
        data: result.success ? { emailSentAt: new Date() } : { emailError: result.error },
      });
      if (result.success) emailsSent++;
      else emailErrors++;
    }
  }

  // 2. Mark overdue + only notify NEWLY overdue (not previously marked)
  const { count: newlyOverdue, newlyOverdueIds } = await invoiceService.markOverdue();

  if (newlyOverdueIds.length === 0) {
    return {
      dueSoonChecked: dueSoon.length,
      newlyOverdue: 0,
      totalOverdue: 0,
      notificationsCreated,
      emailsSent,
      emailErrors,
    };
  }

  const overdue = await prisma.invoice.findMany({
    where: { id: { in: newlyOverdueIds } },
    include: invoiceInclude,
  });

  for (const inv of overdue) {
    if (notifiedSet.has(`invoice_overdue:${inv.id}`)) continue;

    const customer = inv.disbursement.loan.customer;
    const effectiveDate = inv.customDeadline ?? inv.dueDate;
    const notif = await notificationService.create({
      type: "invoice_overdue",
      title: `HD qua han: ${inv.invoiceNumber}`,
      message: `HD ${inv.invoiceNumber} (${customer.customer_name}) da qua han`,
      metadata: { invoiceId: inv.id, disbursementId: inv.disbursementId, customerId: customer.id },
    });
    notificationsCreated++;

    if (customer.email) {
      const result = await emailService.sendInvoiceOverdue(customer.email, {
        customerName: customer.customer_name,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        dueDate: effectiveDate,
        contractNumber: inv.disbursement.loan.contractNumber,
      });
      await prisma.appNotification.update({
        where: { id: notif.id },
        data: result.success ? { emailSentAt: new Date() } : { emailError: result.error },
      });
      if (result.success) emailsSent++;
      else emailErrors++;
    }
  }

  return {
    dueSoonChecked: dueSoon.length,
    newlyOverdue,
    totalOverdue: newlyOverdueIds.length,
    notificationsCreated,
    emailsSent,
    emailErrors,
  };
}
