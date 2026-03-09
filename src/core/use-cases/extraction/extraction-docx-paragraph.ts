/**
 * Adjacent paragraph extraction — matches field labels on line N
 * with values on line N+1 in DOCX paragraphs.
 */

import { securityService } from "@/services/security.service";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { DocxParagraph } from "@/services/auto-tagging.service";
import { scoreTokenOverlap, toTypedValue, type FieldSuggestion } from "./extraction-text-helpers";

const ADJACENT_PARA_THRESHOLD = 0.5;
const ADJACENT_PARA_CONFIDENCE = 0.65;
const MAX_LABEL_LENGTH = 120;
const MAX_VALUE_LENGTH = 500;

/** Extract fields by matching paragraph labels with next-paragraph values. */
export function extractFromAdjacentParagraphs(
  paragraphs: DocxParagraph[],
  scalarCatalog: FieldCatalogItem[],
  alreadyMatched: Set<string>,
): FieldSuggestion[] {
  const suggestions: FieldSuggestion[] = [];
  const matchedKeys = new Set<string>(alreadyMatched);

  for (let i = 0; i < paragraphs.length - 1; i++) {
    const paraText = paragraphs[i].text.trim();
    if (!paraText || paraText.length > MAX_LABEL_LENGTH) continue;
    // Skip lines that already have delimiters (handled by buildHeaderValueCandidates)
    if (/[:\u2013\-]/.test(paraText)) {
      const parts = paraText.split(/[:\u2013\-]/);
      if (parts.length >= 2 && parts[0].trim() && parts.slice(1).join("").trim()) continue;
    }

    let bestField: FieldCatalogItem | null = null;
    let bestScore = 0;
    for (const field of scalarCatalog) {
      if (matchedKeys.has(field.field_key)) continue;
      const score = scoreTokenOverlap(paraText, field.label_vi);
      if (score > bestScore && score >= ADJACENT_PARA_THRESHOLD) {
        bestScore = score;
        bestField = field;
      }
    }
    if (!bestField) continue;

    const nextText = paragraphs[i + 1].text.trim();
    if (!nextText || nextText.length > MAX_VALUE_LENGTH) continue;
    // Guard: if next paragraph also matches a field label, it's a label not a value
    let looksLikeLabel = false;
    for (const field of scalarCatalog) {
      if (scoreTokenOverlap(nextText, field.label_vi) >= ADJACENT_PARA_THRESHOLD) {
        looksLikeLabel = true;
        break;
      }
    }
    if (looksLikeLabel) continue;

    const typedValue = toTypedValue(nextText, bestField.type);
    const proposedValue =
      typedValue === null || typedValue === "" ? nextText : String(typedValue);
    // Don't mask numeric/financial fields
    const scrubbedValue = ["number", "percent"].includes(bestField.type)
      ? proposedValue
      : securityService.scrubSensitiveData(proposedValue);
    suggestions.push({
      fieldKey: bestField.field_key,
      proposedValue: scrubbedValue,
      confidenceScore: ADJACENT_PARA_CONFIDENCE,
      source: "docx_ai",
    });
    matchedKeys.add(bestField.field_key);
  }
  return suggestions;
}
