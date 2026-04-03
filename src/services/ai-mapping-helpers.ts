/**
 * AI mapping helpers — text normalization, fuzzy matching, prompt building,
 * suggestion sanitization, JSON parsing utilities.
 */
import { ValidationError } from "@/core/errors/app-error";


import type { FieldHint, GroupingSuggestion, MappingSuggestion, MappingSuggestionResult } from "./ai-mapping.service";

import { normalizeText, tokenize, scoreTokenOverlap } from "@/lib/text/normalize";


// ---------------------------------------------------------------------------
// Suggestion sanitization
// ---------------------------------------------------------------------------

export function sanitizeSuggestion(
  raw: unknown,
  excelHeaders: string[],
  wordPlaceholders: string[],
): MappingSuggestion {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("AI suggestion must be a JSON object.");
  }
  const headerSet = new Set(excelHeaders);
  const placeholderSet = new Set(wordPlaceholders);
  const result: MappingSuggestion = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!placeholderSet.has(k)) continue;
    if (typeof v !== "string") continue;
    if (!headerSet.has(v)) continue;
    result[k] = v;
  }
  return result;
}

export function sanitizeGrouping(raw: unknown, excelHeaders: string[]): GroupingSuggestion | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const value = raw as { groupKey?: unknown; repeatKey?: unknown };
  if (typeof value.groupKey !== "string" || typeof value.repeatKey !== "string") return undefined;
  const groupKey = value.groupKey.trim();
  const repeatKey = value.repeatKey.trim();
  if (!groupKey || !repeatKey) return undefined;
  if (!excelHeaders.includes(groupKey)) return undefined;
  return { groupKey, repeatKey };
}

export function parseSuggestionResult(
  raw: unknown,
  excelHeaders: string[],
  wordPlaceholders: string[],
  includeGrouping: boolean,
): MappingSuggestionResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("AI suggestion must be a JSON object.");
  }

  const objectRaw = raw as Record<string, unknown>;
  const rawMapping =
    objectRaw.mapping && typeof objectRaw.mapping === "object" && !Array.isArray(objectRaw.mapping)
      ? objectRaw.mapping
      : objectRaw;

  const mapping = sanitizeSuggestion(rawMapping, excelHeaders, wordPlaceholders);
  const grouping = includeGrouping ? sanitizeGrouping(objectRaw.grouping, excelHeaders) : undefined;
  return grouping ? { mapping, grouping } : { mapping };
}

// ---------------------------------------------------------------------------
// Fuzzy fallback
// ---------------------------------------------------------------------------

export function fuzzyFallback(excelHeaders: string[], wordPlaceholders: string[]): MappingSuggestion {
  const result: MappingSuggestion = {};
  for (const placeholder of wordPlaceholders) {
    let bestHeader = "";
    let bestScore = 0;
    for (const header of excelHeaders) {
      const score = scoreTokenOverlap(placeholder, header);
      if (score > bestScore) {
        bestScore = score;
        bestHeader = header;
      }
    }
    if (bestHeader && bestScore >= 0.5) {
      result[placeholder] = bestHeader;
    }
  }
  return result;
}

export function fuzzyGroupingFallback(excelHeaders: string[]): GroupingSuggestion | undefined {
  const keyHints = [
    "so hdtd",
    "so hop dong",
    "ma nhan vien",
    "ma phieu",
    "ma sku",
    "ma hang",
    "id",
    "so chung tu",
    "ma don",
  ];
  const candidate = excelHeaders.find((header) => {
    const normalized = normalizeText(header);
    return keyHints.some((hint) => normalized.includes(hint));
  });
  if (!candidate) return undefined;
  return { groupKey: candidate, repeatKey: "items" };
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

export function buildPrompt(
  excelHeaders: string[],
  wordPlaceholders: string[],
  includeGrouping: boolean,
  fieldHints?: FieldHint[],
): string {
  const hintMap = new Map<string, FieldHint>();
  if (fieldHints) {
    for (const h of fieldHints) hintMap.set(h.key, h);
  }

  const hasHints = hintMap.size > 0;
  const placeholderSection = hasHints
    ? [
        "Word placeholders (cần map) — kèm metadata để hỗ trợ nhận diện:",
        ...wordPlaceholders.map((p) => {
          const h = hintMap.get(p);
          if (!h) return `  - "${p}"`;
          const parts: string[] = [`label: "${h.label}"`, `type: ${h.type}`];
          if (h.isRepeater) parts.push("repeater: true");
          if (h.examples && h.examples.length > 0) {
            const ex = h.examples.slice(0, 2).map((e) => `"${e}"`).join(", ");
            parts.push(`ví dụ: ${ex}`);
          }
          return `  - "${p}": ${parts.join(", ")}`;
        }),
      ].join("\n")
    : `Word placeholders: ${JSON.stringify(wordPlaceholders)}`;

  return [
    "Vai trò: Data & Systems Architect cho bài toán mapping biểu mẫu.",
    "Mục tiêu: ghép cột Excel phù hợp nhất với placeholder Word, dựa trên label và type.",
    "Nguyên tắc:",
    "1) Ưu tiên semantic dựa vào label tiếng Việt của placeholder, không cần header trùng từng chữ.",
    "2) Nhận diện khóa chính/group key (vd: số HĐTD, mã nhân viên, mã phiếu, mã SKU).",
    "3) Placeholder có repeater:true → map vào cột chi tiết lặp lại (không phải cột tổng).",
    "4) Nếu confidence < 70% (không chắc), KHÔNG trả về key đó — bỏ trống tốt hơn map sai.",
    "5) Chỉ dùng header có trong danh sách Excel và placeholder có trong danh sách Word.",
    includeGrouping
      ? 'Trả về DUY NHẤT JSON: {"mapping":{"wordPlaceholder":"excelHeader"},"grouping":{"groupKey":"...","repeatKey":"items"}}.'
      : 'Trả về DUY NHẤT JSON: {"mapping":{"wordPlaceholder":"excelHeader"}}.',
    "Không thêm giải thích, không markdown.",
    "",
    `Excel headers: ${JSON.stringify(excelHeaders)}`,
    "",
    placeholderSection,
  ].join("\n");
}
