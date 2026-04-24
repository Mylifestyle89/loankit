import { addOneMonthClamped } from "@/lib/invoice-tracking-format-helpers";
import { prisma } from "@/lib/prisma";
import { invoiceService } from "@/services/invoice.service";
import { notificationService } from "@/services/notification.service";
import { emailService, type InvoiceDigestItem } from "@/services/email.service";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
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

type DigestBucket = {
  customerName: string;
  email: string;
  items: InvoiceDigestItem[];
  notifIds: string[];
};

/** Shared logic: check due-soon + overdue invoices, create notifications, send ONE digest email per customer */
export async function runDeadlineCheck(): Promise<DeadlineCheckResult> {
  const startTime = Date.now();
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + SEVEN_DAYS);
  let emailsSent = 0;
  let emailErrors = 0;
  let notificationsCreated = 0;

  console.log(`[deadline-check] START at ${now.toISOString()}`);
  console.log(`[deadline-check] SMTP configured: host=${!!process.env.SMTP_HOST} user=${!!process.env.SMTP_USER} pass=${!!process.env.SMTP_PASS}`);

  const invoiceInclude = {
    disbursement: {
      include: {
        loan: {
          include: {
            customer: { select: { id: true, customer_name: true, email: true } },
          },
        },
      },
    },
  } as const;

  // Dedup: notifications created in last 24h
  const recentNotifs = await prisma.appNotification.findMany({
    where: {
      type: { in: ["invoice_due_soon", "invoice_overdue"] },
      createdAt: { gte: new Date(now.getTime() - TWENTY_FOUR_HOURS) },
    },
    select: { type: true, metadata: true },
  });
  const notifiedSet = new Set<string>();
  for (const n of recentNotifs) {
    if (!n.metadata) continue;
    try {
      const meta = JSON.parse(n.metadata) as { invoiceId?: string };
      if (meta.invoiceId) {
        const key = meta.invoiceId.startsWith("virtual-")
          ? `${n.type}:supplement-${meta.invoiceId.slice("virtual-".length)}`
          : `${n.type}:${meta.invoiceId}`;
        notifiedSet.add(key);
      }
    } catch { /* skip */ }
  }

  // Digest buckets: group all items by customer email
  const buckets = new Map<string, DigestBucket>();
  const addToBucket = (customer: { id: string; customer_name: string; email: string | null }, item: InvoiceDigestItem, notifId: string) => {
    if (!customer.email) return;
    let bucket = buckets.get(customer.email);
    if (!bucket) {
      bucket = { customerName: customer.customer_name, email: customer.email, items: [], notifIds: [] };
      buckets.set(customer.email, bucket);
    }
    bucket.items.push(item);
    bucket.notifIds.push(notifId);
  };

  // 1. Real invoices due within 7 days
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
  console.log(`[deadline-check] Found ${dueSoon.length} due-soon real invoices`);

  for (const inv of dueSoon) {
    const effectiveDate = inv.customDeadline ?? inv.dueDate;
    if (effectiveDate > sevenDaysFromNow || effectiveDate <= now) continue;
    if (notifiedSet.has(`invoice_due_soon:${inv.id}`)) continue;

    const customer = inv.disbursement.loan.customer;
    const notif = await notificationService.create({
      type: "invoice_due_soon",
      title: `HD sap den han: ${inv.invoiceNumber}`,
      message: `HD ${inv.invoiceNumber} (${customer.customer_name}) den han ${effectiveDate.toLocaleDateString("vi-VN")}`,
      metadata: { invoiceId: inv.id, disbursementId: inv.disbursementId, customerId: customer.id },
      customerId: customer.id,
    });
    notificationsCreated++;
    addToBucket(customer, {
      invoiceNumber: inv.invoiceNumber,
      amount: inv.amount,
      dueDate: effectiveDate,
      contractNumber: inv.disbursement.loan.contractNumber,
      isOverdue: false,
      isSupplement: false,
    }, notif.id);
  }

  // 2. Real invoices overdue — mark newly overdue + notify ALL overdue invoices (not just newly transitioned)
  // Newly transitioned: pending → overdue (status update)
  const { count: newlyOverdue, newlyOverdueIds } = await invoiceService.markOverdue();

  // Query ALL currently overdue invoices (includes previously marked ones) for daily repeat reminders
  // Dedup 24h prevents notification spam — same invoice only fires once per day
  const overdue = await prisma.invoice.findMany({
    where: { status: "overdue" },
    include: invoiceInclude,
  });
  console.log(`[deadline-check] Found ${overdue.length} total overdue invoices (${newlyOverdue} newly marked)`);

  for (const inv of overdue) {
    if (notifiedSet.has(`invoice_overdue:${inv.id}`)) continue;
    const customer = inv.disbursement.loan.customer;
    const effectiveDate = inv.customDeadline ?? inv.dueDate;
    const notif = await notificationService.create({
      type: "invoice_overdue",
      title: `HD qua han: ${inv.invoiceNumber}`,
      message: `HD ${inv.invoiceNumber} (${customer.customer_name}) da qua han`,
      metadata: { invoiceId: inv.id, disbursementId: inv.disbursementId, customerId: customer.id },
      customerId: customer.id,
    });
    notificationsCreated++;
    addToBucket(customer, {
      invoiceNumber: inv.invoiceNumber,
      amount: inv.amount,
      dueDate: effectiveDate,
      contractNumber: inv.disbursement.loan.contractNumber,
      isOverdue: true,
      isSupplement: false,
    }, notif.id);
  }

  // 3. Virtual "needs supplement" invoices
  const { supplementDueSoon, supplementOverdue, supNotifs } = await collectSupplementItems({
    now, sevenDaysFromNow, notifiedSet, addToBucket,
  });
  notificationsCreated += supNotifs;

  // 4. Send ONE digest email per customer
  console.log(`[deadline-check] Sending digest emails to ${buckets.size} customer(s)`);
  for (const bucket of buckets.values()) {
    const result = await emailService.sendInvoiceDigest(bucket.email, {
      customerName: bucket.customerName,
      items: bucket.items,
    });
    // Update all notifications for this customer with email status
    await prisma.appNotification.updateMany({
      where: { id: { in: bucket.notifIds } },
      data: result.success ? { emailSentAt: new Date() } : { emailError: result.error },
    });
    if (result.success) {
      emailsSent++;
      console.log(`[deadline-check] DIGEST SENT to ${bucket.email} (${bucket.items.length} items)`);
    } else {
      emailErrors++;
      console.error(`[deadline-check] DIGEST FAILED to ${bucket.email}: ${result.error}`);
    }
  }

  const result = {
    dueSoonChecked: dueSoon.length,
    newlyOverdue,
    totalOverdue: overdue.length,
    supplementDueSoon,
    supplementOverdue,
    notificationsCreated,
    emailsSent,
    emailErrors,
  };
  console.log(`[deadline-check] DONE in ${Date.now() - startTime}ms:`, JSON.stringify(result));
  return result;
}

