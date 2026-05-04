import { prisma } from "@/lib/prisma";
import { invoiceService } from "@/services/invoice.service";
import { notificationService } from "@/services/notification.service";
import { emailService, type InvoiceDigestItem } from "@/services/email.service";
import {
  collectDigestItems,
  type DigestItemWithRef,
} from "@/lib/notifications/collect-digest-items";

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export type DeadlineCheckResult = {
  dueSoonChecked: number;
  newlyOverdue: number;
  totalOverdue: number;
  supplementDueSoon: number;
  supplementOverdue: number;
  notificationsCreated: number;
  emailsSent: number;
  emailErrors: number;
};

/** Cron orchestrator: snapshot via collectDigestItems, dedup, notify, email. */
export async function runDeadlineCheck(): Promise<DeadlineCheckResult> {
  const startTime = Date.now();
  const now = new Date();
  console.log(`[deadline-check] START at ${now.toISOString()}`);
  console.log(
    `[deadline-check] SMTP configured: host=${!!process.env.SMTP_HOST} user=${!!process.env.SMTP_USER} pass=${!!process.env.SMTP_PASS}`,
  );

  // Transition pending → overdue first so snapshot reflects new state
  const { count: newlyOverdue } = await invoiceService.markOverdue();

  // Snapshot all customers + items (no dedup, no side-effect)
  const snapshot = await collectDigestItems();

  // Dedup: notifications created in last 24h
  const notifiedSet = await loadRecentNotifiedKeys(now);

  let notificationsCreated = 0;
  let emailsSent = 0;
  let emailErrors = 0;
  let dueSoonChecked = 0;
  let totalOverdue = 0;
  let supplementDueSoon = 0;
  let supplementOverdue = 0;

  for (const { customer, items } of snapshot.values()) {
    const emailItems: InvoiceDigestItem[] = [];
    const notifIds: string[] = [];

    for (const item of items) {
      // Counters mirror legacy DeadlineCheckResult shape
      if (item.isSupplement) {
        if (item.isOverdue) supplementOverdue++;
        else supplementDueSoon++;
      } else if (item.isOverdue) totalOverdue++;
      else dueSoonChecked++;

      const dedupKey = buildDedupKey(item);
      if (notifiedSet.has(dedupKey)) continue;

      const notif = await createNotification(customer, item);
      notificationsCreated++;
      notifIds.push(notif.id);
      emailItems.push(stripRefs(item));
    }

    if (!customer.email || emailItems.length === 0) continue;

    const result = await emailService.sendInvoiceDigest(customer.email, {
      customerName: customer.customer_name,
      items: emailItems,
    });
    await prisma.appNotification.updateMany({
      where: { id: { in: notifIds } },
      data: result.success ? { emailSentAt: new Date() } : { emailError: result.error },
    });
    if (result.success) {
      emailsSent++;
      console.log(`[deadline-check] DIGEST SENT to ${customer.email} (${emailItems.length} items)`);
    } else {
      emailErrors++;
      console.error(`[deadline-check] DIGEST FAILED to ${customer.email}: ${result.error}`);
    }
  }

  const result: DeadlineCheckResult = {
    dueSoonChecked,
    newlyOverdue,
    totalOverdue,
    supplementDueSoon,
    supplementOverdue,
    notificationsCreated,
    emailsSent,
    emailErrors,
  };
  console.log(`[deadline-check] DONE in ${Date.now() - startTime}ms:`, JSON.stringify(result));
  return result;
}

async function loadRecentNotifiedKeys(now: Date): Promise<Set<string>> {
  const recent = await prisma.appNotification.findMany({
    where: {
      type: { in: ["invoice_due_soon", "invoice_overdue"] },
      createdAt: { gte: new Date(now.getTime() - TWENTY_FOUR_HOURS) },
    },
    select: { type: true, metadata: true },
  });
  const set = new Set<string>();
  for (const n of recent) {
    if (!n.metadata) continue;
    try {
      const meta = JSON.parse(n.metadata) as { invoiceId?: string };
      if (!meta.invoiceId) continue;
      const key = meta.invoiceId.startsWith("virtual-")
        ? `${n.type}:supplement-${meta.invoiceId.slice("virtual-".length)}`
        : `${n.type}:${meta.invoiceId}`;
      set.add(key);
    } catch {
      /* skip malformed */
    }
  }
  return set;
}

function buildDedupKey(item: DigestItemWithRef): string {
  const type = item.isOverdue ? "invoice_overdue" : "invoice_due_soon";
  if (item.isSupplement && item.beneficiaryId) return `${type}:supplement-${item.beneficiaryId}`;
  return `${type}:${item.invoiceId}`;
}

async function createNotification(
  customer: { id: string; customer_name: string },
  item: DigestItemWithRef,
) {
  const type = item.isOverdue ? "invoice_overdue" : "invoice_due_soon";
  const dateStr = item.dueDate.toLocaleDateString("vi-VN");

  const title = item.isSupplement
    ? item.isOverdue
      ? `HD can bo sung qua han: ${item.invoiceNumber}`
      : `HD can bo sung sap den han: ${item.invoiceNumber}`
    : item.isOverdue
      ? `HD qua han: ${item.invoiceNumber}`
      : `HD sap den han: ${item.invoiceNumber}`;

  const message = item.isSupplement
    ? `${item.invoiceNumber} (${customer.customer_name}) ${item.isOverdue ? "da qua han" : "sap den han"} bo sung (${dateStr})`
    : item.isOverdue
      ? `HD ${item.invoiceNumber} (${customer.customer_name}) da qua han`
      : `HD ${item.invoiceNumber} (${customer.customer_name}) den han ${dateStr}`;

  // Legacy metadata shape: virtual-{beneficiaryId} for supplement items
  const metaInvoiceId = item.isSupplement && item.beneficiaryId
    ? `virtual-${item.beneficiaryId}`
    : item.invoiceId!;

  return notificationService.create({
    type,
    title,
    message,
    metadata: {
      invoiceId: metaInvoiceId,
      disbursementId: item.disbursementId,
      customerId: customer.id,
      ...(item.isSupplement ? { virtual: true } : {}),
    },
    customerId: customer.id,
  });
}

/** Strip internal ref fields before sending to emailService (typed InvoiceDigestItem). */
function stripRefs(item: DigestItemWithRef): InvoiceDigestItem {
  return {
    invoiceNumber: item.invoiceNumber,
    amount: item.amount,
    dueDate: item.dueDate,
    contractNumber: item.contractNumber,
    isOverdue: item.isOverdue,
    isSupplement: item.isSupplement,
  };
}
