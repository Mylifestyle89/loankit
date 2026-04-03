/**
 * Robust JSON extraction from AI text responses.
 * Handles: raw JSON, markdown-fenced code blocks, embedded { } blocks.
 * Based on the most robust implementation (financial-analysis.service.ts).
 */

import { ValidationError } from "@/core/errors/app-error";

/**
 * Extract a JSON object from an AI response string.
 * Tries 3 strategies: direct parse, markdown fenced block, first { } substring.
 *
 * @throws {ValidationError} if no valid JSON object found
 */
export function extractJsonFromAiResponse(raw: string): unknown {
  const trimmed = raw.trim();

  // 1) Direct parse
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // continue
  }

  // 2) Extract from markdown code block
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    try {
      const parsed = JSON.parse(fenced[1].trim());
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // continue
    }
  }

  // 3) Find first { ... } block
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(trimmed.slice(start, end + 1));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // continue
    }
  }

  throw new ValidationError("AI response is not valid JSON.", { raw: trimmed.slice(0, 500) });
}
