/**
 * document-extraction.service.ts
 *
 * "Full-Document Comprehension" — AI đọc toàn bộ văn bản tài liệu và trích
 * xuất trực tiếp các giá trị field dựa vào label + type trong field catalog.
 *
 * Khác với ai-mapping.service (mapping column headers → placeholders),
 * service này không cần biết cấu trúc bảng/cột — AI hiểu ngữ cảnh văn bản.
 *
 * Future improvement (khi cần):
 *   "Anchor-based Extraction" — tìm vị trí label trong văn bản, cắt 500 ký tự
 *   xung quanh và gửi riêng lên AI. Giúp tăng độ chính xác cho field cụ thể
 *   mà "full-doc" bỏ qua vì bị loãng trong văn bản dài.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

import { SystemError, ValidationError } from "@/core/errors/app-error";
import { resolveAiProvider } from "@/lib/ai";
import type { FieldCatalogItem } from "@/lib/report/config-schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocumentFieldExtraction = {
  fieldKey: string;
  value: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

/**
 * Head 30k + Tail 10k = 40k ký tự.
 * Phủ toàn bộ thông tin KH, bảng BCTC, và kết luận đề xuất.
 * Tương đương ~10,000–13,000 tokens — an toàn với gpt-4o-mini (128k) và gemini-1.5-flash (1M).
 */
const HEAD_CHARS = 30_000;
const TAIL_CHARS = 10_000;

/**
 * Giới hạn số field gửi mỗi lần gọi API.
 * Output token limit thường là 4,096 tokens. Với 80 field × ~50 ký tự/field ≈ 4,000 ký tự
 * (~1,000 tokens) — an toàn. Nếu số field lớn hơn, sẽ batch thành nhiều lượt.
 */
const MAX_FIELDS_PER_CALL = 80;

/** Timeout cho mỗi API call. 40k ký tự input thường mất 10–25 giây. */
const API_CALL_TIMEOUT_MS = 28_000;

// ─── Schema builders for structured AI output ────────────────────────────────

/** Build OpenAI json_schema response format from field catalog. */
function buildOpenAIJsonSchema(fields: FieldCatalogItem[]) {
  return {
    type: "json_schema" as const,
    json_schema: {
      name: "field_extraction",
      strict: true,
      schema: {
        type: "object",
        properties: Object.fromEntries(
          fields.map((f) => [f.field_key, { type: "string", description: f.label_vi }]),
        ),
        required: fields.map((f) => f.field_key),
        additionalProperties: false,
      },
    },
  };
}

/** Build Gemini responseSchema from field catalog. */
function buildGeminiResponseSchema(fields: FieldCatalogItem[]) {
  return {
    type: "object" as const,
    properties: Object.fromEntries(
      fields.map((f) => [f.field_key, { type: "string" as const, description: f.label_vi }]),
    ),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncateDocumentText(text: string): string {
  const total = HEAD_CHARS + TAIL_CHARS;
  if (text.length <= total) return text;
  const head = text.slice(0, HEAD_CHARS);
  const tail = text.slice(-TAIL_CHARS);
  return `${head}\n\n...(nội dung giữa đã được rút gọn)...\n\n${tail}`;
}

function buildExtractionPrompt(documentText: string, fields: FieldCatalogItem[]): string {
  const fieldSummary = fields
    .map((f) => {
      const ex =
        f.examples && f.examples.length > 0
          ? ` — ví dụ: ${f.examples.slice(0, 2).join(", ")}`
          : "";
      return `  - ${f.field_key} (${f.label_vi}): type=${f.type}${ex}`;
    })
    .join("\n");

  return `
VAI TRÒ: Chuyên gia phân tích dữ liệu tài chính Việt Nam.
NHIỆM VỤ: Đọc toàn bộ tài liệu dưới đây và trích xuất giá trị cho từng field trong danh sách.

QUY TẮC:
1. Chỉ trích xuất khi CHẮC CHẮN giá trị xuất hiện trong tài liệu — đúng ngữ cảnh.
2. Nếu không tìm thấy, KHÔNG đưa field đó vào kết quả (bỏ trống tốt hơn suy đoán sai).
3. Trả về giá trị nguyên gốc từ tài liệu, không diễn giải lại.
4. Định dạng số VN: dấu chấm (.) là phân cách nghìn, dấu phẩy (,) là thập phân.
   → type=number/percent: bỏ dấu phân cách nghìn, đổi phẩy thập phân thành chấm.
   → Ví dụ: "1.234.567,89" → "1234567.89"
5. type=date: chuyển về YYYY-MM-DD nếu nhận ra, nếu không giữ nguyên bản.
6. Nếu giá trị nằm trong bảng: lấy cột kỳ gần nhất ("Số cuối năm", "Kỳ này", cột phải nhất).

DANH SÁCH FIELDS CẦN TRÍCH XUẤT:
${fieldSummary}

YÊU CẦU ĐẦU RA: Trả về giá trị cho mỗi field_key. Nếu không tìm thấy, trả chuỗi rỗng "".

TÀI LIỆU:
---
${truncateDocumentText(documentText)}
---
`.trim();
}

function sanitizeExtractions(
  raw: unknown,
  validKeys: Set<string>,
): DocumentFieldExtraction[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const result: DocumentFieldExtraction[] = [];
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!validKeys.has(k)) continue;
    // String(v) để chấp nhận cả number JSON (AI đôi khi trả về số thay vì chuỗi)
    const str = String(v ?? "").trim();
    if (!str || str === "null" || str === "undefined") continue;
    result.push({ fieldKey: k, value: str });
  }
  return result;
}

