/**
 * Mapping-instance service — per-customer mapping instance CRUD.
 */
import { NotFoundError, ValidationError } from "@/core/errors/app-error";
import { prisma } from "@/lib/prisma";
import {
  getActiveMappingVersion,
  loadState,
  readAliasFile,
  readMappingFile,
} from "@/lib/report/fs-store";

import { mapMappingInstanceRecordToSummary } from "./_shared";
import { createInstanceDraftFiles, ensureMasterInstanceMigration } from "./_migration-internals";

// ---------------------------------------------------------------------------
// Mapping-instance Service
// ---------------------------------------------------------------------------

export const mappingInstanceService = {
  async createMappingInstance(input: { masterId: string; customerId: string; name?: string; createdBy?: string }) {
    const masterId = input.masterId.trim();
    const customerId = input.customerId.trim();
    if (!masterId || !customerId) throw new ValidationError("master_id and customer_id are required.");
    await ensureMasterInstanceMigration();
    const [master, customer] = await Promise.all([
      prisma.fieldTemplateMaster.findUnique({ where: { id: masterId } }),
      prisma.customer.findUnique({ where: { id: customerId } }),
    ]);
    if (!master) throw new NotFoundError("Master template not found.");
    if (!customer) throw new NotFoundError("Customer not found.");
    const state = await loadState();
    const activeVersion = await getActiveMappingVersion(state);
    const [mapping, alias] = await Promise.all([
      readMappingFile(activeVersion.mapping_json_path),
      readAliasFile(activeVersion.alias_json_path),
    ]);
    const files = await createInstanceDraftFiles({
      customerId: customer.id,
      masterId: master.id,
      mapping,
      aliasMap: alias,
    });
    const created = await prisma.mappingInstance.create({
      data: {
        name: input.name?.trim() || `${customer.customer_name} - ${master.name}`,
        status: "draft",
        createdBy: input.createdBy?.trim() || "web-user",
        mappingJsonPath: files.mappingPath,
        aliasJsonPath: files.aliasPath,
        masterSnapshotName: master.name,
        fieldCatalogJson: master.fieldCatalogJson,
        customerId: customer.id,
        masterId: master.id,
      },
    });
    return mapMappingInstanceRecordToSummary(created);
  },

  async listMappingInstances(params?: { customerId?: string; masterId?: string; status?: "draft" | "published" | "archived" }) {
    await ensureMasterInstanceMigration();
    const rows = await prisma.mappingInstance.findMany({
      where: {
        ...(params?.customerId ? { customerId: params.customerId } : {}),
        ...(params?.masterId ? { masterId: params.masterId } : {}),
        ...(params?.status ? { status: params.status } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((row) => mapMappingInstanceRecordToSummary(row));
  },

  async getMappingInstance(instanceId: string) {
    const id = instanceId.trim();
    if (!id) throw new ValidationError("instance_id is required.");
    await ensureMasterInstanceMigration();
    const row = await prisma.mappingInstance.findUnique({ where: { id } });
    if (!row) throw new NotFoundError("Mapping instance not found.");
    return mapMappingInstanceRecordToSummary(row);
  },

  async publishMappingInstance(instanceId: string) {
    const id = instanceId.trim();
    if (!id) throw new ValidationError("instance_id is required.");
    await ensureMasterInstanceMigration();
    const row = await prisma.mappingInstance.findUnique({ where: { id } });
    if (!row) throw new NotFoundError("Mapping instance not found.");
    const updated = await prisma.mappingInstance.update({
      where: { id },
      data: {
        status: "published",
        publishedAt: new Date(),
      },
    });
    return mapMappingInstanceRecordToSummary(updated);
  },

  async deleteMappingInstance(instanceId: string) {
    const id = instanceId.trim();
    if (!id) throw new ValidationError("instance_id is required.");
    await ensureMasterInstanceMigration();
    const existing = await prisma.mappingInstance.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Mapping instance not found.");
    await prisma.mappingInstance.delete({ where: { id } });
    return { id };
  },
};
