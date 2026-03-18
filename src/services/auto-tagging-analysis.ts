import { ValidationError } from "@/core/errors/app-error";
import {
  buildSemanticCandidates,
  selectTopSuggestions,
} from "@/core/use-cases/reverse-template-matcher";
import { reverseTagSuggestionSchema } from "@/lib/report/config-schema";

import {
  callAI,
  sanitizeSuggestions,
  buildAutoTagPrompt,
  extractJsonObject,
  fuzzyFallback,
} from "./auto-tagging-ai-helpers";
import { extractParagraphs } from "./auto-tagging-docx-parser";
import type { DocxParagraph, TagSuggestion, ReverseSuggestionResult } from "./auto-tagging-types";

// ---------------------------------------------------------------------------
// Public: analyze document
// ---------------------------------------------------------------------------

export async function analyzeDocument(
  docxBuffer: Buffer,
  excelHeaders: string[],
  fieldLabels?: Record<string, string>,
): Promise<{ paragraphs: DocxParagraph[]; suggestions: TagSuggestion[] }> {
  if (excelHeaders.length === 0) throw new ValidationError("Excel headers không được rỗng.");
  const paragraphs = await extractParagraphs(docxBuffer);
  if (paragraphs.length === 0) throw new ValidationError("File DOCX không chứa nội dung text nào.");

  const uniqueHeaders = [...new Set(excelHeaders.map((h) => h.trim()).filter(Boolean))];
  const headerSet = new Set(uniqueHeaders);
  const prompt = buildAutoTagPrompt(paragraphs, uniqueHeaders, fieldLabels);

  let suggestions: TagSuggestion[];
  try {
    const responseText = await callAI(prompt);
    if (!responseText) throw new ValidationError("AI trả về rỗng.");
    const json = extractJsonObject(responseText);
    suggestions = sanitizeSuggestions(json, headerSet, paragraphs);
  } catch (error) {
    if (error instanceof ValidationError && error.message.includes("configured")) throw error;
    suggestions = fuzzyFallback(paragraphs, uniqueHeaders);
  }

  suggestions.sort((a, b) => b.confidence - a.confidence);
  return { paragraphs, suggestions };
}

export async function reverseEngineerTemplate(params: {
  docxBuffer: Buffer;
  excelRows: Array<Record<string, unknown>>;
  threshold?: number;
}): Promise<ReverseSuggestionResult> {
  if (!Array.isArray(params.excelRows) || params.excelRows.length === 0) {
    throw new ValidationError("excelRows is required and must not be empty.");
  }
  const paragraphs = await extractParagraphs(params.docxBuffer);
  if (paragraphs.length === 0) {
    throw new ValidationError("File DOCX không chứa nội dung text nào.");
  }
  const threshold = typeof params.threshold === "number" ? Math.max(0, Math.min(1, params.threshold)) : 0.55;
  const candidates = buildSemanticCandidates({
    excelRows: params.excelRows,
    paragraphs: paragraphs.map((p) => ({ index: p.index, text: p.text })),
  });
  const suggestions = selectTopSuggestions(candidates, threshold).map((item) =>
    reverseTagSuggestionSchema.parse(item),
  );
  return {
    suggestions,
    meta: {
      threshold,
      totalCandidates: candidates.length,
      accepted: suggestions.length,
    },
  };
}
