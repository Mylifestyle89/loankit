/**
 * Field-template list/query operations — read-only queries for field templates.
 * Extracted from template-field-operations.service.ts for file-size compliance.
 */
import { prisma } from "@/lib/prisma";
import { loadState } from "@/lib/report/fs-store";

import { mapMasterTemplateRecordToSummary, parseCustomerDataJson } from "./_shared";
import { ensureMasterInstanceMigration } from "./_migration-internals";

export async function listFieldTemplates(params: {
  customerId?: string;
  withUsage?: boolean;
  page?: number;
  limit?: number;
}) {
  await ensureMasterInstanceMigration();

  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(500, Math.max(1, params.limit ?? 100));
  const skip = (page - 1) * limit;

  const [masters, total] = await prisma.$transaction([
    prisma.fieldTemplateMaster.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.fieldTemplateMaster.count(),
  ]);

  const hasDbMasterData = total > 0;
  const hasDbInstanceData = (await prisma.mappingInstance.count()) > 0;

  if (hasDbMasterData || hasDbInstanceData) {
    const usageMap = new Map<string, number>();
    if (params.withUsage || params.customerId) {
      // Scoped _count aggregate — avoids full-table groupBy scan
      const masterIds = masters.map((m) => m.id);
      const instanceCounts = await prisma.mappingInstance.groupBy({
        by: ["masterId"],
        where: {
          masterId: { in: masterIds },
          ...(params.customerId ? { customerId: params.customerId } : {}),
        },
        _count: { customerId: true },
      });
      for (const row of instanceCounts) {
        if (!row.masterId) continue;
        usageMap.set(row.masterId, row._count.customerId);
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

  // ── Legacy FS-store path ──
  const state = await loadState();
  const allTemplates = state.field_templates ?? [];

  if (!params.customerId) {
    if (!params.withUsage) {
      const pageSlice = allTemplates.slice(skip, skip + limit);
      return { data: pageSlice, total: allTemplates.length, page, limit };
    }
    const customers = await prisma.customer.findMany({ select: { data_json: true } });
    const legacyUsageMap = new Map<string, number>();
    for (const customer of customers) {
      const dataJson = parseCustomerDataJson(customer.data_json);
      const assignedIdsRaw = dataJson.__field_template_ids;
      const assignedIds = Array.isArray(assignedIdsRaw) ? assignedIdsRaw.map(String) : [];
      for (const id of assignedIds) legacyUsageMap.set(id, (legacyUsageMap.get(id) ?? 0) + 1);
    }
    const withUsageTemplates = allTemplates.map((template) => ({
      ...template,
      assigned_customer_count: legacyUsageMap.get(template.id) ?? 0,
    }));
    const pageSlice = withUsageTemplates.slice(skip, skip + limit);
    return { data: pageSlice, total: allTemplates.length, page, limit };
  }

  const customer = await prisma.customer.findUnique({ where: { id: params.customerId } });
  if (!customer) return { data: [], total: 0, page, limit };
  const dataJson = parseCustomerDataJson(customer.data_json);
  const assignedIdsRaw = dataJson.__field_template_ids;
  const assignedIds = Array.isArray(assignedIdsRaw) ? assignedIdsRaw.map(String) : [];
  const filtered = allTemplates.filter((template) => assignedIds.includes(template.id));
  const pageSlice = filtered.slice(skip, skip + limit);
  return { data: pageSlice, total: filtered.length, page, limit };
}
