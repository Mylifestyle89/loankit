/**
 * KHCN Template Validation Engine — cross-checks 3 coupled layers:
 * 1. Template Registry (DOCX file paths, categories, methods)
 * 2. Placeholder Registry (field names, groups, loops)
 * 3. DOCX tag scan results (actual tags inside template files)
 *
 * Reports mismatches with actionable messages. Run at dev startup (warning)
 * and build time (error blocks deploy).
 */
import { KHCN_TEMPLATES, DOC_CATEGORY_LABELS } from "@/lib/loan-plan/khcn-template-registry";
import { KHCN_PLACEHOLDER_GROUPS } from "./khcn-placeholder-registry";
import { scanAllKhcnTemplates, normalizeIndexedTag } from "./khcn-docx-tag-scanner";

// ── Types ──

export type ValidationIssue = {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  file?: string;
  field?: string;
};

export type ValidationReport = {
  issues: ValidationIssue[];
  stats: {
    templatesChecked: number;
    tagsScanned: number;
    placeholdersRegistered: number;
    errors: number;
    warnings: number;
    infos: number;
  };
};

// ── Constants ──

const VALID_METHODS = new Set(["tung_lan", "han_muc", "trung_dai", "tieu_dung"]);
const VALID_CATEGORIES = new Set(Object.keys(DOC_CATEGORY_LABELS));

/** Tags that are docxtemplater internal or dynamic — skip validation */
const IGNORED_TAG_PATTERNS = [
  /^#/, /^\//, // loop open/close (handled separately)
  /^\.$/,      // docxtemplater current item reference
];

// ── Helpers ──

/** Build set of all registered placeholder keys from KHCN_PLACEHOLDER_GROUPS */
function getRegistryKeys(): Set<string> {
  const keys = new Set<string>();
  for (const group of KHCN_PLACEHOLDER_GROUPS) {
    for (const item of group.items) {
      keys.add(item);
    }
  }
  return keys;
}

/** Build set of all registered loop names */
function getRegistryLoops(): Set<string> {
  const loops = new Set<string>();
  for (const group of KHCN_PLACEHOLDER_GROUPS) {
    if (!group.loop) continue;
    // Some groups declare multiple loops: "PA_CHIPHI, PA_DOANHTHU"
    for (const loopName of group.loop.split(",").map((s) => s.trim())) {
      loops.add(loopName);
    }
  }
  return loops;
}

/** Check if a tag should be ignored during validation */
function shouldIgnoreTag(tag: string): boolean {
  if (IGNORED_TAG_PATTERNS.some((p) => p.test(tag))) return true;
  // Loop item references like "STT", "Khách hàng thụ hưởng" inside [#UNC]...[/UNC]
  // These are relative field names — they'll match when prefixed with loop name
  return false;
}

// ── Main Validator ──

export function validateKhcnTemplates(): ValidationReport {
  const issues: ValidationIssue[] = [];
  const registryKeys = getRegistryKeys();
  const registryLoops = getRegistryLoops();

  // Step 1: Validate template registry entries
  const seenPaths = new Set<string>();
  for (const tpl of KHCN_TEMPLATES) {
    // Check duplicate paths
    if (seenPaths.has(tpl.path)) {
      issues.push({ severity: "warning", code: "DUPLICATE_PATH", message: `Duplicate template path`, file: tpl.path });
    }
    seenPaths.add(tpl.path);

    // Check category validity
    if (!VALID_CATEGORIES.has(tpl.category)) {
      issues.push({ severity: "error", code: "INVALID_CATEGORY", message: `Unknown category "${tpl.category}"`, file: tpl.path });
    }

    // Check method validity
    for (const method of tpl.methods) {
      if (!VALID_METHODS.has(method)) {
        issues.push({ severity: "error", code: "INVALID_METHOD", message: `Unknown method "${method}"`, file: tpl.path });
      }
    }
  }

  // Step 2: Scan all DOCX files and check existence
  const scanResults = scanAllKhcnTemplates(KHCN_TEMPLATES);
  let totalTagsScanned = 0;
  const allDocxTags = new Set<string>();
  const allDocxLoops = new Set<string>();

  for (const [filePath, result] of scanResults) {
    // File-level errors (missing file, corrupt DOCX)
    for (const err of result.errors) {
      issues.push({ severity: "error", code: "MISSING_FILE", message: err, file: filePath });
    }

    for (const tag of result.tags) {
      totalTagsScanned++;
      const normalized = normalizeIndexedTag(tag);
      allDocxTags.add(normalized);

      // Check if tag exists in placeholder registry
      if (!shouldIgnoreTag(tag) && !registryKeys.has(normalized)) {
        // Check if it's a loop-internal field (e.g., "STT" inside [#UNC])
        // These short names often match when prefixed — skip warning for known loop fields
        const isLoopField = KHCN_PLACEHOLDER_GROUPS.some((g) =>
          g.loop && g.items.some((item) => {
            const shortName = item.includes(".") ? item.split(".").slice(1).join(".") : item;
            return shortName === normalized || item === normalized;
          }),
        );
        if (!isLoopField) {
          issues.push({ severity: "warning", code: "ORPHAN_DOCX_TAG", message: `Tag [${tag}] in DOCX not found in placeholder registry`, file: filePath, field: tag });
        }
      }
    }

    // Collect loop names from DOCX
    for (const loop of result.loopOpens) allDocxLoops.add(loop);
  }

  // Step 3: Check loop consistency
  for (const registryLoop of registryLoops) {
    if (!allDocxLoops.has(registryLoop)) {
      issues.push({ severity: "info", code: "LOOP_UNUSED", message: `Registry declares loop "${registryLoop}" but no DOCX uses [#${registryLoop}]`, field: registryLoop });
    }
  }

  // Sort: errors first, then warnings, then info
  const severityOrder = { error: 0, warning: 1, info: 2 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    issues,
    stats: {
      templatesChecked: scanResults.size,
      tagsScanned: totalTagsScanned,
      placeholdersRegistered: registryKeys.size,
      errors: issues.filter((i) => i.severity === "error").length,
      warnings: issues.filter((i) => i.severity === "warning").length,
      infos: issues.filter((i) => i.severity === "info").length,
    },
  };
}
