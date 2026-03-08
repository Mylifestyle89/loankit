import fs from "node:fs/promises";
import path from "node:path";

import {
  DEFAULT_ALIAS_FILE,
  DEFAULT_MAPPING_FILE,
  DEFAULT_TEMPLATE_FILE,
  REPORT_CONFIG_DIR,
  REPORT_INVENTORY_DIR,
  REPORT_STATE_FILE,
  REPORT_VERSIONS_DIR,
} from "@/lib/report/constants";
import {
  aliasMapSchema,
  frameworkStateSchema,
  type AliasMap,
  type FieldCatalogItem,
  type FrameworkState,
  type MappingMaster,
  mappingMasterSchema,
  type MappingVersion,
  type TemplateProfile,
} from "@/lib/report/config-schema";
import {
  normalizeFieldCatalogGroupsVi,
  normalizeFieldCatalogLabelsVi,
  translateFieldLabelVi,
  translateGroupVi,
} from "@/lib/report/field-labels";
import { fileLockService } from "@/lib/report/file-lock.service";
import { FINANCIAL_FIELD_CATALOG } from "@/lib/report/financial-field-catalog";

const nowIso = () => new Date().toISOString();

function tsForFilename(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(
    date.getMinutes(),
  )}${pad(date.getSeconds())}`;
}

async function pruneOldBackups(folder: string, maxKeep: number): Promise<void> {
  const entries = await fs.readdir(folder, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort().reverse();
  const stale = files.slice(maxKeep);
  await Promise.all(stale.map((name) => fs.unlink(path.join(folder, name)).catch(() => undefined)));
}

function toGroup(fieldKey: string): string {
  const chunks = fieldKey.split(".");
  const raw = chunks.length > 1 ? `${chunks[0]}.${chunks[1]}` : chunks[0];
  return translateGroupVi(raw);
}

function inferType(fieldKey: string, normalizer?: string): FieldCatalogItem["type"] {
  if (normalizer?.includes("date") || fieldKey.includes("date")) {
    return "date";
  }
  if (normalizer?.includes("percent")) {
    return "percent";
  }
  if (normalizer?.includes("currency") || normalizer?.includes("percent")) {
    return "number";
  }
  if (fieldKey.includes("list") || fieldKey.includes("table")) {
    return "table";
  }
  return "text";
}

function isReadOnlyFsError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException).code;
  return code === "EROFS" || code === "ENOENT" || code === "EPERM";
}

async function ensureDirectories(): Promise<void> {
  try {
    await fs.mkdir(REPORT_CONFIG_DIR, { recursive: true });
    await fs.mkdir(REPORT_VERSIONS_DIR, { recursive: true });
    await fs.mkdir(REPORT_INVENTORY_DIR, { recursive: true });
  } catch (err) {
    if (isReadOnlyFsError(err)) return;
    throw err;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fileLockService.acquireLock("report_assets");
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  } finally {
    await fileLockService.releaseLock("report_assets");
  }
}

export async function readMappingFile(mappingPath: string): Promise<MappingMaster> {
  const absolute = path.join(process.cwd(), mappingPath);
  const parsed = await readJsonFile<unknown>(absolute);
  return mappingMasterSchema.parse(parsed);
}

export async function readAliasFile(aliasPath: string): Promise<AliasMap> {
  const absolute = path.join(process.cwd(), aliasPath);
  const parsed = await readJsonFile<unknown>(absolute);
  return aliasMapSchema.parse(parsed);
}

function buildCatalog(mapping: MappingMaster): FieldCatalogItem[] {
  return mapping.mappings.map((item) => ({
    field_key: item.template_field,
    label_vi: translateFieldLabelVi(item.template_field),
    group: toGroup(item.template_field),
    type: inferType(item.template_field, item.normalizer),
    required: item.status !== "MISSING",
    normalizer: item.normalizer,
    examples: item.sources.map((source) => `${source.source}:${source.path}`),
  }));
}

function bootstrapTemplateProfiles(): TemplateProfile[] {
  return [
    {
      id: "template-2268-no-prefix",
      template_name: "Mau 2268 (no prefix placeholders)",
      docx_path: DEFAULT_TEMPLATE_FILE,
      placeholder_inventory_path: "",
      active: true,
    },
    {
      id: "template-2268-original",
      template_name: "Mau 2268 (original)",
      docx_path: "report_assets/2268.02A.PN BC de xuat cho vay ngan han.docx",
      placeholder_inventory_path: "",
      active: false,
    },
  ];
}

async function bootstrapState(): Promise<FrameworkState> {
  const mapping = await readMappingFile(DEFAULT_MAPPING_FILE);
  const versionId = `bootstrap-${Date.now()}`;
  const draftMappingPath = `report_assets/config/versions/${versionId}.mapping.json`;
  const draftAliasPath = `report_assets/config/versions/${versionId}.alias.json`;

  await writeJsonFile(path.join(process.cwd(), draftMappingPath), mapping);
  const alias = await readAliasFile(DEFAULT_ALIAS_FILE);
  await writeJsonFile(path.join(process.cwd(), draftAliasPath), alias);

  const mappingVersion: MappingVersion = {
    id: versionId,
    status: "published",
    created_by: "system",
    created_at: nowIso(),
    mapping_json_path: draftMappingPath,
    alias_json_path: draftAliasPath,
    notes: "Bootstrap from existing report assets.",
  };

  const state: FrameworkState = {
    field_catalog: buildCatalog(mapping),
    field_templates: [],
    mapping_versions: [mappingVersion],
    template_profiles: bootstrapTemplateProfiles(),
    run_logs: [],
    active_mapping_version_id: versionId,
    active_template_id: "template-2268-no-prefix",
  };
  return frameworkStateSchema.parse(state);
}

/**
 * Merge FINANCIAL_FIELD_CATALOG items into the existing catalog.
 * Idempotent: only adds items whose field_key does not already exist.
 */
function mergeFinancialCatalog(catalog: FieldCatalogItem[]): {
  catalog: FieldCatalogItem[];
  changed: boolean;
} {
  const existing = new Set(catalog.map((item) => item.field_key));
  const toAdd = FINANCIAL_FIELD_CATALOG.filter((item) => !existing.has(item.field_key));
  if (toAdd.length === 0) return { catalog, changed: false };
  return { catalog: [...catalog, ...toAdd], changed: true };
}

const EMPTY_STATE: FrameworkState = frameworkStateSchema.parse({
  field_catalog: [],
  field_templates: [],
  mapping_versions: [],
  template_profiles: [],
  run_logs: [],
  active_mapping_version_id: "",
  active_template_id: "",
});

export async function loadState(): Promise<FrameworkState> {
  await ensureDirectories();

  // Try reading existing state file
  let stateRaw: unknown;
  try {
    stateRaw = await readJsonFile<unknown>(REPORT_STATE_FILE);
  } catch (err) {
    if (isReadOnlyFsError(err)) return EMPTY_STATE;
    // File missing on writable FS — bootstrap
    try {
      const state = await bootstrapState();
      await saveState(state);
      return state;
    } catch (bootstrapErr) {
      if (isReadOnlyFsError(bootstrapErr)) return EMPTY_STATE;
      throw bootstrapErr;
    }
  }

  // Parse and normalize (parse errors bubble up, not swallowed)
  const parsed = frameworkStateSchema.parse(stateRaw);

  const mergedFinancial = mergeFinancialCatalog(parsed.field_catalog);
  if (mergedFinancial.changed) {
    parsed.field_catalog = mergedFinancial.catalog;
  }

  const normalizedLabels = normalizeFieldCatalogLabelsVi(parsed.field_catalog);
  const normalizedGroups = normalizeFieldCatalogGroupsVi(normalizedLabels.catalog);
  if (mergedFinancial.changed || normalizedLabels.changed || normalizedGroups.changed) {
    parsed.field_catalog = normalizedGroups.catalog;
    await saveState(parsed);
  }
  return parsed;
}

export async function saveState(state: FrameworkState): Promise<void> {
  await fileLockService.acquireLock("report_assets");
  try {
    await ensureDirectories();
    const parsed = frameworkStateSchema.parse(state);
    const nextRaw = JSON.stringify(parsed, null, 2);

    let currentRaw = "";
    try {
      currentRaw = await fs.readFile(REPORT_STATE_FILE, "utf-8");
    } catch {
      currentRaw = "";
    }

    // Skip redundant write/backup when content does not change.
    if (currentRaw === nextRaw) {
      return;
    }

    if (currentRaw) {
      const backupDir = path.join(process.cwd(), "report_assets", "backups", "state-config");
      await fs.mkdir(backupDir, { recursive: true });
      const backupPath = path.join(backupDir, `framework_state-${tsForFilename()}.json`);
      await fs.writeFile(backupPath, currentRaw, "utf-8");
      await pruneOldBackups(backupDir, 100);
    }

    await fs.writeFile(REPORT_STATE_FILE, nextRaw, "utf-8");
  } catch (err) {
    if (isReadOnlyFsError(err)) return; // Vercel read-only FS
    throw err;
  } finally {
    await fileLockService.releaseLock("report_assets");
  }
}

export async function createMappingDraft(params: {
  createdBy: string;
  notes?: string;
  mapping: MappingMaster;
  aliasMap: AliasMap;
  fieldCatalog?: FieldCatalogItem[];
}): Promise<{ state: FrameworkState; version: MappingVersion }> {
  const state = await loadState();
  const id = `draft-${Date.now()}`;
  const mappingPath = `report_assets/config/versions/${id}.mapping.json`;
  const aliasPath = `report_assets/config/versions/${id}.alias.json`;

  await writeJsonFile(path.join(process.cwd(), mappingPath), mappingMasterSchema.parse(params.mapping));
  await writeJsonFile(path.join(process.cwd(), aliasPath), aliasMapSchema.parse(params.aliasMap));

  const version: MappingVersion = {
    id,
    status: "draft",
    created_by: params.createdBy,
    created_at: nowIso(),
    mapping_json_path: mappingPath,
    alias_json_path: aliasPath,
    notes: params.notes ?? "",
  };

  state.mapping_versions = [version, ...state.mapping_versions];
  state.active_mapping_version_id = id;
  state.field_catalog = params.fieldCatalog ?? buildCatalog(params.mapping);
  await saveState(state);
  return { state, version };
}

export async function publishMappingVersion(versionId: string): Promise<FrameworkState> {
  const state = await loadState();
  state.mapping_versions = state.mapping_versions.map((version) =>
    version.id === versionId ? { ...version, status: "published" } : version,
  );
  state.active_mapping_version_id = versionId;
  await saveState(state);
  return state;
}

export async function setActiveTemplate(templateId: string): Promise<FrameworkState> {
  const state = await loadState();
  state.template_profiles = state.template_profiles.map((template) => ({
    ...template,
    active: template.id === templateId,
  }));
  state.active_template_id = templateId;
  await saveState(state);
  return state;
}

export async function updateTemplateInventory(templateId: string, inventoryPath: string): Promise<FrameworkState> {
  const state = await loadState();
  state.template_profiles = state.template_profiles.map((template) =>
    template.id === templateId
      ? {
          ...template,
          placeholder_inventory_path: inventoryPath,
        }
      : template,
  );
  await saveState(state);
  return state;
}

export async function appendRunLog(log: FrameworkState["run_logs"][number]): Promise<void> {
  const state = await loadState();
  state.run_logs = [log, ...state.run_logs].slice(0, 100);
  await saveState(state);
}

export async function getActiveMappingVersion(stateOverride?: FrameworkState): Promise<MappingVersion> {
  const state = stateOverride ?? (await loadState());
  const activeId = state.active_mapping_version_id;
  const active = state.mapping_versions.find((version) => version.id === activeId);
  if (!active) {
    throw new Error("Active mapping version not found.");
  }
  return active;
}

export async function getActiveTemplateProfile(stateOverride?: FrameworkState): Promise<TemplateProfile> {
  const state = stateOverride ?? (await loadState());
  const activeId = state.active_template_id;
  const active = state.template_profiles.find((template) => template.id === activeId);
  if (!active) {
    throw new Error("Active template profile not found.");
  }
  return active;
}
