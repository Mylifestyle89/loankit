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
      prisma.masterTemplate.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.masterTemplate.count(),
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
    const created = await prisma.masterTemplate.create({
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
    const existing = await prisma.masterTemplate.findUnique({ where: { id: masterId } });
    if (!existing) throw new NotFoundError("Master template not found.");
    const fieldCatalog = Array.isArray(input.fieldCatalog)
      ? input.fieldCatalog.map((item) => fieldCatalogItemSchema.parse(item))
      : undefined;
    const updated = await prisma.masterTemplate.update({
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
    const existing = await prisma.masterTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Master template not found.");
    await prisma.masterTemplate.delete({ where: { id } });
    return { id };
  },

  // ─────────────────────────────────────────────────────────────────────
  // Phase 6: per-master mapping/alias/formulas accessors
  //
  // Storage on the master replaces the per-customer MappingInstance.mappingJson
  // pattern. Bodies are JSON strings — callers parse/validate at their layer.
  // ─────────────────────────────────────────────────────────────────────

  async getMappingForTemplate(masterId: string): Promise<string> {
    const row = await prisma.masterTemplate.findUnique({
      where: { id: masterId },
      select: { defaultMappingJson: true },
    });
    if (!row) throw new NotFoundError(`Master template ${masterId} not found.`);
    return row.defaultMappingJson;
  },

  async setMappingForTemplate(masterId: string, mappingJson: string): Promise<void> {
    JSON.parse(mappingJson); // throws SyntaxError on bad input — fail before DB write
    const result = await prisma.masterTemplate.updateMany({
      where: { id: masterId },
      data: { defaultMappingJson: mappingJson },
    });
    if (result.count === 0) throw new NotFoundError(`Master template ${masterId} not found.`);
  },

  async getAliasForTemplate(masterId: string): Promise<string> {
    const row = await prisma.masterTemplate.findUnique({
      where: { id: masterId },
      select: { defaultAliasJson: true },
    });
    if (!row) throw new NotFoundError(`Master template ${masterId} not found.`);
    return row.defaultAliasJson;
  },

  async setAliasForTemplate(masterId: string, aliasJson: string): Promise<void> {
    JSON.parse(aliasJson);
    const result = await prisma.masterTemplate.updateMany({
      where: { id: masterId },
      data: { defaultAliasJson: aliasJson },
    });
    if (result.count === 0) throw new NotFoundError(`Master template ${masterId} not found.`);
  },

  async getFormulasForTemplate(masterId: string): Promise<Record<string, string>> {
    const row = await prisma.masterTemplate.findUnique({
      where: { id: masterId },
      select: { formulasJson: true },
    });
    if (!row) throw new NotFoundError(`Master template ${masterId} not found.`);
    try {
      const parsed = JSON.parse(row.formulasJson);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
    } catch {
      return {};
    }
  },

  async setFormulasForTemplate(masterId: string, formulas: Record<string, string>): Promise<void> {
    if (!formulas || typeof formulas !== "object") {
      throw new ValidationError("formulas must be a plain object of field_key → formula string.");
    }
    const result = await prisma.masterTemplate.updateMany({
      where: { id: masterId },
      data: { formulasJson: JSON.stringify(formulas) },
    });
    if (result.count === 0) throw new NotFoundError(`Master template ${masterId} not found.`);
  },
};
