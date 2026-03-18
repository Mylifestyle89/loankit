import fs from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_ALIAS_FILE,
  DEFAULT_MAPPING_FILE,
  DEFAULT_TEMPLATE_FILE,
  REPORT_STATE_FILE,
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
} from "@/lib/report/field-labels";
import { fileLockService } from "@/lib/report/file-lock.service";
import { FINANCIAL_FIELD_CATALOG } from "@/lib/report/financial-field-catalog";
import {
  ensureDirectories,
  fsErrorCode,
  inferType,
  isIgnorableFsError,
  isReadOnlyFsError,
  pruneOldBackups,
  readJsonFile,
  toGroup,
  tsForFilename,
  writeJsonFile,
} from "@/lib/report/fs-store-helpers";

const REPORT_CONFIG_DB_KEY = "framework_state";

const nowIso = () => new Date().toISOString();

export async function readMappingFile(mappingPath: string): Promise<MappingMaster> {
  const absolute = path.join(process.cwd(), mappingPath);
  const parsed = await readJsonFile<unknown>(absolute);
  return mappingMasterSchema.parse(parsed);
}

/** Parse mapping JSON from inline DB string (avoids filesystem read). */
export function parseMappingJson(json: string): MappingMaster {
  return mappingMasterSchema.parse(JSON.parse(json));
}

export async function readAliasFile(aliasPath: string): Promise<AliasMap> {
  const absolute = path.join(process.cwd(), aliasPath);
  const parsed = await readJsonFile<unknown>(absolute);
  return aliasMapSchema.parse(parsed);
}

/** Parse alias JSON from inline DB string (avoids filesystem read). */
export function parseAliasJson(json: string): AliasMap {
  return aliasMapSchema.parse(JSON.parse(json));
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

/** Try loading state from DB first (works on Vercel), fall back to filesystem. */
async function loadStateFromDb(): Promise<FrameworkState | null> {
  try {
    const row = await prisma.reportConfig.findUnique({ where: { key: REPORT_CONFIG_DB_KEY } });
    if (!row) return null;
    return frameworkStateSchema.parse(JSON.parse(row.valueJson));
  } catch {
    return null;
  }
}

/** Persist state to DB (always works, even on read-only FS). */
async function saveStateToDb(state: FrameworkState): Promise<void> {
  try {
    const json = JSON.stringify(state);
    await prisma.reportConfig.upsert({
      where: { key: REPORT_CONFIG_DB_KEY },
      update: { valueJson: json },
      create: { key: REPORT_CONFIG_DB_KEY, valueJson: json },
    });
  } catch (err) {
    console.warn("[fs-store] DB save failed, falling back to file:", err);
  }
}

export async function loadState(): Promise<FrameworkState> {
  // 1. Try DB first (works on Vercel read-only FS)
  const fromDb = await loadStateFromDb();
  if (fromDb) {
    return normalizeAndPersist(fromDb);
  }

  // 2. Fall back to filesystem (local dev)
  await ensureDirectories();
  let stateRaw: unknown;
  try {
    stateRaw = await readJsonFile<unknown>(REPORT_STATE_FILE);
  } catch (err) {
    if (isReadOnlyFsError(err)) return EMPTY_STATE;
    if (fsErrorCode(err) !== "ENOENT") throw err;
    try {
      const state = await bootstrapState();
      await saveState(state);
      return state;
    } catch (bootstrapErr) {
      if (isIgnorableFsError(bootstrapErr)) return EMPTY_STATE;
      throw bootstrapErr;
    }
  }

  const parsed = frameworkStateSchema.parse(stateRaw);
  // Seed DB from file so future reads use DB
  await saveStateToDb(parsed);
  return normalizeAndPersist(parsed);
}

/** Merge financial catalog + normalize labels, persist if changed. */
async function normalizeAndPersist(parsed: FrameworkState): Promise<FrameworkState> {
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
  const parsed = frameworkStateSchema.parse(state);

  // Always save to DB (works on Vercel)
  await saveStateToDb(parsed);

  // Also save to filesystem when possible (local dev, backup)
  await fileLockService.acquireLock("report_assets");
  try {
    await ensureDirectories();
    const nextRaw = JSON.stringify(parsed, null, 2);

    let currentRaw = "";
    try {
      currentRaw = await fs.readFile(REPORT_STATE_FILE, "utf-8");
    } catch {
      currentRaw = "";
    }

    if (currentRaw === nextRaw) return;

    if (currentRaw) {
      const backupDir = path.join(process.cwd(), "report_assets", "backups", "state-config");
      await fs.mkdir(backupDir, { recursive: true });
      const backupPath = path.join(backupDir, `framework_state-${tsForFilename()}.json`);
      await fs.writeFile(backupPath, currentRaw, "utf-8");
      await pruneOldBackups(backupDir, 100);
    }

    await fs.writeFile(REPORT_STATE_FILE, nextRaw, "utf-8");
  } catch (err) {
    if (isIgnorableFsError(err)) return; // Vercel read-only FS — DB already saved above
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

  const parsedMapping = mappingMasterSchema.parse(params.mapping);
  const parsedAlias = aliasMapSchema.parse(params.aliasMap);

  // Write to filesystem (best-effort, skipped on Vercel read-only FS)
  try {
    await writeJsonFile(path.join(process.cwd(), mappingPath), parsedMapping);
    await writeJsonFile(path.join(process.cwd(), aliasPath), parsedAlias);
  } catch (err) {
    if (!isIgnorableFsError(err)) throw err;
  }

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
