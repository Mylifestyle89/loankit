import { prisma } from "@/lib/prisma";
import { invoiceService } from "@/services/invoice.service";
import { notificationService } from "@/services/notification.service";

const ONE_HOUR = 60 * 60 * 1000;
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

const SCHEDULER_KEY = "__deadline_scheduler_started__";

export function startDeadlineScheduler() {
  if ((globalThis as Record<string, unknown>)[SCHEDULER_KEY]) return;
  (globalThis as Record<string, unknown>)[SCHEDULER_KEY] = true;
  console.log("[deadline-scheduler] Starting hourly invoice deadline check...");

  // Run immediately on boot, then hourly
  void checkDeadlines();
  setInterval(() => void checkDeadlines(), ONE_HOUR);
}

async function checkDeadlines() {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + SEVEN_DAYS);

    // 1. Find pending invoices due within 7 days (considering customDeadline)
    const dueSoon = await prisma.invoice.findMany({
      where: {
        status: "pending",
        OR: [
          { customDeadline: { not: null, lte: sevenDaysFromNow, gt: now } },
          { AND: [{ customDeadline: null }, { dueDate: { lte: sevenDaysFromNow, gt: now } }] },
        ],
      },
      include: {
        disbursement: {
          include: { loan: { include: { customer: true } } },
        },
      },
    });

    for (const inv of dueSoon) {
      const effectiveDate = inv.customDeadline ?? inv.dueDate;
      if (effectiveDate > sevenDaysFromNow || effectiveDate <= now) continue;

      // Deduplicate: skip if notification for this invoice in last 24h
      const recentNotif = await prisma.appNotification.findFirst({
        where: {
          type: "invoice_due_soon",
          metadata: { contains: inv.id },
          createdAt: { gte: new Date(now.getTime() - TWENTY_FOUR_HOURS) },
        },
      });
      if (recentNotif) continue;

      const customerName = inv.disbursement.loan.customer.customer_name;
      await notificationService.create({
        type: "invoice_due_soon",
        title: `HD sap den han: ${inv.invoiceNumber}`,
        message: `HD ${inv.invoiceNumber} (${customerName}) den han ${effectiveDate.toLocaleDateString("vi-VN")}`,
        metadata: {
          invoiceId: inv.id,
          disbursementId: inv.disbursementId,
          customerId: inv.disbursement.loan.customerId,
        },
      });
    }

    // 2. Auto-mark overdue using service (handles customDeadline correctly)
    await invoiceService.markOverdue();

    // Create notifications for newly overdue invoices
    const overdue = await prisma.invoice.findMany({
      where: { status: "overdue" },
      include: {
        disbursement: {
          include: { loan: { include: { customer: true } } },
        },
      },
    });

    for (const inv of overdue) {
      const recentNotif = await prisma.appNotification.findFirst({
        where: {
          type: "invoice_overdue",
          metadata: { contains: inv.id },
          createdAt: { gte: new Date(now.getTime() - TWENTY_FOUR_HOURS) },
        },
      });
      if (recentNotif) continue;

      const customerName = inv.disbursement.loan.customer.customer_name;
      await notificationService.create({
        type: "invoice_overdue",
        title: `HD qua han: ${inv.invoiceNumber}`,
        message: `HD ${inv.invoiceNumber} (${customerName}) da qua han`,
        metadata: {
          invoiceId: inv.id,
          disbursementId: inv.disbursementId,
          customerId: inv.disbursement.loan.customerId,
        },
      });
    }

    console.log(
      `[deadline-scheduler] Checked ${dueSoon.length} due-soon, ${overdue.length} overdue.`,
    );
  } catch (err) {
    console.error("[deadline-scheduler] Error:", err);
  }
}
