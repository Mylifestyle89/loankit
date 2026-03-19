/**
 * DOCX report field extraction — orchestrator.
 * Runs a 6-step pipeline: table parse → adjacent paragraph → AI mapping →
 * heuristic fallback → AI full-doc → repeater extraction.
 *
 * Each step is implemented in a dedicated module under ./extraction/.
 */

import path from "node:path";

import { AiMappingTimeoutError, ValidationError } from "@/core/errors/app-error";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { RepeaterSuggestionItem } from "@/app/report/khdn/mapping/types";
import { aiMappingService } from "@/services/ai-mapping.service";
import { documentExtractionService } from "@/services/document-extraction.service";
import { securityService } from "@/services/security.service";
import { extractParagraphs } from "@/services/auto-tagging.service";

import {
  type FieldSuggestion,
  buildHeaderValueCandidates,
  extractByHeuristic,
  dedupeByField,
} from "./extraction/extraction-text-helpers";
import { validateAndAdjustSuggestions } from "./extraction/extraction-value-validator";
import { parseXmlTablesRaw } from "./extraction/extraction-docx-xml-parser";
import { extractScalarFieldsFromTables } from "./extraction/extraction-docx-table-fields";
import { extractFromAdjacentParagraphs } from "./extraction/extraction-docx-paragraph";
import { extractRepeaterSuggestions } from "./extraction/extraction-docx-repeater";

// --- Types ---

export type DocxFieldSuggestion = FieldSuggestion & { source: "docx_ai" };

type Input = {
  buffer: Buffer;
  filename?: string;
  fieldCatalog: FieldCatalogItem[];
  timeoutMs?: number;
};

type Output = {
  suggestions: DocxFieldSuggestion[];
  repeaterSuggestions: RepeaterSuggestionItem[];
  meta: {
    provider: "docx_ai";
    extractedTextLength: number;
    masked: true;
    paragraphCount: number;
  };
};

// --- Orchestrator ---

export async function extractFieldsFromDocxReport(input: Input): Promise<Output> {
  if (!Array.isArray(input.fieldCatalog) || input.fieldCatalog.length === 0) {
    throw new ValidationError("fieldCatalog is required.");
  }
  const ext = path.extname(input.filename ?? "").toLowerCase();
  if (ext !== ".docx") {
    throw new ValidationError("Only .docx files are supported for DOCX extract.");
  }

  const timeoutMs = Math.max(5_000, input.timeoutMs ?? 35_000);
  let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutTimer = setTimeout(() => reject(new AiMappingTimeoutError("DOCX extraction timed out.")), timeoutMs);
  });

  const parsePromise = extractParagraphs(input.buffer);
  let paragraphs: Awaited<ReturnType<typeof extractParagraphs>>;
  try {
    paragraphs = await Promise.race([parsePromise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutTimer);
  }
  if (paragraphs.length === 0) {
    throw new ValidationError("DOCX file does not contain readable text.");
  }

  const rawText = paragraphs.map((p) => p.text).join("\n");
  const scrubbed = securityService.scrubSensitiveData(rawText);
  const scalarCatalog = input.fieldCatalog.filter((f) => !f.is_repeater);

  // Step 1: Table-based scalar extraction (fast, no API calls)
  const rawTables = await parseXmlTablesRaw(input.buffer);
  const tableSuggestions = extractScalarFieldsFromTables(rawTables, scalarCatalog);

  // Step 2: Adjacent paragraph extraction (fast, no API calls)
  const tableMatchedKeys = new Set(tableSuggestions.map((s) => s.fieldKey));
  const adjacentSuggestions = extractFromAdjacentParagraphs(paragraphs, scalarCatalog, tableMatchedKeys);

  // Step 3: Header:value + AI mapping
  const { headers, valueByHeader } = buildHeaderValueCandidates(scrubbed);
  let aiSuggestions: FieldSuggestion[] = [];
  if (headers.length > 0) {
    const step3Hints = input.fieldCatalog.map((f) => ({
      key: f.label_vi,
      label: f.label_vi,
      type: f.type,
      examples: f.examples?.length ? f.examples : undefined,
      isRepeater: f.is_repeater ?? false,
    }));
    const mapped = await aiMappingService.suggestMapping(
      headers,
      input.fieldCatalog.map((f) => f.label_vi),
      { includeGrouping: false, fieldHints: step3Hints },
    );
    const fieldKeyByLabel = new Map(input.fieldCatalog.map((f) => [f.label_vi, f.field_key]));
    for (const [fieldLabel, matchedHeader] of Object.entries(mapped.mapping)) {
      const fieldKey = fieldKeyByLabel.get(fieldLabel);
      const proposedValue = valueByHeader[matchedHeader];
      if (!fieldKey || !proposedValue) continue;
      aiSuggestions.push({ fieldKey, proposedValue, confidenceScore: 0.82, source: "docx_ai" });
    }
  }

  // Step 4: Heuristic fallback (only if AI yields nothing)
  let heuristicSuggestions: FieldSuggestion[] = [];
  if (aiSuggestions.length === 0) {
    heuristicSuggestions = extractByHeuristic(scrubbed, input.fieldCatalog, "docx_ai", 0.68);
  }

  // Step 5: AI full-document extraction for missing fields
  const foundKeys = new Set([
    ...tableSuggestions.map((s) => s.fieldKey),
    ...adjacentSuggestions.map((s) => s.fieldKey),
    ...aiSuggestions.map((s) => s.fieldKey),
    ...heuristicSuggestions.map((s) => s.fieldKey),
  ]);
  const missingScalarFields = scalarCatalog.filter((f) => !foundKeys.has(f.field_key));

  let fullDocSuggestions: FieldSuggestion[] = [];
  if (missingScalarFields.length > 0) {
    const extractions = await documentExtractionService.extractFields(scrubbed, missingScalarFields);
    const fieldTypeMap = new Map(missingScalarFields.map((f) => [f.field_key, f.type]));
    fullDocSuggestions = extractions.map(({ fieldKey, value }) => {
      const fieldType = fieldTypeMap.get(fieldKey);
      const scrubbedValue = ["number", "percent"].includes(fieldType ?? "")
        ? value
        : securityService.scrubSensitiveData(value);
      return { fieldKey, proposedValue: scrubbedValue, confidenceScore: 0.78, source: "docx_ai" as const };
    });
  }

  // Step 6: Merge + dedupe + repeater extraction
  const allSuggestions = [
    ...tableSuggestions,
    ...adjacentSuggestions,
    ...aiSuggestions,
    ...heuristicSuggestions,
    ...fullDocSuggestions,
  ];

  const repeaterSuggestions = await extractRepeaterSuggestions({
    buffer: input.buffer,
    scrubbedText: scrubbed,
    fieldCatalog: input.fieldCatalog,
  });

  // Validate + adjust confidence before dedup
  const validated = validateAndAdjustSuggestions(allSuggestions, input.fieldCatalog);

  return {
    suggestions: dedupeByField(validated) as DocxFieldSuggestion[],
    repeaterSuggestions,
    meta: {
      provider: "docx_ai",
      extractedTextLength: scrubbed.length,
      masked: true,
      paragraphCount: paragraphs.length,
    },
  };
}