/** Collect DisbursementBeneficiary lines needing invoice supplement into customer buckets. */
async function collectSupplementItems(ctx: {
  now: Date;
  sevenDaysFromNow: Date;
  notifiedSet: Set<string>;
  addToBucket: (c: { id: string; customer_name: string; email: string | null }, item: InvoiceDigestItem, notifId: string) => void;
}) {
  const { now, sevenDaysFromNow, notifiedSet, addToBucket } = ctx;
  let supNotifs = 0;

  const lines = await prisma.disbursementBeneficiary.findMany({
    where: { invoiceStatus: { in: ["pending", "supplementing"] } },
    include: {
      disbursement: {
        select: {
          id: true, disbursementDate: true,
          loan: {
            select: {
              contractNumber: true,
              customer: { select: { id: true, customer_name: true, email: true } },
            },
          },
        },
      },
    },
  });
  console.log(`[deadline-check] Found ${lines.length} beneficiary lines awaiting supplement`);

  let supplementDueSoon = 0;
  let supplementOverdue = 0;

  for (const b of lines) {
    const dueDate = addOneMonthClamped(b.disbursement.disbursementDate);
    const isOverdue = dueDate <= now;
    const isDueSoon = !isOverdue && dueDate <= sevenDaysFromNow;
    if (!isOverdue && !isDueSoon) continue;

    const type = isOverdue ? "invoice_overdue" : "invoice_due_soon";
    if (notifiedSet.has(`${type}:supplement-${b.id}`)) continue;

    const customer = b.disbursement.loan.customer;
    const notif = await notificationService.create({
      type,
      title: isOverdue ? `HD can bo sung qua han: ${b.beneficiaryName}` : `HD can bo sung sap den han: ${b.beneficiaryName}`,
      message: `${b.beneficiaryName} (${customer.customer_name}) ${isOverdue ? "da qua han" : "sap den han"} bo sung (${dueDate.toLocaleDateString("vi-VN")})`,
      metadata: { invoiceId: `virtual-${b.id}`, disbursementId: b.disbursementId, customerId: customer.id, virtual: true },
      customerId: customer.id,
    });
    supNotifs++;
    addToBucket(customer, {
      invoiceNumber: b.beneficiaryName,
      amount: b.amount - b.invoiceAmount,
      dueDate,
      contractNumber: b.disbursement.loan.contractNumber,
      isOverdue,
      isSupplement: true,
    }, notif.id);

    if (isOverdue) supplementOverdue++;
    else supplementDueSoon++;
  }

  return { supplementDueSoon, supplementOverdue, supNotifs };
}
