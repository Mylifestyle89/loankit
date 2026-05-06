/**
 * Build freshness check — determines whether a cached build is stale.
 *
 * Phase 6: scope is master-template-aware. Caller passes `loanId` (preferred)
 * or legacy `mappingInstanceId` (translated internally). Without a scope the
 * legacy FS-backed active mapping version drives freshness.
 */
import { loadState } from "@/lib/report/fs-store";

import { type BuildFreshness } from "./_shared";
import { resolveBuildSource, type BuildScope } from "./build-source";
import { hasFlatDraftFile, readBuildMeta } from "./build-service-helpers";

export async function getBuildFreshnessStatus(scope: BuildScope = {}): Promise<BuildFreshness> {
  const [state, source, buildMeta, hasFlatDraft] = await Promise.all([
    loadState(),
    resolveBuildSource(scope),
    readBuildMeta(),
    hasFlatDraftFile(),
  ]);
  const reasons: string[] = [];

  if (!hasFlatDraft) reasons.push("FLAT_DRAFT_MISSING");
  if (!buildMeta) reasons.push("NO_BUILD_META");
  if (buildMeta) {
    if (buildMeta.mapping_source_mode !== source.mode) reasons.push("MAPPING_SOURCE_MODE_CHANGED");
    if (buildMeta.mapping_source_id !== source.sourceId) reasons.push("MAPPING_SOURCE_CHANGED");
    if (buildMeta.mapping_source_updated_at !== source.sourceUpdatedAt) reasons.push("MAPPING_UPDATED");
    if ((buildMeta.template_profile_id || "unknown") !== (state.active_template_id || "unknown")) {
      reasons.push("TEMPLATE_CHANGED");
    }
    const builtAtMs = Date.parse(buildMeta.built_at);
    const mappingUpdatedMs = Date.parse(source.sourceUpdatedAt);
    if (Number.isFinite(builtAtMs) && Number.isFinite(mappingUpdatedMs) && builtAtMs < mappingUpdatedMs) {
      reasons.push("MAPPING_NEWER_THAN_BUILD");
    }
  }

  return {
    is_stale: reasons.length > 0,
    reasons,
    has_flat_draft: hasFlatDraft,
    current_mapping_source_mode: source.mode,
    current_mapping_source_id: source.sourceId,
    current_mapping_updated_at: source.sourceUpdatedAt,
    last_build_at: buildMeta?.built_at,
  };
}
