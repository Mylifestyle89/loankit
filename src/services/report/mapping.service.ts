/**
 * Mapping service — read, draft & publish mapping versions.
 *
 * Phase 6 transition: reads prefer MasterTemplate.{defaultMappingJson,
 * defaultAliasJson}. MappingInstance + FS remain as fallback while the
 * cascade is in progress; saveMappingDraft dual-writes to keep both in sync.
 */
import { NotFoundError, ValidationError } from "@/core/errors/app-error";
import { docxEngine } from "@/lib/docx-engine";
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

import { ensureMasterInstanceMigration, resolveMappingSource } from "./_migration-internals";

const isEmptyJson = (s: string | null | undefined): boolean =>
  !s || s.trim() === "" || s.trim() === "{}";

// ---------------------------------------------------------------------------
// Mapping Service
// ---------------------------------------------------------------------------

export const mappingService = {
  async getMapping(params?: { mappingInstanceId?: string }) {
    const state = await loadState();
    const source = await resolveMappingSource(params?.mappingInstanceId);

    // Phase 6: master-first reads. Empty master rows fall through to instance / FS.
    let masterMapping: string | null = null;
    let masterAlias: string | null = null;
    if (source.mode === "instance" && params?.mappingInstanceId) {
      const instance = await prisma.mappingInstance.findUnique({
        where: { id: params.mappingInstanceId },
        select: { masterId: true },
      });
      if (instance?.masterId) {
        const master = await prisma.masterTemplate.findUnique({
          where: { id: instance.masterId },
          select: { defaultMappingJson: true, defaultAliasJson: true },
        });
        if (master) {
          if (!isEmptyJson(master.defaultMappingJson)) masterMapping = master.defaultMappingJson;
          if (!isEmptyJson(master.defaultAliasJson)) masterAlias = master.defaultAliasJson;
        }
      }
    }

    const mapping = masterMapping
      ? parseMappingJson(masterMapping)
      : source.mode === "instance" && source.mappingJson
        ? parseMappingJson(source.mappingJson)
        : await readMappingFile(source.mappingPath);
    const aliasMap = masterAlias
      ? parseAliasJson(masterAlias)
      : source.mode === "instance" && source.aliasJson
        ? parseAliasJson(source.aliasJson)
        : await readAliasFile(source.aliasPath);

    return {
      active_version_id: source.mode === "legacy" ? source.versionId : source.instanceId,
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
    mappingInstanceId?: string;
  }) {
    const mapping = mappingMasterSchema.parse(input.mapping);
    const aliasMap = aliasMapSchema.parse(input.aliasMap);
    const fieldCatalog = Array.isArray(input.fieldCatalog)
      ? input.fieldCatalog.map((item) => fieldCatalogItemSchema.parse(item))
      : undefined;
    if (input.mappingInstanceId) {
      await ensureMasterInstanceMigration();
      const instance = await prisma.mappingInstance.findUnique({
        where: { id: input.mappingInstanceId },
      });
      if (!instance) throw new NotFoundError("Mapping instance not found.");

      const mappingJsonStr = JSON.stringify(mapping);
      const aliasJsonStr = JSON.stringify(aliasMap);

      // Write to filesystem (best-effort — skipped on Vercel read-only FS)
      try {
        await Promise.all([
          docxEngine.writeJson(instance.mappingJsonPath, mapping),
          docxEngine.writeJson(instance.aliasJsonPath, aliasMap),
        ]);
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== "EROFS" && code !== "EPERM" && code !== "ENOENT") throw err;
      }

      // Always store JSON in DB columns (works on Vercel)
      const dbUpdateData: Record<string, string> = {
        mappingJson: mappingJsonStr,
        aliasJson: aliasJsonStr,
      };
      if (fieldCatalog) {
        const serializedCatalog = JSON.stringify(fieldCatalog);
        dbUpdateData.fieldCatalogJson = serializedCatalog;
      }

      // Phase 6: dual-write — keep MasterTemplate canonical and MappingInstance in
      // sync until the cascade drops the instance table.
      await prisma.$transaction(async (tx) => {
        if (instance.masterId) {
          await tx.masterTemplate.update({
            where: { id: instance.masterId },
            data: {
              defaultMappingJson: mappingJsonStr,
              defaultAliasJson: aliasJsonStr,
              ...(fieldCatalog ? { fieldCatalogJson: JSON.stringify(fieldCatalog) } : {}),
            },
          });
        }
        await tx.mappingInstance.update({
          where: { id: instance.id },
          data: dbUpdateData,
        });
      });

      return { version: { id: instance.id, status: "draft", created_at: instance.updatedAt.toISOString() }, activeVersionId: instance.id };
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
