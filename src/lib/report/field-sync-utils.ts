import type { FieldCatalogItem } from "./config-schema";

/** Result of computing how many fields have values filled in */
export type FieldCoverageResult = {
  total: number;
  filled: number;
  empty: number;
  coveragePercent: number;
  /** field_keys that have no value */
  emptyKeys: string[];
};

/**
 * Compute field coverage: how many fields in the catalog have non-empty values.
 * Used by both Mapping page (status bar) and Template page (build tab).
 */
export function computeFieldCoverage(
  catalog: FieldCatalogItem[],
  values: Record<string, unknown>,
): FieldCoverageResult {
  const emptyKeys: string[] = [];
  let filled = 0;

  for (const field of catalog) {
    const val = values[field.field_key];
    if (isValueFilled(val)) {
      filled++;
    } else {
      emptyKeys.push(field.field_key);
    }
  }

  const total = catalog.length;
  const empty = total - filled;
  const coveragePercent = total > 0 ? Math.round((filled / total) * 100) : 0;

  return { total, filled, empty, coveragePercent, emptyKeys };
}

/** Validated field entry for template field validation panel */
export type ValidatedField = {
  fieldKey: string;
  label: string;
  status: "with-data" | "no-data" | "unknown";
};

/** Result of validating template placeholders against field catalog + values */
export type TemplateFieldValidation = {
  withData: ValidatedField[];
  noData: ValidatedField[];
  unknown: ValidatedField[];
};

/**
 * Validate template placeholders against field catalog and effective values.
 * Classifies each placeholder as: has data, missing data, or unknown (not in catalog).
 */
export function validateTemplateFields(
  placeholders: string[],
  catalog: FieldCatalogItem[],
  values: Record<string, unknown>,
): TemplateFieldValidation {
  const catalogMap = new Map(catalog.map((f) => [f.field_key, f]));
  const withData: ValidatedField[] = [];
  const noData: ValidatedField[] = [];
  const unknown: ValidatedField[] = [];

  // Deduplicate placeholders
  const seen = new Set<string>();
  for (const ph of placeholders) {
    if (seen.has(ph)) continue;
    seen.add(ph);

    // Skip loop control placeholders like #items, /items
    if (ph.startsWith("#") || ph.startsWith("/")) continue;

    const field = catalogMap.get(ph);
    if (!field) {
      unknown.push({ fieldKey: ph, label: ph, status: "unknown" });
      continue;
    }

    if (isValueFilled(values[ph])) {
      withData.push({ fieldKey: ph, label: field.label_vi, status: "with-data" });
    } else {
      noData.push({ fieldKey: ph, label: field.label_vi, status: "no-data" });
    }
  }

  return { withData, noData, unknown };
}

/**
 * Extract placeholder keys from DOCX template content string.
 * Matches [field_key] patterns (square bracket delimiters used by Docxtemplater).
 */
export function extractPlaceholderKeys(templateContent: string): string[] {
  const matches = templateContent.matchAll(/\[([^\[\]]+)\]/g);
  return Array.from(matches, (m) => m[1]);
}

/** Check if a field value is considered "filled" (non-empty) */
function isValueFilled(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === "string") return val.trim() !== "";
  if (typeof val === "number" || typeof val === "boolean") return true;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "object") return Object.keys(val as Record<string, unknown>).length > 0;
  return false;
}
