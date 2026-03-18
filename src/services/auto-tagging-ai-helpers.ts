import { GoogleGenerativeAI } from "@google/generative-ai";

import { SystemError, ValidationError } from "@/core/errors/app-error";

import type { DocxParagraph, TagSuggestion } from "./auto-tagging-types";

// ---------------------------------------------------------------------------
// AI prompt construction
// ---------------------------------------------------------------------------

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const MAX_PARAGRAPHS = 500;

export function buildAutoTagPrompt(
  paragraphs: DocxParagraph[],
  excelHeaders: string[],
  fieldLabels?: Record<string, string>,
): string {
  const headerList = excelHeaders
    .map((h) => {
      const label = fieldLabels?.[h];
      return label ? `"${h}" (${label})` : `"${h}"`;
    })
    .join(", ");

  const docLines = paragraphs
    .slice(0, MAX_PARAGRAPHS)
    .map((p) => `[${p.index}] ${p.text}`)
    .join("\n");

  return [
    "Vai trò: Data Analyst chuyên phân tích biểu mẫu tín dụng / HR / kho bãi.",
    "Mục tiêu: Tìm trong văn bản dưới đây, giá trị cụ thể nào tương ứng với từng header Excel.",
    "",
    "Quy tắc:",
    "1) Chỉ trả về text THỰC SỰ có trong document, KHÔNG bịa thêm.",
    "2) matchedText phải là chuỗi con chính xác của đoạn văn tương ứng.",
    "3) Mỗi header chỉ map tối đa 1 lần (chọn vị trí xuất hiện đầu tiên có ý nghĩa nhất).",
    "4) Nếu không tìm thấy giá trị phù hợp cho header, BỎ QUA header đó.",
    "5) confidence: 1.0 = chắc chắn, 0.5 = có thể, < 0.3 = không chắc.",
    "",
    "Trả về DUY NHẤT JSON:",
    '{"tags":[{"header":"...","matchedText":"...","paragraphIndex":N,"confidence":0.0-1.0}]}',
    "",
    `Excel headers: [${headerList}]`,
    "",
    "Nội dung document (mỗi dòng: [paragraphIndex] text):",
    docLines,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// JSON extraction & sanitization (reuse pattern from ai-mapping)
// ---------------------------------------------------------------------------

export function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return JSON.parse(trimmed);
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    const inner = fenced[1].trim();
    if (inner.startsWith("{") && inner.endsWith("}")) return JSON.parse(inner);
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
  throw new ValidationError("AI response is not valid JSON.");
}

export function sanitizeSuggestions(
  raw: unknown,
  headers: Set<string>,
  paragraphs: DocxParagraph[],
): TagSuggestion[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  const tagsRaw = Array.isArray(obj.tags) ? obj.tags : [];
  const paraMap = new Map(paragraphs.map((p) => [p.index, p.text]));
  const result: TagSuggestion[] = [];
  const usedHeaders = new Set<string>();

  for (const item of tagsRaw) {
    if (!item || typeof item !== "object") continue;
    const t = item as Record<string, unknown>;
    const header = typeof t.header === "string" ? t.header.trim() : "";
    const matchedText = typeof t.matchedText === "string" ? t.matchedText.trim() : "";
    const paragraphIndex = typeof t.paragraphIndex === "number" ? t.paragraphIndex : -1;
    const confidence = typeof t.confidence === "number" ? Math.min(1, Math.max(0, t.confidence)) : 0.5;

    if (!header || !matchedText) continue;
    if (!headers.has(header)) continue;
    if (usedHeaders.has(header)) continue;

    const paraText = paraMap.get(paragraphIndex);
    if (paraText === undefined || !paraText.includes(matchedText)) continue;

    usedHeaders.add(header);
    result.push({ header, matchedText, paragraphIndex, confidence });
  }

  return result;
}

// ---------------------------------------------------------------------------
// AI call (Gemini / OpenAI) with fallback
// ---------------------------------------------------------------------------

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new ValidationError("GEMINI_API_KEY is not configured.");
  const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model }, { apiVersion: "v1" });
  const result = await geminiModel.generateContent({
    generationConfig: { temperature: 0 },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  return result.response.text().trim();
}

async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new ValidationError("OPENAI_API_KEY is not configured.");
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const res = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You are a Document Analyst. Given a document and Excel headers, identify exact text values matching each header. Return strict JSON only.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    let errorCode: string | undefined;
    try {
      const errBody = (await res.json()) as { error?: { message?: string; code?: string } };
      errorCode = errBody.error?.code ?? undefined;
    } catch { /* non-JSON response — ignore */ }
    throw new SystemError("OpenAI auto-tagging request failed.", { status: res.status, code: errorCode });
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function callAI(prompt: string): Promise<string> {
  const provider = (process.env.AI_MAPPING_PROVIDER ?? "").toLowerCase();
  if (provider === "openai") return callOpenAI(prompt);
  if (provider === "gemini") return callGemini(prompt);
  if (process.env.OPENAI_API_KEY) return callOpenAI(prompt);
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return callGemini(prompt);
  throw new ValidationError("No AI provider configured (set OPENAI_API_KEY or GEMINI_API_KEY).");
}

// ---------------------------------------------------------------------------
// Fuzzy fallback (no AI)
// ---------------------------------------------------------------------------

export function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function fuzzyFallback(paragraphs: DocxParagraph[], headers: string[]): TagSuggestion[] {
  const results: TagSuggestion[] = [];
  const usedHeaders = new Set<string>();

  for (const header of headers) {
    if (usedHeaders.has(header)) continue;
    const normHeader = normalizeText(header);
    const tokens = normHeader.split(" ").filter(Boolean);
    if (tokens.length === 0) continue;

    for (const para of paragraphs) {
      const normPara = normalizeText(para.text);
      const matchCount = tokens.filter((t) => normPara.includes(t)).length;
      if (matchCount / tokens.length < 0.5) continue;

      usedHeaders.add(header);
      results.push({
        header,
        matchedText: para.text.length > 120 ? para.text.slice(0, 120) : para.text,
        paragraphIndex: para.index,
        confidence: 0.3,
      });
      break;
    }
  }
  return results;
}
