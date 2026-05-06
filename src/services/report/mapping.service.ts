/**
 * Mapping service — read & save mapping/alias config.
 * MasterTemplate is canonical. Unscoped calls fall through to FS
 * active version (retires with fs-store.ts in Phase 6e).
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
  publishMappingVersion as fsPublishMappingVersion,
  readAliasFile,
  readMappingFile,
} from "@/lib/report/fs-store";

import { resolveMasterSourceById } from "./master-source";

// ---------------------------------------------------------------------------
// Mapping Service
// ---------------------------------------------------------------------------

export const mappingService = {
  async getMapping(params?: { masterTemplateId?: string }) {
    const state = await loadState();
    const masterId = params?.masterTemplateId ?? null;

    if (masterId) {
      const ms = await resolveMasterSourceById(masterId);
      return {
        active_version_id: ms.masterTemplateId,
        versions: state.mapping_versions,
        mapping: ms.mapping,
        alias_map: ms.aliasMap,
      };
    }

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
  }) {
    const mapping = mappingMasterSchema.parse(input.mapping);
    const aliasMap = aliasMapSchema.parse(input.aliasMap);
    const fieldCatalog = Array.isArray(input.fieldCatalog)
      ? input.fieldCatalog.map((item) => fieldCatalogItemSchema.parse(item))
      : undefined;

    const masterId = input.masterTemplateId ?? null;

    if (masterId) {
      const updated = await prisma.masterTemplate.update({
        where: { id: masterId },
        data: {
          defaultMappingJson: JSON.stringify(mapping),
          defaultAliasJson: JSON.stringify(aliasMap),
          ...(fieldCatalog ? { fieldCatalogJson: JSON.stringify(fieldCatalog) } : {}),
        },
        select: { id: true, updatedAt: true },
      });
      return {
        version: { id: updated.id, status: "draft", created_at: updated.updatedAt.toISOString() },
        activeVersionId: updated.id,
      };
    }

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
