import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { validateFileSize } from "@/lib/report/upload-limits";

export const runtime = "nodejs";

const DATA_EXTS = new Set([".csv", ".xlsx", ".xls", ".json", ".md"]);
const TEMPLATE_EXTS = new Set([".docx", ".doc"]);

/** Magic byte signatures for format validation */
const MAGIC_BYTES: Record<string, number[]> = {
  // PK ZIP header — used by .docx, .xlsx
  ".docx": [0x50, 0x4b, 0x03, 0x04],
  ".doc": [0xd0, 0xcf, 0x11, 0xe0], // OLE2 Compound Document
  ".xlsx": [0x50, 0x4b, 0x03, 0x04],
  ".xls": [0xd0, 0xcf, 0x11, 0xe0],
};

function validateMagicBytes(buffer: Buffer, ext: string): boolean {
  const expected = MAGIC_BYTES[ext];
  if (!expected) return true; // no magic defined → skip check
  if (buffer.length < expected.length) return false;
  return expected.every((byte, i) => buffer[i] === byte);
}

function sanitizeName(input: string): string {
  return input.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").trim();
}

export async function POST(req: NextRequest) {
  try {
    await requireEditorOrAdmin();
    const formData = await req.formData();
    const file = formData.get("file");
    const kind = String(formData.get("kind") ?? "data").toLowerCase();
    if (!(file instanceof File)) {
      throw new ValidationError("Thiếu file upload.");
    }

    const original = sanitizeName(file.name || "upload.bin");
    const ext = path.extname(original).toLowerCase();
    const isTemplate = kind === "template";
    validateFileSize(file, isTemplate ? "generic_template" : "generic_data");
    const allowed = isTemplate ? TEMPLATE_EXTS : DATA_EXTS;
    if (!allowed.has(ext)) {
      throw new ValidationError(
        isTemplate
          ? "Template chỉ hỗ trợ .docx/.doc"
          : "File dữ liệu chỉ hỗ trợ .csv/.xlsx/.xls/.json/.md",
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate file content matches declared extension (magic bytes check)
    if (!validateMagicBytes(buffer, ext)) {
      throw new ValidationError(
        `Nội dung file không khớp với định dạng ${ext}. File có thể bị giả mạo extension.`,
      );
    }

    const subDir = isTemplate ? "report_assets/uploads/templates" : "report_assets/uploads/data";
    const timestamp = Date.now();
    const finalName = `${timestamp}-${original}`;
    const relPath = `${subDir}/${finalName}`.replaceAll("\\", "/");
    const absPath = path.join(process.cwd(), relPath);
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, buffer);

    return NextResponse.json({
      ok: true,
      path: relPath,
      name: original,
    });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "Upload thất bại.");
    return NextResponse.json(
      {
        ok: false,
        error: httpError.message,
      },
      { status: httpError.status },
    );
  }
}
