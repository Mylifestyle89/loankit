/**
 * collect-digest-items.ts
 * Pure query: scan invoices + beneficiary lines awaiting supplement,
 * group by customer. NO side-effects (no notification create, no email).
 *
 * Reused by:
 *   - runDeadlineCheck (cron) — applies dedup + creates notification + sends digest
 *   - overdue-export endpoint — just snapshots data into XLSX
 */
import { addOneMonthClamped } from "@/lib/invoice-tracking-format-helpers";
import { prisma } from "@/lib/prisma";
import type { InvoiceDigestItem } from "@/services/email.service";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export type DigestItemType = "overdue" | "dueSoon" | "supplement";

/** Digest item augmented with source row IDs for cron notification metadata + dedup. */
export type DigestItemWithRef = InvoiceDigestItem & {
  invoiceId?: string;            // real invoice row id
  beneficiaryId?: string;        // virtual supplement source
  disbursementId: string;
};

export type DigestCustomerGroup = {
  customer: { id: string; customer_name: string; email: string | null };
  items: DigestItemWithRef[];
};

export type DigestSnapshot = Map<string /* customerId */, DigestCustomerGroup>;

export type CollectDigestOpts = {
  customerIds?: string[];
  types?: DigestItemType[]; // default: all 3
};

const ALL_TYPES: DigestItemType[] = ["overdue", "dueSoon", "supplement"];

/**
 * Scan real overdue/due-soon invoices + virtual supplement beneficiary lines.
 * Returns customers grouped by id with their digest items.
 *
 * NOTE: Does NOT call invoiceService.markOverdue() — caller must do that first
 * if they want pending→overdue transition before snapshotting.
 */
export async function collectDigestItems(
  opts: CollectDigestOpts = {},
): Promise<DigestSnapshot> {
  const types = new Set(opts.types ?? ALL_TYPES);
  const customerFilter = opts.customerIds && opts.customerIds.length > 0
    ? { customerId: { in: opts.customerIds } }
    : undefined;

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + SEVEN_DAYS);
  const snapshot: DigestSnapshot = new Map();

  const addItem = (
    customer: { id: string; customer_name: string; email: string | null },
    item: DigestItemWithRef,
  ) => {
    let group = snapshot.get(customer.id);
    if (!group) {
      group = { customer, items: [] };
      snapshot.set(customer.id, group);
    }
    group.items.push(item);
  };

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

  // 1. Real invoices due within 7 days
  if (types.has("dueSoon")) {
    const dueSoon = await prisma.invoice.findMany({
      where: {
        status: "pending",
        OR: [
          { customDeadline: { not: null, lte: sevenDaysFromNow, gt: now } },
          { AND: [{ customDeadline: null }, { dueDate: { lte: sevenDaysFromNow, gt: now } }] },
        ],
        ...(customerFilter ? { disbursement: { loan: customerFilter } } : {}),
      },
      include: invoiceInclude,
    });

    for (const inv of dueSoon) {
      const effectiveDate = inv.customDeadline ?? inv.dueDate;
      if (effectiveDate > sevenDaysFromNow || effectiveDate <= now) continue;
      addItem(inv.disbursement.loan.customer, {
        invoiceId: inv.id,
        disbursementId: inv.disbursementId,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        dueDate: effectiveDate,
        contractNumber: inv.disbursement.loan.contractNumber,
        isOverdue: false,
        isSupplement: false,
      });
    }
  }

  // 2. Real overdue invoices (status already transitioned by markOverdue elsewhere)
  if (types.has("overdue")) {
    const overdue = await prisma.invoice.findMany({
      where: {
        status: "overdue",
        ...(customerFilter ? { disbursement: { loan: customerFilter } } : {}),
      },
      include: invoiceInclude,
    });

    for (const inv of overdue) {
      const effectiveDate = inv.customDeadline ?? inv.dueDate;
      addItem(inv.disbursement.loan.customer, {
        invoiceId: inv.id,
        disbursementId: inv.disbursementId,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        dueDate: effectiveDate,
        contractNumber: inv.disbursement.loan.contractNumber,
        isOverdue: true,
        isSupplement: false,
      });
    }
  }

  // 3. Virtual supplement items
  if (types.has("supplement")) {
    await scanSupplement({ now, sevenDaysFromNow, customerFilter, addItem });
  }

  return snapshot;
}

async function scanSupplement(ctx: {
  now: Date;
  sevenDaysFromNow: Date;
  customerFilter: { customerId: { in: string[] } } | undefined;
  addItem: (
    customer: { id: string; customer_name: string; email: string | null },
    item: DigestItemWithRef,
  ) => void;
}) {
  const { now, sevenDaysFromNow, customerFilter, addItem } = ctx;

  const lines = await prisma.disbursementBeneficiary.findMany({
    where: {
      invoiceStatus: { in: ["pending", "supplementing"] },
      ...(customerFilter ? { disbursement: { loan: customerFilter } } : {}),
    },
    include: {
      disbursement: {
        select: {
          id: true,
          disbursementDate: true,
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

  for (const b of lines) {
    const dueDate = addOneMonthClamped(b.disbursement.disbursementDate);
    const isOverdue = dueDate <= now;
    const isDueSoon = !isOverdue && dueDate <= sevenDaysFromNow;
    if (!isOverdue && !isDueSoon) continue;

    addItem(b.disbursement.loan.customer, {
      beneficiaryId: b.id,
      disbursementId: b.disbursementId,
      invoiceNumber: b.beneficiaryName,
      amount: b.amount - b.invoiceAmount,
      dueDate,
      contractNumber: b.disbursement.loan.contractNumber,
      isOverdue,
      isSupplement: true,
    });
  }
}
