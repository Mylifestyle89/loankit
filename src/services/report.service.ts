import type { Customer, Prisma } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";

import { NotFoundError, SystemError, ValidationError } from "@/core/errors/app-error";
import { groupDataByField } from "@/core/use-cases/grouping-engine";
import { validateReportPayload } from "@/core/use-cases/report-validation";
import { CorruptedTemplateError, DataPlaceholderMismatchError, docxEngine, TemplateNotFoundError } from "@/lib/docx-engine";
import { prisma } from "@/lib/prisma";
import {
  fieldCatalogItemSchema,
  frameworkStateSchema,
  mappingMasterSchema,
  aliasMapSchema,
  type FieldCatalogItem,
  type FieldTemplate,
  type MappingInstanceSummary,
  type MasterTemplateSummary,
} from "@/lib/report/config-schema";
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

const LEGACY_MIGRATION_VERSION = 1;


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

function parseFieldCatalogJson(raw: string): FieldCatalogItem[] {
  try {
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => fieldCatalogItemSchema.parse(item));
  } catch {
    return [];
  }
}

function mapMasterTemplateRecordToSummary(input: {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  fieldCatalogJson: string;
}): MasterTemplateSummary {
  return {
    id: input.id,
    name: input.name,
    description: input.description ?? undefined,
    status: input.status === "archived" ? "archived" : "active",
    created_at: input.createdAt.toISOString(),
    updated_at: input.updatedAt.toISOString(),
    field_catalog: parseFieldCatalogJson(input.fieldCatalogJson),
  };
}

function mapMappingInstanceRecordToSummary(input: {
  id: string;
  masterId: string | null;
  masterSnapshotName: string;
  fieldCatalogJson: string;
  customerId: string;
  name: string;
  status: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}): MappingInstanceSummary {
  return {
    id: input.id,
    master_id: input.masterId ?? undefined,
    master_snapshot_name: input.masterSnapshotName || undefined,
    field_catalog: parseFieldCatalogJson(input.fieldCatalogJson),
    customer_id: input.customerId,
    name: input.name,
    status: input.status === "published" ? "published" : input.status === "archived" ? "archived" : "draft",
    created_by: input.createdBy,
    created_at: input.createdAt.toISOString(),
    updated_at: input.updatedAt.toISOString(),
    published_at: input.publishedAt?.toISOString(),
  };
}

async function createInstanceDraftFiles(seed: {
  customerId: string;
  masterId?: string | null;
  mapping: unknown;
  aliasMap: unknown;
}): Promise<{ mappingPath: string; aliasPath: string }> {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idBase = `instance-${seed.customerId}-${seed.masterId ?? "snapshot"}-${stamp}`;
  const mappingPath = `report_assets/config/versions/${idBase}.mapping.json`;
  const aliasPath = `report_assets/config/versions/${idBase}.alias.json`;
  await docxEngine.writeJson(mappingPath, mappingMasterSchema.parse(seed.mapping));
  await docxEngine.writeJson(aliasPath, aliasMapSchema.parse(seed.aliasMap));
  return { mappingPath, aliasPath };
}

function ensurePrismaModelsExist(): void {
  const prismaRecord = prisma as unknown as Record<string, unknown>;
  const hasMaster = typeof (prismaRecord.fieldTemplateMaster as { count?: unknown } | undefined)?.count === "function";
  const hasInstance = typeof (prismaRecord.mappingInstance as { count?: unknown } | undefined)?.count === "function";
  if (!hasMaster || !hasInstance) {
    throw new SystemError(
      "Prisma client thiếu model FieldTemplateMaster/MappingInstance. Chạy: npx prisma generate",
    );
  }
}

