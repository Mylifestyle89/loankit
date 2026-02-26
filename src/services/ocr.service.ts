import { createWorker } from "tesseract.js";
import { PDFParse } from "pdf-parse";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { OcrProcessError, ValidationError } from "@/core/errors/app-error";

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

async function extractPdfText(buffer: Buffer): Promise<string> {
  if (buffer.length > PDF_MAX_BYTES) {
    throw new ValidationError("PDF vượt quá giới hạn 20MB.");
  }
  const parser = new PDFParse({ data: buffer });
  try {
    const parsed = await parser.getText();
    return (parsed.text ?? "").trim();
  } catch (error) {
    throw new OcrProcessError("PDF parsing failed.", error);
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

async function extractWithVision(buffer: Buffer, mimeType: string): Promise<OcrExtractResult> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new ValidationError("GEMINI_API_KEY/GOOGLE_API_KEY is not configured for OCR fallback.");
  }
  const modelName = process.env.GEMINI_VISION_MODEL ?? "gemini-1.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: "v1" });
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

    try {
      const local = await extractWithTesseract(input.buffer);
      if (local.confidence !== undefined && local.confidence >= 0.45) {
        return local;
      }
      return await extractWithVision(input.buffer, mime);
    } catch (error) {
      return extractWithVision(input.buffer, mime).catch((visionError) => {
        throw new OcrProcessError("Hybrid OCR failed.", { localError: error, visionError });
      });
    }
  },
};

