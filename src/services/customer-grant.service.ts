/** Customer grant service — admin-delegated access management */
import { prisma } from "@/lib/prisma";

/** List all access grants for a customer (admin use only). */
export async function listGrants(customerId: string) {
  return prisma.customerGrant.findMany({
    where: { customerId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      grantedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

/** Grant a user access to a customer. Idempotent — safe to call multiple times. */
export async function grantAccess(customerId: string, userId: string, grantedById: string) {
  return prisma.customerGrant.upsert({
    where: { customerId_userId: { customerId, userId } },
    create: { customerId, userId, grantedById },
    update: { grantedById },
  });
}

/** Revoke a user's access to a customer. No-op if grant doesn't exist. */
export async function revokeAccess(customerId: string, userId: string) {
  return prisma.customerGrant.deleteMany({ where: { customerId, userId } });
}
