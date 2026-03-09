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
import type {
  BctcExtractResult,
  CstcData,
  FinancialRow,
  SubTable,
} from "@/lib/bctc-extractor";

// ─── Public Types ─────────────────────────────────────────────────────────────

export type AnalysisField = {
  field_key: string;
  analysis_prompt: string;
};

export type AnalysisInput = {
  bctcData: BctcExtractResult;
  fields: AnalysisField[];
  /** Optional user-provided qualitative info AI cannot derive from numbers. */
  qualitativeContext?: Record<string, string>;
  /** Override the default system prompt. */
  systemPromptOverride?: string;
};

export type AnalysisResult = {
  values: Record<string, string>;
  model: string;
  provider: "gemini" | "openai";
};

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

const CSTC_LABELS: Record<keyof CstcData, string> = {
  // Group 1: Thanh toán
  hsTtTongQuat: "Hệ số thanh toán tổng quát (Tổng TS / Nợ phải trả)",
  hsTtNganHan: "Hệ số khả năng thanh toán hiện hành (TSNH / Nợ NH)",
  hsTtNhanh: "Hệ số khả năng thanh toán nhanh ((TSNH − HTK) / Nợ NH)",
  hsTtTienMat: "Hệ số khả năng thanh toán tức thời (Tiền / Nợ NH)",
  hsTtLaiVay: "Hệ số khả năng thanh toán lãi vay ((LNTT + Lãi vay) / Lãi vay)",
  // Group 2: Cơ cấu vốn
  heSoNo: "Hệ số nợ (Nợ / Tổng TS)",
  hsTuTaiTro: "Hệ số tự tài trợ (VCSH / Tổng TS)",
  heSoNoVcsh: "Hệ số nợ trên vốn chủ sở hữu (Nợ / VCSH)",
  // Group 3: Hoạt động
  vqVld: "Vòng quay vốn lưu động (DT thuần / TSNH BQ)",
  vqHtk: "Vòng quay hàng tồn kho (GVHB / HTK BQ)",
  soNgayHtk: "Số ngày tồn kho (365 / Vòng quay HTK)",
  vqPhaiThu: "Vòng quay khoản phải thu (DT thuần / Phải thu BQ)",
  soNgayThu: "Số ngày thu tiền BQ (365 / Vòng quay phải thu)",
  vqTscd: "Vòng quay tài sản cố định (DT thuần / TSCĐ BQ)",
  vqTongTs: "Vòng quay tổng tài sản (DT thuần / Tổng TS BQ)",
  // Group 4: Sinh lời
  tyLeGop: "Tỷ suất lợi nhuận gộp (LN gộp / DT thuần)",
  ros: "ROS – Tỷ suất lợi nhuận biên (LNST / DT thuần)",
  roa: "ROA – Khả năng sinh lời tài sản (LNST / Tổng TS BQ)",
  roe: "ROE – Khả năng sinh lời VCSH (LNST / VCSH BQ)",
  bep: "BEP – Tỷ số sinh lời cơ sở ((LNTT + Lãi vay) / Tổng TS)",
};

// ─── Data Formatting ──────────────────────────────────────────────────────────

function fmtNum(v: number | null): string {
  if (v === null) return "N/A";
  const abs = Math.abs(v);
  const s = Math.round(abs).toLocaleString("en-US").replace(/,/g, ".");
  return v < 0 ? `(${s})` : s;
}

function fmtRatio(v: number | null): string {
  if (v === null) return "N/A";
  return v.toFixed(2);
}

function formatFinancialRows(
  title: string,
  rows: FinancialRow[],
  currentLabel: string,
  priorLabel: string,
): string {
  if (!rows.length) return "";

  const lines = [
    `=== ${title} ===`,
    `| Chỉ tiêu | Mã số | ${currentLabel} | ${priorLabel} |`,
    `|---|---|---|---|`,
  ];
  for (const r of rows) {
    lines.push(`| ${r.chiTieu} | ${r.maSo} | ${fmtNum(r.current)} | ${fmtNum(r.prior)} |`);
  }
  return lines.join("\n");
}

