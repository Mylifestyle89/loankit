import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

import { toHttpError } from "@/core/errors/app-error";
import { analyzeDocument } from "@/services/auto-tagging.service";

export const runtime = "nodejs";

const ALLOWED_EXT = new Set([".docx", ".doc"]);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const headersJson = formData.get("headers");
    const fieldLabelsJson = formData.get("fieldLabels");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Vui lòng chọn file DOCX." }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return NextResponse.json(
        { ok: false, error: `Chỉ chấp nhận file .docx/.doc, nhận được: ${ext}` },
        { status: 400 },
      );
    }

    let headers: string[];
    try {
      headers = JSON.parse(String(headersJson ?? "[]"));
      if (!Array.isArray(headers)) throw new Error();
    } catch {
      return NextResponse.json({ ok: false, error: "headers phải là JSON array." }, { status: 400 });
    }

    let fieldLabels: Record<string, string> | undefined;
    if (fieldLabelsJson) {
      try {
        fieldLabels = JSON.parse(String(fieldLabelsJson));
      } catch {
        /* ignore invalid labels */
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const docxBuffer = Buffer.from(arrayBuffer);

    const sanitizedName = file.name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
    const uploadDir = path.join(process.cwd(), "report_assets", "uploads", "tagging");
    await fs.mkdir(uploadDir, { recursive: true });
    const uploadPath = path.join(uploadDir, `${Date.now()}-${sanitizedName}`);
    await fs.writeFile(uploadPath, docxBuffer);
    const relPath = path.relative(process.cwd(), uploadPath).replace(/\\/g, "/");

    const { paragraphs, suggestions } = await analyzeDocument(docxBuffer, headers, fieldLabels);

    const documentPreview = paragraphs
      .slice(0, 100)
      .map((p) => p.text)
      .join("\n");

    return NextResponse.json({
      ok: true,
      docxPath: relPath,
      suggestions,
      documentPreview,
      paragraphCount: paragraphs.length,
    });
  } catch (error) {
    const httpError = toHttpError(error, "Auto-tagging analysis failed.");
    return NextResponse.json(
      { ok: false, error: httpError.message, details: httpError.details },
      { status: httpError.status },
    );
  }
}
