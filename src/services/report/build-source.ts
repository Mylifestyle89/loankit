/**
 * build-source.ts — unified scope resolver for the build/export/validate flow.
 *
 * Phase 6 transition: prefers master-template-scoped data (DB) when caller
 * passes `loanId` directly or via translated `mappingInstanceId`. Falls back
 * to the legacy FS-based active mapping version when no scope is supplied
 * (the global "Template" page still drives builds without per-loan scope —
 * that path retires together with `fs-store.ts` in Phase 6e).
 */
import { docxEngine } from "@/lib/docx-engine";
import type { AliasMap } from "@/lib/report/config-schema";
import { getActiveMappingVersion, loadState } from "@/lib/report/fs-store";

import { loanIdFromMappingInstance, resolveMasterSourceByLoan } from "./master-source";

export type BuildSource =
  | {
      mode: "master";
      masterTemplateId: string;
      loanId: string | null;
      aliasMap: AliasMap;
      sourceId: string;
      sourceUpdatedAt: string;
    }
  | {
      mode: "legacy";
      mappingPath: string;
      aliasPath: string;
      sourceId: string;
      sourceUpdatedAt: string;
    };

export type BuildScope = {
  loanId?: string | null;
  mappingInstanceId?: string | null;
};

export async function resolveBuildSource(scope: BuildScope = {}): Promise<BuildSource> {
  if (scope.loanId) {
    const ms = await resolveMasterSourceByLoan(scope.loanId);
    return {
      mode: "master",
      masterTemplateId: ms.masterTemplateId,
      loanId: ms.loanId,
      aliasMap: ms.aliasMap,
      sourceId: ms.masterTemplateId,
      sourceUpdatedAt: ms.mappingUpdatedAt,
    };
  }
  if (scope.mappingInstanceId) {
    const loanId = await loanIdFromMappingInstance(scope.mappingInstanceId);
    if (loanId) {
      const ms = await resolveMasterSourceByLoan(loanId);
      return {
        mode: "master",
        masterTemplateId: ms.masterTemplateId,
        loanId: ms.loanId,
        aliasMap: ms.aliasMap,
        sourceId: ms.masterTemplateId,
        sourceUpdatedAt: ms.mappingUpdatedAt,
      };
    }
    // Orphan instance (no linked loan) — fall through to legacy.
  }
  const state = await loadState();
  const v = await getActiveMappingVersion(state);
  return {
    mode: "legacy",
    mappingPath: v.mapping_json_path,
    aliasPath: v.alias_json_path,
    sourceId: v.id,
    sourceUpdatedAt: v.created_at,
  };
}

/** Load the alias map regardless of source mode — DB read for master, FS read for legacy. */
export async function loadAliasMapFromBuildSource(
  source: BuildSource,
): Promise<Record<string, unknown>> {
  if (source.mode === "master") return source.aliasMap as unknown as Record<string, unknown>;
  return await docxEngine.readJson<Record<string, unknown>>(source.aliasPath);
}

export function loanIdFromBuildSource(source: BuildSource): string | null {
  return source.mode === "master" ? source.loanId : null;
}
