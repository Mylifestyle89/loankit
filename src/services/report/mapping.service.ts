/**
 * Mapping service — read & save mapping/alias config.
 *
 * Phase 6: MasterTemplate is the canonical store. Reads/writes target
 * `defaultMappingJson` + `defaultAliasJson`. Legacy `mappingInstanceId`
 * is translated to `masterTemplateId` at the boundary (back-compat for
 * the mapping page UI until Commit 3 swaps it). Unscoped calls fall
 * through to the legacy FS active-version path; that path retires
 * with `fs-store.ts` in Phase 6e.
 */
import { NotFoundError, ValidationError } from "@/core/errors/app-error";
import { prisma } from "@/lib/prisma";
import {
  fieldCatalogItemSchema,
  mappingMasterSchema,
  aliasMapSchema,
} from "@/lib/report/config-schema";
import {
  createMappingDraft,
  loadState,
  parseAliasJson,
  parseMappingJson,
  publishMappingVersion as fsPublishMappingVersion,
  readAliasFile,
  readMappingFile,
} from "@/lib/report/fs-store";

import { masterAndLoanFromMappingInstance } from "./master-source";

async function resolveMasterIdFromScope(scope: {
  masterTemplateId?: string;
  mappingInstanceId?: string;
}): Promise<string | null> {
  if (scope.masterTemplateId) return scope.masterTemplateId;
  if (scope.mappingInstanceId) {
    const t = await masterAndLoanFromMappingInstance(scope.mappingInstanceId);
    return t.masterTemplateId;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Mapping Service
// ---------------------------------------------------------------------------

export const mappingService = {
  async getMapping(params?: { masterTemplateId?: string; mappingInstanceId?: string }) {
    const state = await loadState();
    const masterId = await resolveMasterIdFromScope(params ?? {});

    if (masterId) {
      const master = await prisma.masterTemplate.findUnique({
        where: { id: masterId },
        select: { id: true, defaultMappingJson: true, defaultAliasJson: true },
      });
      if (master) {
        const mapping = parseMappingJson(master.defaultMappingJson);
        const aliasMap = parseAliasJson(master.defaultAliasJson);
        return {
          active_version_id: master.id,
          versions: state.mapping_versions,
          mapping,
          alias_map: aliasMap,
        };
      }
    }

    // Legacy FS path — global active version (no per-customer scope).
    const activeVersion = state.mapping_versions.find((v) => v.id === state.active_mapping_version_id)
      ?? state.mapping_versions[0];
    if (!activeVersion) {
      throw new NotFoundError("No active mapping version available.");
    }
    const mapping = await readMappingFile(activeVersion.mapping_json_path);
    const aliasMap = await readAliasFile(activeVersion.alias_json_path);
    return {
      active_version_id: activeVersion.id,
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
    masterTemplateId?: string;
    mappingInstanceId?: string;
  }) {
    const mapping = mappingMasterSchema.parse(input.mapping);
    const aliasMap = aliasMapSchema.parse(input.aliasMap);
    const fieldCatalog = Array.isArray(input.fieldCatalog)
      ? input.fieldCatalog.map((item) => fieldCatalogItemSchema.parse(item))
      : undefined;

    const masterId = await resolveMasterIdFromScope({
      masterTemplateId: input.masterTemplateId,
      mappingInstanceId: input.mappingInstanceId,
    });

    if (masterId) {
      const mappingJsonStr = JSON.stringify(mapping);
      const aliasJsonStr = JSON.stringify(aliasMap);
      const updated = await prisma.masterTemplate.update({
        where: { id: masterId },
        data: {
          defaultMappingJson: mappingJsonStr,
          defaultAliasJson: aliasJsonStr,
          ...(fieldCatalog ? { fieldCatalogJson: JSON.stringify(fieldCatalog) } : {}),
        },
        select: { id: true, updatedAt: true },
      });
      return {
        version: { id: updated.id, status: "draft", created_at: updated.updatedAt.toISOString() },
        activeVersionId: updated.id,
      };
    }

    if (input.mappingInstanceId) {
      // Boundary translator returned null masterId — surface clearly so the
      // UI prompts the operator to relink the instance.
      throw new ValidationError(
        "Mapping instance is not linked to a master template. Run the backfill or relink before saving.",
      );
    }

    // Legacy FS draft (no scope provided).
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
    const state = await fsPublishMappingVersion(versionId);
    return {
      active_version_id: state.active_mapping_version_id,
      versions: state.mapping_versions,
    };
  },
};
