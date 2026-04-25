/**
 * Customer access-check helpers — verify user has owner/grant access
 * to a customer or any entity that belongs to a customer.
 * Admin bypass is the caller's responsibility.
 */
import { prisma } from "@/lib/prisma";

export async function checkCustomerAccess(customerId: string, userId: string): Promise<boolean> {
  // Fast path: user has global access to all customers
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { globalCustomerAccess: true } });
  if (user?.globalCustomerAccess) return true;

  const hit = await prisma.customer.findFirst({
    where: {
      id: customerId,
      OR: [
        { createdById: userId },
        { grants: { some: { userId } } },
      ],
    },
    select: { id: true },
  });
  return !!hit;
}

const CUSTOMER_OWNERSHIP = (userId: string) => ({
  OR: [{ createdById: userId }, { grants: { some: { userId } } }],
});

export async function checkLoanAccess(loanId: string, userId: string): Promise<boolean> {
  const hit = await prisma.loan.findFirst({
    where: { id: loanId, customer: CUSTOMER_OWNERSHIP(userId) },
    select: { id: true },
  });
  return !!hit;
}

export async function checkDisbursementAccess(disbursementId: string, userId: string): Promise<boolean> {
  const hit = await prisma.disbursement.findFirst({
    where: { id: disbursementId, loan: { customer: CUSTOMER_OWNERSHIP(userId) } },
    select: { id: true },
  });
  return !!hit;
}

export async function checkInvoiceAccess(invoiceId: string, userId: string): Promise<boolean> {
  const hit = await prisma.invoice.findFirst({
    where: { id: invoiceId, disbursement: { loan: { customer: CUSTOMER_OWNERSHIP(userId) } } },
    select: { id: true },
  });
  return !!hit;
}
