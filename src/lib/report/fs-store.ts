/**
 * fs-store — framework state load/save + re-export barrel.
 * Sub-modules: fs-store-mapping-io.ts, fs-store-state-ops.ts.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";
import { REPORT_STATE_FILE } from "@/lib/report/constants";
import {
  frameworkStateSchema,
  type FrameworkState,
  type MappingVersion,
  type TemplateProfile,
} from "@/lib/report/config-schema";
import {
  normalizeFieldCatalogGroupsVi,
  normalizeFieldCatalogLabelsVi,
} from "@/lib/report/field-labels";
import { fileLockService } from "@/lib/report/file-lock.service";
import {
  ensureDirectories,
  fsErrorCode,
  isIgnorableFsError,
  isReadOnlyFsError,
  pruneOldBackups,
  tsForFilename,
} from "@/lib/report/fs-store-helpers";
import {
  buildCatalog,
  mergeFinancialCatalog,
  readMappingFile,
  readAliasFile,
} from "@/lib/report/fs-store-mapping-io";
import {
  DEFAULT_ALIAS_FILE,
  DEFAULT_MAPPING_FILE,
  DEFAULT_TEMPLATE_FILE,
} from "@/lib/report/constants";

// Re-export all public API from sub-modules so consumers import from "@/lib/report/fs-store"
export {
  readMappingFile,
  parseMappingJson,
  readAliasFile,
  parseAliasJson,
  buildCatalog,
  mergeFinancialCatalog,
} from "@/lib/report/fs-store-mapping-io";

export {
  createMappingDraft,
  publishMappingVersion,
  setActiveTemplate,
  updateTemplateInventory,
  appendRunLog,
} from "@/lib/report/fs-store-state-ops";

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const REPORT_CONFIG_DB_KEY = "framework_state";
const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Bootstrap helpers (internal)
// ---------------------------------------------------------------------------

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

  const { writeJsonFile } = await import("@/lib/report/fs-store-helpers");
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

const EMPTY_STATE: FrameworkState = frameworkStateSchema.parse({
  field_catalog: [],
  field_templates: [],
  mapping_versions: [],
  template_profiles: [],
  run_logs: [],
  active_mapping_version_id: "",
  active_template_id: "",
});

// ---------------------------------------------------------------------------
// DB persistence
// ---------------------------------------------------------------------------

async function loadStateFromDb(): Promise<FrameworkState | null> {
  try {
    const row = await prisma.reportConfig.findUnique({ where: { key: REPORT_CONFIG_DB_KEY } });
    if (!row) return null;
    return frameworkStateSchema.parse(JSON.parse(row.valueJson));
  } catch {
    return null;
  }
}

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

// ---------------------------------------------------------------------------
// Normalize + persist helper
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Public API: loadState / saveState / getActiveMappingVersion / getActiveTemplateProfile
// ---------------------------------------------------------------------------

export async function loadState(): Promise<FrameworkState> {
  // 1. Try DB first (works on Vercel read-only FS)
  const fromDb = await loadStateFromDb();
  if (fromDb) {
    return normalizeAndPersist(fromDb);
  }

  // 2. Fall back to filesystem (local dev)
  await ensureDirectories();
  const { readJsonFile } = await import("@/lib/report/fs-store-helpers");
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
  await saveStateToDb(parsed);
  return normalizeAndPersist(parsed);
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
    if (isIgnorableFsError(err)) return;
    throw err;
  } finally {
    await fileLockService.releaseLock("report_assets");
  }
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
