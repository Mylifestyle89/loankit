/**
 * Master-template service — CRUD for master field-template definitions.
 */
import { NotFoundError, ValidationError } from "@/core/errors/app-error";
import { prisma } from "@/lib/prisma";
import { fieldCatalogItemSchema } from "@/lib/report/config-schema";

import { mapMasterTemplateRecordToSummary } from "./_shared";
import { ensureMasterInstanceMigration } from "./_migration-internals";

// ---------------------------------------------------------------------------
// Master-template Service
// ---------------------------------------------------------------------------

export const masterTemplateService = {
  async listMasterTemplates(params?: { withUsage?: boolean; page?: number; limit?: number }) {
    await ensureMasterInstanceMigration();
    const page = Math.max(1, params?.page ?? 1);
    const limit = Math.min(500, Math.max(1, params?.limit ?? 100));
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
    if (!hasDbMasterData && !hasDbInstanceData) {
      return { data: [], total: 0, page, limit };
    }
    if (!params?.withUsage) {
      return { data: masters.map((item) => mapMasterTemplateRecordToSummary(item)), total, page, limit };
    }
    // Replace full-table groupBy: use _count aggregate scoped per master in current page
    const masterIds = masters.map((m) => m.id);
    const instanceCounts = await prisma.mappingInstance.groupBy({
      by: ["masterId"],
      where: { masterId: { in: masterIds } },
      _count: { customerId: true },
    });
    const usageMap = new Map<string, number>(
      instanceCounts.map((row) => [row.masterId ?? "", row._count.customerId]),
    );
    return {
      data: masters.map((item) => ({
        ...mapMasterTemplateRecordToSummary(item),
        assigned_customer_count: usageMap.get(item.id) ?? 0,
      })),
      total,
      page,
      limit,
    };
  },

  async createMasterTemplate(input: { name: string; description?: string; fieldCatalog: unknown[]; createdBy?: string }) {
    const name = input.name.trim();
    if (!name) throw new ValidationError("name is required.");
    if (!Array.isArray(input.fieldCatalog)) throw new ValidationError("field_catalog must be an array.");
    const fieldCatalog = input.fieldCatalog.map((item) => fieldCatalogItemSchema.parse(item));
    await ensureMasterInstanceMigration();
    const created = await prisma.fieldTemplateMaster.create({
      data: {
        name,
        description: input.description?.trim() || null,
        status: "active",
        fieldCatalogJson: JSON.stringify(fieldCatalog),
        ...(input.createdBy ? { createdBy: input.createdBy } : {}),
      },
    });
    return mapMasterTemplateRecordToSummary(created);
  },

  async updateMasterTemplate(input: { masterId: string; name?: string; description?: string; fieldCatalog?: unknown[]; status?: "active" | "archived" }) {
    const masterId = input.masterId.trim();
    if (!masterId) throw new ValidationError("master_id is required.");
    await ensureMasterInstanceMigration();
    const existing = await prisma.fieldTemplateMaster.findUnique({ where: { id: masterId } });
    if (!existing) throw new NotFoundError("Master template not found.");
    const fieldCatalog = Array.isArray(input.fieldCatalog)
      ? input.fieldCatalog.map((item) => fieldCatalogItemSchema.parse(item))
      : undefined;
    const updated = await prisma.fieldTemplateMaster.update({
      where: { id: masterId },
      data: {
        ...(typeof input.name === "string" ? { name: input.name.trim() || existing.name } : {}),
        ...(typeof input.description === "string" ? { description: input.description.trim() || null } : {}),
        ...(fieldCatalog ? { fieldCatalogJson: JSON.stringify(fieldCatalog) } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
    });
    return mapMasterTemplateRecordToSummary(updated);
  },

  async deleteMasterTemplate(masterId: string) {
    const id = masterId.trim();
    if (!id) throw new ValidationError("master_id is required.");
    await ensureMasterInstanceMigration();
    const existing = await prisma.fieldTemplateMaster.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Master template not found.");
    await prisma.fieldTemplateMaster.delete({ where: { id } });
    return { id };
  },
};