async function ensureMasterInstanceMigration(): Promise<void> {
  ensurePrismaModelsExist();
  const state = await loadState();
  if ((state.data_migration_version ?? 0) >= LEGACY_MIGRATION_VERSION) return;

  const [existingMasterCount, existingInstanceCount] = await Promise.all([
    prisma.fieldTemplateMaster.count(),
    prisma.mappingInstance.count(),
  ]);
  if (existingMasterCount > 0 || existingInstanceCount > 0) {
    state.data_migration_version = LEGACY_MIGRATION_VERSION;
    await saveState(state);
    return;
  }

  const legacyTemplates = state.field_templates ?? [];
  if (legacyTemplates.length === 0) {
    state.data_migration_version = LEGACY_MIGRATION_VERSION;
    await saveState(state);
    return;
  }

  const masterIdByLegacyId = new Map<string, string>();
  for (const legacy of legacyTemplates) {
    const created = await prisma.fieldTemplateMaster.create({
      data: {
        name: legacy.name,
        status: "active",
        fieldCatalogJson: JSON.stringify(legacy.field_catalog ?? []),
      },
    });
    masterIdByLegacyId.set(legacy.id, created.id);
  }

  const [activeMapping, activeAlias, customers] = await Promise.all([
    readMappingFile((await getActiveMappingVersion(state)).mapping_json_path),
    readAliasFile((await getActiveMappingVersion(state)).alias_json_path),
    prisma.customer.findMany(),
  ]);

  for (const customer of customers) {
    const dataJson = parseCustomerDataJson(customer.data_json);
    const assignedIdsRaw = dataJson.__field_template_ids;
    const assignedLegacyIds = Array.isArray(assignedIdsRaw) ? assignedIdsRaw.map(String) : [];
    for (const legacyId of assignedLegacyIds) {
      const masterId = masterIdByLegacyId.get(legacyId);
      if (!masterId) continue;
      const draftFiles = await createInstanceDraftFiles({
        customerId: customer.id,
        masterId,
        mapping: activeMapping,
        aliasMap: activeAlias,
      });
      await prisma.mappingInstance.create({
        data: {
          name: `${customer.customer_name} - migrated instance`,
          status: "draft",
          createdBy: "migration",
          mappingJsonPath: draftFiles.mappingPath,
          aliasJsonPath: draftFiles.aliasPath,
          masterSnapshotName: "migrated instance",
          fieldCatalogJson: JSON.stringify((legacyTemplates.find((t) => t.id === legacyId)?.field_catalog ?? [])),
          customerId: customer.id,
          masterId,
        },
      });
    }
  }

  state.data_migration_version = LEGACY_MIGRATION_VERSION;
  await saveState(state);
}

async function isDbTemplateModeEnabled(): Promise<boolean> {
  const state = await loadState();
  return (state.data_migration_version ?? 0) >= LEGACY_MIGRATION_VERSION;
}

async function relPathExists(relPath: string): Promise<boolean> {
  try {
    await fs.access(path.join(process.cwd(), relPath));
    return true;
  } catch {
    return false;
  }
}

async function resolveMappingSource(mappingInstanceId?: string): Promise<
  | { mode: "instance"; mappingPath: string; aliasPath: string; instanceId: string }
  | { mode: "legacy"; mappingPath: string; aliasPath: string; versionId: string }
