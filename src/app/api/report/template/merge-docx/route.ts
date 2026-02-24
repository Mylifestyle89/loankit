import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { ValidationError, toHttpError } from "@/core/errors/app-error";
import { mergeDocxBuffers } from "@/lib/docx-merge";

export const runtime = "nodejs";

function sanitizeFileName(input: string): string {
  const raw = (input ?? "").trim();
  if (!raw) return "merged-template";
  return raw.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").replace(/\s+/g, " ").trim() || "merged-template";
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const files = form
      .getAll("files")
      .filter((item): item is File => item instanceof File);
    const pageBreakRaw = String(form.get("pageBreak") ?? "true").toLowerCase();
    const pageBreak = pageBreakRaw !== "false";
    const outputNameRaw = String(form.get("outputName") ?? "merged-template").trim();
    const outputName = sanitizeFileName(outputNameRaw);

    if (files.length < 2) {
      throw new ValidationError("Cần chọn ít nhất 2 file DOCX.");
    }

    const buffers: Buffer[] = [];
    for (const file of files) {
      const ext = path.extname(file.name).toLowerCase();
      if (ext !== ".docx") {
        throw new ValidationError(`Chỉ hỗ trợ file .docx. File không hợp lệ: ${file.name}`);
      }
      const arrayBuffer = await file.arrayBuffer();
      buffers.push(Buffer.from(arrayBuffer));
    }

    const merged = await mergeDocxBuffers(buffers, { pageBreak });
    const fileName = `${outputName}.docx`;
    const outputArrayBuffer = merged.buffer.slice(
      merged.byteOffset,
      merged.byteOffset + merged.byteLength,
    ) as ArrayBuffer;
    return new NextResponse(outputArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    const httpError = toHttpError(error, "Không thể nối các file DOCX.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}
