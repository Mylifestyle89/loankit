import type { Customer, Prisma } from "@prisma/client";
import path from "node:path";

import { NotFoundError, SystemError, ValidationError } from "@/core/errors/app-error";
import { groupDataByField } from "@/core/use-cases/grouping-engine";
import { validateReportPayload } from "@/core/use-cases/report-validation";
import { CorruptedTemplateError, DataPlaceholderMismatchError, docxEngine, TemplateNotFoundError } from "@/lib/docx-engine";
import { prisma } from "@/lib/prisma";
import { fieldCatalogItemSchema, mappingMasterSchema, aliasMapSchema, type FieldTemplate } from "@/lib/report/config-schema";
import { REPORT_MERGED_FLAT_FILE } from "@/lib/report/constants";
import { evaluateFieldFormula } from "@/lib/report/field-calc";
import { loadFieldFormulas, saveFieldFormulas } from "@/lib/report/field-formulas";
import {
  createMappingDraft,
  getActiveMappingVersion,
  getActiveTemplateProfile,
  loadState,
  publishMappingVersion,
  readAliasFile,
  readMappingFile,
  saveState,
  setActiveTemplate,
  updateTemplateInventory,
} from "@/lib/report/fs-store";
import { loadManualValues, mergeFlatWithManualValues, saveManualValues } from "@/lib/report/manual-values";
import { logRun, runBuildAndValidate } from "@/lib/report/pipeline-client";
import { parseDocxPlaceholderInventory, suggestAliasForPlaceholder } from "@/lib/report/template-parser";


