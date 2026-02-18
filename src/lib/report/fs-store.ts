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

const nowIso = () => new Date().toISOString();

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

async function ensureDirectories(): Promise<void> {
  await fs.mkdir(REPORT_CONFIG_DIR, { recursive: true });
  await fs.mkdir(REPORT_VERSIONS_DIR, { recursive: true });
  await fs.mkdir(REPORT_INVENTORY_DIR, { recursive: true });
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
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
    mapping_versions: [mappingVersion],
    template_profiles: bootstrapTemplateProfiles(),
    run_logs: [],
    active_mapping_version_id: versionId,
    active_template_id: "template-2268-no-prefix",
  };
  return frameworkStateSchema.parse(state);
}

export async function loadState(): Promise<FrameworkState> {
  await ensureDirectories();
  try {
    const stateRaw = await readJsonFile<unknown>(REPORT_STATE_FILE);
    const parsed = frameworkStateSchema.parse(stateRaw);
    const normalizedLabels = normalizeFieldCatalogLabelsVi(parsed.field_catalog);
    const normalizedGroups = normalizeFieldCatalogGroupsVi(normalizedLabels.catalog);
    if (normalizedLabels.changed || normalizedGroups.changed) {
      parsed.field_catalog = normalizedGroups.catalog;
      await saveState(parsed);
    }
    return parsed;
  } catch {
    const state = await bootstrapState();
    await saveState(state);
    return state;
  }
}

export async function saveState(state: FrameworkState): Promise<void> {
  await ensureDirectories();
  await writeJsonFile(REPORT_STATE_FILE, frameworkStateSchema.parse(state));
}

export async function createMappingDraft(params: {
  createdBy: string;
  notes?: string;
  mapping: MappingMaster;
  aliasMap: AliasMap;
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
  state.field_catalog = buildCatalog(params.mapping);
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
