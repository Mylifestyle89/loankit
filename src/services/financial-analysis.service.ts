/**
 * financial-analysis.service.ts
 *
 * Takes extracted BCTC data (Phase 1) and generates narrative financial analysis
 * text via AI (Gemini / OpenAI). Each output field maps to a placeholder in the
 * DOCX template and is merged into manualValues for injection.
 *
 * Architecture:
 *   Layer 1 — System prompt: role, tone, benchmark rules (DEFAULT_SYSTEM_PROMPT)
 *   Layer 2 — Per-field `analysis_prompt` from the field catalog
 *
 * The service sends ONE prompt containing all financial data + all field
 * instructions and expects a single JSON response:
 *   { "field_key": "analysis text", ... }
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

import { SystemError, ValidationError } from "@/core/errors/app-error";
import type { BctcExtractResult } from "@/lib/bctc-extractor";
import { resolveAiProvider, extractJsonFromAiResponse } from "@/lib/ai";

import { formatBctcData } from "./financial-analysis-formatters";

// Re-export types for backward compatibility
export type { AnalysisField, AnalysisInput, AnalysisResult } from "./financial-analysis-types";
import type { AnalysisField, AnalysisInput, AnalysisResult } from "./financial-analysis-types";

// ─── Constants ────────────────────────────────────────────────────────────────

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

const DEFAULT_SYSTEM_PROMPT = [
  "Bạn là chuyên viên phân tích tín dụng tại ngân hàng thương mại Việt Nam.",
  "Nhiệm vụ: phân tích báo cáo tài chính doanh nghiệp và viết nhận xét chuyên môn.",
  "GÓC NHÌN: Người cho vay (lender) — tập trung đánh giá khả năng trả nợ, KHÔNG phải góc nhìn nhà đầu tư.",
  "",
  "Quy tắc viết:",
  "1. Tiếng Việt, văn phong chuyên nghiệp, rõ ràng.",
  "2. Trích dẫn số liệu cụ thể khi phân tích (triệu đồng hoặc tỷ đồng tuỳ quy mô).",
  "3. So sánh kỳ hiện tại vs kỳ trước (2 năm liền kề): tăng/giảm bao nhiêu, tỷ lệ %, xu hướng.",
  "4. ƯU TIÊN tìm điểm tích cực, cơ sở cho thấy doanh nghiệp có khả năng trả nợ.",
  "5. Nếu có rủi ro/hạn chế, BẮT BUỘC đi kèm giải pháp xử lý/giảm thiểu cụ thể.",
  "6. Mỗi nhận xét từ 3-8 câu, đủ chi tiết nhưng không dài dòng.",
  "7. Khi phân tích chỉ số, so sánh với ngưỡng phổ biến (VD: thanh toán hiện hành > 1 là tốt).",
  "8. Trả về ĐÚNG format JSON, không có text khác bên ngoài.",
].join("\n");

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildUserPrompt(
  data: BctcExtractResult,
  fields: AnalysisField[],
  qualitativeContext?: Record<string, string>,
): string {
  const sections: string[] = [];

  // Financial data
  sections.push(formatBctcData(data));

  // Qualitative context from user
  if (qualitativeContext && Object.keys(qualitativeContext).length > 0) {
    const ctxLines = ["=== THÔNG TIN BỔ SUNG (từ cán bộ tín dụng) ==="];
    for (const [key, value] of Object.entries(qualitativeContext)) {
      ctxLines.push(`- ${key}: ${value}`);
    }
    sections.push(ctxLines.join("\n"));
  }

  // Field instructions
  const fieldLines = [
    "=== YÊU CẦU PHÂN TÍCH ===",
    "Dựa trên dữ liệu trên, viết phân tích cho từng mục bên dưới.",
    `Trả về JSON object với đúng ${fields.length} key:`,
    "",
  ];
  for (let i = 0; i < fields.length; i++) {
    fieldLines.push(`${i + 1}. "${fields[i].field_key}": ${fields[i].analysis_prompt}`);
  }
  fieldLines.push("");
  fieldLines.push("Trả về ĐÚNG format JSON (không markdown, không text bên ngoài):");
  fieldLines.push("{");
  for (const f of fields) {
    fieldLines.push(`  "${f.field_key}": "nội dung phân tích...",`);
  }
  fieldLines.push("}");

  sections.push(fieldLines.join("\n"));

  return sections.join("\n\n");
}

// ─── AI Providers ─────────────────────────────────────────────────────────────

async function callGemini(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ text: string; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new ValidationError("GEMINI_API_KEY/GOOGLE_API_KEY is not configured.");
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel(
    { model, systemInstruction: systemPrompt },
    { apiVersion: "v1beta" },
  );

  const result = await geminiModel.generateContent({
    generationConfig: { temperature: 0 },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
  });

  const text = result.response.text().trim();
  if (!text) throw new ValidationError("Gemini returned empty response.");
  return { text, model };
}

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ text: string; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new ValidationError("OPENAI_API_KEY is not configured.");
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

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
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new SystemError("OpenAI financial analysis request failed.", { status: res.status, detail });
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new ValidationError("OpenAI returned empty response.");
  return { text, model };
}

/**
 * Validate and filter the parsed JSON — keep only expected field keys
 * and ensure all values are strings.
 */
function sanitiseValues(
  raw: Record<string, string>,
  expectedKeys: Set<string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!expectedKeys.has(key)) continue;
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) result[key] = trimmed;
  }
  return result;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const financialAnalysisService = {
  /**
   * Generate AI financial analysis for the given BCTC data.
   *
   * @throws {ValidationError} if no analysis fields provided or AI returns bad JSON
   * @throws {SystemError} if AI provider call fails
   */
  async analyze(input: AnalysisInput): Promise<AnalysisResult> {
    const { bctcData, fields, qualitativeContext, systemPromptOverride } = input;

    if (!fields.length) {
      throw new ValidationError("No analysis fields provided.");
    }

    const systemPrompt = systemPromptOverride ?? DEFAULT_SYSTEM_PROMPT;
    const userPrompt = buildUserPrompt(bctcData, fields, qualitativeContext);

    // Select provider via shared resolver
    const resolved = resolveAiProvider({ defaultGeminiModel: "gemini-2.5-flash" });
    const providerName = resolved.provider;
    const response = providerName === "openai"
      ? await callOpenAI(systemPrompt, userPrompt)
      : await callGemini(systemPrompt, userPrompt);

    const parsed = extractJsonFromAiResponse(response.text) as Record<string, string>;
    const expectedKeys = new Set(fields.map((f) => f.field_key));
    const values = sanitiseValues(parsed, expectedKeys);

    return {
      values,
      model: response.model,
      provider: providerName,
    };
  },

  /** Format BCTC data as readable text (useful for previewing what AI receives). */
  formatDataPreview(data: BctcExtractResult): string {
    return formatBctcData(data);
  },
};
