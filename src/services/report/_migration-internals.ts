/**
 * _migration-internals.ts
 * Thin orchestrator + re-export barrel for migration sub-modules.
 * Sub-modules: migration-state.ts (DB sentinel), migration-runner.ts (data migration steps).
 *
 * Not part of the public API — used by template, mapping, mapping-instance,
 * and master-template services.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { docxEngine } from "@/lib/docx-engine";
import { prisma } from "@/lib/prisma";
import {
  aliasMapSchema,
  mappingMasterSchema,
} from "@/lib/report/config-schema";
import {
  getActiveMappingVersion,
  loadState,
  saveState,
} from "@/lib/report/fs-store";

import {
  type MappingSource,
  LEGACY_MIGRATION_VERSION,
} from "./_shared";
import {
  ensurePrismaModelsExist,
  acquireMigrationSlot,
  getMigrationChecked,
  setMigrationChecked,
} from "./migration-state";
import { runLegacyMigration } from "./migration-runner";

// Re-export for callers that import directly from _migration-internals
export { ensurePrismaModelsExist } from "./migration-state";

// ---------------------------------------------------------------------------
// Instance draft file creation
// ---------------------------------------------------------------------------

export async function createInstanceDraftFiles(seed: {
  customerId: string;
  masterId?: string | null;
  mapping: unknown;
  aliasMap: unknown;
}): Promise<{ mappingPath: string; aliasPath: string; mappingJson: string; aliasJson: string }> {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idBase = `instance-${seed.customerId}-${seed.masterId ?? "snapshot"}-${stamp}`;
  const mappingPath = `report_assets/config/versions/${idBase}.mapping.json`;
  const aliasPath = `report_assets/config/versions/${idBase}.alias.json`;

  const parsedMapping = mappingMasterSchema.parse(seed.mapping);
  const parsedAlias = aliasMapSchema.parse(seed.aliasMap);
  const mappingJson = JSON.stringify(parsedMapping);
  const aliasJson = JSON.stringify(parsedAlias);

  // Write to filesystem (best-effort — skipped on Vercel read-only FS)
  try {
    await Promise.all([
      docxEngine.writeJson(mappingPath, parsedMapping),
      docxEngine.writeJson(aliasPath, parsedAlias),
    ]);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "EROFS" && code !== "EPERM" && code !== "ENOENT") throw err;
  }

  return { mappingPath, aliasPath, mappingJson, aliasJson };
}

// ---------------------------------------------------------------------------
// Orchestrator: ensure migration has run exactly once per process / DB
// ---------------------------------------------------------------------------

export async function ensureMasterInstanceMigration(): Promise<void> {
  if (getMigrationChecked()) return;
  ensurePrismaModelsExist();

  const shouldRun = await acquireMigrationSlot();
  if (!shouldRun) return;

  const state = await loadState();
  if ((state.data_migration_version ?? 0) >= LEGACY_MIGRATION_VERSION) {
    setMigrationChecked(true);
    return;
  }

  const [existingMasterCount, existingInstanceCount] = await Promise.all([
    prisma.fieldTemplateMaster.count(),
    prisma.mappingInstance.count(),
  ]);
  if (existingMasterCount > 0 || existingInstanceCount > 0) {
    state.data_migration_version = LEGACY_MIGRATION_VERSION;
    await saveState(state);
    setMigrationChecked(true);
    return;
  }

  await runLegacyMigration(state);
  setMigrationChecked(true);
}

// ---------------------------------------------------------------------------
// Feature detection
// ---------------------------------------------------------------------------

export async function isDbTemplateModeEnabled(): Promise<boolean> {
  const state = await loadState();
  return (state.data_migration_version ?? 0) >= LEGACY_MIGRATION_VERSION;
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

export async function relPathExists(relPath: string): Promise<boolean> {
  try {
    await fs.access(path.join(process.cwd(), relPath));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Mapping source resolution
// ---------------------------------------------------------------------------

export async function resolveMappingSource(
  mappingInstanceId?: string,
): Promise<MappingSource> {
  await ensureMasterInstanceMigration();

  if (mappingInstanceId) {
    const instance = await prisma.mappingInstance.findUnique({
      where: { id: mappingInstanceId },
    });
    if (instance) {
      const hasDbJson = !!instance.mappingJson && !!instance.aliasJson;
      const hasFiles = hasDbJson || (
        (await relPathExists(instance.mappingJsonPath)) &&
        (await relPathExists(instance.aliasJsonPath))
      );
      if (hasDbJson || hasFiles) {
        return {
          mode: "instance",
          mappingPath: instance.mappingJsonPath,
          aliasPath: instance.aliasJsonPath,
          instanceId: instance.id,
          mappingUpdatedAt: instance.updatedAt.toISOString(),
          mappingJson: instance.mappingJson,
          aliasJson: instance.aliasJson,
        };
      }
    }
  }

  const state = await loadState();
  const activeVersion = await getActiveMappingVersion(state);
  return {
    mode: "legacy",
    mappingPath: activeVersion.mapping_json_path,
    aliasPath: activeVersion.alias_json_path,
    versionId: activeVersion.id,
    mappingUpdatedAt: activeVersion.created_at,
  };
}
