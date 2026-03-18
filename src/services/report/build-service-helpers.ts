/**
 * Internal helpers for the build service — FS utilities, meta read/write, slug conversion.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { removeVietnameseTones } from "@/app/report/mapping/helpers";
import { docxEngine } from "@/lib/docx-engine";
import { REPORT_BUILD_META_FILE } from "@/lib/report/constants";

import { type BuildMeta, type MappingSource } from "./_shared";

// ---------------------------------------------------------------------------
// FS helpers
// ---------------------------------------------------------------------------

export function isReadOnlyFsError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException).code;
  return code === "EROFS" || code === "EPERM" || code === "ENOENT";
}

export async function readBuildMeta(): Promise<BuildMeta | null> {
  try {
    const raw = await fs.readFile(REPORT_BUILD_META_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<BuildMeta>;
    if (
      typeof parsed.built_at === "string" &&
      (parsed.mapping_source_mode === "instance" || parsed.mapping_source_mode === "legacy") &&
      typeof parsed.mapping_source_id === "string" &&
      typeof parsed.mapping_source_updated_at === "string" &&
      typeof parsed.template_profile_id === "string"
    ) {
      return parsed as BuildMeta;
    }
    return null;
  } catch {
    return null;
  }
}

export async function writeBuildMeta(params: {
  source: MappingSource;
  templateProfileId: string;
}): Promise<BuildMeta> {
  const next: BuildMeta = {
    built_at: new Date().toISOString(),
    mapping_source_mode: params.source.mode,
    mapping_source_id: params.source.mode === "instance" ? params.source.instanceId : params.source.versionId,
    mapping_source_updated_at: params.source.mappingUpdatedAt,
    template_profile_id: params.templateProfileId,
  };
  try {
    await fs.writeFile(REPORT_BUILD_META_FILE, JSON.stringify(next, null, 2), "utf-8");
  } catch (err) {
    if (!isReadOnlyFsError(err)) throw err;
  }
  return next;
}

/** Write JSON via docxEngine, silently skip on Vercel read-only FS. */
export async function safeWriteJson(relPath: string, data: unknown): Promise<void> {
  try {
    await docxEngine.writeJson(relPath, data);
  } catch (err) {
    if (!isReadOnlyFsError(err)) throw err;
  }
}

export async function hasFlatDraftFile(): Promise<boolean> {
  try {
    await fs.access(path.join(process.cwd(), "report_assets", "generated", "report_draft_flat.json"));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// String utilities
// ---------------------------------------------------------------------------

/**
 * Convert a Vietnamese string to an ASCII-safe slug: "Ban lãnh đạo" → "Ban_lanh_dao"
 * Reuses removeVietnameseTones from helpers to avoid duplicating diacritics logic.
 */
export function slugifyVi(text: string): string {
  return removeVietnameseTones(text)
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
