/**
 * OCR-based field extraction pipeline.
 * Extracts text via OCR → scrubs PII → AI mapping → heuristic fallback.
 */

import { ValidationError, AiMappingTimeoutError } from "@/core/errors/app-error";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import { aiMappingService } from "@/services/ai-mapping.service";
import { ocrService } from "@/services/ocr.service";
import { securityService } from "@/services/security.service";

import {
  type FieldSuggestion,
  buildHeaderValueCandidates,
  extractByHeuristic,
} from "./extraction/extraction-text-helpers";
import { validateAndAdjustSuggestions } from "./extraction/extraction-value-validator";

export type OcrFieldSuggestion = FieldSuggestion & { source: "ocr_ai" };

type Input = {
  buffer: Buffer;
  mimeType: string;
  filename?: string;
  fieldCatalog: FieldCatalogItem[];
  timeoutMs?: number;
};

type Output = {
  suggestions: OcrFieldSuggestion[];
  meta: {
    provider: "tesseract" | "vision";
    extractedTextLength: number;
    masked: true;
  };
};

export async function extractFieldsFromOcr(input: Input): Promise<Output> {
  if (!Array.isArray(input.fieldCatalog) || input.fieldCatalog.length === 0) {
    throw new ValidationError("fieldCatalog is required.");
  }

  const timeoutMs = Math.max(5_000, input.timeoutMs ?? 30_000);
  let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutTimer = setTimeout(() => reject(new AiMappingTimeoutError("OCR extraction timed out.")), timeoutMs);
  });

  const ocrPromise = ocrService.extractTextFromBuffer({
    buffer: input.buffer,
    mimeType: input.mimeType,
    filename: input.filename,
  });

  let ocr: Awaited<ReturnType<typeof ocrService.extractTextFromBuffer>>;
  try {
    ocr = await Promise.race([ocrPromise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutTimer);
  }
  const scrubbed = securityService.scrubSensitiveData(ocr.text);
  const { headers, valueByHeader } = buildHeaderValueCandidates(scrubbed);

  let suggestions: OcrFieldSuggestion[] = [];
  if (headers.length > 0) {
    const mapped = await aiMappingService.suggestMapping(
      headers,
      input.fieldCatalog.map((f) => f.label_vi),
      { includeGrouping: false },
    );
    const fieldKeyByLabel = new Map(input.fieldCatalog.map((f) => [f.label_vi, f.field_key]));
    suggestions = Object.entries(mapped.mapping)
      .map(([fieldLabel, matchedHeader]) => {
        const fieldKey = fieldKeyByLabel.get(fieldLabel);
        const proposedValue = valueByHeader[matchedHeader];
        if (!fieldKey || !proposedValue) return null;
        return { fieldKey, proposedValue, confidenceScore: 0.8, source: "ocr_ai" as const };
      })
      .filter((item): item is OcrFieldSuggestion => Boolean(item));
  }

  if (suggestions.length === 0) {
    suggestions = extractByHeuristic(scrubbed, input.fieldCatalog, "ocr_ai", 0.7) as OcrFieldSuggestion[];
  }

  // Validate + adjust confidence
  const validated = validateAndAdjustSuggestions(suggestions, input.fieldCatalog) as OcrFieldSuggestion[];

  return {
    suggestions: validated,
    meta: {
      provider: ocr.provider,
      extractedTextLength: scrubbed.length,
      masked: true,
    },
  };
}
