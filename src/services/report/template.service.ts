/**
 * Template service — state management, template profiles, and field-template CRUD.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { NotFoundError, ValidationError } from "@/core/errors/app-error";
import { docxEngine } from "@/lib/docx-engine";
import { prisma } from "@/lib/prisma";
import {
  fieldCatalogItemSchema,
  frameworkStateSchema,
  type FieldTemplate,
} from "@/lib/report/config-schema";
import {
  getActiveMappingVersion,
  loadState,
  readAliasFile,
  readMappingFile,
  saveState,
  setActiveTemplate as fsSetActiveTemplate,
  updateTemplateInventory,
} from "@/lib/report/fs-store";
import {
  parseDocxPlaceholderInventory,
  suggestAliasForPlaceholder,
} from "@/lib/report/template-parser";

import {
  mapDocxError,
  mapMasterTemplateRecordToSummary,
  parseCustomerDataJson,
  toJsonString,
} from "./_shared";
import {
  createInstanceDraftFiles,
  ensureMasterInstanceMigration,
  isDbTemplateModeEnabled,
} from "./_migration-internals";

// ---------------------------------------------------------------------------
// Template Service
// ---------------------------------------------------------------------------

export const templateService = {
  async getState() {
    return loadState();
  },

  async loadRuns() {
    const state = await loadState();
    return state.run_logs;
  },

  async getTemplates() {
    const state = await loadState();
    return {
      templates: state.template_profiles,
      activeTemplateId: state.active_template_id,
    };
  },

  async setActiveTemplate(templateId: string) {
    if (!templateId) throw new ValidationError("template_id is required.");
    const state = await fsSetActiveTemplate(templateId);
    return {
      templates: state.template_profiles,
      activeTemplateId: state.active_template_id,
    };
  },

  async buildTemplateInventory(templateId: string) {
    if (!templateId) throw new ValidationError("template_id is required.");
    const state = await loadState();
    const template = state.template_profiles.find((item) => item.id === templateId);
    if (!template) throw new NotFoundError("Template not found.");

    const inventory = await parseDocxPlaceholderInventory(template.docx_path);
    const inventoryFile = `report_assets/config/inventories/${template.id}.json`;
    await docxEngine.writeJson(inventoryFile, inventory);
    await updateTemplateInventory(template.id, inventoryFile);

    const activeVersion = state.mapping_versions.find(
      (item) => item.id === state.active_mapping_version_id,
    );
    const aliasMap = activeVersion ? await readAliasFile(activeVersion.alias_json_path) : {};
    const fieldKeys = state.field_catalog.map((item) => item.field_key);
    const suggestions = inventory.placeholders.map((placeholder) => ({
      placeholder,
      current_alias: aliasMap[placeholder] ?? null,
      suggestions: suggestAliasForPlaceholder(placeholder, fieldKeys),
    }));
    return { inventoryPath: inventoryFile, inventory, suggestions };
  },

  async openBackupFolder() {
    const backupDir = await docxEngine.openBackupFolder();
    return { backupDir };
  },

  /** Danh sách file backup state-config (framework_state-*.json), mới nhất trước */
  async listStateBackups(): Promise<{ filename: string; label: string }[]> {
    const backupDir = path.join(process.cwd(), "report_assets", "backups", "state-config");
    try {
      const entries = await fs.readdir(backupDir, { withFileTypes: true });
      const files = entries
        .filter((e) => e.isFile() && e.name.endsWith(".json") && e.name.startsWith("framework_state-"))
        .map((e) => e.name)
        .sort()
        .reverse();
      return files.map((filename) => ({
        filename,
        label: filename.replace(/^framework_state-|\.json$/g, ""),
      }));
    } catch {
      return [];
    }
  },

  /** Đọc nội dung một file backup và trả về field_templates để import ngược vào template */
  async getStateBackupContent(filename: string): Promise<{ field_templates: FieldTemplate[] }> {
    if (!filename || !filename.startsWith("framework_state-") || !filename.endsWith(".json")) {
      throw new ValidationError("Tên file backup không hợp lệ.");
    }
    const backupDir = path.join(process.cwd(), "report_assets", "backups", "state-config");
    const absolute = path.join(backupDir, filename);
    const raw = await fs.readFile(absolute, "utf-8");
    const parsed = frameworkStateSchema.parse(JSON.parse(raw) as unknown);
    return {
      field_templates: parsed.field_templates ?? [],
    };
  },

  async saveTemplateDocx(input: { relPath: string; buffer: Buffer; mode: "backup" | "save" }) {
    try {
      return await docxEngine.saveDocxWithBackup(input);
    } catch (error) {
      mapDocxError(error);
    }
  },

  async listFieldTemplates(params: { customerId?: string; withUsage?: boolean }) {
    await ensureMasterInstanceMigration();
    const masters = await prisma.fieldTemplateMaster.findMany({
      orderBy: { createdAt: "desc" },
    });
    const hasDbMasterData = masters.length > 0;
    const hasDbInstanceData = (await prisma.mappingInstance.count()) > 0;
    if (hasDbMasterData || hasDbInstanceData) {
      const usageMap = new Map<string, number>();
      if (params.withUsage || params.customerId) {
        const grouped = await prisma.mappingInstance.groupBy({
          by: ["masterId", "customerId"],
          ...(params.customerId ? { where: { customerId: params.customerId } } : {}),
        });
        for (const row of grouped) {
          if (!row.masterId) continue;
          usageMap.set(row.masterId, (usageMap.get(row.masterId) ?? 0) + 1);
        }
      }
      const result = masters.map((master) => {
        const item = mapMasterTemplateRecordToSummary(master);
        return {
          ...item,
          assigned_customer_count: usageMap.get(master.id) ?? 0,
        };
      });
      return params.customerId ? result.filter((item) => (item.assigned_customer_count ?? 0) > 0) : result;
    }

    const state = await loadState();
    const allTemplates = state.field_templates ?? [];

    if (!params.customerId) {
      if (!params.withUsage) return allTemplates;
      const customers = await prisma.customer.findMany({ select: { data_json: true } });
      const usageMap = new Map<string, number>();
      for (const customer of customers) {
        const dataJson = parseCustomerDataJson(customer.data_json);
        const assignedIdsRaw = dataJson.__field_template_ids;
        const assignedIds = Array.isArray(assignedIdsRaw) ? assignedIdsRaw.map(String) : [];
        for (const id of assignedIds) usageMap.set(id, (usageMap.get(id) ?? 0) + 1);
      }
      return allTemplates.map((template) => ({
        ...template,
        assigned_customer_count: usageMap.get(template.id) ?? 0,
      }));
    }

    const customer = await prisma.customer.findUnique({ where: { id: params.customerId } });
    if (!customer) return [];
    const dataJson = parseCustomerDataJson(customer.data_json);
    const assignedIdsRaw = dataJson.__field_template_ids;
    const assignedIds = Array.isArray(assignedIdsRaw) ? assignedIdsRaw.map(String) : [];
    return allTemplates.filter((template) => assignedIds.includes(template.id));
  },

  async createFieldTemplate(input: { name: string; fieldCatalog: unknown[]; customerId?: string; createdBy?: string }) {
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
  },

  async attachTemplateToCustomer(input: { customerId: string; templateId: string }) {
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
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw new NotFoundError("Customer not found.");
      const dataJson = parseCustomerDataJson(customer.data_json);
      const assignedIdsRaw = dataJson.__field_template_ids;
      const assignedIds = Array.isArray(assignedIdsRaw) ? assignedIdsRaw.map(String) : [];
      if (!assignedIds.includes(template.id)) assignedIds.push(template.id);
      dataJson.__field_template_ids = assignedIds;
      await tx.customer.update({
        where: { id: customer.id },
        data: { data_json: toJsonString(dataJson) },
      });
    });

    return { template_id: template.id, customer_id: customerId };
  },

  async updateFieldTemplate(input: { templateId: string; name?: string; fieldCatalog: unknown[] }) {
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
  },

  /** Register a DOCX file from folder browser as a configured template profile */
  async registerTemplateProfile(input: { templateName: string; docxPath: string }) {
    const name = (input.templateName ?? "").trim();
    if (!name) throw new ValidationError("Tên mẫu là bắt buộc.");
    if (!input.docxPath) throw new ValidationError("Đường dẫn file DOCX là bắt buộc.");

    const state = await loadState();

    // Check for duplicate docx_path
    const existing = state.template_profiles.find((p) => p.docx_path === input.docxPath);
    if (existing) throw new ValidationError(`File này đã được đăng ký: "${existing.template_name}".`);

    const profile = {
      id: `template-${Date.now()}`,
      template_name: name,
      docx_path: input.docxPath,
      placeholder_inventory_path: "",
      active: state.template_profiles.length === 0, // auto-activate if first
    };

    state.template_profiles.push(profile);
    if (profile.active) state.active_template_id = profile.id;
    await saveState(state);

    return {
      profile,
      templates: state.template_profiles,
      activeTemplateId: state.active_template_id,
    };
  },

  /** Remove a template profile from configured templates */
  async removeTemplateProfile(templateId: string) {
    if (!templateId) throw new ValidationError("template_id là bắt buộc.");

    const state = await loadState();
    const idx = state.template_profiles.findIndex((p) => p.id === templateId);
    if (idx === -1) throw new NotFoundError("Không tìm thấy template profile.");

    state.template_profiles.splice(idx, 1);

    // If removed template was active, activate the first remaining one
    if (state.active_template_id === templateId) {
      state.active_template_id = state.template_profiles[0]?.id ?? "";
    }

    await saveState(state);

    return {
      templates: state.template_profiles,
      activeTemplateId: state.active_template_id,
    };
  },
};
