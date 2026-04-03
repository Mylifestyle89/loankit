/**
 * Shared text processing utilities for document extraction pipelines.
 * Used by both DOCX and OCR extractors to avoid duplication.
 */

import type { FieldCatalogItem } from "@/lib/report/config-schema";

// --- Suggestion types (shared across all extractors) ---

export type ExtractionSource = "ocr_ai" | "docx_ai";

export type FieldSuggestion = {
  fieldKey: string;
  proposedValue: string;
  confidenceScore: number;
  source: ExtractionSource;
  validationStatus?: "valid" | "warning" | "invalid";
};

import {
  normalizeText,
  tokenize,
  scoreTokenOverlap,
  decodeXmlText,
} from "@/lib/text/normalize";

export {
  normalizeText,
  tokenize,
  scoreTokenOverlap,
  decodeXmlText,
};

// --- Line-based extraction ---

/** Search for a label in text lines and return the value after delimiter (: or -). */
export function lineValueAfterLabel(label: string, lines: string[]): string | undefined {
  const normalizedLabel = normalizeText(label);
  for (const line of lines) {
    const raw = line.trim();
    if (!raw) continue;
    const normalized = normalizeText(raw);
    if (!normalized || !normalized.includes(normalizedLabel)) continue;
    const split = raw.split(/[:\-]/);
    if (split.length < 2) continue;
    const value = split.slice(1).join(":").trim();
    if (value) return value;
  }
  return undefined;
}

/** Parse "header: value" candidates from text lines. */
export function buildHeaderValueCandidates(text: string): {
  headers: string[];
  valueByHeader: Record<string, string>;
} {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const headers: string[] = [];
  const valueByHeader: Record<string, string> = {};

  for (const line of lines) {
    const split = line.split(/[:\-]/);
    if (split.length < 2) continue;
    const header = split[0].trim();
    const value = split.slice(1).join(":").trim();
    if (!header || !value) continue;
    headers.push(header);
    valueByHeader[header] = value;
  }

  return { headers: [...new Set(headers)], valueByHeader };
}

/** Heuristic fallback: match field labels against text lines. */
export function extractByHeuristic<S extends ExtractionSource>(
  text: string,
  fieldCatalog: FieldCatalogItem[],
  source: S,
  confidence: number,
): FieldSuggestion[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const suggestions: FieldSuggestion[] = [];

  for (const field of fieldCatalog) {
    const proposed = lineValueAfterLabel(field.label_vi, lines);
    if (!proposed) continue;
    suggestions.push({
      fieldKey: field.field_key,
      proposedValue: proposed,
      confidenceScore: confidence,
      source,
    });
  }
  return suggestions;
}

// --- Value conversion ---

/** Convert raw string to typed value based on field type. */
export function toTypedValue(
  raw: string,
  fieldType: FieldCatalogItem["type"],
): string | number | boolean | null {
  const value = raw.trim();
  if (!value) return "";
  if (fieldType === "number" || fieldType === "percent") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : value;
  }
  if (fieldType === "date") return value;
  return value;
}

/** Deduplicate suggestions by field_key, keeping highest confidence. */
export function dedupeByField(suggestions: FieldSuggestion[]): FieldSuggestion[] {
  const byField = new Map<string, FieldSuggestion>();
  for (const item of suggestions) {
    const existing = byField.get(item.fieldKey);
    if (!existing || item.confidenceScore > existing.confidenceScore) {
      byField.set(item.fieldKey, item);
    }
  }
  return [...byField.values()];
}