function formatCstc(cstc: CstcData): string {
  const lines = [
    "=== CHỈ SỐ TÀI CHÍNH (Năm hiện tại vs Năm trước) ===",
    "| Chỉ tiêu | Năm N | Năm N-1 | Biến động |",
    "|---|---|---|---|",
  ];
  for (const [key, label] of Object.entries(CSTC_LABELS)) {
    const pair = cstc[key as keyof CstcData];
    const cur = fmtRatio(pair.current);
    const pri = fmtRatio(pair.prior);
    let delta = "N/A";
    if (pair.current !== null && pair.prior !== null) {
      const d = pair.current - pair.prior;
      delta = (d >= 0 ? "+" : "") + d.toFixed(2);
    }
    lines.push(`| ${label} | ${cur} | ${pri} | ${delta} |`);
  }
  return lines.join("\n");
}

function formatSubTable(title: string, subTable: SubTable): string {
  if (!subTable.rows.length) return "";

  const lines = [
    `=== ${title} ===`,
    `| ${subTable.headers.join(" | ")} |`,
    `|${subTable.headers.map(() => "---").join("|")}|`,
  ];
  for (const row of subTable.rows) {
    const cells = subTable.headers.map((h) => {
      const v = row[h];
      if (v === null || v === undefined) return "";
      if (typeof v === "number") return fmtNum(v);
      return String(v);
    });
    lines.push(`| ${cells.join(" | ")} |`);
  }
  return lines.join("\n");
}

function formatBctcData(data: BctcExtractResult): string {
  const { yearLabels } = data;
  const sections: string[] = [];

  sections.push(
    formatFinancialRows(
      "BẢNG CÂN ĐỐI KẾ TOÁN (CDKT)",
      data.cdkt.rows,
      yearLabels.current,
      yearLabels.prior,
    ),
  );
  sections.push(
    formatFinancialRows(
      "BÁO CÁO KẾT QUẢ KINH DOANH (KQKD)",
      data.kqkd.rows,
      yearLabels.current,
      yearLabels.prior,
    ),
  );
  sections.push(formatCstc(data.cstc));
  sections.push(formatSubTable("CHI TIẾT PHẢI THU KHÁCH HÀNG", data.subTables.phaiThu));
  sections.push(formatSubTable("CHI TIẾT HÀNG TỒN KHO", data.subTables.tonKho));
  sections.push(formatSubTable("CHI TIẾT PHẢI TRẢ NHÀ CUNG CẤP", data.subTables.phaiTra));

  return sections.filter(Boolean).join("\n\n");
}

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

// ─── JSON Parsing ─────────────────────────────────────────────────────────────

function extractJsonObject(raw: string): Record<string, string> {
  const trimmed = raw.trim();

  // 1) Direct parse
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
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
        return parsed as Record<string, string>;
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
        return parsed as Record<string, string>;
      }
    } catch {
      // continue
    }
  }

  throw new ValidationError("AI response is not valid JSON.", { raw: trimmed.slice(0, 500) });
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

    // Select provider (same priority as ai-mapping.service)
    const provider = (process.env.AI_MAPPING_PROVIDER ?? "").toLowerCase();
    let response: { text: string; model: string };
    let providerName: "gemini" | "openai";

    if (provider === "openai") {
      response = await callOpenAI(systemPrompt, userPrompt);
      providerName = "openai";
    } else if (provider === "gemini") {
      response = await callGemini(systemPrompt, userPrompt);
      providerName = "gemini";
    } else if (process.env.OPENAI_API_KEY) {
      response = await callOpenAI(systemPrompt, userPrompt);
      providerName = "openai";
    } else if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
      response = await callGemini(systemPrompt, userPrompt);
      providerName = "gemini";
    } else {
      throw new ValidationError(
        "No AI provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY.",
      );
    }

    const parsed = extractJsonObject(response.text);
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
