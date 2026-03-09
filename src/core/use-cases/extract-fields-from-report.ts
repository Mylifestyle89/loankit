import path from "node:path";

import { ValidationError } from "@/core/errors/app-error";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import { extractFieldsFromDocxReport } from "@/core/use-cases/extract-fields-from-docx-report";
import { extractFieldsFromOcr } from "@/core/use-cases/extract-fields-from-ocr";

type ReportExtractKind = "ocr" | "docx";

type Input = {
  buffer: Buffer;
  mimeType?: string;
  filename?: string;
  fieldCatalog: FieldCatalogItem[];
  preferredKind?: ReportExtractKind;
};

type Output = {
  kind: ReportExtractKind;
  suggestions: Array<{
    fieldKey: string;
    proposedValue: string;
    confidenceScore: number;
    source: "ocr_ai" | "docx_ai";
  }>;
  repeaterSuggestions?: Array<{
    groupPath: string;
    fieldKeys: string[];
    rows: Array<Record<string, string | number | boolean | null>>;
    confidenceScore: number;
    status?: "pending" | "accepted" | "declined";
    source?: "docx_ai" | "ocr_ai";
  }>;
  meta: {
    provider: "tesseract" | "vision" | "docx_ai";
    extractedTextLength: number;
    masked: true;
    paragraphCount?: number;
  };
};

function detectKind(input: { mimeType?: string; filename?: string }): ReportExtractKind {
  const filename = String(input.filename ?? "").toLowerCase();
  const ext = path.extname(filename);
  if (ext === ".docx") return "docx";

  const mime = String(input.mimeType ?? "").toLowerCase();
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";

  const supportedOcr = new Set([
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "application/pdf",
  ]);
  if (supportedOcr.has(mime)) return "ocr";

  throw new ValidationError(`Unsupported input type for extract: mime=${mime || "(empty)"} ext=${ext || "(empty)"}`);
}

export async function extractFieldsFromReport(input: Input): Promise<Output> {
  if (!Array.isArray(input.fieldCatalog) || input.fieldCatalog.length === 0) {
    throw new ValidationError("fieldCatalog is required.");
  }
  const kind = input.preferredKind ?? detectKind(input);

  if (kind === "docx") {
    const docx = await extractFieldsFromDocxReport({
      buffer: input.buffer,
      filename: input.filename,
      fieldCatalog: input.fieldCatalog,
    });
    return {
      kind,
      suggestions: docx.suggestions,
      repeaterSuggestions: docx.repeaterSuggestions,
      meta: docx.meta,
    };
  }

  const ocr = await extractFieldsFromOcr({
    buffer: input.buffer,
    mimeType: input.mimeType ?? "application/octet-stream",
    filename: input.filename,
    fieldCatalog: input.fieldCatalog,
  });
  return {
    kind,
    suggestions: ocr.suggestions,
    meta: ocr.meta,
  };
}