> {
  await ensureMasterInstanceMigration();
  if (mappingInstanceId) {
    const instance = await prisma.mappingInstance.findUnique({ where: { id: mappingInstanceId } });
    if (instance && (await relPathExists(instance.mappingJsonPath)) && (await relPathExists(instance.aliasJsonPath))) {
      return {
        mode: "instance",
        mappingPath: instance.mappingJsonPath,
        aliasPath: instance.aliasJsonPath,
        instanceId: instance.id,
      };
    }
  }

  const state = await loadState();
  const activeVersion = await getActiveMappingVersion(state);
  return {
    mode: "legacy",
    mappingPath: activeVersion.mapping_json_path,
    aliasPath: activeVersion.alias_json_path,
    versionId: activeVersion.id,
  };
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

  async getMapping(params?: { mappingInstanceId?: string }) {
    const state = await loadState();
    const source = await resolveMappingSource(params?.mappingInstanceId);
    const mapping = await readMappingFile(source.mappingPath);
    const aliasMap = await readAliasFile(source.aliasPath);
    return {
      active_version_id: source.mode === "legacy" ? source.versionId : source.instanceId,
      versions: state.mapping_versions,
      mapping,
      alias_map: aliasMap,
    };
  },

  async saveMappingDraft(input: {
    createdBy?: string;
    notes?: string;
    mapping?: unknown;
    aliasMap?: unknown;
    fieldCatalog?: unknown[];
    mappingInstanceId?: string;
  }) {
    const mapping = mappingMasterSchema.parse(input.mapping);
    const aliasMap = aliasMapSchema.parse(input.aliasMap);
    const fieldCatalog = Array.isArray(input.fieldCatalog)
      ? input.fieldCatalog.map((item) => fieldCatalogItemSchema.parse(item))
      : undefined;
    if (input.mappingInstanceId) {
      await ensureMasterInstanceMigration();
      const instance = await prisma.mappingInstance.findUnique({
        where: { id: input.mappingInstanceId },
      });
      if (!instance) throw new NotFoundError("Mapping instance not found.");
      await docxEngine.writeJson(instance.mappingJsonPath, mapping);
      await docxEngine.writeJson(instance.aliasJsonPath, aliasMap);
      if (fieldCatalog) {
        const serializedCatalog = JSON.stringify(fieldCatalog);
        if (instance.masterId) {
          await prisma.fieldTemplateMaster.update({
            where: { id: instance.masterId },
            data: { fieldCatalogJson: serializedCatalog },
          });
        } else {
          // Snapshot instance no longer linked to a master template.
          await prisma.mappingInstance.update({
            where: { id: instance.id },
            data: { fieldCatalogJson: serializedCatalog },
          });
        }
      }
      return { version: { id: instance.id, status: "draft", created_at: instance.updatedAt.toISOString() }, activeVersionId: instance.id };
    }
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

  async runReportExport(input: { outputPath?: string; reportPath?: string; templatePath?: string; mappingInstanceId?: string }) {
    const start = Date.now();
    const state = await loadState();
    const source = await resolveMappingSource(input.mappingInstanceId);
    const activeTemplate = await getActiveTemplateProfile(state);

    const outputPath = input.outputPath ?? "report_assets/report_preview.docx";
    const reportPath = input.reportPath ?? "report_assets/template_export_report.json";
    const templatePath = input.templatePath ?? activeTemplate.docx_path;
    const baseFlat = await docxEngine.readJson<Record<string, unknown>>("report_assets/report_draft_flat.json");
    const aliasMap = await docxEngine.readJson<Record<string, unknown>>(source.aliasPath);
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
    mappingInstanceId?: string;
  }) {
    const start = Date.now();
    const state = await loadState();
    const source = await resolveMappingSource(input?.mappingInstanceId);
    const activeTemplate = await getActiveTemplateProfile(state);

    const templatePath = input?.templatePath ?? activeTemplate.docx_path;
    const reportPath = input?.reportPath ?? "report_assets/template_export_report_bank.json";
    const outputDir = input?.outputDir ?? "report_assets/exports/bank-rate-notices";
    const groupKey = input?.groupKey?.trim() || "HĐTD";
    const repeatKey = input?.repeatKey?.trim() || "items";
    const customerNameKey = input?.customerNameKey?.trim() || "TÊN KH";

    const [baseFlat, aliasMapRaw, manualValues] = await Promise.all([
      docxEngine.readJson<Record<string, unknown>>("report_assets/report_draft_flat.json"),
      docxEngine.readJson<Record<string, unknown>>(source.aliasPath),
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

  async validateReport(input: { runBuild?: boolean; mappingInstanceId?: string }) {
    const state = await loadState();
    const activeTemplate = await getActiveTemplateProfile(state);
    const source = await resolveMappingSource(input.mappingInstanceId);

    if (input.runBuild) {
      const result = await runBuildAndValidate();
      const final = validateReportPayload({
        validation: result.validation,
        templatePath: activeTemplate.docx_path,
        aliasPath: source.aliasPath,
        source: "pipeline",
      });
      return { source: "pipeline", validation: final };
    }

    const parsed = await docxEngine.readJson<unknown>("report_assets/validation_report.json");
    const final = validateReportPayload({
      validation: parsed,
      templatePath: activeTemplate.docx_path,
      aliasPath: source.aliasPath,
      source: "cached",
    });
    return { source: "cached", validation: final };
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

  async createFieldTemplate(input: { name: string; fieldCatalog: unknown[]; customerId?: string }) {
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
              createdBy: "web-user",
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

  async listMasterTemplates(params?: { withUsage?: boolean }) {
    await ensureMasterInstanceMigration();
    const masters = await prisma.fieldTemplateMaster.findMany({
      orderBy: { createdAt: "desc" },
    });
    const hasDbMasterData = masters.length > 0;
    const hasDbInstanceData = (await prisma.mappingInstance.count()) > 0;
    if (!hasDbMasterData && !hasDbInstanceData) {
      return [];
    }
    if (!params?.withUsage) {
      return masters.map((item) => mapMasterTemplateRecordToSummary(item));
    }
    const grouped = await prisma.mappingInstance.groupBy({
      by: ["masterId", "customerId"],
    });
    const usageMap = new Map<string, number>();
    for (const row of grouped) {
      if (!row.masterId) continue;
      usageMap.set(row.masterId, (usageMap.get(row.masterId) ?? 0) + 1);
    }
    return masters.map((item) => ({
      ...mapMasterTemplateRecordToSummary(item),
      assigned_customer_count: usageMap.get(item.id) ?? 0,
    }));
  },

  async createMasterTemplate(input: { name: string; description?: string; fieldCatalog: unknown[] }) {
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

  async deleteMasterTemplate(masterId: string) {
    const id = masterId.trim();
    if (!id) throw new ValidationError("master_id is required.");
    await ensureMasterInstanceMigration();
    const existing = await prisma.fieldTemplateMaster.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Master template not found.");
    await prisma.fieldTemplateMaster.delete({ where: { id } });
    return { id };
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

