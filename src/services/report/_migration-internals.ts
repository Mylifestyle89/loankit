/**
 * _migration-internals.ts — legacy migration bootstrap + per-instance draft
 * file helper. Consumed by template-field-mutate + mapping-instance services
 * pending their retirement.
 */
import { docxEngine } from "@/lib/docx-engine";
import { prisma } from "@/lib/prisma";
import {
  aliasMapSchema,
  mappingMasterSchema,
} from "@/lib/report/config-schema";
import { loadState, saveState } from "@/lib/report/fs-store";

import { LEGACY_MIGRATION_VERSION } from "./_shared";
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
    prisma.masterTemplate.count(),
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
