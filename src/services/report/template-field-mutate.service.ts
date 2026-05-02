/**
 * Field-template mutation operations — create, update, attach for field templates.
 * Extracted from template-field-operations.service.ts for file-size compliance.
 */
import { NotFoundError, ValidationError } from "@/core/errors/app-error";
import { prisma } from "@/lib/prisma";
import { fieldCatalogItemSchema } from "@/lib/report/config-schema";
import {
  getActiveMappingVersion,
  loadState,
  readAliasFile,
  readMappingFile,
  saveState,
} from "@/lib/report/fs-store";

import {
  mapMasterTemplateRecordToSummary,
  parseCustomerDataJson,
  toJsonString,
} from "./_shared";
import {
  createInstanceDraftFiles,
  ensureMasterInstanceMigration,
  isDbTemplateModeEnabled,
} from "./_migration-internals";

export async function createFieldTemplate(input: {
  name: string;
  fieldCatalog: unknown[];
  customerId?: string;
  createdBy?: string;
}) {
  const name = (input.name ?? "").trim();
  if (!name) throw new ValidationError("Template name is required.");
  if (!Array.isArray(input.fieldCatalog)) throw new ValidationError("field_catalog must be an array.");
  const parsedCatalog = input.fieldCatalog.map((item) => fieldCatalogItemSchema.parse(item));

  await ensureMasterInstanceMigration();
  if (await isDbTemplateModeEnabled()) {
    const master = await prisma.fieldTemplateMaster.create({
      data: {
        name,
        status: "active",
        fieldCatalogJson: JSON.stringify(parsedCatalog),
      },
    });
    if (input.customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
      if (customer) {
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
        await prisma.mappingInstance.create({
          data: {
            name: `${customer.customer_name} - ${name}`,
            status: "draft",
            createdBy: input.createdBy ?? "web-user",
            mappingJsonPath: files.mappingPath,
            aliasJsonPath: files.aliasPath,
            mappingJson: files.mappingJson,
            aliasJson: files.aliasJson,
            masterSnapshotName: master.name,
            fieldCatalogJson: master.fieldCatalogJson,
            customerId: customer.id,
            masterId: master.id,
          },
        });
      }
    }
    const created = mapMasterTemplateRecordToSummary(master);
    const allMasters = await prisma.fieldTemplateMaster.findMany({ orderBy: { createdAt: "desc" } });
    return { template: created, allTemplates: allMasters.map((item) => mapMasterTemplateRecordToSummary(item)) };
  }

  const template = {
    id: `field-template-${Date.now()}`,
    name,
    created_at: new Date().toISOString(),
    field_catalog: parsedCatalog,
  };

  if (!input.customerId) {
    const state = await loadState();
    state.field_templates = [template, ...(state.field_templates ?? [])];
    await saveState(state);
    return { template, allTemplates: state.field_templates };
  }

  return prisma.$transaction(async (tx) => {
    const state = await loadState();
    state.field_templates = [template, ...(state.field_templates ?? [])];
    await saveState(state);

    const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
    if (customer) {
      const dataJson = parseCustomerDataJson(customer.data_json);
      const assignedIdsRaw = dataJson.__field_template_ids;
      const assignedIds = Array.isArray(assignedIdsRaw) ? assignedIdsRaw.map(String) : [];
      if (!assignedIds.includes(template.id)) assignedIds.push(template.id);
      dataJson.__field_template_ids = assignedIds;
      await tx.customer.update({
        where: { id: customer.id },
        data: { data_json: toJsonString(dataJson) },
      });
    }
    return { template, allTemplates: state.field_templates };
  });
}

export async function updateFieldTemplate(input: {
  templateId: string;
  name?: string;
  fieldCatalog: unknown[];
}) {
  const templateId = input.templateId.trim();
  if (!templateId) throw new ValidationError("template_id is required.");
  if (!Array.isArray(input.fieldCatalog)) throw new ValidationError("field_catalog must be an array.");

  const nextName = (input.name ?? "").trim();
  const parsedCatalog = input.fieldCatalog.map((item) => fieldCatalogItemSchema.parse(item));
  await ensureMasterInstanceMigration();
  const master = await prisma.fieldTemplateMaster.findUnique({ where: { id: templateId } });
  if (master && (await isDbTemplateModeEnabled())) {
    const updated = await prisma.fieldTemplateMaster.update({
      where: { id: templateId },
      data: {
        ...(nextName ? { name: nextName } : {}),
        fieldCatalogJson: JSON.stringify(parsedCatalog),
      },
    });
    const allMasters = await prisma.fieldTemplateMaster.findMany({ orderBy: { createdAt: "desc" } });
    return {
      updated: mapMasterTemplateRecordToSummary(updated),
      allTemplates: allMasters.map((item) => mapMasterTemplateRecordToSummary(item)),
    };
  }
  const state = await loadState();
  const current = (state.field_templates ?? []).find((item) => item.id === templateId);
  if (!current) throw new NotFoundError("Field template not found.");

  state.field_templates = (state.field_templates ?? []).map((item) =>
    item.id === templateId
      ? {
          ...item,
          name: nextName || item.name,
          field_catalog: parsedCatalog,
        }
      : item,
  );
  await saveState(state);
  const updated = state.field_templates.find((item) => item.id === templateId);
  return { updated, allTemplates: state.field_templates };
}

export async function attachTemplateToCustomer(input: { customerId: string; templateId: string }) {
  const customerId = input.customerId.trim();
  const templateId = input.templateId.trim();
  if (!customerId || !templateId) throw new ValidationError("customer_id and template_id are required.");

  await ensureMasterInstanceMigration();
  const [customer, master] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.fieldTemplateMaster.findUnique({ where: { id: templateId } }),
  ]);

  if (customer && master && (await isDbTemplateModeEnabled())) {
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
    const instance = await prisma.mappingInstance.create({
      data: {
        name: `${customer.customer_name} - ${master.name}`,
        status: "draft",
        createdBy: "web-user",
        mappingJsonPath: files.mappingPath,
        aliasJsonPath: files.aliasPath,
        mappingJson: files.mappingJson,
        aliasJson: files.aliasJson,
        masterSnapshotName: master.name,
        fieldCatalogJson: master.fieldCatalogJson,
        customerId: customer.id,
        masterId: master.id,
      },
    });
    return { template_id: master.id, customer_id: customerId, mapping_instance_id: instance.id };
  }

  const state = await loadState();
  const template = (state.field_templates ?? []).find((item) => item.id === templateId);
  if (!template) throw new NotFoundError("Field template not found.");

  await prisma.$transaction(async (tx) => {
    const existingCustomer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!existingCustomer) throw new NotFoundError("Customer not found.");
    const dataJson = parseCustomerDataJson(existingCustomer.data_json);
    const assignedIdsRaw = dataJson.__field_template_ids;
    const assignedIds = Array.isArray(assignedIdsRaw) ? assignedIdsRaw.map(String) : [];
    if (!assignedIds.includes(template.id)) assignedIds.push(template.id);
    dataJson.__field_template_ids = assignedIds;
    await tx.customer.update({
      where: { id: existingCustomer.id },
      data: { data_json: toJsonString(dataJson) },
    });
  });

  return { template_id: template.id, customer_id: customerId };
}
