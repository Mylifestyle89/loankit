import { createWorker } from "tesseract.js";
import { PDFParse } from "pdf-parse";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { OcrProcessError, ValidationError } from "@/core/errors/app-error";
import {
  type DocumentType,
  type DocumentExtractionResult,
  getPromptTemplate,
} from "./ocr-document-prompts";

type OcrProvider = "tesseract" | "vision";

export type OcrExtractResult = {
  text: string;
  confidence?: number;
  provider: OcrProvider;
};

type ExtractInput = {
  buffer: Buffer;
  mimeType: string;
  filename?: string;
};

function ensureSupportedMime(mimeType: string): void {
  const lower = mimeType.toLowerCase();
  const supported = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "application/pdf",
  ];
  if (!supported.includes(lower)) {
    throw new ValidationError(`Unsupported file type: ${mimeType}`);
  }
}

async function extractWithTesseract(buffer: Buffer): Promise<OcrExtractResult> {
  const worker = await createWorker("eng+vie");
  try {
    const { data } = await worker.recognize(buffer);
    const text = (data.text ?? "").trim();
    if (!text) {
      throw new OcrProcessError("Local OCR returned empty text.");
    }
    return {
      text,
      confidence: typeof data.confidence === "number" ? data.confidence / 100 : undefined,
      provider: "tesseract",
    };
  } catch (error) {
    throw new OcrProcessError("Local OCR (tesseract) failed.", error);
  } finally {
    await worker.terminate();
  }
}

const PDF_MAX_BYTES = 20 * 1024 * 1024; // 20 MB

async function extractPdfText(buffer: Buffer): Promise<string | null> {
  if (buffer.length > PDF_MAX_BYTES) {
    throw new ValidationError("PDF vượt quá giới hạn 20MB.");
  }
  try {
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    return (parsed.text ?? "").trim() || null;
  } catch {
    return null;
  }
}

/** Shared Gemini model initialization for Vision OCR */
function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new ValidationError("GEMINI_API_KEY/GOOGLE_API_KEY is not configured.");
  }
  const modelName = process.env.GEMINI_VISION_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName }, { apiVersion: "v1beta" });
}

async function extractWithVision(buffer: Buffer, mimeType: string): Promise<OcrExtractResult> {
  const model = getGeminiModel();
  try {
    const response = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: buffer.toString("base64"),
        },
      },
      "Extract all text content exactly from this document/image. Return plain text only.",
    ]);
    const text = response.response.text().trim();
    if (!text) throw new OcrProcessError("Vision OCR returned empty text.");
    return { text, provider: "vision" };
  } catch (error) {
    throw new OcrProcessError("Vision OCR fallback failed.", error);
  }
}

export const ocrService = {
  /** Extract structured fields from one or more document images using Gemini Vision */
  async extractDocumentFields(
    inputs: ExtractInput | ExtractInput[],
    documentType: DocumentType
  ): Promise<DocumentExtractionResult> {
    const files = Array.isArray(inputs) ? inputs : [inputs];
    if (files.length === 0) throw new ValidationError("No files provided.");
    for (const input of files) {
      if (!input?.buffer || !Buffer.isBuffer(input.buffer) || input.buffer.length === 0) {
        throw new ValidationError("OCR input buffer is empty.");
      }
      ensureSupportedMime(input.mimeType);
    }

    const model = getGeminiModel();
    const template = getPromptTemplate(documentType);

    // Build parts: all images first, then the prompt
    const imageParts = files.map((f) => ({
      inlineData: { mimeType: f.mimeType, data: f.buffer.toString("base64") },
    }));
    const multiNote = files.length > 1
      ? "Đây là nhiều ảnh/trang của cùng 1 tài liệu. Hãy kết hợp thông tin từ tất cả các trang.\n\n"
      : "";

    try {
      const response = await model.generateContent({
        contents: [{
          role: "user",
          parts: [
            ...imageParts,
            { text: multiNote + template.prompt },
          ],
        }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const raw = response.response.text().trim();
      const parsed = JSON.parse(raw);

      // Extract confidence then build fields record (exclude confidence from fields)
      const rawConf = typeof parsed.confidence === "number" ? parsed.confidence : 0.7;
      const confidence = Math.max(0, Math.min(1, rawConf));
      const fields: Record<string, string> = {};
      for (const key of template.fields) {
        fields[key] = typeof parsed[key] === "string" ? parsed[key] : String(parsed[key] ?? "");
      }

      return { documentType, fields, confidence };
    } catch (error) {
      throw new OcrProcessError("Document field extraction failed.", error);
    }
  },

  async extractTextFromBuffer(input: ExtractInput): Promise<OcrExtractResult> {
    if (!input?.buffer || !Buffer.isBuffer(input.buffer) || input.buffer.length === 0) {
      throw new ValidationError("OCR input buffer is empty.");
    }
    ensureSupportedMime(input.mimeType);

    const mime = input.mimeType.toLowerCase();
    if (mime === "application/pdf") {
      const extracted = await extractPdfText(input.buffer);
      if (extracted) {
        return { text: extracted, provider: "tesseract", confidence: 0.99 };
      }
      return extractWithVision(input.buffer, mime);
    }

    // Vision-first strategy: Gemini handles tables/structured content far better
    // than Tesseract, which often produces garbled text with misleadingly high confidence.
    const hasVisionKey = !!(process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY);
    if (hasVisionKey) {
      try {
        return await extractWithVision(input.buffer, mime);
      } catch {
        // Vision failed — fall back to Tesseract
        return extractWithTesseract(input.buffer);
      }
    }
    // No Vision API key — Tesseract only
    return extractWithTesseract(input.buffer);
  },
};

