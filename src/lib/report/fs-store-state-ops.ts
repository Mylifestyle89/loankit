/**
 * fs-store state operations — createMappingDraft, publishMappingVersion,
 * setActiveTemplate, updateTemplateInventory, appendRunLog.
 * These mutate FrameworkState and delegate to loadState/saveState.
 */
import path from "node:path";

import {
  aliasMapSchema,
  type AliasMap,
  type FieldCatalogItem,
  type FrameworkState,
  type MappingVersion,
  mappingMasterSchema,
  type MappingMaster,
} from "@/lib/report/config-schema";
import { isIgnorableFsError, writeJsonFile } from "@/lib/report/fs-store-helpers";
import { buildCatalog } from "@/lib/report/fs-store-mapping-io";

// Lazy import to avoid circular dep — loadState/saveState live in fs-store.ts
async function getStoreFns() {
  const { loadState, saveState } = await import("@/lib/report/fs-store");
  return { loadState, saveState };
}

const nowIso = () => new Date().toISOString();

export async function createMappingDraft(params: {
  createdBy: string;
  notes?: string;
  mapping: MappingMaster;
  aliasMap: AliasMap;
  fieldCatalog?: FieldCatalogItem[];
}): Promise<{ state: FrameworkState; version: MappingVersion }> {
  const { loadState, saveState } = await getStoreFns();
  const state = await loadState();
  const id = `draft-${Date.now()}`;
  const mappingPath = `report_assets/config/versions/${id}.mapping.json`;
  const aliasPath = `report_assets/config/versions/${id}.alias.json`;

  const parsedMapping = mappingMasterSchema.parse(params.mapping);
  const parsedAlias = aliasMapSchema.parse(params.aliasMap);

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
  const { loadState, saveState } = await getStoreFns();
  const state = await loadState();
  state.mapping_versions = state.mapping_versions.map((version) =>
    version.id === versionId ? { ...version, status: "published" } : version,
  );
  state.active_mapping_version_id = versionId;
  await saveState(state);
  return state;
}

export async function setActiveTemplate(templateId: string): Promise<FrameworkState> {
  const { loadState, saveState } = await getStoreFns();
  const state = await loadState();
  state.template_profiles = state.template_profiles.map((template) => ({
    ...template,
    active: template.id === templateId,
  }));
  state.active_template_id = templateId;
  await saveState(state);
  return state;
}

export async function updateTemplateInventory(
  templateId: string,
  inventoryPath: string,
): Promise<FrameworkState> {
  const { loadState, saveState } = await getStoreFns();
  const state = await loadState();
  state.template_profiles = state.template_profiles.map((template) =>
    template.id === templateId
      ? { ...template, placeholder_inventory_path: inventoryPath }
      : template,
  );
  await saveState(state);
  return state;
}

export async function appendRunLog(
  log: FrameworkState["run_logs"][number],
): Promise<void> {
  const { loadState, saveState } = await getStoreFns();
  const state = await loadState();
  state.run_logs = [log, ...state.run_logs].slice(0, 100);
  await saveState(state);
}
