/**
 * Zod-based validation for extracted field values.
 * Checks values against their declared field types (number, date, percent, text, boolean).
 * Adjusts confidence scores based on validation results.
 */

import { z } from "zod";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { FieldSuggestion } from "./extraction-text-helpers";

// --- Validation result ---

export type ValidationResult = {
  valid: boolean;
  status: "valid" | "warning" | "invalid";
  normalizedValue?: string;
};

// --- Vietnamese number parsing ---

/** Strip VN thousand separators (dots), convert VN decimal comma to dot. */
function parseVietnameseNumber(raw: string): number | null {
  // Remove spaces and common suffixes
  let cleaned = raw.trim().replace(/\s+/g, "").replace(/(VNĐ|VND|đ|đồng)$/i, "").trim();
  // Handle VN format: "1.234.567,89" → "1234567.89"
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  }
  // Handle already-clean format: "1234567.89"
  const num = Number(cleaned.replace(/,/g, ""));
  return Number.isFinite(num) ? num : null;
}

// --- Date validation ---

/** Common VN date formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY-MM-DD */
const DATE_PATTERNS = [
  /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/,  // DD/MM/YYYY
  /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/,  // YYYY-MM-DD
];

function isValidDate(raw: string): boolean {
  const trimmed = raw.trim();
  for (const pattern of DATE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (!match) continue;
    let day: number, month: number, year: number;
    if (match[3] && match[3].length === 4) {
      // DD/MM/YYYY
      day = parseInt(match[1]);
      month = parseInt(match[2]);
      year = parseInt(match[3]);
    } else {
      // YYYY-MM-DD
      year = parseInt(match[1]);
      month = parseInt(match[2]);
      day = parseInt(match[3]);
    }
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) continue;
    // Basic month-day validation
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day <= daysInMonth) return true;
  }
  return false;
}

// --- Zod schemas per field type ---

const numberSchema = z.string().refine(
  (val) => parseVietnameseNumber(val) !== null,
  { message: "Not a valid number" },
);

const percentSchema = z.string().refine(
  (val) => {
    const cleaned = val.trim().replace(/%$/, "");
    return parseVietnameseNumber(cleaned) !== null;
  },
  { message: "Not a valid percent" },
);

const dateSchema = z.string().refine(
  (val) => isValidDate(val),
  { message: "Not a valid date" },
);

const textSchema = z.string().min(1).max(5000);

const BOOLEAN_TRUE = new Set(["có", "co", "đạt", "dat", "yes", "true", "1", "x"]);
const BOOLEAN_FALSE = new Set(["không", "khong", "không đạt", "khong dat", "no", "false", "0"]);
const booleanSchema = z.string().refine(
  (val) => {
    const lower = val.trim().toLowerCase();
    return BOOLEAN_TRUE.has(lower) || BOOLEAN_FALSE.has(lower);
  },
  { message: "Not a valid boolean" },
);

// --- Validator ---

const SCHEMA_MAP: Record<string, z.ZodType> = {
  number: numberSchema,
  percent: percentSchema,
  date: dateSchema,
  text: textSchema,
  boolean: booleanSchema,
};

/** Validate a single extracted value against its field type. */
export function validateExtractedValue(
  value: string,
  fieldType: FieldCatalogItem["type"],
): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false, status: "invalid" };

  // "table" type fields are always valid (they're repeater containers)
  if (fieldType === "table") return { valid: true, status: "valid" };

  const schema = SCHEMA_MAP[fieldType];
  if (!schema) return { valid: true, status: "valid" }; // unknown type → pass

  const result = schema.safeParse(trimmed);
  if (result.success) return { valid: true, status: "valid" };

  // For text type, most values are valid — only fail on truly empty
  if (fieldType === "text") return { valid: true, status: "warning" };

  return { valid: false, status: "warning" }; // warning, not invalid — AI may have unusual format
}

// --- Confidence adjustment ---

const CONFIDENCE_BOOST = 0.05;
const CONFIDENCE_PENALTY = 0.15;

/** Validate and adjust confidence for a list of suggestions. */
export function validateAndAdjustSuggestions(
  suggestions: FieldSuggestion[],
  fieldCatalog: FieldCatalogItem[],
): FieldSuggestion[] {
  const typeByKey = new Map(fieldCatalog.map((f) => [f.field_key, f.type]));

  return suggestions.map((suggestion) => {
    const fieldType = typeByKey.get(suggestion.fieldKey);
    if (!fieldType) return suggestion;

    const validation = validateExtractedValue(suggestion.proposedValue, fieldType);
    const adjustedConfidence = validation.status === "valid"
      ? Math.min(1, suggestion.confidenceScore + CONFIDENCE_BOOST)
      : Math.max(0, suggestion.confidenceScore - CONFIDENCE_PENALTY);

    return {
      ...suggestion,
      confidenceScore: adjustedConfidence,
      validationStatus: validation.status,
    };
  });
}
