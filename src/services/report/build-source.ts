/**
 * build-source.ts — unified scope resolver for build/export/validate flow.
 * Returns DB-backed master source when caller supplies loanId;
 * falls back to FS active mapping version when unscoped.
 */
import { docxEngine } from "@/lib/docx-engine";
import type { AliasMap } from "@/lib/report/config-schema";
import { getActiveMappingVersion, loadState } from "@/lib/report/fs-store";

import { resolveMasterSourceByLoan } from "./master-source";

export type BuildSource =
  | {
      mode: "master";
      masterTemplateId: string;
      loanId: string | null;
      aliasMap: AliasMap;
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
};

/** Source ID for freshness/build-meta — masterTemplateId for master, versionId for legacy. */
export function buildSourceId(source: BuildSource): string {
  return source.mode === "master" ? source.masterTemplateId : source.sourceId;
}

export async function resolveBuildSource(scope: BuildScope = {}): Promise<BuildSource> {
  const loanId = scope.loanId ?? null;
  if (loanId) {
    const ms = await resolveMasterSourceByLoan(loanId);
    return {
      mode: "master",
      masterTemplateId: ms.masterTemplateId,
      loanId: ms.loanId,
      aliasMap: ms.aliasMap,
      sourceUpdatedAt: ms.mappingUpdatedAt,
    };
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
