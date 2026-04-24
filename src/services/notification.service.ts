import { prisma } from "@/lib/prisma";

/** Build Prisma where clause scoping notifications to a user's accessible customers */
function ownershipWhere(userId?: string, isAdmin?: boolean) {
  if (isAdmin || !userId) return {};
  return {
    OR: [
      { customerId: null }, // system-wide notifications (no customer context)
      { customer: { OR: [{ createdById: userId }, { grants: { some: { userId } } }] } },
    ],
  };
}

export const notificationService = {
  async list(opts?: { unreadOnly?: boolean; limit?: number; skip?: number; userId?: string; isAdmin?: boolean }) {
    const base = opts?.unreadOnly ? { readAt: null } : {};
    const ownership = ownershipWhere(opts?.userId, opts?.isAdmin);
    const where = Object.keys(ownership).length ? { ...base, ...ownership } : base;
    return prisma.appNotification.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { createdAt: "desc" },
      take: opts?.limit ?? 50,
      skip: opts?.skip ?? 0,
    });
  },

  async countAll(opts?: { unreadOnly?: boolean; userId?: string; isAdmin?: boolean }) {
    const base = opts?.unreadOnly ? { readAt: null } : {};
    const ownership = ownershipWhere(opts?.userId, opts?.isAdmin);
    const where = Object.keys(ownership).length ? { ...base, ...ownership } : base;
    return prisma.appNotification.count({
      where: Object.keys(where).length ? where : undefined,
    });
  },

  getUnreadCount() {
    return notificationService.countAll({ unreadOnly: true });
  },

  async create(input: {
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
    customerId?: string | null;
  }) {
    return prisma.appNotification.create({
      data: {
        type: input.type,
        title: input.title,
        message: input.message,
        metadata: JSON.stringify(input.metadata ?? {}),
        customerId: input.customerId ?? null,
      },
    });
  },

  async markRead(id: string) {
    return prisma.appNotification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  },

  async markAllRead() {
    return prisma.appNotification.updateMany({
      where: { readAt: null },
      data: { readAt: new Date() },
    });
  },
};
