import { NextRequest, NextResponse } from "next/server";
import { requireEditorOrAdmin } from "@/lib/auth-guard";
import { ocrService } from "@/services/ocr.service";
import { isValidDocumentType } from "@/services/ocr-document-prompts";
import { toHttpError } from "@/core/errors/app-error";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_FILES = 4;
const ALLOWED_MIMES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];

/**
 * POST /api/ocr/extract-document
 * Body: multipart/form-data { file (1-4 files), documentType }
 * Supports multiple images of the same document (e.g. front+back of CCCD).
 */
export async function POST(request: NextRequest) {
  try {
    await requireEditorOrAdmin();

    const formData = await request.formData();
    const files = formData.getAll("file") as File[];
    const documentType = formData.get("documentType") as string | null;

    if (!files.length) {
      return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ ok: false, error: `Maximum ${MAX_FILES} files allowed` }, { status: 400 });
    }

    // Validate each file
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ ok: false, error: `File "${file.name}" exceeds 10MB limit` }, { status: 400 });
      }
      if (!ALLOWED_MIMES.includes(file.type.toLowerCase())) {
        return NextResponse.json({ ok: false, error: `Unsupported file type: ${file.type}` }, { status: 400 });
      }
    }

    if (!documentType || !isValidDocumentType(documentType)) {
      return NextResponse.json(
        { ok: false, error: `Invalid documentType. Must be one of: cccd, land_cert, savings_book, vehicle_reg` },
        { status: 400 }
      );
    }

    // Convert all files to ExtractInput
    const inputs = await Promise.all(
      files.map(async (f) => ({
        buffer: Buffer.from(await f.arrayBuffer()),
        mimeType: f.type,
        filename: f.name,
      }))
    );

    const result = await ocrService.extractDocumentFields(inputs, documentType);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const httpErr = toHttpError(error, "Document extraction failed");
    return NextResponse.json({ ok: false, error: httpErr.message }, { status: httpErr.status });
  }
}
