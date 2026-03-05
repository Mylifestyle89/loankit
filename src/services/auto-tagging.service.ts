import fs from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { SystemError, ValidationError } from "@/core/errors/app-error";
import { signFileAccess } from "@/lib/report/file-token";
import {
  buildSemanticCandidates,
  selectTopSuggestions,
} from "@/core/use-cases/reverse-template-matcher";
import { reverseTagSuggestionSchema, type ReverseTagSuggestion } from "@/lib/report/config-schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DocxParagraph = {
  index: number;
  text: string;
  xmlPath: string;
};

export type TagSuggestion = {
  header: string;
  matchedText: string;
  paragraphIndex: number;
  confidence: number;
};

export type ReverseSuggestionResult = {
  suggestions: ReverseTagSuggestion[];
  meta: {
    threshold: number;
    totalCandidates: number;
    accepted: number;
  };
};

export type TagFormat = "square" | "curly";

// ---------------------------------------------------------------------------
// DOCX text extraction (JSZip + XML regex)
// ---------------------------------------------------------------------------

const XML_PARTS_RE = /^word\/(document|header\d+|footer\d+)\.xml$/;
const W_PARAGRAPH_RE = /<w:p[ >][\s\S]*?<\/w:p>/g;
const W_TEXT_RE = /<w:t(?=[\s>])[^>]*>([\s\S]*?)<\/w:t>/g;

async function loadDocxZip(docxBuffer: Buffer): Promise<JSZip> {
  try {
    return await JSZip.loadAsync(docxBuffer);
  } catch {
    throw new ValidationError("File không phải DOCX hợp lệ.");
  }
}

function extractTextFromParagraphXml(paragraphXml: string): string {
  const parts: string[] = [];
  for (const m of paragraphXml.matchAll(W_TEXT_RE)) {
    if (m[1]) parts.push(m[1]);
  }
  return parts.join("").trim();
}

