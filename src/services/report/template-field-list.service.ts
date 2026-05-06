/**
 * Field-template list/query — read-only master template queries with usage count.
 * Usage count = number of loans referencing each master template.
 */
import { prisma } from "@/lib/prisma";

import { mapMasterTemplateRecordToSummary } from "./_shared";

export async function listFieldTemplates(params: {
  customerId?: string;
  withUsage?: boolean;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(500, Math.max(1, params.limit ?? 100));
  const skip = (page - 1) * limit;

  const [masters, total] = await prisma.$transaction([
    prisma.masterTemplate.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.masterTemplate.count(),
  ]);

  if (total === 0) {
    return { data: [], total: 0, page, limit };
  }

  const usageMap = new Map<string, number>();
  if (params.withUsage || params.customerId) {
    const masterIds = masters.map((m) => m.id);
    const loanCounts = await prisma.loan.groupBy({
      by: ["masterTemplateId"],
      where: {
        masterTemplateId: { in: masterIds },
        ...(params.customerId ? { customerId: params.customerId } : {}),
      },
      _count: { id: true },
    });
    for (const row of loanCounts) {
      if (!row.masterTemplateId) continue;
      usageMap.set(row.masterTemplateId, row._count.id);
    }
  }

  const items = masters.map((master) => ({
    ...mapMasterTemplateRecordToSummary(master),
    assigned_customer_count: usageMap.get(master.id) ?? 0,
  }));

  const data = params.customerId
    ? items.filter((item) => (item.assigned_customer_count ?? 0) > 0)
    : items;

  return { data, total, page, limit };
}