/** Wrap một promise với timeout. Reject khi vượt quá `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

// ─── Provider implementations ─────────────────────────────────────────────────

async function extractViaOpenAI(
  documentText: string,
  fields: FieldCatalogItem[],
): Promise<DocumentFieldExtraction[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new ValidationError("OPENAI_API_KEY is not configured.");

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const prompt = buildExtractionPrompt(documentText, fields);

  const fetchPromise = fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      // Structured Output — enforce field_key names and string types at API level
      response_format: buildOpenAIJsonSchema(fields),
      messages: [
        {
          role: "system",
          content:
            "You are a Vietnamese financial document extraction specialist. Extract field values accurately. Return empty string for fields not found in the document.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  const res = await withTimeout(fetchPromise, API_CALL_TIMEOUT_MS, "OpenAI extraction");

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new SystemError("OpenAI document extraction failed.", { status: res.status, detail });
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return [];

  const validKeys = new Set(fields.map((f) => f.field_key));
  // JSON Mode đảm bảo content là JSON hợp lệ — parse trực tiếp
  const parsed = JSON.parse(content) as unknown;
  return sanitizeExtractions(parsed, validKeys);
}

async function extractViaGemini(
  documentText: string,
  fields: FieldCatalogItem[],
): Promise<DocumentFieldExtraction[]> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new ValidationError("GEMINI_API_KEY/GOOGLE_API_KEY is not configured.");

  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const prompt = buildExtractionPrompt(documentText, fields);

  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model });

  let text: string;
  const generatePromise = geminiModel.generateContent({
    generationConfig: { temperature: 0 },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  try {
    const result = await withTimeout(generatePromise, API_CALL_TIMEOUT_MS, "Gemini extraction");
    text = result.response.text().trim();
    // Strip markdown code fences if present
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }
  } catch (error) {
    throw new SystemError("Gemini document extraction failed.", error);
  }

  if (!text) return [];

  const validKeys = new Set(fields.map((f) => f.field_key));
  const parsed = JSON.parse(text) as unknown;
  return sanitizeExtractions(parsed, validKeys);
}

/** Gọi provider với field list, tự động batch nếu vượt MAX_FIELDS_PER_CALL. */
async function callProvider(
  documentText: string,
  fields: FieldCatalogItem[],
  provider: (doc: string, f: FieldCatalogItem[]) => Promise<DocumentFieldExtraction[]>,
): Promise<DocumentFieldExtraction[]> {
  if (fields.length <= MAX_FIELDS_PER_CALL) {
    return provider(documentText, fields);
  }

  // Batch: chia fields thành các nhóm ≤ MAX_FIELDS_PER_CALL
  const results: DocumentFieldExtraction[] = [];
  for (let i = 0; i < fields.length; i += MAX_FIELDS_PER_CALL) {
    const batch = fields.slice(i, i + MAX_FIELDS_PER_CALL);
    const batchResults = await provider(documentText, batch);
    results.push(...batchResults);
  }
  return results;
}

// ─── Service export ───────────────────────────────────────────────────────────

export const documentExtractionService = {
  /**
   * Gửi toàn bộ văn bản tài liệu + field catalog lên AI để trích xuất giá trị.
   *
   * - Thường được gọi cho các field CHƯA được tìm thấy bởi các bước parse
   *   (table-based, adjacent-paragraph, header:value).
   * - Silently returns [] nếu không có API key — bước này là enhancement,
   *   không block luồng chính.
   * - Mỗi batch API call được bảo vệ bởi timeout 28 giây.
   *
   * @param documentText  Văn bản tài liệu đã scrub sensitive data
   * @param fields        Danh sách scalar field cần trích xuất
   */
  async extractFields(
    documentText: string,
    fields: FieldCatalogItem[],
  ): Promise<DocumentFieldExtraction[]> {
    if (!documentText.trim() || fields.length === 0) return [];

    try {
      const resolved = resolveAiProvider();
      const providerFn = resolved.provider === "openai" ? extractViaOpenAI : extractViaGemini;
      return await callProvider(documentText, fields, providerFn);
    } catch (error) {
      // Ghi log để debug, không throw — đây là bước bổ sung, không block luồng chính
      if (process.env.NODE_ENV === "development") {
        console.error("[DocumentExtractionService] extractFields failed:", error);
      }
    }
    return [];
  },
};
