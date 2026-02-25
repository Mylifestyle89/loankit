import { NextRequest, NextResponse } from "next/server";

import { ValidationError, toHttpError } from "@/core/errors/app-error";
import { extractFieldsFromOcr } from "@/core/use-cases/extract-fields-from-ocr";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

function validateMimeType(mimeType: string): void {
  const supported = new Set([
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "application/pdf",
  ]);
  if (!supported.has(mimeType.toLowerCase())) {
    throw new ValidationError(`Unsupported file type: ${mimeType}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ValidationError("file is required.");
    }
    const mappingInstanceId = String(form.get("mappingInstanceId") ?? "").trim();
    const fieldTemplateId = String(form.get("fieldTemplateId") ?? "").trim();
    if (!mappingInstanceId && !fieldTemplateId) {
      throw new ValidationError("mappingInstanceId or fieldTemplateId is required.");
    }
    validateMimeType(file.type || "application/octet-stream");
    const buffer = Buffer.from(await file.arrayBuffer());

    let fieldCatalog;
    if (mappingInstanceId) {
      const mappingInstance = await reportService.getMappingInstance(mappingInstanceId);
      fieldCatalog = mappingInstance.field_catalog;
    } else {
      const masters = await reportService.listMasterTemplates({ withUsage: false });
      const selected = masters.find((item) => item.id === fieldTemplateId);
      if (!selected) throw new ValidationError("fieldTemplateId not found.");
      fieldCatalog = selected.field_catalog;
    }

    const result = await extractFieldsFromOcr({
      buffer,
      mimeType: file.type,
      filename: file.name,
      fieldCatalog,
    });

    return NextResponse.json({
      ok: true,
      suggestions: result.suggestions,
      meta: result.meta,
    });
  } catch (error) {
    const httpError = toHttpError(error, "OCR process failed.");
    return NextResponse.json(
      { ok: false, error: httpError.message, details: httpError.details },
      { status: httpError.status },
    );
  }
}

