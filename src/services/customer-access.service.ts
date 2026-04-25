/**
 * Customer access-check helpers — verify user has owner/grant access
 * to a customer or any entity that belongs to a customer.
 * Admin bypass is the caller's responsibility.
 */
import { prisma } from "@/lib/prisma";

export async function checkCustomerAccess(customerId: string, userId: string): Promise<boolean> {
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

export async function checkLoanAccess(loanId: string, userId: string): Promise<boolean> {
  const loan = await prisma.loan.findUnique({ where: { id: loanId }, select: { customerId: true } });
  if (!loan) return false;
  return checkCustomerAccess(loan.customerId, userId);
}

export async function checkDisbursementAccess(disbursementId: string, userId: string): Promise<boolean> {
  const d = await prisma.disbursement.findUnique({ where: { id: disbursementId }, select: { loanId: true } });
  if (!d) return false;
  return checkLoanAccess(d.loanId, userId);
}

export async function checkInvoiceAccess(invoiceId: string, userId: string): Promise<boolean> {
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { disbursementId: true } });
  if (!inv) return false;
  return checkDisbursementAccess(inv.disbursementId, userId);
}
