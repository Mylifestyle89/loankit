import { ValidationError, AiMappingTimeoutError } from "@/core/errors/app-error";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import { aiMappingService } from "@/services/ai-mapping.service";
import { ocrService } from "@/services/ocr.service";
import { securityService } from "@/services/security.service";

export type OcrFieldSuggestion = {
  fieldKey: string;
  proposedValue: string;
  confidenceScore: number;
  source: "ocr_ai";
};

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

function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function lineValueAfterLabel(label: string, lines: string[]): string | undefined {
  const normalizedLabel = normalizeText(label);
  for (const line of lines) {
    const raw = line.trim();
    if (!raw) continue;
    const norm = normalizeText(raw);
    if (!norm) continue;
    if (norm.includes(normalizedLabel)) {
      const split = raw.split(/[:\-]/);
      if (split.length > 1) {
        const value = split.slice(1).join(":").trim();
        if (value) return value;
      }
    }
  }
  return undefined;
}

function extractByHeuristic(text: string, fieldCatalog: FieldCatalogItem[]): OcrFieldSuggestion[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const suggestions: OcrFieldSuggestion[] = [];

  for (const field of fieldCatalog) {
    const proposed = lineValueAfterLabel(field.label_vi, lines);
    if (!proposed) continue;
    suggestions.push({
      fieldKey: field.field_key,
      proposedValue: proposed,
      confidenceScore: 0.7,
      source: "ocr_ai",
    });
  }
  return suggestions;
}

function buildHeaderValueCandidates(text: string): { headers: string[]; valueByHeader: Record<string, string> } {
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

export async function extractFieldsFromOcr(input: Input): Promise<Output> {
  if (!Array.isArray(input.fieldCatalog) || input.fieldCatalog.length === 0) {
    throw new ValidationError("fieldCatalog is required.");
  }

  const timeoutMs = Math.max(5_000, input.timeoutMs ?? 30_000);
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      clearTimeout(timer);
      reject(new AiMappingTimeoutError("OCR extraction timed out."));
    }, timeoutMs);
  });

  const ocrPromise = ocrService.extractTextFromBuffer({
    buffer: input.buffer,
    mimeType: input.mimeType,
    filename: input.filename,
  });

  const ocr = await Promise.race([ocrPromise, timeoutPromise]);
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
        return {
          fieldKey,
          proposedValue,
          confidenceScore: 0.8,
          source: "ocr_ai" as const,
        };
      })
      .filter((item): item is OcrFieldSuggestion => Boolean(item));
  }

  if (suggestions.length === 0) {
    suggestions = extractByHeuristic(scrubbed, input.fieldCatalog);
  }

  return {
    suggestions,
    meta: {
      provider: ocr.provider,
      extractedTextLength: scrubbed.length,
      masked: true,
    },
  };
}

