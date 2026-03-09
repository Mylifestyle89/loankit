import { SystemError, ValidationError } from "@/core/errors/app-error";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[{}[\]()]/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(input: string): string[] {
  return normalizeText(input)
    .split(" ")
    .map((s) => s.trim())
    .filter(Boolean);
}

function scoreTokenOverlap(a: string, b: string): number {
  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }
  return overlap / Math.max(aTokens.size, bTokens.size);
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return JSON.parse(trimmed);
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    const inner = fencedMatch[1].trim();
    if (inner.startsWith("{") && inner.endsWith("}")) {
      return JSON.parse(inner);
    }
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }
  throw new ValidationError("AI response is not valid JSON.");
}

function sanitizeSuggestion(raw: unknown, excelHeaders: string[], wordPlaceholders: string[]): MappingSuggestion {
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

function sanitizeGrouping(raw: unknown, excelHeaders: string[]): GroupingSuggestion | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const value = raw as { groupKey?: unknown; repeatKey?: unknown };
  if (typeof value.groupKey !== "string" || typeof value.repeatKey !== "string") return undefined;
  const groupKey = value.groupKey.trim();
  const repeatKey = value.repeatKey.trim();
  if (!groupKey || !repeatKey) return undefined;
  if (!excelHeaders.includes(groupKey)) return undefined;
  return { groupKey, repeatKey };
}

function fuzzyFallback(excelHeaders: string[], wordPlaceholders: string[]): MappingSuggestion {
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

function fuzzyGroupingFallback(excelHeaders: string[]): GroupingSuggestion | undefined {
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

function buildPrompt(
  excelHeaders: string[],
  wordPlaceholders: string[],
  includeGrouping: boolean,
  fieldHints?: FieldHint[],
): string {
  // Build lookup map hint → metadata
  const hintMap = new Map<string, FieldHint>();
  if (fieldHints) {
    for (const h of fieldHints) hintMap.set(h.key, h);
  }

  // Nếu có fieldHints, render mô tả chi tiết từng placeholder
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
      ? "Trả về DUY NHẤT JSON: {\"mapping\":{\"wordPlaceholder\":\"excelHeader\"},\"grouping\":{\"groupKey\":\"...\",\"repeatKey\":\"items\"}}."
      : "Trả về DUY NHẤT JSON: {\"mapping\":{\"wordPlaceholder\":\"excelHeader\"}}.",
    "Không thêm giải thích, không markdown.",
    "",
    `Excel headers: ${JSON.stringify(excelHeaders)}`,
    "",
    placeholderSection,
  ].join("\n");
}

function parseSuggestionResult(
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
  const json = extractJsonObject(content);
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
  const geminiModel = genAI.getGenerativeModel(
    { model },
    { apiVersion: "v1" },
  );

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
    const json = extractJsonObject(text);
    return parseSuggestionResult(json, excelHeaders, wordPlaceholders, includeGrouping);
  } catch (error) {
    throw new ValidationError("Gemini returned invalid JSON content.", {
      raw: text,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

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

    const provider = (process.env.AI_MAPPING_PROVIDER ?? "").toLowerCase();
    try {
      if (provider === "openai") {
        return await suggestViaOpenAI(uniqueHeaders, uniquePlaceholders, includeGrouping, fieldHints);
      }
      if (provider === "gemini") {
        return await suggestViaGemini(uniqueHeaders, uniquePlaceholders, includeGrouping, fieldHints);
      }
      if (process.env.OPENAI_API_KEY) {
        return await suggestViaOpenAI(uniqueHeaders, uniquePlaceholders, includeGrouping, fieldHints);
      }
      if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
        return await suggestViaGemini(uniqueHeaders, uniquePlaceholders, includeGrouping, fieldHints);
      }
      const mapping = fuzzyFallback(uniqueHeaders, uniquePlaceholders);
      const grouping = includeGrouping ? fuzzyGroupingFallback(uniqueHeaders) : undefined;
      return grouping ? { mapping, grouping } : { mapping };
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

