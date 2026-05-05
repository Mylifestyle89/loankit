/**
 * migration-runner.ts
 * Actual migration steps: legacy JSON field_templates → DB FieldTemplateMaster
 * + MappingInstance records, cursor-batched per customer.
 */

import { prisma } from "@/lib/prisma";
import {
  getActiveMappingVersion,
  readAliasFile,
  readMappingFile,
  saveState,
} from "@/lib/report/fs-store";

import {
  LEGACY_MIGRATION_VERSION,
  customerBatches,
  parseCustomerDataJson,
} from "./_shared";
import { createInstanceDraftFiles } from "./_migration-internals";

// ---------------------------------------------------------------------------
// Migration runner — call only after acquireMigrationSlot() returns true
// ---------------------------------------------------------------------------

export async function runLegacyMigration(
  state: Awaited<ReturnType<typeof import("@/lib/report/fs-store").loadState>>,
): Promise<void> {
  const legacyTemplates = state.field_templates ?? [];

  // Nothing to migrate
  if (legacyTemplates.length === 0) {
    state.data_migration_version = LEGACY_MIGRATION_VERSION;
    await saveState(state);
    return;
  }

  console.log(`[Migration] Bắt đầu chuyển đổi dữ liệu sang v${LEGACY_MIGRATION_VERSION}...`);

  // 1. Templates → FieldTemplateMaster DB rows
  const masterIdByLegacyId = new Map<string, string>();
  // Also cache catalog JSON by legacy id to avoid O(n×m) find in step 3
  const catalogJsonByLegacyId = new Map<string, string>();
  for (const legacy of legacyTemplates) {
    const catalogJson = JSON.stringify(legacy.field_catalog ?? []);
    const created = await prisma.masterTemplate.create({
      data: {
        name: legacy.name,
        status: "active",
        fieldCatalogJson: catalogJson,
      },
    });
    masterIdByLegacyId.set(legacy.id, created.id);
    catalogJsonByLegacyId.set(legacy.id, catalogJson);
  }

  // 2. Fetch active mapping once (shared across all customer instances)
  const activeVersion = await getActiveMappingVersion(state);
  const [activeMapping, activeAlias] = await Promise.all([
    readMappingFile(activeVersion.mapping_json_path),
    readAliasFile(activeVersion.alias_json_path),
  ]);

  // 3. Migrate customers cursor-batched to avoid RAM overflow
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
              fieldCatalogJson: catalogJsonByLegacyId.get(legacyId) ?? "[]",
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

  // 4. Finalise
  state.data_migration_version = LEGACY_MIGRATION_VERSION;
  await saveState(state);
  console.log(`[Migration] Hoàn tất chuyển đổi lên v${LEGACY_MIGRATION_VERSION}.`);
}