export async function extractParagraphs(docxBuffer: Buffer): Promise<DocxParagraph[]> {
  const zip = await loadDocxZip(docxBuffer);
  const xmlParts = Object.keys(zip.files).filter((name) => XML_PARTS_RE.test(name));
  const result: DocxParagraph[] = [];
  let globalIndex = 0;

  for (const xmlPath of xmlParts.sort()) {
    const xml = await zip.file(xmlPath)?.async("string");
    if (!xml) continue;
    for (const match of xml.matchAll(W_PARAGRAPH_RE)) {
      const text = extractTextFromParagraphXml(match[0]);
      if (text) {
        result.push({ index: globalIndex, text, xmlPath });
        globalIndex++;
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// AI prompt construction
// ---------------------------------------------------------------------------

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const MAX_PARAGRAPHS = 500;

function buildAutoTagPrompt(
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

function extractJsonObject(raw: string): unknown {
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

function sanitizeSuggestions(
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

async function callAI(prompt: string): Promise<string> {
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

function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fuzzyFallback(paragraphs: DocxParagraph[], headers: string[]): TagSuggestion[] {
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

// ---------------------------------------------------------------------------
// Public: analyze document
// ---------------------------------------------------------------------------

export async function analyzeDocument(
  docxBuffer: Buffer,
  excelHeaders: string[],
  fieldLabels?: Record<string, string>,
): Promise<{ paragraphs: DocxParagraph[]; suggestions: TagSuggestion[] }> {
  if (excelHeaders.length === 0) throw new ValidationError("Excel headers không được rỗng.");
  const paragraphs = await extractParagraphs(docxBuffer);
  if (paragraphs.length === 0) throw new ValidationError("File DOCX không chứa nội dung text nào.");

  const uniqueHeaders = [...new Set(excelHeaders.map((h) => h.trim()).filter(Boolean))];
  const headerSet = new Set(uniqueHeaders);
  const prompt = buildAutoTagPrompt(paragraphs, uniqueHeaders, fieldLabels);

  let suggestions: TagSuggestion[];
  try {
    const responseText = await callAI(prompt);
    if (!responseText) throw new ValidationError("AI trả về rỗng.");
    const json = extractJsonObject(responseText);
    suggestions = sanitizeSuggestions(json, headerSet, paragraphs);
  } catch (error) {
    if (error instanceof ValidationError && error.message.includes("configured")) throw error;
    suggestions = fuzzyFallback(paragraphs, uniqueHeaders);
  }

  suggestions.sort((a, b) => b.confidence - a.confidence);
  return { paragraphs, suggestions };
}

export async function reverseEngineerTemplate(params: {
  docxBuffer: Buffer;
  excelRows: Array<Record<string, unknown>>;
  threshold?: number;
}): Promise<ReverseSuggestionResult> {
  if (!Array.isArray(params.excelRows) || params.excelRows.length === 0) {
    throw new ValidationError("excelRows is required and must not be empty.");
  }
  const paragraphs = await extractParagraphs(params.docxBuffer);
  if (paragraphs.length === 0) {
    throw new ValidationError("File DOCX không chứa nội dung text nào.");
  }
  const threshold = typeof params.threshold === "number" ? Math.max(0, Math.min(1, params.threshold)) : 0.55;
  const candidates = buildSemanticCandidates({
    excelRows: params.excelRows,
    paragraphs: paragraphs.map((p) => ({ index: p.index, text: p.text })),
  });
  const suggestions = selectTopSuggestions(candidates, threshold).map((item) =>
    reverseTagSuggestionSchema.parse(item),
  );
  return {
    suggestions,
    meta: {
      threshold,
      totalCandidates: candidates.length,
      accepted: suggestions.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Public: replace text with tags and produce new template
// ---------------------------------------------------------------------------

function wrapTag(header: string, format: TagFormat): string {
  return format === "curly" ? `{{${header}}}` : `[${header}]`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build a map of concatenated paragraph text -> paragraph XML for each <w:p>.
 * This lets us find which paragraph contains the matched text, then do a
 * safe replacement only within <w:t> tags of that paragraph.
 */
function replaceParagraphText(
  paragraphXml: string,
  matchedText: string,
  replacement: string,
): string | null {
  const textParts: Array<{
    full: string;
    text: string;
    start: number;
    end: number;
    textStart: number;
    textEnd: number;
  }> = [];
  const tRe = /<w:t(?=[\s>])[^>]*>([\s\S]*?)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = tRe.exec(paragraphXml)) !== null) {
    const full = m[0];
    const text = m[1] ?? "";
    const openEnd = full.indexOf(">") + 1;
    const textStart = m.index + openEnd;
    const textEnd = textStart + text.length;
    textParts.push({
      full,
      text,
      start: m.index,
      end: m.index + full.length,
      textStart,
      textEnd,
    });
  }
  if (textParts.length === 0) return null;

  const concatenated = textParts.map((p) => p.text).join("");
  const matchStart = concatenated.indexOf(matchedText);
  if (matchStart < 0) return null;
  const matchEnd = matchStart + matchedText.length;
  const escapedReplacement = escapeXml(replacement);

  const runRanges: Array<{ start: number; end: number }> = [];
  let globalOffset = 0;
  for (const part of textParts) {
    const start = globalOffset;
    const end = start + part.text.length;
    runRanges.push({ start, end });
    globalOffset = end;
  }

  // Rebuild paragraph from exact node offsets; avoid string replace collisions.
  let result = "";
  let cursor = 0;
  let inserted = false;

  for (let i = 0; i < textParts.length; i++) {
    const part = textParts[i];
    const range = runRanges[i];

    result += paragraphXml.slice(cursor, part.start);

    const intersects = matchStart < range.end && matchEnd > range.start;
    if (!intersects) {
      result += part.full;
      cursor = part.end;
      continue;
    }

    const startInRun = Math.max(0, matchStart - range.start);
    const endInRun = Math.min(part.text.length, matchEnd - range.start);
    const before = part.text.slice(0, startInRun);
    const after = part.text.slice(endInRun);
    const middle = inserted ? "" : escapedReplacement;
    inserted = true;

    result += `<w:t xml:space="preserve">${before}${middle}${after}</w:t>`;
    cursor = part.end;
  }

  result += paragraphXml.slice(cursor);
  return result;
}

export async function replaceWithTags(
  docxBuffer: Buffer,
  accepted: Array<{ header: string; matchedText: string }>,
  format: TagFormat,
): Promise<Buffer> {
  if (accepted.length === 0) throw new ValidationError("Không có tag nào được chọn.");
  const zip = await loadDocxZip(docxBuffer);

  const xmlParts = Object.keys(zip.files).filter((name) => XML_PARTS_RE.test(name));

  for (const xmlPath of xmlParts) {
    const xml = await zip.file(xmlPath)?.async("string");
    if (!xml) continue;

    // Process paragraph-by-paragraph to avoid corrupting XML structure
    let resultXml = xml;
    let modified = false;

    for (const { header, matchedText } of accepted) {
      const tag = wrapTag(header, format);
      const paragraphs = [...resultXml.matchAll(W_PARAGRAPH_RE)];

      for (const paraMatch of paragraphs) {
        const paraXml = paraMatch[0];
        const replaced = replaceParagraphText(paraXml, matchedText, tag);
        if (replaced && replaced !== paraXml) {
          resultXml = resultXml.replace(paraXml, replaced);
          modified = true;
          break; // only replace first occurrence
        }
      }
    }

    if (modified) {
      zip.file(xmlPath, resultXml);
    }
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return Buffer.from(buffer);
}

// ---------------------------------------------------------------------------
// Public: save template to disk
// ---------------------------------------------------------------------------

export async function saveTemplate(
  templateBuffer: Buffer,
  outputName?: string,
): Promise<{ templatePath: string; downloadUrl: string }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
  const dirName = `AutoTagging_${timestamp}`;
  const dir = path.join(process.cwd(), "report_assets", "exports", dirName);
  await fs.mkdir(dir, { recursive: true });

  const fileName = outputName?.trim()
    ? outputName.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    : `tagged-template_${timestamp}.docx`;
  const filePath = path.join(dir, fileName);
  await fs.writeFile(filePath, templateBuffer);

  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return {
    templatePath: relPath,
    downloadUrl: `/api/report/file?path=${encodeURIComponent(relPath)}&download=1&token=${encodeURIComponent(signFileAccess(relPath))}`,
  };
}
