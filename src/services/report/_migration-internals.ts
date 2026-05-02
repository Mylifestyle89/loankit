/**
 * Internal migration helpers shared across report sub-services.
 * Not part of the public API — used by template, mapping, mapping-instance,
 * and master-template services.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { SystemError } from "@/core/errors/app-error";
import { docxEngine } from "@/lib/docx-engine";
import { prisma } from "@/lib/prisma";
import {
  aliasMapSchema,
  mappingMasterSchema,
} from "@/lib/report/config-schema";
import {
  getActiveMappingVersion,
  loadState,
  readAliasFile,
  readMappingFile,
  saveState,
} from "@/lib/report/fs-store";

import {
  type MappingSource,
  LEGACY_MIGRATION_VERSION,
  customerBatches,
  parseCustomerDataJson,
} from "./_shared";

// ---------------------------------------------------------------------------
// Module-level guard (in-process cache to skip repeated DB reads)
// ---------------------------------------------------------------------------

let isMigrationChecked = false;

const MIGRATION_KEY = "LEGACY_MIGRATION";

// ---------------------------------------------------------------------------
// Prisma model detection
// ---------------------------------------------------------------------------

function hasPrismaModel(modelName: string): boolean {
  const model: unknown = Reflect.get(prisma as object, modelName);
  return (
    model !== null &&
    typeof model === "object" &&
    typeof (model as { count?: unknown }).count === "function"
  );
}

export function ensurePrismaModelsExist(): void {
  if (
    !hasPrismaModel("fieldTemplateMaster") ||
    !hasPrismaModel("mappingInstance")
  ) {
    throw new SystemError(
      "Prisma client thiếu model FieldTemplateMaster/MappingInstance. Chạy: npx prisma generate",
    );
  }
}

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
// Migration: legacy JSON → DB master/instance
// ---------------------------------------------------------------------------

export async function ensureMasterInstanceMigration(): Promise<void> {
  // Fast path: in-process cache avoids repeated DB reads within same process
  if (isMigrationChecked) return;
  ensurePrismaModelsExist();

  // A-C3: Use DB sentinel (MigrationState) inside a serializable transaction
  // to prevent duplicate migration runs on concurrent cold-starts.
  // SQLite Serializable isolation ensures second concurrent tx sees the sentinel row.
  let shouldRunMigration = false;

  try {
    await prisma.$transaction(
      async (tx) => {
        // Check for existing sentinel row — if present, migration already ran
        const existing = await tx.migrationState.findUnique({
          where: { key: MIGRATION_KEY },
        });
        if (existing && existing.version >= LEGACY_MIGRATION_VERSION) {
          // Already done — no-op; isMigrationChecked set after tx
          return;
        }

        // Reserve the slot: insert sentinel before doing work.
        // Concurrent tx will collide on @id unique constraint → skip.
        await tx.migrationState.upsert({
          where: { key: MIGRATION_KEY },
          create: { key: MIGRATION_KEY, version: LEGACY_MIGRATION_VERSION },
          update: { version: LEGACY_MIGRATION_VERSION },
        });

        shouldRunMigration = true;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (err) {
    // Unique constraint violation → another process won the race, skip
    console.warn("[Migration] Concurrent migration detected, skipping:", (err as Error).message);
    isMigrationChecked = true;
    return;
  }

  if (!shouldRunMigration) {
    isMigrationChecked = true;
    return;
  }

  const state = await loadState();
  if ((state.data_migration_version ?? 0) >= LEGACY_MIGRATION_VERSION) {
    isMigrationChecked = true;
    return;
  }

  const [existingMasterCount, existingInstanceCount] = await Promise.all([
    prisma.fieldTemplateMaster.count(),
    prisma.mappingInstance.count(),
  ]);
  if (existingMasterCount > 0 || existingInstanceCount > 0) {
    state.data_migration_version = LEGACY_MIGRATION_VERSION;
    await saveState(state);
    isMigrationChecked = true;
    return;
  }

  const legacyTemplates = state.field_templates ?? [];
  if (legacyTemplates.length === 0) {
    state.data_migration_version = LEGACY_MIGRATION_VERSION;
    await saveState(state);
    isMigrationChecked = true;
    return;
  }

  console.log(`[Migration] Bắt đầu chuyển đổi dữ liệu sang v${LEGACY_MIGRATION_VERSION}...`);

  // 1. Chuyển đổi Templates sang Master DB
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

  // 2. Chuẩn bị dữ liệu Mapping gốc (gọi getActiveMappingVersion 1 lần)
  const activeVersion = await getActiveMappingVersion(state);
  const [activeMapping, activeAlias] = await Promise.all([
    readMappingFile(activeVersion.mapping_json_path),
    readAliasFile(activeVersion.alias_json_path),
  ]);

  // 3. Migrate Customers theo đợt (cursor-based) để tránh tràn RAM
  for await (const batch of customerBatches({}, 50)) {
    for (const customer of batch) {
      try {
        const dataJson = parseCustomerDataJson(customer.data_json);
        const assignedLegacyIds = Array.isArray(dataJson.__field_template_ids)
          ? dataJson.__field_template_ids.map(String)
          : [];
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
              mappingJson: draftFiles.mappingJson,
              aliasJson: draftFiles.aliasJson,
              masterSnapshotName: "migrated instance",
              fieldCatalogJson: JSON.stringify(
                legacyTemplates.find((t) => t.id === legacyId)?.field_catalog ?? [],
              ),
              customerId: customer.id,
              masterId,
            },
          });
        }
      } catch (err) {
        console.error(`[Migration] Lỗi khi migrate customer ${customer.id}:`, err);
      }
    }
  }

  // 4. Hoàn tất migration
  state.data_migration_version = LEGACY_MIGRATION_VERSION;
  await saveState(state);
  isMigrationChecked = true;
  console.log(`[Migration] Hoàn tất chuyển đổi lên v${LEGACY_MIGRATION_VERSION}.`);
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
      // Prefer DB columns; fall back to file existence check
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
