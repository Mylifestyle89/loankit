import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { validateFileSize } from "@/lib/report/upload-limits";

export const runtime = "nodejs";

const DATA_EXTS = new Set([".csv", ".xlsx", ".xls", ".json", ".md"]);
const TEMPLATE_EXTS = new Set([".docx", ".doc"]);

function sanitizeName(input: string): string {
  return input.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").trim();
}

export async function POST(req: NextRequest) {
  try {
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

    const subDir = isTemplate ? "report_assets/uploads/templates" : "report_assets/uploads/data";
    const timestamp = Date.now();
    const finalName = `${timestamp}-${original}`;
    const relPath = `${subDir}/${finalName}`.replaceAll("\\", "/");
    const absPath = path.join(process.cwd(), relPath);
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(absPath, Buffer.from(arrayBuffer));

    return NextResponse.json({
      ok: true,
      path: relPath,
      name: original,
    });
  } catch (error) {
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