function parseCustomerDataJson(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function toJsonString(value: unknown): string {
  return JSON.stringify(value ?? {});
}

async function loadFlatDraftWithBuildFallback(): Promise<Record<string, unknown>> {
  try {
    return await docxEngine.readJson<Record<string, unknown>>("report_assets/report_draft_flat.json");
  } catch {
    await runBuildAndValidate();
    return await docxEngine.readJson<Record<string, unknown>>("report_assets/report_draft_flat.json");
  }
}

function mapDocxError(error: unknown): never {
  if (error instanceof TemplateNotFoundError) {
    throw new ValidationError(`Không tìm thấy file template: ${error.templatePath}`);
  }
  if (error instanceof CorruptedTemplateError) {
    throw new ValidationError(`File DOCX không hợp lệ hoặc bị hỏng: ${error.templatePath}`);
  }
  if (error instanceof DataPlaceholderMismatchError) {
    throw new ValidationError(`Dữ liệu không khớp placeholder của template: ${error.templatePath}`, error.details);
  }
  throw new SystemError("DOCX engine failed unexpectedly.", error);
}

async function* customerBatches(where?: Prisma.CustomerWhereInput, batchSize = 500): AsyncGenerator<Customer[]> {
  let skip = 0;
  while (true) {
    const rows = await prisma.customer.findMany({
      where,
      orderBy: { id: "asc" },
      skip,
      take: batchSize,
    });
    if (rows.length === 0) break;
    yield rows;
    skip += rows.length;
  }
}

function encode(data: string): Uint8Array {
  return new TextEncoder().encode(data);
}

function sanitizeFilePart(input: unknown, fallback: string): string {
  const raw = String(input ?? "").trim();
  if (!raw) return fallback;
  const safe = raw.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").replace(/\s+/g, " ").trim();
  return safe || fallback;
}

function resolveParentFromGroupedRecord(
  grouped: Record<string, unknown>,
  repeatKey: string,
): Record<string, unknown> {
  const parent = { ...grouped };
  const itemsRaw = parent[repeatKey];
  const items = Array.isArray(itemsRaw) ? (itemsRaw as Array<Record<string, unknown>>) : [];
  if (items.length > 0) {
    const first = items[0];
    for (const [k, v] of Object.entries(first)) {
      if (!(k in parent) || parent[k] === null || parent[k] === undefined || parent[k] === "") {
        parent[k] = v;
      }
    }
  }
  parent[repeatKey] = items;
  return parent;
}

type ImportCustomerRecord = {
  customer_code: string;
  customer_name: string;
  address: string | null;
  main_business: string | null;
  charter_capital: number | null;
  legal_representative_name: string | null;
  legal_representative_title: string | null;
  organization_type: string | null;
  data_json: string | null;
};

type ImportTemplateRecord = FieldTemplate;

export const reportService = {
  async getState() {
    return loadState();
  },

  async runBuildAndLog() {
    const start = Date.now();
    const result = await runBuildAndValidate();
    const durationMs = Date.now() - start;
    await logRun({
      resultSummary: {
        step: "build_validate",
        validation: result.validation,
      },
      outputPaths: [
        "report_assets/report_draft.json",
        "report_assets/report_draft_flat.json",
        "report_assets/validation_report.json",
      ],
      durationMs,
    });
    return { durationMs, command: result.command, validation: result.validation };
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
    const state = await setActiveTemplate(templateId);
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

    const activeVersion = state.mapping_versions.find((item) => item.id === state.active_mapping_version_id);
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

  async saveTemplateDocx(input: { relPath: string; buffer: Buffer; mode: "backup" | "save" }) {
    try {
      return await docxEngine.saveDocxWithBackup(input);
    } catch (error) {
      mapDocxError(error);
    }
  },

  async getFieldValues() {
    const [state, flatValues, manualValues, fieldFormulas] = await Promise.all([
      loadState(),
      loadFlatDraftWithBuildFallback(),
      loadManualValues(),
      loadFieldFormulas(),
    ]);
    return {
      field_catalog: state.field_catalog,
      auto_values: flatValues,
      values: { ...flatValues, ...manualValues },
      manual_values: manualValues,
      field_formulas: fieldFormulas,
    };
  },

  async saveFieldValues(input: {
    manualValues?: Record<string, string | number | boolean | null>;
    fieldFormulas?: Record<string, string>;
  }) {
    if (!input.manualValues || typeof input.manualValues !== "object") {
      throw new ValidationError("manual_values is required.");
    }

    const [flat, state] = await Promise.all([loadFlatDraftWithBuildFallback(), loadState()]);
    const fieldTypeMap = new Map((state.field_catalog ?? []).map((f) => [f.field_key, f.type]));
    const toSave = { ...input.manualValues };
    if (input.fieldFormulas && typeof input.fieldFormulas === "object") {
      for (const [key, formula] of Object.entries(input.fieldFormulas)) {
        const ctx = { ...flat, ...toSave };
        const fieldType = fieldTypeMap.get(key) ?? "text";
        const v = evaluateFieldFormula(formula, ctx, fieldType);
        if (v !== null) toSave[key] = v;
      }
    }

    const [savedManual, savedFormulas] = await Promise.all([
      saveManualValues(toSave),
      input.fieldFormulas && typeof input.fieldFormulas === "object"
        ? saveFieldFormulas(input.fieldFormulas)
        : Promise.resolve({}),
    ]);
    return { manual_values: savedManual, field_formulas: savedFormulas };
  },

  async getMapping() {
    const state = await loadState();
    const activeVersion = await getActiveMappingVersion(state);
    const mapping = await readMappingFile(activeVersion.mapping_json_path);
    const aliasMap = await readAliasFile(activeVersion.alias_json_path);
    return {
      active_version_id: activeVersion.id,
      versions: state.mapping_versions,
      mapping,
      alias_map: aliasMap,
    };
  },

  async saveMappingDraft(input: { createdBy?: string; notes?: string; mapping?: unknown; aliasMap?: unknown; fieldCatalog?: unknown[] }) {
    const mapping = mappingMasterSchema.parse(input.mapping);
    const aliasMap = aliasMapSchema.parse(input.aliasMap);
    const fieldCatalog = Array.isArray(input.fieldCatalog)
      ? input.fieldCatalog.map((item) => fieldCatalogItemSchema.parse(item))
      : undefined;
    const { state, version } = await createMappingDraft({
      createdBy: input.createdBy ?? "web-user",
      notes: input.notes,
      mapping,
      aliasMap,
      fieldCatalog,
    });
    return { version, activeVersionId: state.active_mapping_version_id };
  },

  async publishMappingVersion(versionId: string) {
    if (!versionId) throw new ValidationError("version_id is required.");
    const state = await publishMappingVersion(versionId);
    return {
      active_version_id: state.active_mapping_version_id,
      versions: state.mapping_versions,
    };
  },

  async runReportExport(input: { outputPath?: string; reportPath?: string; templatePath?: string }) {
    const start = Date.now();
    const state = await loadState();
    const activeVersion = await getActiveMappingVersion(state);
    const activeTemplate = await getActiveTemplateProfile(state);

    const outputPath = input.outputPath ?? "report_assets/report_preview.docx";
    const reportPath = input.reportPath ?? "report_assets/template_export_report.json";
    const templatePath = input.templatePath ?? activeTemplate.docx_path;
    const baseFlat = await docxEngine.readJson<Record<string, unknown>>("report_assets/report_draft_flat.json");
    const aliasMap = await docxEngine.readJson<Record<string, unknown>>(activeVersion.alias_json_path);
    const manualValues = await loadManualValues();
    const mergedFlat = mergeFlatWithManualValues(baseFlat, manualValues);
    await docxEngine.writeJson(REPORT_MERGED_FLAT_FILE, mergedFlat);

    try {
      await docxEngine.generateDocx(templatePath, { flat: mergedFlat, aliasMap }, outputPath);
    } catch (error) {
      mapDocxError(error);
    }
    const report = {
      template_docx: templatePath,
      output_docx: outputPath,
      engine: "docxtemplater (engine)",
    };
    await docxEngine.writeJson(reportPath, report);

    const durationMs = Date.now() - start;
    await logRun({
      resultSummary: {
        step: "export_docx",
        report,
      },
      outputPaths: [outputPath, reportPath],
      durationMs,
    });

    return {
      duration_ms: durationMs,
      output_path: outputPath,
      report_path: reportPath,
      report,
      command: { stdout: "Rendered via DOCX engine.", stderr: "", exitCode: 0 },
    };
  },

  async processBankReportExport(input?: {
    reportPath?: string;
    templatePath?: string;
    outputDir?: string;
    groupKey?: string;
    repeatKey?: string;
    customerNameKey?: string;
  }) {
    const start = Date.now();
    const state = await loadState();
    const activeVersion = await getActiveMappingVersion(state);
    const activeTemplate = await getActiveTemplateProfile(state);

    const templatePath = input?.templatePath ?? activeTemplate.docx_path;
    const reportPath = input?.reportPath ?? "report_assets/template_export_report_bank.json";
    const outputDir = input?.outputDir ?? "report_assets/exports/bank-rate-notices";
    const groupKey = input?.groupKey?.trim() || "HĐTD";
    const repeatKey = input?.repeatKey?.trim() || "items";
    const customerNameKey = input?.customerNameKey?.trim() || "TÊN KH";

    const [baseFlat, aliasMapRaw, manualValues] = await Promise.all([
      docxEngine.readJson<Record<string, unknown>>("report_assets/report_draft_flat.json"),
      docxEngine.readJson<Record<string, unknown>>(activeVersion.alias_json_path),
      loadManualValues(),
    ]);
    const aliasMap = aliasMapRaw as Record<string, unknown>;
    const mergedFlat = mergeFlatWithManualValues(baseFlat, manualValues);
    await docxEngine.writeJson(REPORT_MERGED_FLAT_FILE, mergedFlat);

    const rowsRaw = mergedFlat[repeatKey];
    if (!Array.isArray(rowsRaw)) {
      throw new ValidationError(`Không tìm thấy mảng dữ liệu '${repeatKey}' trong report_draft_flat.json.`);
    }
    const rows = rowsRaw.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object" && !Array.isArray(row)));
    if (rows.length === 0) {
      throw new ValidationError(`Mảng '${repeatKey}' không có dòng dữ liệu hợp lệ.`);
    }

    const groupedRecords = groupDataByField(rows, groupKey, repeatKey) as Array<Record<string, unknown>>;
    if (groupedRecords.length === 0) {
      throw new ValidationError(`Không thể gom nhóm theo khóa '${groupKey}'.`);
    }

    const outputPaths: string[] = [];
    for (const groupedRecord of groupedRecords) {
      const payload = resolveParentFromGroupedRecord(groupedRecord, repeatKey);
      const contractNo = sanitizeFilePart(payload[groupKey], "unknown-contract");
      const customerName = sanitizeFilePart(payload[customerNameKey], "unknown-customer");
      const outputPath = path.posix.join(outputDir, `${customerName}__${contractNo}.docx`);
      try {
        await docxEngine.generateDocx(
          templatePath,
          { flat: { ...mergedFlat, ...payload }, aliasMap },
          outputPath,
        );
      } catch (error) {
        mapDocxError(error);
      }
      outputPaths.push(outputPath);
    }

    const report = {
      mode: "bank_grouped_export",
      template_docx: templatePath,
      output_dir: outputDir,
      total_files: outputPaths.length,
      group_key: groupKey,
      repeat_key: repeatKey,
      outputs: outputPaths,
    };
    await docxEngine.writeJson(reportPath, report);

    const durationMs = Date.now() - start;
    await logRun({
      resultSummary: {
        step: "export_docx_bank_grouped",
        report,
      },
      outputPaths: [...outputPaths, reportPath],
      durationMs,
    });

    return {
      duration_ms: durationMs,
      output_dir: outputDir,
      output_paths: outputPaths,
      report_path: reportPath,
      report,
      command: { stdout: "Rendered grouped bank DOCX via DOCX engine.", stderr: "", exitCode: 0 },
    };
  },

  async validateReport(input: { runBuild?: boolean }) {
    const state = await loadState();
    const activeTemplate = await getActiveTemplateProfile(state);
    const activeVersion = await getActiveMappingVersion(state);

    if (input.runBuild) {
      const result = await runBuildAndValidate();
      const final = validateReportPayload({
        validation: result.validation,
        templatePath: activeTemplate.docx_path,
        aliasPath: activeVersion.alias_json_path,
        source: "pipeline",
      });
      return { source: "pipeline", validation: final };
    }

    const parsed = await docxEngine.readJson<unknown>("report_assets/validation_report.json");
    const final = validateReportPayload({
      validation: parsed,
      templatePath: activeTemplate.docx_path,
      aliasPath: activeVersion.alias_json_path,
      source: "cached",
    });
    return { source: "cached", validation: final };
  },

  async listFieldTemplates(params: { customerId?: string; withUsage?: boolean }) {
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

  async createFieldTemplate(input: { name: string; fieldCatalog: unknown[]; customerId?: string }) {
    const name = (input.name ?? "").trim();
    if (!name) throw new ValidationError("Template name is required.");
    if (!Array.isArray(input.fieldCatalog)) throw new ValidationError("field_catalog must be an array.");
    const parsedCatalog = input.fieldCatalog.map((item) => fieldCatalogItemSchema.parse(item));

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

  async importData(input: { version?: unknown; customers?: unknown[]; field_templates?: unknown[] }) {
    if (!input.version || !Array.isArray(input.customers) || !Array.isArray(input.field_templates)) {
      throw new ValidationError("Định dạng file không hợp lệ");
    }
    const customersInput = input.customers as ImportCustomerRecord[];
    const fieldTemplatesInput = input.field_templates as ImportTemplateRecord[];

    let customersImported = 0;
    await prisma.$transaction(async (tx) => {
      for (const customer of customersInput) {
        const existing = await tx.customer.findUnique({
          where: { customer_code: customer.customer_code },
        });
        if (existing) {
          await tx.customer.update({
            where: { id: existing.id },
            data: {
              customer_name: customer.customer_name ?? existing.customer_name,
              address: customer.address,
              main_business: customer.main_business,
              charter_capital: customer.charter_capital,
              legal_representative_name: customer.legal_representative_name,
              legal_representative_title: customer.legal_representative_title,
              organization_type: customer.organization_type,
              data_json: customer.data_json,
            },
          });
        } else {
          await tx.customer.create({
            data: {
              customer_code: customer.customer_code,
              customer_name: customer.customer_name,
              address: customer.address,
              main_business: customer.main_business,
              charter_capital: customer.charter_capital,
              legal_representative_name: customer.legal_representative_name,
              legal_representative_title: customer.legal_representative_title,
              organization_type: customer.organization_type,
              data_json: customer.data_json,
            },
          });
        }
        customersImported += 1;
      }
    });

    const state = await loadState();
    const existingTemplatesMap = new Map((state.field_templates || []).map((t) => [t.id, t]));
    for (const tpl of fieldTemplatesInput) {
      existingTemplatesMap.set(tpl.id, tpl);
    }
    state.field_templates = Array.from(existingTemplatesMap.values());
    await saveState(state);

    return { customers: customersImported, templates: fieldTemplatesInput.length };
  },

  async exportData(params?: { customerIds?: string[]; templateIds?: string[] }) {
    const customerIds = Array.isArray(params?.customerIds) ? params.customerIds : [];
    const templateIds = Array.isArray(params?.templateIds) ? params.templateIds : [];
    const customers: Customer[] =
      customerIds.length > 0
        ? await prisma.customer.findMany({ where: { id: { in: customerIds } } })
        : await prisma.customer.findMany();

    const state = await loadState();
    const field_templates =
      templateIds.length > 0
        ? (state.field_templates || []).filter((t) => templateIds.includes(t.id))
        : state.field_templates || [];

    return {
      version: "1.0",
      exported_at: new Date().toISOString(),
      customers,
      field_templates,
      field_catalog: state.field_catalog || [],
    };
  },

  async exportDataStream(params?: { customerIds?: string[]; templateIds?: string[] }) {
    const state = await loadState();
    const templateIds = Array.isArray(params?.templateIds) ? params.templateIds : [];
    const customerIds = Array.isArray(params?.customerIds) ? params.customerIds : [];
    const fieldTemplates =
      templateIds.length > 0
        ? (state.field_templates || []).filter((t) => templateIds.includes(t.id))
        : state.field_templates || [];

    const where: Prisma.CustomerWhereInput | undefined = customerIds.length > 0 ? { id: { in: customerIds } } : undefined;
    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        controller.enqueue(
          encode(
            `{"version":"1.0","exported_at":"${new Date().toISOString()}","customers":[`,
          ),
        );
        let first = true;
        for await (const batch of customerBatches(where, 500)) {
          for (const customer of batch) {
            const chunk = `${first ? "" : ","}${JSON.stringify(customer)}`;
            controller.enqueue(encode(chunk));
            first = false;
          }
        }
        controller.enqueue(encode(`],"field_templates":${JSON.stringify(fieldTemplates)},"field_catalog":${JSON.stringify(state.field_catalog || [])}}`));
        controller.close();
      },
    });
    return stream;
  },
};

