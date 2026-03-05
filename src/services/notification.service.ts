import { prisma } from "@/lib/prisma";

export const notificationService = {
  async list(opts?: { unreadOnly?: boolean; limit?: number }) {
    return prisma.appNotification.findMany({
      where: opts?.unreadOnly ? { readAt: null } : undefined,
      orderBy: { createdAt: "desc" },
      take: opts?.limit ?? 50,
    });
  },

  async getUnreadCount() {
    return prisma.appNotification.count({ where: { readAt: null } });
  },

  async create(input: {
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.appNotification.create({
      data: {
        type: input.type,
        title: input.title,
        message: input.message,
        metadata: JSON.stringify(input.metadata ?? {}),
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
