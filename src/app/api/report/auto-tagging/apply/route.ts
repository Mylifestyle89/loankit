import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { replaceWithTags, saveTemplate, type TagFormat } from "@/services/auto-tagging.service";

export const runtime = "nodejs";

type ApplyBody = {
  docxPath?: string;
  accepted?: Array<{ header: string; matchedText: string }>;
  format?: TagFormat;
  outputName?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ApplyBody;
    const { docxPath, accepted, format = "square", outputName } = body;

    if (!docxPath || typeof docxPath !== "string") {
      throw new ValidationError("docxPath is required.");
    }
    if (!Array.isArray(accepted) || accepted.length === 0) {
      throw new ValidationError("Cần ít nhất 1 tag được chấp nhận.");
    }
    if (format !== "square" && format !== "curly") {
      throw new ValidationError("format phải là 'square' hoặc 'curly'.");
    }

    const absolute = path.join(process.cwd(), docxPath);
    const docxBuffer = await fs.readFile(absolute);

    const taggedBuffer = await replaceWithTags(docxBuffer, accepted, format);
    const { templatePath, downloadUrl } = await saveTemplate(taggedBuffer, outputName);

    return NextResponse.json({ ok: true, templatePath, downloadUrl });
  } catch (error) {
    const httpError = toHttpError(error, "Auto-tagging apply failed.");
    return NextResponse.json(
      { ok: false, error: httpError.message, details: httpError.details },
      { status: httpError.status },
    );
  }
}
