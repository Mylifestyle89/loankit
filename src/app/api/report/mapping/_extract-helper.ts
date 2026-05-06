import path from "node:path";

import { ValidationError } from "@/core/errors/app-error";
import { extractFieldsFromReport } from "@/core/use-cases/extract-fields-from-report";
import { validateFileSize } from "@/lib/report/upload-limits";
import { reportService } from "@/services/report.service";

type ExtractKind = "ocr" | "docx";

export type ExtractRequestContext = {
  file: File;
  fieldTemplateId: string;
};

export async function parseExtractRequestForm(form: FormData): Promise<ExtractRequestContext> {
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new ValidationError("file is required.");
  }
  // Phase 6g: UI always sends fieldTemplateId (master id); mappingInstanceId removed.
  const fieldTemplateId = String(form.get("fieldTemplateId") ?? "").trim();
  if (!fieldTemplateId) {
    throw new ValidationError("fieldTemplateId is required.");
  }
  return { file, fieldTemplateId };
}

export function validateOcrFile(file: File): void {
  validateFileSize(file, "ocr");
  const supported = new Set([
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "application/pdf",
  ]);
  const mimeType = (file.type || "application/octet-stream").toLowerCase();
  if (!supported.has(mimeType)) {
    throw new ValidationError(`Unsupported file type: ${file.type || "(empty)"}`);
  }
}

export function validateDocxFile(file: File): void {
  validateFileSize(file, "docx");
  const ext = path.extname(file.name || "").toLowerCase();
  if (ext !== ".docx") {
    throw new ValidationError(`Unsupported file extension: ${ext || "(empty)"}. Only .docx is allowed.`);
  }
}

async function resolveFieldCatalog(fieldTemplateId: string) {
  const { data: masters } = await reportService.listMasterTemplates({ withUsage: false, limit: 500 });
  const selected = masters.find((item: { id: string }) => item.id === fieldTemplateId);
  if (!selected) throw new ValidationError("fieldTemplateId not found.");
  return selected.field_catalog;
}

export async function runExtractProcess(input: {
  context: ExtractRequestContext;
  preferredKind?: ExtractKind;
}) {
  const { context, preferredKind } = input;
  const fieldCatalog = await resolveFieldCatalog(context.fieldTemplateId);
  const buffer = Buffer.from(await context.file.arrayBuffer());
  return extractFieldsFromReport({
    buffer,
    mimeType: context.file.type,
    filename: context.file.name,
    fieldCatalog,
    preferredKind,
  });
}
