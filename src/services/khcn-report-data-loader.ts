/**
 * KHCN report data loader — Prisma query to load full customer with all relations
 * needed for DOCX template rendering.
 */
import { NotFoundError } from "@/core/errors/app-error";
import { decryptCoBorrowerPii, decryptCustomerPii, decryptRelatedPersonPii } from "@/lib/field-encryption";
import { prisma } from "@/lib/prisma";

// ── Load full customer with ALL relations needed for templates ──

export async function loadFullCustomer(customerId: string, loanId?: string, disbursementId?: string) {
  const c = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      active_branch: true,
      loans: {
        where: loanId ? { id: loanId } : undefined,
        take: 1,
        include: {
          disbursements: disbursementId
            ? { where: { id: disbursementId }, take: 1, include: { beneficiaryLines: true } }
            : { orderBy: { disbursementDate: "desc" }, take: 1, include: { beneficiaryLines: true } },
          beneficiaries: true,
        },
        orderBy: { startDate: "desc" },
      },
      collaterals: { orderBy: { createdAt: "asc" } },
      loan_plans: { orderBy: { createdAt: "desc" }, take: 1 },
      co_borrowers: { orderBy: { createdAt: "asc" } },
      related_persons: { orderBy: { createdAt: "asc" } },
      credit_agribank: { orderBy: { createdAt: "asc" } },
      credit_other: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!c) throw new NotFoundError("Customer not found.");
  // Decrypt PII fields for DOCX template rendering (needs raw values)
  Object.assign(c, decryptCustomerPii(c));
  // Decrypt all PII fields on co-borrowers and related persons
  c.co_borrowers = c.co_borrowers.map((cb) => decryptCoBorrowerPii(cb as unknown as Record<string, unknown>) as typeof cb);
  c.related_persons = c.related_persons.map((rp) => decryptRelatedPersonPii(rp as unknown as Record<string, unknown>) as typeof rp);
  return c;
}
