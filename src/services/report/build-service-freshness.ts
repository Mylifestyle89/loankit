/**
 * Build freshness check — determines whether a cached build is stale.
 * Accepts a pre-resolved BuildSource to avoid duplicate resolution on the
 * export hot path; the public service wrapper resolves when only a scope is given.
 */
import { loadState } from "@/lib/report/fs-store";

import { type BuildFreshness } from "./_shared";
import {
  buildSourceId,
  resolveBuildSource,
  type BuildScope,
  type BuildSource,
} from "./build-source";
import { hasFlatDraftFile, readBuildMeta } from "./build-service-helpers";

export async function getBuildFreshnessFromSource(source: BuildSource): Promise<BuildFreshness> {
  const [state, buildMeta, hasFlatDraft] = await Promise.all([
    loadState(),
    readBuildMeta(),
    hasFlatDraftFile(),
  ]);
  const reasons: string[] = [];
  const sourceId = buildSourceId(source);

  if (!hasFlatDraft) reasons.push("FLAT_DRAFT_MISSING");
  if (!buildMeta) reasons.push("NO_BUILD_META");
  if (buildMeta) {
    if (buildMeta.mapping_source_mode !== source.mode) reasons.push("MAPPING_SOURCE_MODE_CHANGED");
    if (buildMeta.mapping_source_id !== sourceId) reasons.push("MAPPING_SOURCE_CHANGED");
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
    current_mapping_source_id: sourceId,
    current_mapping_updated_at: source.sourceUpdatedAt,
    last_build_at: buildMeta?.built_at,
  };
}

export async function getBuildFreshnessStatus(scope: BuildScope = {}): Promise<BuildFreshness> {
  const source = await resolveBuildSource(scope);
  return getBuildFreshnessFromSource(source);
}
