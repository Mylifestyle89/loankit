/**
 * AI mapping service — types + suggestMapping/batchSuggest public API.
 * Helpers (fuzzy, prompt, sanitize) live in ai-mapping-helpers.ts.
 */
import { SystemError, ValidationError } from "@/core/errors/app-error";
import { resolveAiProvider, extractJsonFromAiResponse } from "@/lib/ai";
import { GoogleGenerativeAI } from "@google/generative-ai";

import {
  buildPrompt,
  fuzzyFallback,
  fuzzyGroupingFallback,
  parseSuggestionResult,
} from "./ai-mapping-helpers";

// ---------------------------------------------------------------------------
// Types (public — consumed by callers)
// ---------------------------------------------------------------------------

export type MappingSuggestion = Record<string, string>;
export type GroupingSuggestion = {
  groupKey: string;
  repeatKey: string;
};
export type MappingSuggestionResult = {
  mapping: MappingSuggestion;
  grouping?: GroupingSuggestion;
};

/**
 * Metadata về một field placeholder để AI hiểu ý nghĩa tốt hơn.
 * Được build từ FieldCatalogItem trước khi gọi API.
 */
export type FieldHint = {
  key: string;        // = field_key / wordPlaceholder
  label: string;      // label_vi — mô tả tiếng Việt
  type: string;       // text | number | percent | date | table
  examples?: string[];
  isRepeater?: boolean;
};

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

// ---------------------------------------------------------------------------
// Provider implementations
// ---------------------------------------------------------------------------

async function suggestViaOpenAI(
  excelHeaders: string[],
  wordPlaceholders: string[],
  includeGrouping: boolean,
  fieldHints?: FieldHint[],
): Promise<MappingSuggestionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new ValidationError("OPENAI_API_KEY is not configured.");
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const prompt = buildPrompt(excelHeaders, wordPlaceholders, includeGrouping, fieldHints);

  const res = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You are a Data & Systems Architect for document mapping across finance, HR, and warehouse domains. Detect primary/group keys and repeater-array fields semantically. Return strict JSON object only.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new SystemError("OpenAI mapping suggestion request failed.", { status: res.status, detail });
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new ValidationError("OpenAI returned empty suggestion content.");
  const json = extractJsonFromAiResponse(content);
  return parseSuggestionResult(json, excelHeaders, wordPlaceholders, includeGrouping);
}

async function suggestViaGemini(
  excelHeaders: string[],
  wordPlaceholders: string[],
  includeGrouping: boolean,
  fieldHints?: FieldHint[],
): Promise<MappingSuggestionResult> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new ValidationError("GEMINI_API_KEY/GOOGLE_API_KEY is not configured.");
  const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
  const prompt = buildPrompt(excelHeaders, wordPlaceholders, includeGrouping, fieldHints);

  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model }, { apiVersion: "v1" });

  let text: string;
  try {
    const result = await geminiModel.generateContent({
      generationConfig: { temperature: 0 },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    text = result.response.text().trim();
  } catch (error) {
    throw new SystemError("Gemini mapping suggestion request failed.", error);
  }

  if (!text) {
    throw new ValidationError("Gemini returned empty suggestion content.");
  }

  try {
    const json = extractJsonFromAiResponse(text);
    return parseSuggestionResult(json, excelHeaders, wordPlaceholders, includeGrouping);
  } catch (error) {
    throw new ValidationError("Gemini returned invalid JSON content.", {
      raw: text,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ---------------------------------------------------------------------------
// Public service
// ---------------------------------------------------------------------------

export const aiMappingService = {
  async suggestMapping(
    excelHeaders: string[],
    wordPlaceholders: string[],
    options?: { includeGrouping?: boolean; fieldHints?: FieldHint[] },
  ): Promise<MappingSuggestionResult> {
    if (!Array.isArray(excelHeaders) || excelHeaders.length === 0) {
      throw new ValidationError("excelHeaders is required and must not be empty.");
    }
    if (!Array.isArray(wordPlaceholders) || wordPlaceholders.length === 0) {
      throw new ValidationError("wordPlaceholders is required and must not be empty.");
    }

    const uniqueHeaders = [...new Set(excelHeaders.map((h) => String(h).trim()).filter(Boolean))];
    const uniquePlaceholders = [...new Set(wordPlaceholders.map((p) => String(p).trim()).filter(Boolean))];
    const includeGrouping = Boolean(options?.includeGrouping);
    const fieldHints = options?.fieldHints;

    if (uniqueHeaders.length === 0 || uniquePlaceholders.length === 0) {
      throw new ValidationError("excelHeaders/wordPlaceholders contains only empty values.");
    }

    let resolved: ReturnType<typeof resolveAiProvider> | null = null;
    try {
      resolved = resolveAiProvider();
    } catch {
      // No AI provider — use fuzzy fallback
    }

    if (!resolved) {
      const mapping = fuzzyFallback(uniqueHeaders, uniquePlaceholders);
      const grouping = includeGrouping ? fuzzyGroupingFallback(uniqueHeaders) : undefined;
      return grouping ? { mapping, grouping } : { mapping };
    }

    try {
      if (resolved.provider === "openai") {
        return await suggestViaOpenAI(uniqueHeaders, uniquePlaceholders, includeGrouping, fieldHints);
      }
      return await suggestViaGemini(uniqueHeaders, uniquePlaceholders, includeGrouping, fieldHints);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      const fallback = fuzzyFallback(uniqueHeaders, uniquePlaceholders);
      if (Object.keys(fallback).length > 0) {
        const grouping = includeGrouping ? fuzzyGroupingFallback(uniqueHeaders) : undefined;
        return grouping ? { mapping: fallback, grouping } : { mapping: fallback };
      }
      throw new SystemError("AI mapping suggestion failed.", error);
    }
  },
};
