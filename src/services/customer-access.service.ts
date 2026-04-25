/**
 * Customer access-check helpers — verify user has owner/grant access
 * to a customer or any entity that belongs to a customer.
 * Admin bypass is the caller's responsibility.
 *
 * All functions accept an optional `globalAccess` param: when the caller has
 * already fetched the user's globalCustomerAccess flag, passing it avoids a
 * redundant DB lookup.
 */
import { prisma } from "@/lib/prisma";

const CUSTOMER_OWNERSHIP = (userId: string) => ({
  OR: [{ createdById: userId }, { grants: { some: { userId } } }],
});

async function userHasGlobalAccess(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { globalCustomerAccess: true } });
  return u?.globalCustomerAccess ?? false;
}

export async function checkCustomerAccess(customerId: string, userId: string, globalAccess?: boolean): Promise<boolean> {
  if (globalAccess ?? await userHasGlobalAccess(userId)) return true;
  const hit = await prisma.customer.findFirst({
    where: { id: customerId, OR: [{ createdById: userId }, { grants: { some: { userId } } }] },
    select: { id: true },
  });
  return !!hit;
}

export async function checkLoanAccess(loanId: string, userId: string, globalAccess?: boolean): Promise<boolean> {
  if (globalAccess ?? await userHasGlobalAccess(userId)) return true;
  const hit = await prisma.loan.findFirst({
    where: { id: loanId, customer: CUSTOMER_OWNERSHIP(userId) },
    select: { id: true },
  });
  return !!hit;
}

export async function checkDisbursementAccess(disbursementId: string, userId: string, globalAccess?: boolean): Promise<boolean> {
  if (globalAccess ?? await userHasGlobalAccess(userId)) return true;
  const hit = await prisma.disbursement.findFirst({
    where: { id: disbursementId, loan: { customer: CUSTOMER_OWNERSHIP(userId) } },
    select: { id: true },
  });
  return !!hit;
}

export async function checkInvoiceAccess(invoiceId: string, userId: string, globalAccess?: boolean): Promise<boolean> {
  if (globalAccess ?? await userHasGlobalAccess(userId)) return true;
  const hit = await prisma.invoice.findFirst({
    where: { id: invoiceId, disbursement: { loan: { customer: CUSTOMER_OWNERSHIP(userId) } } },
    select: { id: true },
  });
  return !!hit;
}
